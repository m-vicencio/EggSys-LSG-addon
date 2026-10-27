"""Jobs de fondo: reintento de eventos y mantenimiento de tokens.

`maintain_user_tokens` es el latido que sostiene la reconexion desatendida:
corre aunque no haya trafico de eventos, asi que una sesion muerta se recupera
sola aunque el usuario no abra la app.
"""

import logging
from datetime import timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.timeutil import as_aware, utcnow

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler(timezone="UTC")

_BASE_DELAY_S = 60


async def _retry_pass(db: AsyncSession) -> None:
    """Una pasada de reintentos. Recibe la sesion para poder testearla."""
    from app.models import LsgConnection, LsgEvent
    from app.services.sync import sync_event
    from app.services.token import get_usable_token

    stmt = select(LsgEvent).where(
        LsgEvent.status == "ERROR",
        LsgEvent.attempts < settings.retry_max_attempts,
    )
    events = (await db.execute(stmt)).scalars().all()

    # El token se resuelve una vez por conexion, no por evento: un lote grande
    # con la sesion muerta dispararia un re-login por cada evento.
    tokens: dict[str, str | None] = {}

    for event in events:
        last_attempt = as_aware(event.last_attempt_at)
        if last_attempt is not None:
            backoff_s = _BASE_DELAY_S * (2 ** max(0, event.attempts - 1))
            if utcnow() < last_attempt + timedelta(seconds=backoff_s):
                continue

        connection = (await db.execute(
            select(LsgConnection).where(
                LsgConnection.eggsys_user_id == event.eggsys_user_id
            )
        )).scalar_one_or_none()
        if connection is None or not connection.enabled or connection.broken_reason:
            continue

        if event.eggsys_user_id not in tokens:
            tokens[event.eggsys_user_id] = await get_usable_token(connection, db)
        token = tokens[event.eggsys_user_id]
        if token is None:
            continue  # sesion irrecuperable ahora mismo: no gastar intentos

        logger.info(
            "Reintentando evento %s (intento %s/%s)",
            event.client_ref, event.attempts + 1, settings.retry_max_attempts,
        )
        try:
            await sync_event(event, connection, db, token=token)
        except Exception as exc:
            logger.error("Error en reintento de evento %s: %s", event.client_ref, exc)


async def _maintain_pass(db: AsyncSession) -> None:
    """Mantiene vivos los tokens de todas las conexiones habilitadas."""
    from app.models import LsgConnection
    from app.services.token import get_usable_token

    # Sin filtrar por user_token IS NOT NULL: justamente las filas con el token
    # ya muerto son las que hay que recuperar.
    stmt = select(LsgConnection).where(LsgConnection.enabled.is_(True))
    for connection in (await db.execute(stmt)).scalars().all():
        try:
            await get_usable_token(connection, db)
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "Error manteniendo el token de %s: %s", connection.eggsys_user_id, exc
            )


async def retry_failed_events() -> None:
    from app.db.session import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        await _retry_pass(db)


async def maintain_user_tokens() -> None:
    from app.db.session import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        await _maintain_pass(db)


def register_jobs() -> None:
    """Registra los jobs. Lo llama el lifespan, no el import.

    `next_run_time=utcnow()` es imprescindible: un trigger `interval` no dispara
    hasta pasado el intervalo completo, asi que al despertar el portatil habia
    una ventana ciega justo cuando el token acaba de morir.

    `misfire_grace_time=None` evita que APScheduler descarte las ejecuciones que
    se perdieron mientras la maquina estaba suspendida (por defecto las tira tras
    1 segundo de retraso).
    """
    scheduler.add_job(
        retry_failed_events, "interval", seconds=60, id="retry_failed_events",
        next_run_time=utcnow(), misfire_grace_time=None, coalesce=True,
    )
    scheduler.add_job(
        maintain_user_tokens, "interval", minutes=5, id="maintain_user_tokens",
        next_run_time=utcnow(), misfire_grace_time=None, coalesce=True,
    )
