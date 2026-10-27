"""Orquestador de sincronizacion evento -> LSG-Core.

Flujo (mismo orden de produccion que lsg-routes):
  1. Resolver/cachear el players_sensor_endpoint_id del endpoint de esa conducta.
  2. POST /sensors/ingest/webhook (auditoria del estudio longitudinal).
  3. POST /players/{id}/points/adjust con idempotencia via ledger.
  4. Persistir LsgSyncLog por paso.

Si el ingest falla no se acreditan puntos: evento auditable sin puntos > puntos
sin auditoria. Errores transitorios -> ERROR (retry_worker); 403/422 -> REJECTED
permanente; 404 de jugador -> broken_reason, requiere revinculacion.

El ciclo de vida del token (deslizar / re-loguear) vive en services/token.py.
"""

import logging
from datetime import datetime, timezone

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.clients import lsg_service_account
from app.clients.lsg_core import lsg_core_client
from app.core.config import settings
from app.models import LsgConnection, LsgEvent, LsgSyncLog
from app.services.token import get_usable_token

logger = logging.getLogger(__name__)


def _log(db: AsyncSession, event: LsgEvent, step: str, **kwargs) -> None:
    db.add(LsgSyncLog(event_id=event.id, attempt=event.attempts, step=step, **kwargs))


async def _resolve_pseid(
    connection: LsgConnection, token: str, db: AsyncSession, endpoint_id: int
) -> int | None:
    """players_sensor_endpoint_id del endpoint dado: cache local o GET /sensors/players/{id}."""
    cache = connection.players_sensor_endpoints or {}
    cached = cache.get(str(endpoint_id))
    if cached is not None:
        return cached
    try:
        sensors = await lsg_core_client.get_player_sensors(connection.id_players, token)
    except (httpx.HTTPStatusError, httpx.RequestError) as exc:
        logger.error("No se pudo obtener sensores del jugador %s: %s", connection.id_players, exc)
        return None
    for sensor in sensors:
        if sensor.get("id_sensor_endpoint") == endpoint_id and sensor.get("activated"):
            # Reasignar el dict entero: SQLAlchemy no detecta mutaciones in situ en JSON.
            connection.players_sensor_endpoints = {
                **cache,
                str(endpoint_id): sensor["id_players_sensor_endpoint"],
            }
            await db.commit()
            return sensor["id_players_sensor_endpoint"]
    logger.warning(
        "Endpoint %s no activado para el jugador %s", endpoint_id, connection.id_players
    )
    return None


async def _ledger_already_credited(client_ref: str, player_id: int, token: str) -> bool:
    """Verifica en el ledger LSG si este client_ref ya fue acreditado."""
    try:
        ledger = await lsg_core_client.get_points_ledger(
            player_id=player_id, token=token, source_type="ADJUST"
        )
        return any(client_ref in str(entry.get("reason", "")) for entry in ledger)
    except (httpx.HTTPStatusError, httpx.RequestError) as exc:
        logger.warning("No se pudo verificar ledger para idempotencia: %s", exc)
        return False


def _classify_http_error(exc: httpx.HTTPStatusError) -> str:
    """Estado resultante segun el codigo HTTP de LSG."""
    code = exc.response.status_code
    if code in (403, 422):
        return "REJECTED"  # fallo de configuracion o payload: nunca reintentar
    if code == 404:
        return "BROKEN"  # jugador inexistente: conexion rota, revincular
    return "ERROR"  # 401/5xx/red: transitorio, reintentar


