"""Vinculacion usuario EggSys <-> jugador LSG.

La contrasena LSG se usa siempre para el login inicial. Se descarta despues,
SALVO que el usuario active la reconexion automatica (`store_credential`): en
ese caso se guarda cifrada (app/core/crypto.py) para poder re-loguear cuando el
token muera, porque LSG no emite refresh token durable.

El access_token resultante siempre se guarda, cifrado (models.EncryptedToken): el
adaptador ingesta en nombre del propio usuario y lo mantiene vivo con
/token/refresh. Sin LSG_CREDENTIAL_KEYS no hay donde guardarlo y /link falla.
"""

import logging

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.clients.lsg_auth import lsg_auth_client
from app.clients.lsg_core import lsg_core_client
from app.core.crypto import crypto_available, encrypt_credential
from app.core.security import verify_ingest_secret
from app.core.timeutil import parse_expires_at, utcnow
from app.db.session import get_db
from app.models import LsgConnection
from app.schemas import LinkRequest, LinkResponse
from app.services.token import connection_status

logger = logging.getLogger(__name__)
router = APIRouter(tags=["link"], dependencies=[Depends(verify_ingest_secret)])


@router.post("/link", response_model=LinkResponse)
async def link_user(
    body: LinkRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Vincula un usuario EggSys con su jugador LSG via login + whoami."""
    # Antes de gastar un login: si el usuario pidio guardar la credencial y no hay
    # clave, fallar. Degradar en silencio descartaria su consentimiento sin avisar.
    if body.store_credential and not crypto_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "CREDENTIAL_STORAGE_UNAVAILABLE",
                "message": "El adaptador no tiene configurado el cifrado de credenciales",
            },
        )
    # El token de sesion siempre se guarda, y solo se guarda cifrado.
    if not crypto_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "TOKEN_STORAGE_UNAVAILABLE",
                "message": "El adaptador no tiene configurado el cifrado del token de sesion",
            },
        )
    try:
        login_result = await lsg_auth_client.login(
            body.email, body.password.get_secret_value()
        )
        profile = await lsg_auth_client.whoami(login_result["access_token"])
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code in (400, 401, 403):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"code": "INVALID_LSG_CREDENTIALS", "message": "Credenciales LSG invalidas"},
            )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"code": "LSG_AUTH_ERROR", "message": "Error consultando LSG-Auth"},
        )
    except httpx.RequestError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "LSG_AUTH_UNAVAILABLE", "message": "LSG-Auth no disponible"},
        )

    id_players: int = profile["id_players"]
    user_token: str = login_result["access_token"]
    token_expires_at = parse_expires_at(login_result["expires_at"])

    existing = (await db.execute(
        select(LsgConnection).where(LsgConnection.eggsys_user_id == body.eggsys_user_id)
    )).scalar_one_or_none()

    if existing:
        existing.id_players = id_players
        existing.lsg_email = body.email
        existing.enabled = True
        existing.players_sensor_endpoints = {}  # re-resolver en el proximo sync
        existing.user_token = user_token
        existing.user_token_expires_at = token_expires_at
        existing.broken_reason = None  # un relink es la unica forma de limpiarlo
        connection = existing
    else:
        connection = LsgConnection(
            eggsys_user_id=body.eggsys_user_id,
            id_players=id_players,
            lsg_email=body.email,
            enabled=True,
            user_token=user_token,
            user_token_expires_at=token_expires_at,
        )
        db.add(connection)

    if body.store_credential:
        connection.credential_enc = encrypt_credential(
            body.eggsys_user_id, body.password.get_secret_value()
        )
        connection.credential_consent = True
        connection.credential_updated_at = utcnow()
    else:
        # Revincular sin marcar la casilla revoca: si no, el consentimiento
        # sobreviviria a un relink donde el usuario la desmarco a proposito.
        connection.credential_enc = None
        connection.credential_consent = False
        connection.credential_updated_at = None
    connection.credential_fail_reason = None
    connection.credential_failed_at = None
    connection.auto_relogin_attempts = 0
    connection.last_auto_relogin_at = None
    await db.commit()

    background_tasks.add_task(lsg_core_client.ensure_sensor_linked, id_players, user_token)
    logger.info(
        "Usuario %s vinculado a jugador LSG %s (reconexion automatica: %s)",
        body.eggsys_user_id, id_players, "si" if body.store_credential else "no",
    )

    return LinkResponse(
        id_players=id_players,
        lsg_email=body.email,
        enabled=True,
        **connection_status(connection),
    )


@router.get("/link/{eggsys_user_id}", response_model=LinkResponse)
async def get_link(eggsys_user_id: str, db: AsyncSession = Depends(get_db)):
    """Estado del vinculo de un usuario EggSys."""
    connection = (await db.execute(
        select(LsgConnection).where(LsgConnection.eggsys_user_id == eggsys_user_id)
    )).scalar_one_or_none()
    if connection is None:
        raise HTTPException(status_code=404, detail={"code": "NOT_LINKED"})
    return LinkResponse(
        id_players=connection.id_players,
        lsg_email=connection.lsg_email,
        enabled=connection.enabled,
        **connection_status(connection),
    )


@router.delete("/link/{eggsys_user_id}/credential", status_code=204)
async def revoke_credential(eggsys_user_id: str, db: AsyncSession = Depends(get_db)):
    """Deja de guardar la contrasena, sin desvincular.

    El token vivo se conserva a proposito: la sincronizacion sigue funcionando
    hasta que expire por su cuenta, y a partir de ahi hara falta revincular.
    """
    connection = (await db.execute(
        select(LsgConnection).where(LsgConnection.eggsys_user_id == eggsys_user_id)
    )).scalar_one_or_none()
    if connection is None:
        raise HTTPException(status_code=404, detail={"code": "NOT_LINKED"})
    connection.credential_enc = None
    connection.credential_consent = False
    connection.credential_updated_at = None
    connection.credential_fail_reason = None
    connection.credential_failed_at = None
    connection.auto_relogin_attempts = 0
    connection.last_auto_relogin_at = None
    await db.commit()
    logger.info("Credencial guardada de %s revocada", eggsys_user_id)


@router.delete("/link/{eggsys_user_id}", status_code=204)
async def unlink_user(eggsys_user_id: str, db: AsyncSession = Depends(get_db)):
    """Desvincula al usuario. El historial de eventos se conserva para el estudio."""
    connection = (await db.execute(
        select(LsgConnection).where(LsgConnection.eggsys_user_id == eggsys_user_id)
    )).scalar_one_or_none()
    if connection is not None:
        await db.delete(connection)
        await db.commit()
