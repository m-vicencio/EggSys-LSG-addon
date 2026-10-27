"""Helpers de tiempo. Todo lo que se compare debe ser timezone-aware."""

from datetime import datetime, timezone


def utcnow() -> datetime:
    return datetime.now(tz=timezone.utc)


def as_aware(value: datetime | None) -> datetime | None:
    """Interpreta como UTC un datetime naive.

    LSG-Auth devuelve `expires_at` en ISO, pero no garantiza el offset. Un naive
    colandose hasta una comparacion con `utcnow()` lanza TypeError y tumba la
    ruta entera (p. ej. GET /link), asi que se normaliza al entrar.
    """
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def parse_expires_at(raw: str) -> datetime:
    """`expires_at` de LSG-Auth -> datetime aware."""
    return as_aware(datetime.fromisoformat(raw))
