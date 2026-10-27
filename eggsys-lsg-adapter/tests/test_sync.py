"""Sincronizacion con LSG-Core: exito, 422 permanente, 503 transitorio."""

from datetime import datetime, timedelta, timezone

import pytest
import respx
from httpx import Response
from sqlalchemy import select

from app.core.config import settings
from app.models import LsgConnection, LsgEvent
from app.services.sync import sync_event

AUTH = settings.lsg_auth_base_url
CORE = settings.lsg_core_base_url


@pytest.fixture(autouse=True)
def _sensor_endpoint(monkeypatch):
    monkeypatch.setattr(settings, "eggsys_sensor_endpoint_id", 7)
    monkeypatch.setattr(settings, "eggsys_endpoint_ids", {"streak.daily_logging": 7})


async def _make_event(db, **overrides):
    connection = LsgConnection(
        eggsys_user_id="usr1", id_players=42, lsg_email="a@b.c",
        players_sensor_endpoints={"7": 99}, enabled=True,
        user_token="utok",
        user_token_expires_at=datetime.now(tz=timezone.utc) + timedelta(hours=2),
    )
    event = LsgEvent(
        client_ref="11111111-1111-1111-1111-111111111111",
        eggsys_user_id="usr1", event_type="streak.daily_logging",
        period_key="2026-W29", occurred_at=datetime.now(tz=timezone.utc),
        status="PENDING", awarded_points=5, point_dimension_id=4,
        **overrides,
    )
    db.add_all([connection, event])
    await db.commit()
    return event, connection


@respx.mock
async def test_sync_success(db):
    event, connection = await _make_event(db)
    respx.post(f"{CORE}/sensors/ingest/webhook").mock(
        return_value=Response(200, json={"status": "ok", "id_sensor_ingest_event": 123})
    )
    respx.get(f"{CORE}/points/ledger").mock(return_value=Response(200, json=[]))
    respx.post(f"{CORE}/players/42/points/adjust").mock(
        return_value=Response(200, json={"status": "ok", "source_ref": "ADJUST-x"})
    )
    result = await sync_event(event, connection, db)
    assert result.status == "SYNCED"
    assert result.sensor_event_id == 123
    assert result.points_ledger_ref == "ADJUST-x"


@respx.mock
async def test_422_is_permanent_rejection(db):
    event, connection = await _make_event(db)
    respx.post(f"{CORE}/sensors/ingest/webhook").mock(return_value=Response(422, json={}))
    result = await sync_event(event, connection, db)
    assert result.status == "REJECTED"
    assert result.reject_reason == "ingest_http_422"


@respx.mock
async def test_503_is_transient_error(db):
    event, connection = await _make_event(db)
    respx.post(f"{CORE}/sensors/ingest/webhook").mock(return_value=Response(503, json={}))
    result = await sync_event(event, connection, db)
    assert result.status == "ERROR"
    assert result.reject_reason is None


@respx.mock
async def test_expired_user_token_requires_relink(db):
    # Token muerto y sin refresh posible -> ERROR pidiendo revincular, sin tocar LSG-Core.
    event, connection = await _make_event(db)
    connection.user_token = None
    connection.user_token_expires_at = datetime.now(tz=timezone.utc) - timedelta(minutes=1)
    await db.commit()
    result = await sync_event(event, connection, db)
    assert result.status == "ERROR"
    assert result.last_error == "user_token_expired_relink_required"


@respx.mock
async def test_dead_token_does_not_burn_attempts(db):
    """Regresion E.2: una noche caido no puede agotar el presupuesto de intentos.

    Antes cada pasada sumaba un intento aunque el fallo fuera 'token muerto', asi
    que al quinto el evento salia del filtro `attempts < 5` para siempre.
    """
    event, connection = await _make_event(db)
    connection.user_token = None
    connection.user_token_expires_at = datetime.now(tz=timezone.utc) - timedelta(minutes=1)
    await db.commit()

    from app.models import LsgSyncLog

    for _ in range(10):
        await sync_event(event, connection, db)

    assert event.attempts == 0
    logs = (await db.execute(select(LsgSyncLog).where(LsgSyncLog.event_id == event.id))).scalars().all()
    assert logs == []  # tampoco se infla la tabla de trazas


@respx.mock
async def test_404_sets_broken_reason_not_enabled_false(db):
    """Regresion E.3: `enabled` es del usuario; la rotura va en su propia columna."""
    event, connection = await _make_event(db)
    respx.post(f"{CORE}/sensors/ingest/webhook").mock(return_value=Response(404, json={}))

    result = await sync_event(event, connection, db)

    assert result.status == "REJECTED"
    assert connection.broken_reason == "player_not_found"
    assert connection.enabled is True


async def test_endpoint_id_for_mapea_cada_conducta():
    """Cada event_type resuelve a su propio endpoint; lo no mapeado cae al default."""
    settings.eggsys_endpoint_ids = {"streak.daily_logging": 8, "budget.month_met": 9}
    settings.eggsys_sensor_endpoint_id = 7
    try:
        assert settings.endpoint_id_for("streak.daily_logging") == 8
        assert settings.endpoint_id_for("budget.month_met") == 9
        assert settings.endpoint_id_for("desconocido") == 7  # fallback
        assert settings.configured_endpoint_ids == [8, 9]
    finally:
        settings.eggsys_endpoint_ids = {}


@respx.mock
async def test_evento_usa_el_endpoint_de_su_conducta(db):
    """El webhook debe llevar el endpoint de la conducta, no el default."""
    settings.eggsys_endpoint_ids = {"streak.daily_logging": 11}
    try:
        event, connection = await _make_event(db)
        connection.players_sensor_endpoints = {"11": 77}
        await db.commit()
        capturado = {}

        def _capturar(request):
            import json
            capturado.update(json.loads(request.content))
            return Response(200, json={"status": "ok", "id_sensor_ingest_event": 1})

        respx.post(f"{CORE}/sensors/ingest/webhook").mock(side_effect=_capturar)
        respx.get(f"{CORE}/points/ledger").mock(return_value=Response(200, json=[]))
        respx.post(f"{CORE}/players/42/points/adjust").mock(
            return_value=Response(200, json={"status": "ok", "source_ref": "ADJUST-x"})
        )
        result = await sync_event(event, connection, db)
        assert result.status == "SYNCED"
        assert capturado["sensor_endpoint_id"] == 11
        assert capturado["players_sensor_endpoint_id"] == 77
    finally:
        settings.eggsys_endpoint_ids = {}


@respx.mock
async def test_ledger_idempotency_skips_adjust(db):
    event, connection = await _make_event(db)
    respx.post(f"{CORE}/sensors/ingest/webhook").mock(
        return_value=Response(200, json={"status": "ok", "id_sensor_ingest_event": 1})
    )
    respx.get(f"{CORE}/points/ledger").mock(return_value=Response(200, json=[
        {"reason": f"eggsys ... client_ref={event.client_ref}"}
    ]))
    result = await sync_event(event, connection, db)
    assert result.status == "SYNCED"
    assert result.points_ledger_ref == "ledger_verified"
