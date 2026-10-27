"""Recuperacion automatica del token LSG: la escalera y su contencion de fallos."""

import logging
from datetime import timedelta

import httpx
import pytest
import respx
from cryptography.fernet import Fernet
from httpx import Response
from sqlalchemy import text

from app.core import crypto
from app.core.config import settings
from app.core.timeutil import utcnow
from app.models import LsgConnection
from app.services import token as token_service

AUTH = settings.lsg_auth_base_url
KEY = Fernet.generate_key().decode()
PASSWORD = "contrasena-lsg"


@pytest.fixture(autouse=True)
def with_key(monkeypatch):
    monkeypatch.setattr(settings, "lsg_credential_keys", KEY)
    crypto._fernet.cache_clear()
    token_service._locks.clear()
    yield
    crypto._fernet.cache_clear()


def _login_payload(token="tok-nuevo", hours=2):
    return {
        "access_token": token,
        "expires_at": (utcnow() + timedelta(hours=hours)).isoformat(),
    }


async def _make_connection(db, *, consent=True, credential=True, expires_in_h=2.0, **kw):
    connection = LsgConnection(
        eggsys_user_id="usr1", id_players=42, lsg_email="a@b.c",
        players_sensor_endpoints={}, enabled=True,
        user_token=kw.pop("user_token", "tok-viejo"),
        user_token_expires_at=utcnow() + timedelta(hours=expires_in_h),
        credential_consent=consent,
        credential_enc=(
            crypto.encrypt_credential("usr1", PASSWORD) if credential else None
        ),
        **kw,
    )
    db.add(connection)
    await db.commit()
    return connection


# ─── Escalera feliz ───────────────────────────────────────────────────────────


@respx.mock
async def test_healthy_token_returned_untouched(db):
    """Con vida de sobra no se toca la red."""
    connection = await _make_connection(db)
    refresh = respx.post(f"{AUTH}/token/refresh")
    login = respx.post(f"{AUTH}/login")

    assert await token_service.get_usable_token(connection, db) == "tok-viejo"
    assert not refresh.called
    assert not login.called


@respx.mock
async def test_near_expiry_slides_via_refresh(db):
    """Por expirar pero vivo: deslizar, nunca re-loguear."""
    connection = await _make_connection(db, expires_in_h=0.05)  # 3 min
    refresh = respx.post(f"{AUTH}/token/refresh").mock(
        return_value=Response(200, json=_login_payload("tok-deslizado"))
    )
    login = respx.post(f"{AUTH}/login")

    assert await token_service.get_usable_token(connection, db) == "tok-deslizado"
    assert refresh.called
    assert not login.called


@respx.mock
async def test_dead_token_with_consent_relogins(db):
    """El caso que motiva todo esto: token muerto, se recupera solo."""
    connection = await _make_connection(db, expires_in_h=-1)
    login = respx.post(f"{AUTH}/login").mock(
        return_value=Response(200, json=_login_payload("tok-recuperado"))
    )

    assert await token_service.get_usable_token(connection, db) == "tok-recuperado"
    assert login.call_count == 1
    assert connection.auto_relogin_attempts == 0
    assert connection.credential_fail_reason is None


@respx.mock
async def test_expired_refresh_falls_back_to_relogin(db):
    """Si /token/refresh responde 401, se cae al login en vez de rendirse."""
    connection = await _make_connection(db, expires_in_h=0.05)
    respx.post(f"{AUTH}/token/refresh").mock(return_value=Response(401))
    login = respx.post(f"{AUTH}/login").mock(
        return_value=Response(200, json=_login_payload("tok-recuperado"))
    )

    assert await token_service.get_usable_token(connection, db) == "tok-recuperado"
    assert login.call_count == 1


# ─── Sin consentimiento: comportamiento de siempre ────────────────────────────


@respx.mock
async def test_dead_token_without_consent_returns_none(db):
    connection = await _make_connection(db, consent=False, credential=False, expires_in_h=-1)
    login = respx.post(f"{AUTH}/login")

    assert await token_service.get_usable_token(connection, db) is None
    assert not login.called
    assert connection.user_token is None
    assert token_service.connection_status(connection)["needs_relink"] is True


async def test_needs_relink_false_while_auto_recovery_possible(db):
    """Con credencial usable la UI no debe gritar 'sesion expirada' cada noche."""
    connection = await _make_connection(db, expires_in_h=-1)
    status = token_service.connection_status(connection)
    assert status["session_expired"] is True
    assert status["needs_relink"] is False
    assert status["credential_state"] == "ACTIVE"


