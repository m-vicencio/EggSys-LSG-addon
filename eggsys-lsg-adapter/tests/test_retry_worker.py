"""Pasadas del worker: un token por conexion y cero desgaste si es irrecuperable."""

from datetime import timedelta

import respx
from httpx import Response

from app.core.config import settings
from app.core.timeutil import utcnow
from app.models import LsgConnection, LsgEvent
from app.services.retry_worker import _maintain_pass, _retry_pass

AUTH = settings.lsg_auth_base_url
CORE = settings.lsg_core_base_url


async def _seed(db, *, n_events=2, user_token="tok", expires_in_h=2.0):
    connection = LsgConnection(
        eggsys_user_id="usr1", id_players=42, lsg_email="a@b.c",
        players_sensor_endpoints={"7": 99}, enabled=True,
        user_token=user_token,
        user_token_expires_at=utcnow() + timedelta(hours=expires_in_h),
    )
    db.add(connection)
    for i in range(n_events):
        db.add(LsgEvent(
            client_ref=f"{i:08d}-1111-1111-1111-111111111111",
            eggsys_user_id="usr1", event_type="streak.daily_logging",
            period_key=f"2026-W{i:02d}", occurred_at=utcnow(),
            status="ERROR", awarded_points=5, point_dimension_id=4,
            attempts=1, last_attempt_at=utcnow() - timedelta(hours=1),
        ))
    await db.commit()
    return connection


@respx.mock
async def test_token_resolved_once_per_connection(db, monkeypatch):
    """Dos eventos del mismo usuario no pueden disparar dos re-logins."""
    monkeypatch.setattr(settings, "eggsys_endpoint_ids", {"streak.daily_logging": 7})
    await _seed(db, n_events=2, expires_in_h=0.05)  # por expirar

    refresh = respx.post(f"{AUTH}/token/refresh").mock(
        return_value=Response(200, json={
            "access_token": "tok-nuevo",
            "expires_at": (utcnow() + timedelta(hours=2)).isoformat(),
        })
    )
    respx.post(f"{CORE}/sensors/ingest/webhook").mock(
        return_value=Response(200, json={"status": "ok", "id_sensor_ingest_event": 1})
    )
    respx.get(f"{CORE}/points/ledger").mock(return_value=Response(200, json=[]))
    respx.post(f"{CORE}/players/42/points/adjust").mock(
        return_value=Response(200, json={"status": "ok", "source_ref": "ADJUST-x"})
    )

    await _retry_pass(db)

    assert refresh.call_count == 1


@respx.mock
async def test_events_untouched_when_token_unrecoverable(db):
    """Sesion irrecuperable: ni un intento gastado, ni una llamada a LSG-Core."""
    await _seed(db, n_events=2, user_token=None, expires_in_h=-1)
    ingest = respx.post(f"{CORE}/sensors/ingest/webhook")

    await _retry_pass(db)

    events = (await db.execute(LsgEvent.__table__.select())).fetchall()
    assert all(e.attempts == 1 for e in events)
    assert not ingest.called


@respx.mock
async def test_maintain_pass_recovers_dead_session(db):
    """El latido: sin trafico de eventos, la sesion muerta vuelve sola."""
    from app.core import crypto
    from cryptography.fernet import Fernet

    key = Fernet.generate_key().decode()
    settings.lsg_credential_keys = key
    crypto._fernet.cache_clear()
    try:
        connection = await _seed(db, n_events=0, user_token=None, expires_in_h=-1)
        connection.credential_consent = True
        connection.credential_enc = crypto.encrypt_credential("usr1", "pw")
        await db.commit()

        login = respx.post(f"{AUTH}/login").mock(
            return_value=Response(200, json={
                "access_token": "tok-recuperado",
                "expires_at": (utcnow() + timedelta(hours=2)).isoformat(),
            })
        )

        await _maintain_pass(db)

        assert login.call_count == 1
        assert connection.user_token == "tok-recuperado"
    finally:
        settings.lsg_credential_keys = ""
        crypto._fernet.cache_clear()


@respx.mock
async def test_broken_connection_is_skipped(db):
    """Una conexion rota no consume reintentos hasta que se revincule."""
    connection = await _seed(db, n_events=1)
    connection.broken_reason = "player_not_found"
    await db.commit()
    ingest = respx.post(f"{CORE}/sensors/ingest/webhook")

    await _retry_pass(db)

    assert not ingest.called
