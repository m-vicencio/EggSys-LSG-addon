"""Administracion de reglas de puntaje, editables sin redesplegar."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import verify_ingest_secret
from app.db.session import get_db
from app.models import LsgEvent, LsgEventRule
from app.schemas import RulePatch

router = APIRouter(tags=["admin"], dependencies=[Depends(verify_ingest_secret)])


def _serialize(rule: LsgEventRule) -> dict:
    return {
        "id": rule.id,
        "event_type": rule.event_type,
        "point_dimension_id": rule.point_dimension_id,
        "base_points": rule.base_points,
        "max_per_day": rule.max_per_day,
        "max_per_week": rule.max_per_week,
        "max_per_month": rule.max_per_month,
        "enabled": rule.enabled,
    }


@router.post("/admin/events/unstick")
async def unstick_events(db: AsyncSession = Depends(get_db)):
    """Devuelve al ruedo los eventos varados por sesion expirada.

    Antes cada pasada del retry worker gastaba un intento aunque el fallo fuera
    "token muerto", asi que al quinto el evento quedaba fuera del filtro
    `attempts < retry_max_attempts` para siempre. Eso ya no ocurre, pero los
    eventos varados de antes necesitan este empujon puntual.
    """
    result = await db.execute(
        update(LsgEvent)
        .where(
            LsgEvent.status == "ERROR",
            LsgEvent.last_error == "user_token_expired_relink_required",
        )
        .values(attempts=0)
    )
    await db.commit()
    return {"unstuck": result.rowcount}


@router.get("/admin/rules")
async def list_rules(db: AsyncSession = Depends(get_db)):
    """Lista todas las reglas de puntaje."""
    rules = (await db.execute(select(LsgEventRule))).scalars().all()
    return {"data": [_serialize(r) for r in rules]}


@router.patch("/admin/rules/{event_type}")
async def patch_rule(event_type: str, body: RulePatch, db: AsyncSession = Depends(get_db)):
    """Actualiza una regla de puntaje por tipo de evento."""
    rule = (await db.execute(
        select(LsgEventRule).where(LsgEventRule.event_type == event_type)
    )).scalar_one_or_none()
    if rule is None:
        raise HTTPException(status_code=404, detail={"code": "RULE_NOT_FOUND"})
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(rule, field, value)
    await db.commit()
    return _serialize(rule)
