"""Ingesta de eventos conductuales desde EggSys.

POST /events recibe un lote y responde 207 con un resultado por client_ref,
imitando el contrato de POST /offline/sync de LSG-Core.
"""

import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import verify_ingest_secret
from app.db.session import get_db
from app.models import LsgConnection, LsgEvent, LsgSyncLog
from app.schemas import EventBatch, EventIn, EventResult
from app.services import rules
from app.services.sync import sync_event

logger = logging.getLogger(__name__)
router = APIRouter(tags=["events"], dependencies=[Depends(verify_ingest_secret)])


def _result_reason(event: LsgEvent) -> str | None:
    """Motivo que ve EggSys.

    `reject_reason` solo se llena en los rechazos definitivos; la sesion expirada
    viaja en `last_error`. Sin este fallback EggSys no puede distinguirla de un
    error real y gasta su propio presupuesto de reintentos contra algo que no
    depende de el.
    """
    return event.reject_reason or event.last_error


async def _process_event(event_in: EventIn, db: AsyncSession) -> EventResult:
    """Procesa un evento: conexion → duplicado → reglas/topes → sync LSG."""
    connection = (await db.execute(
        select(LsgConnection).where(LsgConnection.eggsys_user_id == event_in.eggsys_user_id)
    )).scalar_one_or_none()
    if connection is None or not connection.enabled:
        return EventResult(client_ref=event_in.client_ref, status="REJECTED", reason="not_linked")
    if connection.broken_reason:
        # ERROR y no REJECTED: REJECTED es definitivo en el outbox de EggSys, y
        # estos eventos SI sirven una vez que el usuario revincule.
        return EventResult(
            client_ref=event_in.client_ref, status="ERROR", reason="connection_broken"
        )

    existing = (await db.execute(
        select(LsgEvent).where(LsgEvent.client_ref == event_in.client_ref)
    )).scalar_one_or_none()
    if existing is not None:
        # Reintento de un evento en ERROR: volver a sincronizar; cualquier otro estado es duplicado
        if existing.status == "ERROR" and existing.attempts < settings.retry_max_attempts:
            existing = await sync_event(existing, connection, db)
            return EventResult(
                client_ref=existing.client_ref, status=existing.status,
                reason=_result_reason(existing), awarded_points=existing.awarded_points,
                point_dimension_id=existing.point_dimension_id,
                dimension=rules.dimension_name(existing.point_dimension_id),
            )
        return EventResult(client_ref=event_in.client_ref, status="DUPLICATE")

    now = datetime.now(tz=timezone.utc)
    occurred_at = event_in.occurred_at
    if occurred_at.tzinfo is None:
        occurred_at = occurred_at.replace(tzinfo=timezone.utc)
    if occurred_at < now - timedelta(days=settings.event_max_age_days):
        return EventResult(client_ref=event_in.client_ref, status="REJECTED", reason="event_too_old")

    points, dimension_id, outcome = None, None, "no_rule_for_event_type"
    result = await rules.evaluate(db, event_in.event_type, event_in.eggsys_user_id, event_in.payload)
    points, dimension_id, outcome = result

    event = LsgEvent(
        client_ref=event_in.client_ref,
        eggsys_user_id=event_in.eggsys_user_id,
        event_type=event_in.event_type,
        period_key=event_in.period_key,
        raw_payload=event_in.payload,
        occurred_at=occurred_at,
        status="PENDING",
    )
    db.add(event)

    if points is None:
        event.status = "REJECTED"
        event.reject_reason = outcome
        await db.flush()
        db.add(LsgSyncLog(event_id=event.id, attempt=0, step="rules", reason=outcome))
        await db.commit()
        return EventResult(client_ref=event.client_ref, status="REJECTED", reason=outcome)

    event.awarded_points = points
    event.point_dimension_id = dimension_id
    await db.flush()
    db.add(LsgSyncLog(
        event_id=event.id, attempt=0, step="rules",
        rule_applied=outcome, reason=f"awarded={points} dimension={dimension_id}",
    ))
    await db.commit()

    event = await sync_event(event, connection, db)
    return EventResult(
        client_ref=event.client_ref, status=event.status,
        reason=_result_reason(event), awarded_points=event.awarded_points,
        point_dimension_id=event.point_dimension_id,
        dimension=rules.dimension_name(event.point_dimension_id),
    )


@router.post("/events")
async def ingest_events(batch: EventBatch, db: AsyncSession = Depends(get_db)):
    """Procesa un lote de eventos y responde 207 con el resultado por client_ref."""
    results = []
    for event_in in batch.events:
        try:
            results.append(await _process_event(event_in, db))
        except Exception as exc:
            logger.exception("Error procesando evento %s", event_in.client_ref)
            await db.rollback()
            results.append(EventResult(
                client_ref=event_in.client_ref, status="ERROR", reason=str(exc)[:250],
            ))
    return JSONResponse(
        status_code=207,
        content={"results": [r.model_dump() for r in results]},
    )


@router.get("/events/{eggsys_user_id}")
async def list_events(eggsys_user_id: str, limit: int = 50, db: AsyncSession = Depends(get_db)):
    """Historial de eventos de un usuario con su estado de sincronizacion."""
    events = (await db.execute(
        select(LsgEvent)
        .where(LsgEvent.eggsys_user_id == eggsys_user_id)
        .order_by(LsgEvent.created_at.desc())
        .limit(min(limit, 200))
    )).scalars().all()
    return {
        "data": [
            {
                "client_ref": e.client_ref,
                "event_type": e.event_type,
                "period_key": e.period_key,
                "status": e.status,
                "reject_reason": e.reject_reason,
                "awarded_points": e.awarded_points,
                "occurred_at": e.occurred_at.isoformat(),
                "attempts": e.attempts,
            }
            for e in events
        ]
    }