# ─── Contencion de fallos ─────────────────────────────────────────────────────


@respx.mock
async def test_invalid_password_wipes_and_never_retries(db):
    """La prueba del bloqueo: como maximo UN login fallido por credencial."""
    connection = await _make_connection(db, expires_in_h=-1)
    login = respx.post(f"{AUTH}/login").mock(return_value=Response(401))

    assert await token_service.get_usable_token(connection, db) is None
    assert login.call_count == 1
    assert connection.credential_enc is None
    assert connection.credential_fail_reason == "invalid_credentials"

    # Segunda pasada: ni un intento mas, pese a que el token sigue muerto.
    assert await token_service.get_usable_token(connection, db) is None
    assert login.call_count == 1
    assert token_service.connection_status(connection)["needs_relink"] is True


@respx.mock
async def test_transient_login_failure_backs_off(db):
    """Un 503 no borra la credencial, pero tampoco martillea a LSG."""
    connection = await _make_connection(db, expires_in_h=-1)
    login = respx.post(f"{AUTH}/login").mock(return_value=Response(503))

    assert await token_service.get_usable_token(connection, db) is None
    assert login.call_count == 1
    assert connection.credential_enc is not None  # sigue disponible
    assert connection.credential_fail_reason is None

    # Inmediatamente despues: dentro de la ventana de backoff, no se reintenta.
    assert await token_service.get_usable_token(connection, db) is None
    assert login.call_count == 1

    # Pasada la ventana, si.
    connection.last_auto_relogin_at = utcnow() - timedelta(hours=2)
    await db.commit()
    login.mock(return_value=Response(200, json=_login_payload("tok-al-fin")))
    assert await token_service.get_usable_token(connection, db) == "tok-al-fin"
    assert connection.auto_relogin_attempts == 0


@respx.mock
async def test_lsg_unreachable_keeps_live_token(db):
    """LSG caido con token aun valido: se conserva y no se intenta login."""
    connection = await _make_connection(db, expires_in_h=0.05)
    respx.post(f"{AUTH}/token/refresh").mock(side_effect=httpx.ConnectError("sin red"))
    login = respx.post(f"{AUTH}/login")

    assert await token_service.get_usable_token(connection, db) == "tok-viejo"
    assert not login.called
    assert connection.user_token == "tok-viejo"


@respx.mock
async def test_no_crypto_key_does_not_wipe_credential(db, monkeypatch):
    """Sin clave se desactiva la recuperacion, pero NO se destruye lo guardado."""
    connection = await _make_connection(db, expires_in_h=-1)
    stored = connection.credential_enc
    monkeypatch.setattr(settings, "lsg_credential_keys", "")
    crypto._fernet.cache_clear()
    login = respx.post(f"{AUTH}/login")

    assert await token_service.get_usable_token(connection, db) is None
    assert not login.called
    assert connection.credential_enc == stored
    assert connection.credential_fail_reason is None


@respx.mock
async def test_undecryptable_credential_is_discarded_without_login(db, monkeypatch):
    """Clave equivocada: blob inservible, se descarta sin llamar a LSG."""
    connection = await _make_connection(db, expires_in_h=-1)
    monkeypatch.setattr(settings, "lsg_credential_keys", Fernet.generate_key().decode())
    crypto._fernet.cache_clear()
    login = respx.post(f"{AUTH}/login")

    assert await token_service.get_usable_token(connection, db) is None
    assert not login.called
    assert connection.credential_enc is None
    assert connection.credential_fail_reason == "undecryptable"


@respx.mock
async def test_password_never_logged(db, caplog):
    """La contrasena no puede aparecer en los logs por ninguna rama."""
    connection = await _make_connection(db, expires_in_h=-1)
    respx.post(f"{AUTH}/login").mock(return_value=Response(401))

    with caplog.at_level(logging.DEBUG):
        await token_service.get_usable_token(connection, db)

    assert PASSWORD not in caplog.text


@respx.mock
async def test_plaintext_token_in_db_is_dead_and_recovered(db):
    """Un token que quedo en claro (de antes del cifrado) no se usa: se re-loguea."""
    connection = await _make_connection(db)
    await db.execute(text("UPDATE lsg_connections SET user_token = 'eyJ.en.claro'"))
    await db.commit()
    await db.refresh(connection)
    assert connection.user_token is None

    login = respx.post(f"{AUTH}/login").mock(
        return_value=Response(200, json=_login_payload())
    )

    assert await token_service.get_usable_token(connection, db) == "tok-nuevo"
    assert login.call_count == 1
