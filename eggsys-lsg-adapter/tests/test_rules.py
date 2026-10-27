"""Reglas de puntaje: siembra, topes por regla y topes globales."""

from datetime import datetime, timezone

from app.models import LsgEvent, LsgEventRule
from app.services import rules


async def _seed(db):
    db.add(LsgEventRule(
        event_type="tx.descriptive_entry", point_dimension_id=3,
        base_points=2, max_per_day=3, max_per_month=30, enabled=True,
    ))
    db.add(LsgEventRule(
        event_type="savings.milestone", point_dimension_id=2,
        base_points=10, enabled=True,
    ))
    await db.commit()


async def test_evaluate_awards_base_points(db):
    await _seed(db)
    points, dimension, name = await rules.evaluate(db, "tx.descriptive_entry", "usr1", {})
    assert points == 2
    assert dimension == 3
    assert name == "tx.descriptive_entry"


async def test_unknown_event_type_rejected(db):
    await _seed(db)
    points, _, reason = await rules.evaluate(db, "tx.created", "usr1", {})
    assert points is None
    assert reason == "no_rule_for_event_type"


async def test_milestone_scales_by_threshold(db):
    await _seed(db)
    points, _, _ = await rules.evaluate(db, "savings.milestone", "usr1", {"milestone": 100})
    assert points == 40
    points25, _, _ = await rules.evaluate(db, "savings.milestone", "usr1", {"milestone": 25})
    assert points25 == 10


async def test_per_rule_daily_cap_rejects(db):
    await _seed(db)
    now = datetime.now(tz=timezone.utc)
    for i in range(3):
        db.add(LsgEvent(
            client_ref=f"00000000-0000-0000-0000-00000000000{i}",
            eggsys_user_id="usr1", event_type="tx.descriptive_entry",
            period_key=f"p{i}", occurred_at=now, status="SYNCED", awarded_points=2,
        ))
    await db.commit()
    points, _, reason = await rules.evaluate(db, "tx.descriptive_entry", "usr1", {})
    assert points is None
    assert reason == "cap_exceeded_day"


async def test_global_daily_cap_rejects(db):
    await _seed(db)
    now = datetime.now(tz=timezone.utc)
    # 19 puntos ya acreditados hoy con otro tipo; +2 excede el tope global de 20
    db.add(LsgEvent(
        client_ref="00000000-0000-0000-0000-0000000000aa",
        eggsys_user_id="usr1", event_type="otro",
        period_key="p", occurred_at=now, status="SYNCED", awarded_points=19,
    ))
    await db.commit()
    points, _, reason = await rules.evaluate(db, "tx.descriptive_entry", "usr1", {})
    assert points is None
    assert reason == "cap_exceeded_global_day"
