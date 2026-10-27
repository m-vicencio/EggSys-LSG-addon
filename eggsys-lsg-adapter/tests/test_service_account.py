"""Token de la cuenta de servicio: fallback, cache y re-login tras expirar."""

from datetime import datetime, timedelta, timezone

import pytest
import respx
from httpx import Response

from app.clients import lsg_service_account
from app.core.config import settings

AUTH = settings.lsg_auth_base_url


@pytest.fixture(autouse=True)
def _reset_cache():
    lsg_service_account.invalidate_service_token()
    yield
    lsg_service_account.invalidate_service_token()


def _login_body(minutes: int = 120) -> dict:
    expires = datetime.now(tz=timezone.utc) + timedelta(minutes=minutes)
    return {"access_token": f"svc-{minutes}", "expires_at": expires.isoformat()}


@respx.mock
async def test_returns_none_when_unconfigured(monkeypatch):
    monkeypatch.setattr(settings, "lsg_service_email", "")
    monkeypatch.setattr(settings, "lsg_service_password", "")
    route = respx.post(f"{AUTH}/login").mock(return_value=Response(200, json=_login_body()))
    assert await lsg_service_account.get_service_token() is None
    assert not route.called  # sin credenciales no se intenta login


@respx.mock
async def test_caches_token_within_validity(monkeypatch):
    monkeypatch.setattr(settings, "lsg_service_email", "svc@lsg.cl")
    monkeypatch.setattr(settings, "lsg_service_password", "secret")
    route = respx.post(f"{AUTH}/login").mock(return_value=Response(200, json=_login_body()))
    assert await lsg_service_account.get_service_token() == "svc-120"
    assert await lsg_service_account.get_service_token() == "svc-120"
    assert route.call_count == 1  # segundo llamado usa el cache


@respx.mock
async def test_relogin_after_expiry(monkeypatch):
    monkeypatch.setattr(settings, "lsg_service_email", "svc@lsg.cl")
    monkeypatch.setattr(settings, "lsg_service_password", "secret")
    # Primer login expira dentro de la ventana de 300s -> el siguiente re-loguea.
    respx.post(f"{AUTH}/login").mock(side_effect=[
        Response(200, json=_login_body(minutes=4)),
        Response(200, json=_login_body(minutes=120)),
    ])
    assert await lsg_service_account.get_service_token() == "svc-4"
    assert await lsg_service_account.get_service_token() == "svc-120"
