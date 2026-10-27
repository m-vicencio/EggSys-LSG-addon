"""Token de la cuenta de servicio LSG (rol admin/cross-player).

A diferencia del token del usuario, aqui SI tenemos la contrasena (variables de
entorno), asi que un token muerto se recupera con re-login: no hace falta
/token/refresh ni revincular. Un solo camino.
"""

from datetime import datetime, timezone

from app.clients.lsg_auth import lsg_auth_client
from app.core.config import settings
from app.core.timeutil import parse_expires_at

# Sin lock a proposito: logins concurrentes solo malgastan un request,
# y last-write-wins sobre el cache es inofensivo.
_token: str | None = None
_expires_at: datetime | None = None


async def get_service_token() -> str | None:
    """Token de la cuenta de servicio, re-logueado si expiro.

    Devuelve None si la cuenta no esta configurada -> el caller usa el token del
    propio usuario (comportamiento anterior).

    Raises:
        httpx.HTTPStatusError / httpx.RequestError: si el login falla (el caller
            lo trata como error transitorio y reintenta).
    """
    global _token, _expires_at
    if not settings.lsg_service_email or not settings.lsg_service_password:
        return None
    now = datetime.now(tz=timezone.utc)
    if _token is not None and _expires_at is not None and (_expires_at - now).total_seconds() >= 300:
        return _token
    result = await lsg_auth_client.login(
        settings.lsg_service_email, settings.lsg_service_password
    )
    _token = result["access_token"]
    _expires_at = parse_expires_at(result["expires_at"])
    return _token


def invalidate_service_token() -> None:
    """Descarta el token cacheado (p. ej. tras un 401) para forzar re-login."""
    global _token, _expires_at
    _token = None
    _expires_at = None
