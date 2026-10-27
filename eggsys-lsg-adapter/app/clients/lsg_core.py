"""Cliente async para LSG-Core-API.

Copiado de lsg-routes-backend; contratos verificados contra MANUAL-lsg-core-api.md

Endpoints utilizados:
  POST /sensors/ingest/webhook          -> {status, id_sensor_ingest_event}
  POST /players/{id}/points/adjust      -> {status, source_ref}
  GET  /sensors/players/{id}            -> lista de sensores activos del jugador
  GET  /points/ledger                   -> historial de movimientos (idempotencia)
"""

import logging
from datetime import datetime

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class LsgCoreClient:
    """Envoltura async sobre los endpoints de LSG-Core utilizados por el adaptador."""

    def __init__(self, base_url: str) -> None:
        self._base_url = base_url.rstrip("/")

    async def ingest_sensor_event(
        self,
        player_id: int,
        sensor_endpoint_id: int,
        players_sensor_endpoint_id: int,
        raw_payload: dict,
        parsed_value: float,
        occurred_at: datetime,
        token: str,
    ) -> dict:
        """Registra un evento de sensor en LSG-Core via webhook.

        Args:
            token: JWT del propio usuario. El webhook es player-self: el usuario
                ingesta su propia data y LSG-Core asigna los puntos.

        Returns:
            {"status": "ok", "id_sensor_ingest_event": <int>}
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self._base_url}/sensors/ingest/webhook",
                json={
                    "player_id": player_id,
                    "sensor_endpoint_id": sensor_endpoint_id,
                    "players_sensor_endpoint_id": players_sensor_endpoint_id,
                    "raw_payload": raw_payload,
                    "parsed_value": parsed_value,
                    "status": "OK",
                    "occurred_at": occurred_at.isoformat(),
                },
                headers={"Authorization": f"Bearer {token}"},
                timeout=30.0,
            )
            response.raise_for_status()
            return response.json()

    async def adjust_points(
        self,
        player_id: int,
        point_dimension_id: int,
        amount: int,
        reason: str,
        token: str,
    ) -> dict:
        """Acredita puntos al jugador via POST /players/{id}/points/adjust.

        Solo fase de prueba: adjust exige rol researcher, que tienen las cuentas
        de prueba. En produccion no se usa: LSG-Core puntua desde el webhook.

        Args:
            reason: Debe incluir el client_ref para trazabilidad e idempotencia.
            token: JWT del propio usuario (researcher en pruebas).

        Returns:
            {"status": "ok", "source_ref": "ADJUST-<uuid>"}
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self._base_url}/players/{player_id}/points/adjust",
                json={
                    "point_dimension_id": point_dimension_id,
                    "direction": "CREDIT",
                    "amount": amount,
                    "reason": reason,
                },
                headers={"Authorization": f"Bearer {token}"},
                timeout=30.0,
            )
            response.raise_for_status()
            return response.json()

    async def get_player_sensors(self, player_id: int, token: str) -> list:
        """Obtiene los sensores activos del jugador (con id_players_sensor_endpoint)."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self._base_url}/sensors/players/{player_id}",
                headers={"Authorization": f"Bearer {token}"},
                timeout=15.0,
            )
            response.raise_for_status()
            return response.json()

    async def link_sensor_to_player(self, player_id: int, sensor_id: int, token: str) -> dict:
        """Vincula el sensor EggSys al jugador (POST /sensors/players/{id}/link)."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self._base_url}/sensors/players/{player_id}/link",
                json={"sensor_id": sensor_id},
                headers={"Authorization": f"Bearer {token}"},
                timeout=15.0,
            )
            response.raise_for_status()
            return response.json()

    async def link_sensor_endpoint_to_player(
        self, player_id: int, sensor_endpoint_id: int, token: str
    ) -> dict:
        """Activa el endpoint del sensor para el jugador (POST /sensors/players/{id}/link-endpoint)."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self._base_url}/sensors/players/{player_id}/link-endpoint",
                json={"sensor_endpoint_id": sensor_endpoint_id, "activated": True},
                headers={"Authorization": f"Bearer {token}"},
                timeout=15.0,
            )
            response.raise_for_status()
            return response.json()

    async def ensure_sensor_linked(self, player_id: int, token: str) -> None:
        """Garantiza que el jugador tenga el sensor EggSys vinculado y activado.

        Llamado como tarea de fondo al vincular. Si ya esta vinculado no hace nada.

        Limitacion: link/link-endpoint exigen rol researcher; con el token del propio
        usuario esto solo funciona mientras las cuentas de prueba sean researcher.
        En produccion con rol player, el provisioning del sensor lo hace un
        researcher/admin en el onboarding, no aqui.
        """
        wanted = settings.configured_endpoint_ids
        if not wanted:
            return

        try:
            sensors = await self.get_player_sensors(player_id, token)
        except Exception as exc:
            logger.error("Error obteniendo sensores del jugador %s: %s", player_id, exc)
            return

        active = {
            s.get("id_sensor_endpoint") for s in sensors if s.get("activated")
        }
        missing = [eid for eid in wanted if eid not in active]
        if not missing:
            return

        try:
            await self.link_sensor_to_player(player_id, settings.eggsys_sensor_id, token)
            logger.info("Sensor EggSys vinculado al jugador %s", player_id)
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code != 409:
                logger.error("Error vinculando sensor al jugador %s: %s", player_id, exc)
                return

        # Un endpoint por conducta: si uno falla, los demas deben activarse igual.
        for endpoint_id in missing:
            try:
                await self.link_sensor_endpoint_to_player(player_id, endpoint_id, token)
                logger.info("Endpoint %s activado para jugador %s", endpoint_id, player_id)
            except Exception as exc:
                logger.error(
                    "Error activando endpoint %s para jugador %s: %s", endpoint_id, player_id, exc
                )

    async def get_points_ledger(
        self,
        player_id: int,
        token: str,
        source_type: str | None = "ADJUST",
        from_ts: str | None = None,
    ) -> list:
        """Consulta el ledger de puntos del jugador (verificacion de idempotencia)."""
        params: dict = {"player_id": player_id}
        if source_type is not None:
            params["source_type"] = source_type
        if from_ts:
            params["from_ts"] = from_ts
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self._base_url}/points/ledger",
                params=params,
                headers={"Authorization": f"Bearer {token}"},
                timeout=15.0,
            )
            response.raise_for_status()
            return response.json()


lsg_core_client = LsgCoreClient(settings.lsg_core_base_url)