async def sync_event(
    event: LsgEvent,
    connection: LsgConnection,
    db: AsyncSession,
    token: str | None = None,
) -> LsgEvent:
    """Sincroniza un evento con puntos ya calculados hacia LSG-Core.

    Args:
        token: token ya resuelto por el caller. El retry worker lo resuelve una
            vez por conexion para no disparar un re-login por cada evento del lote.
    """
    # El ingest va EN NOMBRE del usuario (webhook player-self, LSG-Core puntua).
    # El adjust puede ir con la cuenta de servicio; esa frontera no se cruza.
    user_token = token if token is not None else await get_usable_token(connection, db)
    if user_token is None:
        # Sin token no hay nada que reintentar: no se gasta un intento del
        # presupuesto ni se escribe un LsgSyncLog por pasada, o una noche caido
        # dejaria el evento varado para siempre y la tabla de logs inflada.
        event.status = "ERROR"
        event.last_error = "user_token_expired_relink_required"
        await db.commit()
        return event

    event.attempts += 1
    event.last_attempt_at = datetime.now(tz=timezone.utc)
    event.last_error = None

    # Cada conducta viaja por su propio endpoint (docs/lsg-sensor-endpoints.md):
    # es lo unico que un consumidor externo puede leer sin parsear el payload.
    endpoint_id = settings.endpoint_id_for(event.event_type)
    pseid = await _resolve_pseid(connection, user_token, db, endpoint_id)
    if pseid is None:
        event.status = "ERROR"
        event.last_error = "players_sensor_endpoint_not_found"
        _log(db, event, "ingest", reason=f"players_sensor_endpoint_not_found:{endpoint_id}")
        await db.commit()
        return event

    # Paso 1: ingest webhook (auditoria)
    if event.sensor_event_id is None:
        ingest_request = {
            "event_type": event.event_type,
            "period_key": event.period_key,
            "client_ref": event.client_ref,
            "payload": event.raw_payload,
            "awarded_points": event.awarded_points,
            "app": "eggsys",
        }
        try:
            result = await lsg_core_client.ingest_sensor_event(
                player_id=connection.id_players,
                sensor_endpoint_id=endpoint_id,
                players_sensor_endpoint_id=pseid,
                raw_payload=ingest_request,
                parsed_value=float(event.awarded_points),
                occurred_at=event.occurred_at,
                token=user_token,
            )
            event.sensor_event_id = result["id_sensor_ingest_event"]
            _log(db, event, "ingest", request=ingest_request, response=result, http_status=200)
        except httpx.HTTPStatusError as exc:
            outcome = _classify_http_error(exc)
            if exc.response.status_code == 401:
                connection.user_token = None  # token del usuario murio -> revincular
            if outcome == "BROKEN":
                # `enabled` es el interruptor del usuario: marcamos la rotura en
                # su propia columna para no pisarlo (y que la UI lo distinga).
                connection.broken_reason = "player_not_found"
                event.status = "REJECTED"
                event.reject_reason = "player_not_found_relink_required"
            else:
                event.status = outcome
                event.reject_reason = f"ingest_http_{exc.response.status_code}" if outcome == "REJECTED" else None
            event.last_error = str(exc)
            _log(db, event, "ingest", request=ingest_request,
                 http_status=exc.response.status_code, reason=str(exc)[:250])
            await db.commit()
            return event
        except httpx.RequestError as exc:
            event.status = "ERROR"
            event.last_error = str(exc)
            _log(db, event, "ingest", request=ingest_request, reason=str(exc)[:250])
            await db.commit()
            return event

    # Paso 2: adjust points (acreditacion) con idempotencia via ledger.
    # La cuenta de servicio (rol admin/cross-player) acredita en nombre del
    # jugador; sin configurar -> fallback al token del propio usuario. El mismo
    # token consulta el ledger, para que quien verifica sea quien acredita.
    if event.awarded_points > 0 and event.points_ledger_ref is None:
        try:
            service_token = await lsg_service_account.get_service_token()
        except (httpx.HTTPStatusError, httpx.RequestError) as exc:
            event.status = "ERROR"
            event.last_error = f"service_login_failed: {exc}"
            _log(db, event, "adjust", reason=str(exc)[:250])
            await db.commit()
            return event
        adjust_token = service_token or user_token

        if await _ledger_already_credited(event.client_ref, connection.id_players, adjust_token):
            logger.info("Evento %s ya acreditado en ledger, omitiendo adjust", event.client_ref)
            event.points_ledger_ref = "ledger_verified"
        else:
            reason = (
                f"eggsys {event.event_type} period={event.period_key} "
                f"client_ref={event.client_ref} sensor_event_id={event.sensor_event_id}"
            )
            try:
                result = await lsg_core_client.adjust_points(
                    player_id=connection.id_players,
                    point_dimension_id=event.point_dimension_id,
                    amount=event.awarded_points,
                    reason=reason,
                    token=adjust_token,
                )
                event.points_ledger_ref = result.get("source_ref")
                _log(db, event, "adjust", request={"reason": reason, "amount": event.awarded_points},
                     response=result, http_status=200)
            except httpx.HTTPStatusError as exc:
                outcome = _classify_http_error(exc)
                if exc.response.status_code == 401:
                    if service_token is not None:
                        lsg_service_account.invalidate_service_token()  # forzar re-login
                    else:
                        connection.user_token = None  # token del usuario murio -> revincular
                event.status = "REJECTED" if outcome == "REJECTED" else "ERROR"
                if outcome == "REJECTED":
                    event.reject_reason = f"adjust_http_{exc.response.status_code}"
                event.last_error = str(exc)
                _log(db, event, "adjust", http_status=exc.response.status_code, reason=str(exc)[:250])
                await db.commit()
                return event
            except httpx.RequestError as exc:
                event.status = "ERROR"
                event.last_error = str(exc)
                _log(db, event, "adjust", reason=str(exc)[:250])
                await db.commit()
                return event

    event.status = "SYNCED"
    event.last_error = None
    await db.commit()
    return event
