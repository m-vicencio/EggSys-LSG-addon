"""Esquemas Pydantic del adaptador EggSys-LSG."""

from datetime import datetime

from pydantic import BaseModel, Field, SecretStr


class LinkRequest(BaseModel):
    """Solicitud de vinculo.

    La contrasena se usa siempre para el login inicial. Solo se persiste (cifrada)
    si el usuario marca store_credential; sin esa marca se descarta como antes.

    password es SecretStr a proposito: Pydantic devuelve el valor ofensor en el
    cuerpo de un 422, asi que un str plano filtraria la contrasena en claro.
    """

    eggsys_user_id: str = Field(min_length=1, max_length=64)
    email: str = Field(min_length=3, max_length=255)
    password: SecretStr = Field(min_length=1, max_length=255)
    # Opt-in explicito a guardar la contrasena cifrada para reconectar solo.
    # Default False: un EggSys que no mande el campo se comporta como antes.
    store_credential: bool = False


class LinkResponse(BaseModel):
    id_players: int
    lsg_email: str
    enabled: bool
    # Token muerto Y sin forma de recuperarse solo: hay que pedir la contrasena.
    needs_relink: bool = False
    # Token muerto, se recupere solo o no (para un estado "reconectando").
    session_expired: bool = False
    credential_consent: bool = False
    # NONE | ACTIVE | INVALID | UNREADABLE
    credential_state: str = "NONE"
    # Rotura del lado LSG (p. ej. player_not_found); distinto del kill switch.
    broken_reason: str | None = None


class EventIn(BaseModel):
    """Evento conductual emitido por EggSys. Sin montos, sin texto libre."""

    client_ref: str = Field(min_length=36, max_length=36)
    eggsys_user_id: str = Field(min_length=1, max_length=64)
    event_type: str = Field(min_length=1, max_length=64)
    period_key: str = Field(min_length=1, max_length=64)
    occurred_at: datetime
    payload: dict = Field(default_factory=dict)


class EventBatch(BaseModel):
    events: list[EventIn] = Field(min_length=1, max_length=100)


class EventResult(BaseModel):
    client_ref: str
    status: str  # SYNCED | REJECTED | DUPLICATE | ERROR | PENDING
    reason: str | None = None
    awarded_points: int = 0
    point_dimension_id: int | None = None
    dimension: str | None = None


class RulePatch(BaseModel):
    point_dimension_id: int | None = None
    base_points: int | None = None
    max_per_day: int | None = None
    max_per_week: int | None = None
    max_per_month: int | None = None
    enabled: bool | None = None
