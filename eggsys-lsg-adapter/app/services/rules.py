"""Reglas de puntaje: base_points por evento, topes por regla y topes globales.

Principio: el dinero no puntua, puntua la conducta. Ningun peso depende de montos.
"""

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import LsgEvent, LsgEventRule

logger = logging.getLogger(__name__)

# Pesos v1 acordados en el plan (§11). Los hitos de ahorro escalan por umbral
# via payload["milestone"] (25→10, 50→20, 75→30, 100→40) = base_points * umbral/25.
DEFAULT_RULES = [
    {"event_type": "streak.daily_logging", "dimension": "cognitivo", "base_points": 5,
     "max_per_day": None, "max_per_week": 1, "max_per_month": 4},
    {"event_type": "budget.month_met", "dimension": "cognitivo", "base_points": 15,
     "max_per_day": None, "max_per_week": None, "max_per_month": 3},
    {"event_type": "savings.milestone", "dimension": "afectivo", "base_points": 10,
     "max_per_day": None, "max_per_week": None, "max_per_month": None},
    {"event_type": "tx.descriptive_entry", "dimension": "linguistico", "base_points": 2,
     "max_per_day": 3, "max_per_week": None, "max_per_month": 30},
]


def dimension_name(dimension_id: int | None) -> str | None:
    """Invierte el mapeo de seed_default_rules: id de LSG-Core -> nombre de dimension."""
    if dimension_id is None:
        return None
    names = {
        settings.point_dimension_cognitivo: "cognitivo",
        settings.point_dimension_afectivo: "afectivo",
        settings.point_dimension_linguistico: "linguistico",
    }
    return names.get(dimension_id)


async def seed_default_rules(db: AsyncSession) -> None:
    """Crea las reglas v1 si la tabla esta vacia. Idempotente."""
    existing = (await db.execute(select(func.count(LsgEventRule.id)))).scalar_one()
    if existing:
        return
    dimension_ids = {
        "cognitivo": settings.point_dimension_cognitivo,
        "afectivo": settings.point_dimension_afectivo,
        "linguistico": settings.point_dimension_linguistico,
    }
    # Sembrar con 0 deja las reglas rotas para siempre: esta funcion no re-siembra
    # si ya hay filas, y LSG-Core responde 404 a un point_dimension_id inexistente.
    sin_configurar = [name for name, value in dimension_ids.items() if not value]
    if sin_configurar:
        raise RuntimeError(
            "POINT_DIMENSION_* sin configurar: "
            f"{', '.join(sin_configurar)}. Completar el .env antes de arrancar "
            "(ver GET /admin/point-dimensions)."
        )
    for rule in DEFAULT_RULES:
        db.add(LsgEventRule(
            event_type=rule["event_type"],
            point_dimension_id=dimension_ids[rule["dimension"]],
            base_points=rule["base_points"],
            max_per_day=rule["max_per_day"],
            max_per_week=rule["max_per_week"],
            max_per_month=rule["max_per_month"],
            enabled=True,
        ))
    await db.commit()
    logger.info("Reglas v1 sembradas (%s tipos de evento)", len(DEFAULT_RULES))


def _window_starts(now: datetime) -> dict[str, datetime]:
    """Inicio UTC de dia, semana ISO y mes calendario."""
    day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week = day - timedelta(days=day.weekday())
    month = day.replace(day=1)
    return {"day": day, "week": week, "month": month}


def compute_points(rule: LsgEventRule, payload: dict) -> int:
    """Puntos base de la regla; savings.milestone escala por umbral (25/50/75/100 %)."""
    if rule.event_type == "savings.milestone":
        milestone = int(payload.get("milestone", 25))
        return rule.base_points * max(1, milestone // 25)
    return rule.base_points


async def evaluate(db: AsyncSession, event_type: str, eggsys_user_id: str, payload: dict) -> tuple[int, int, str] | tuple[None, None, str]:
    """Evalua reglas y topes para un evento entrante.

    Returns:
        (puntos, point_dimension_id, nombre_regla) si procede acreditar, o
        (None, None, motivo_de_rechazo) si no.
    """
    rule = (await db.execute(
        select(LsgEventRule).where(LsgEventRule.event_type == event_type)
    )).scalar_one_or_none()
    if rule is None or not rule.enabled:
        return None, None, "no_rule_for_event_type"

    now = datetime.now(tz=timezone.utc)
    windows = _window_starts(now)
    points = compute_points(rule, payload)

    # Topes por regla: cantidad de eventos acreditados del mismo tipo por ventana
    per_rule_caps = {
        "day": rule.max_per_day,
        "week": rule.max_per_week,
        "month": rule.max_per_month,
    }
    for window, cap in per_rule_caps.items():
        if cap is None:
            continue
        count = (await db.execute(
            select(func.count(LsgEvent.id)).where(
                LsgEvent.eggsys_user_id == eggsys_user_id,
                LsgEvent.event_type == event_type,
                LsgEvent.status == "SYNCED",
                LsgEvent.occurred_at >= windows[window],
            )
        )).scalar_one()
        if count >= cap:
            return None, None, f"cap_exceeded_{window}"

    # Topes globales anti-farmeo: suma de puntos acreditados por ventana.
    # savings.milestone queda exento: es una vez por cuenta y umbral para siempre
    # (no farmeable) y su peso maximo (40) supera el tope diario (20) por diseño.
    if event_type == "savings.milestone":
        return points, rule.point_dimension_id, rule.event_type

    global_caps = {
        "day": settings.cap_daily,
        "week": settings.cap_weekly,
        "month": settings.cap_monthly,
    }
    for window, cap in global_caps.items():
        awarded = (await db.execute(
            select(func.coalesce(func.sum(LsgEvent.awarded_points), 0)).where(
                LsgEvent.eggsys_user_id == eggsys_user_id,
                LsgEvent.status == "SYNCED",
                LsgEvent.occurred_at >= windows[window],
            )
        )).scalar_one()
        if awarded + points > cap:
            return None, None, f"cap_exceeded_global_{window}"

    return points, rule.point_dimension_id, rule.event_type
