"""Consentimiento en /link: opt-in, revocacion y fallo cerrado sin clave."""

from datetime import timedelta

import pytest
import respx
from cryptography.fernet import Fernet
from fastapi import BackgroundTasks, HTTPException
from httpx import Response
from sqlalchemy import text

from app.api.routes.link import link_user, revoke_credential
from app.core import crypto
from app.core.config import settings
from app.core.timeutil import utcnow
from app.models import LsgConnection
from app.schemas import LinkRequest

AUTH = settings.lsg_auth_base_url
KEY = Fernet.generate_key().decode()
PASSWORD = "contrasena-lsg"


@pytest.fixture
def with_key(monkeypatch):
    monkeypatch.setattr(settings, "lsg_credential_keys", KEY)
    crypto._fernet.cache_clear()
    yield
    crypto._fernet.cache_clear()


def _mock_login():
    respx.post(f"{AUTH}/login").mock(return_value=Response(200, json={
        "access_token": "tok",
        "expires_at": (utcnow() + timedelta(hours=2)).isoformat(),
    }))
    respx.get(f"{AUTH}/whoami").mock(
        return_value=Response(200, json={"id_players": 42, "email": "a@b.c"})
    )


async def _link(db, *, store_credential):
    _mock_login()
    return await link_user(
        LinkRequest(
            eggsys_user_id="usr1", email="a@b.c",
            password=PASSWORD, store_credential=store_credential,
        ),
        BackgroundTasks(),
        db,
    )


async def _get(db):
    return (await db.execute(
        LsgConnection.__table__.select()
    )).fetchone()


@respx.mock
async def test_link_without_flag_stores_nothing(db, with_key):
    """Sin marcar la casilla: comportamiento identico al de antes."""
    response = await _link(db, store_credential=False)

    row = await _get(db)
    assert row.credential_enc is None
    assert row.credential_consent is False
    assert response.credential_state == "NONE"
    assert response.credential_consent is False


@respx.mock
async def test_link_with_flag_encrypts(db, with_key):
    response = await _link(db, store_credential=True)

    row = await _get(db)
    assert row.credential_consent is True
    assert row.credential_enc is not None
    assert PASSWORD not in row.credential_enc
    assert crypto.decrypt_credential("usr1", row.credential_enc) == PASSWORD
    assert response.credential_state == "ACTIVE"


@respx.mock
async def test_relink_without_flag_revokes(db, with_key):
    """Desmarcar la casilla al revincular debe borrar lo guardado."""
    await _link(db, store_credential=True)
    await _link(db, store_credential=False)

    row = await _get(db)
    assert row.credential_enc is None
    assert row.credential_consent is False


@respx.mock
async def test_link_with_flag_503_when_no_key(db, monkeypatch):
    """Sin cifrado configurado se falla en vez de descartar el consentimiento."""
    monkeypatch.setattr(settings, "lsg_credential_keys", "")
    crypto._fernet.cache_clear()
    login = respx.post(f"{AUTH}/login")

    with pytest.raises(HTTPException) as excinfo:
        await _link(db, store_credential=True)

    assert excinfo.value.status_code == 503
    assert excinfo.value.detail["code"] == "CREDENTIAL_STORAGE_UNAVAILABLE"
    assert not login.called  # ni siquiera se gasta un login


@respx.mock
async def test_link_503_when_no_key_even_without_flag(db, monkeypatch):
    """El token siempre se guarda y solo se guarda cifrado: sin clave no hay vinculo."""
    monkeypatch.setattr(settings, "lsg_credential_keys", "")
    crypto._fernet.cache_clear()
    login = respx.post(f"{AUTH}/login")

    with pytest.raises(HTTPException) as excinfo:
        await _link(db, store_credential=False)

    assert excinfo.value.status_code == 503
    assert excinfo.value.detail["code"] == "TOKEN_STORAGE_UNAVAILABLE"
    assert not login.called


@respx.mock
async def test_token_is_encrypted_at_rest(db, with_key):
    await _link(db, store_credential=False)

    raw = (await db.execute(text("SELECT user_token FROM lsg_connections"))).scalar_one()
    assert raw != "tok"
    assert crypto.decrypt_token(raw) == "tok"
    assert (await _get(db)).user_token == "tok"  # el ORM lo entrega descifrado


@respx.mock
async def test_relink_clears_broken_reason(db, with_key):
    await _link(db, store_credential=False)
    connection = (await db.execute(
        LsgConnection.__table__.select()
    )).fetchone()
    assert connection.broken_reason is None

    obj = (await db.get(LsgConnection, connection.id))
    obj.broken_reason = "player_not_found"
    await db.commit()

    await _link(db, store_credential=False)
    await db.refresh(obj)
    assert obj.broken_reason is None


@respx.mock
async def test_delete_credential_keeps_token(db, with_key):
    """Revocar no desvincula: el token vivo se conserva y la sync sigue."""
    await _link(db, store_credential=True)

    await revoke_credential("usr1", db)

    row = await _get(db)
    assert row.credential_enc is None
    assert row.credential_consent is False
    assert row.user_token == "tok"  # intacto


async def test_revoke_on_unknown_user_is_404(db):
    with pytest.raises(HTTPException) as excinfo:
        await revoke_credential("noexiste", db)
    assert excinfo.value.status_code == 404
