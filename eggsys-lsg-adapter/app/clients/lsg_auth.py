"""Cliente async para LSG-Auth (emisor JWT del ecosistema LifeSync-Games).

Copiado de lsg-routes-backend; contratos verificados contra
https://lsg.diinf.usach.cl/lsg-auth/openapi.json

Endpoints utilizados:
  POST /login          -> {access_token, token_type, expires_in_seconds, expires_at, player}
  GET  /whoami         -> perfil del portador del token
  POST /token/refresh  -> desliza un token aun vivo (sin refresh token durable)
"""

import httpx

from app.core.config import settings


class LsgAuthClient:
    """Envoltura async sobre la API de autenticacion LSG-Auth."""

    def __init__(self, base_url: str) -> None:
        self._base_url = base_url.rstrip("/")

    async def login(self, username: str, password: str) -> dict:
        """Autentica con email y contrasena.

        Args:
            username: Email del usuario.
            password: Contrasena del usuario.

        Returns:
            Payload completo: access_token, expires_at, player, etc.

        Raises:
            httpx.HTTPStatusError: Si las credenciales son invalidas (401).
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self._base_url}/login",
                data={"username": username, "password": password},
                timeout=15.0,
            )
            response.raise_for_status()
            return response.json()

    async def whoami(self, token: str) -> dict:
        """Retorna el perfil del portador del token.

        Args:
            token: Token JWT del usuario.

        Returns:
            Perfil: id_players, name, email, roles.

        Raises:
            httpx.HTTPStatusError: Si el token es invalido o expiro (401/403).
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self._base_url}/whoami",
                headers={"Authorization": f"Bearer {token}"},
                timeout=15.0,
            )
            response.raise_for_status()
            return response.json()

    async def refresh_user_token(self, token: str) -> dict:
        """Desliza un token de usuario AUN vivo (POST /token/refresh).

        LSG no emite refresh token durable: /token/refresh exige el Bearer todavia
        valido y devuelve uno nuevo (120 min). Si el token ya expiro -> 401 y hay
        que revincular con contrasena.

        Returns:
            Payload como /login: access_token, expires_at, etc.
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self._base_url}/token/refresh",
                headers={"Authorization": f"Bearer {token}"},
                timeout=15.0,
            )
            response.raise_for_status()
            return response.json()


# Instancia singleton utilizada por toda la aplicacion
lsg_auth_client = LsgAuthClient(settings.lsg_auth_base_url)
