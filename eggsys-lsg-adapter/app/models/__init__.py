"""Modelos SQLAlchemy del adaptador EggSys-LSG.

Todos los modelos viven en este archivo porque son cinco tablas chicas.
"""

from datetime import datetime, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    TypeDecorator,
    UniqueConstraint,
    false,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from app.core import crypto


def _utcnow() -> datetime:
    return datetime.now(tz=timezone.utc)


class EncryptedToken(TypeDecorator):
    """Text cifrado con Fernet en la BD; en memoria el atributo es el token en claro.

    Un valor ilegible (sin clave, clave retirada o un token guardado en claro
    antes de cifrar) se lee como None, que la escalera de services/token.py ya
    trata como token muerto: re-login automatico o revincular.
    """

    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        return None if value is None else crypto.encrypt_token(value)

    def process_result_value(self, value, dialect):
        return None if value is None else crypto.decrypt_token(value)


class Base(DeclarativeBase):
    pass


class LsgConnection(Base):
    """Mapeo usuario EggSys <-> jugador LSG, con cache del endpoint del sensor."""

    __tablename__ = "lsg_connections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    eggsys_user_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    id_players: Mapped[int] = mapped_column(Integer, index=True)
    lsg_email: Mapped[str] = mapped_column(String(255), default="")
    # Cache {str(id_sensor_endpoint): id_players_sensor_endpoint}: hay un endpoint
    # por conducta, y LSG asigna un pseid distinto a cada uno.
    players_sensor_endpoints: Mapped[dict] = mapped_column(JSON, default=dict)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    # Opcion A: token JWT del propio usuario. Se acredita/ingesta EN SU NOMBRE
    # (cuentas researcher solo pueden actuar sobre si mismas). Se mantiene vivo
    # con /token/refresh (sliding, 120 min); si muere -> None -> requiere revincular.
    # Cifrado en reposo con las mismas claves que la credencial.
    user_token: Mapped[str | None] = mapped_column(EncryptedToken, nullable=True)
    user_token_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # Reconexion automatica (opt-in explicito). Sin consentimiento estas columnas
    # quedan vacias y el comportamiento es el de siempre: token muerto -> revincular.
    credential_consent: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=false(), nullable=False
    )
    # Contrasena cifrada con Fernet y ligada al eggsys_user_id (app/core/crypto.py).
    credential_enc: Mapped[str | None] = mapped_column(Text, nullable=True)
    credential_updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # invalid_credentials (401 definitivo: la contrasena LSG cambio) | undecryptable
    credential_fail_reason: Mapped[str | None] = mapped_column(String(64), nullable=True)
    credential_failed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # Backoff del re-login automatico, solo para fallos transitorios.
    auto_relogin_attempts: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0", nullable=False
    )
    last_auto_relogin_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # Conexion rota del lado LSG (p. ej. player_not_found). Antes esto se marcaba
    # apagando `enabled`, que es el interruptor del usuario: se pisaban entre si.
    broken_reason: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class LsgEvent(Base):
    """Evento conductual recibido de EggSys, normalizado y con estado de sync."""

    __tablename__ = "lsg_events"
    __table_args__ = (
        UniqueConstraint("eggsys_user_id", "event_type", "period_key", name="uq_event_period"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    client_ref: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    eggsys_user_id: Mapped[str] = mapped_column(String(64), index=True)
    event_type: Mapped[str] = mapped_column(String(64), index=True)
    period_key: Mapped[str] = mapped_column(String(64))
    raw_payload: Mapped[dict] = mapped_column(JSON, default=dict)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    # PENDING | SYNCED | REJECTED | DUPLICATE | ERROR
    status: Mapped[str] = mapped_column(String(16), default="PENDING", index=True)
    reject_reason: Mapped[str | None] = mapped_column(String(128), nullable=True)
    awarded_points: Mapped[int] = mapped_column(Integer, default=0)
    point_dimension_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sensor_event_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    points_ledger_ref: Mapped[str | None] = mapped_column(String(128), nullable=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    last_attempt_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class LsgEventRule(Base):
    """Regla de puntaje por tipo de evento, editable sin redesplegar."""

    __tablename__ = "lsg_event_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_type: Mapped[str] = mapped_column(String(64), unique=True)
    point_dimension_id: Mapped[int] = mapped_column(Integer)
    base_points: Mapped[int] = mapped_column(Integer)
    max_per_day: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_per_week: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_per_month: Mapped[int | None] = mapped_column(Integer, nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)


class LsgSyncLog(Base):
    """Trazabilidad exigida por el estudio: cada intento con request/response."""

    __tablename__ = "lsg_sync_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("lsg_events.id"), index=True)
    attempt: Mapped[int] = mapped_column(Integer)
    step: Mapped[str] = mapped_column(String(16))  # rules | ingest | adjust
    request: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    response: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    http_status: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rule_applied: Mapped[str | None] = mapped_column(String(128), nullable=True)
    reason: Mapped[str | None] = mapped_column(String(256), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class LsgDimensionMapping(Base):
    """Resultado de Fase 0: dimension LSG -> IDs reales, evita hardcodear."""

    __tablename__ = "lsg_dimension_mappings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    dimension_name: Mapped[str] = mapped_column(String(32), unique=True)
    point_dimension_id: Mapped[int] = mapped_column(Integer)
    attribute_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
