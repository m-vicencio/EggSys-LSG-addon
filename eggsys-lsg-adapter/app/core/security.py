"""Autenticacion maquina a maquina: Bearer con secreto compartido EggSys."""

import secrets

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import settings

_security = HTTPBearer()


async def verify_ingest_secret(
    credentials: HTTPAuthorizationCredentials = Depends(_security),
) -> None:
    """Valida que el Bearer coincida con EGGSYS_INGEST_SECRET.

    Raises:
        HTTPException 401: Secreto ausente o incorrecto.
        HTTPException 503: Secreto no configurado en el adaptador.
    """
    if not settings.eggsys_ingest_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "SECRET_NOT_CONFIGURED", "message": "EGGSYS_INGEST_SECRET no configurado"},
        )
    if not secrets.compare_digest(credentials.credentials, settings.eggsys_ingest_secret):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_SECRET", "message": "Secreto de ingesta invalido"},
        )
