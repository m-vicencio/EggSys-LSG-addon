"""Ciclo de vida del token LSG de cada usuario, en un solo sitio.

Antes habia dos caminos que decidian por su cuenta si un token servia
(`sync.ensure_user_token` y `retry_worker.refresh_user_tokens`) y discrepaban.
Aqui viven la escalera unica y el re-login automatico.

La escalera, de barato a caro:
  1. Token sano (>5 min de vida)      -> usar tal cual.
  2. Por expirar pero vivo            -> POST /token/refresh (deslizar).
  3. Muerto + consentimiento          -> POST /login con la credencial cifrada.
  4. Nada de lo anterior              -> None, la UI pide revincular.

LSG no emite refresh token durable, asi que el paso 3 es la unica forma de
sobrevivir a un apagon mas largo que la vida del token (120 min), el caso
normal en un portatil que se suspende.
"""

import asyncio
import logging
from collections import defaultdict

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.clients.lsg_auth import lsg_auth_client
from app.core import crypto
from app.core.timeutil import as_aware, parse_expires_at, utcnow
from app.models import LsgConnection

logger = logging.getLogger(__name__)

# Margen bajo el cual se considera que el token no aguanta la operacion en curso.
_REFRESH_MARGIN_S = 300
# Backoff del re-login solo para fallos transitorios (red, 5xx).
_BACKOFF_BASE_S = 60
_BACKOFF_MAX_S = 3600

# Lock por usuario en memoria; cierra la carrera entre el job del
# scheduler y una peticion en vuelo. Basta con un worker de uvicorn (el que
# corre el compose); con varios haria falta SELECT ... FOR UPDATE.
_locks: dict[str, asyncio.Lock] = defaultdict(asyncio.Lock)


def _backoff_seconds(attempts: int) -> int:
    return min(_BACKOFF_BASE_S * (2 ** max(0, attempts - 1)), _BACKOFF_MAX_S)


def _store_token(connection: LsgConnection, login_result: dict) -> str:
    """Guarda el token recien emitido y devuelve su valor."""
    connection.user_token = login_result["access_token"]
    connection.user_token_expires_at = parse_expires_at(login_result["expires_at"])
    return connection.user_token


def _clear_credential(connection: LsgConnection, reason: str) -> None:
    """Descarta la credencial guardada por inservible."""
    connection.credential_enc = None
    connection.credential_fail_reason = reason
    connection.credential_failed_at = utcnow()


def credential_state(connection: LsgConnection) -> str:
    """Estado de la credencial para la UI: NONE | ACTIVE | INVALID | UNREADABLE."""
    if connection.credential_fail_reason == "invalid_credentials":
        return "INVALID"
    if connection.credential_fail_reason == "undecryptable":
        return "UNREADABLE"
    if connection.credential_consent and connection.credential_enc:
        return "ACTIVE"
    return "NONE"


def can_auto_recover(connection: LsgConnection) -> bool:
    """True si un token muerto se puede recuperar sin el usuario delante."""
    return bool(
        connection.credential_consent
        and connection.credential_enc
        and connection.credential_fail_reason is None
    )


def connection_status(connection: LsgConnection) -> dict:
    """Estado del vinculo. Puro: sin red y sin tocar la BD (lo usa GET /link)."""
    exp = as_aware(connection.user_token_expires_at)
    token_dead = connection.user_token is None or exp is None or exp <= utcnow()
    return {
        # Solo se pide revincular si ademas NO hay forma de recuperarse solo; si
        # no, la UI mostraria "sesion expirada" cada manana sin motivo.
        "needs_relink": token_dead and not can_auto_recover(connection),
        "session_expired": token_dead,
        "credential_consent": connection.credential_consent,
        "credential_state": credential_state(connection),
        "broken_reason": connection.broken_reason,
    }


async def _auto_relogin(connection: LsgConnection, db: AsyncSession) -> str | None:
    """Re-login con la credencial guardada. None si no se puede o no procede.

    Contencion: un 400/401/403 significa que la contrasena LSG cambio, asi que la
    credencial se borra y NO se reintenta nunca. Eso acota a un unico login
    fallido por credencial: sin bucles contra LSG-Auth y sin aspecto de fuerza
    bruta. El backoff solo cubre fallos transitorios.
    """
    if not connection.credential_consent or connection.credential_enc is None:
        return None
    if connection.credential_fail_reason is not None:
        return None  # ya sabemos que no sirve

    if not crypto.crypto_available():
        # Clave ausente: la credencial puede seguir siendo buena, NO se borra.
        logger.error(
            "LSG_CREDENTIAL_KEYS no configurada: reconexion automatica desactivada "
            "para %s (la credencial guardada se conserva intacta)",
            connection.eggsys_user_id,
        )
        return None

    last = as_aware(connection.last_auto_relogin_at)
    if last is not None:
        wait_s = _backoff_seconds(connection.auto_relogin_attempts)
        if (utcnow() - last).total_seconds() < wait_s:
            return None

    try:
        password = crypto.decrypt_credential(
            connection.eggsys_user_id, connection.credential_enc
        )
    except crypto.CredentialCryptoError as exc:
        logger.error(
            "Credencial de %s ilegible (%s): se descarta",
            connection.eggsys_user_id, exc,
        )
        _clear_credential(connection, "undecryptable")
        await db.commit()
        return None

    # Persistir el intento ANTES de la llamada: si el proceso muere o el portatil
    # se suspende a mitad del login, el contador no se reinicia en bucle.
    connection.last_auto_relogin_at = utcnow()
    connection.auto_relogin_attempts += 1
    await db.commit()

    try:
        login_result = await lsg_auth_client.login(connection.lsg_email, password)
    except httpx.HTTPStatusError as exc:
        status = exc.response.status_code
        if status in (400, 401, 403):
            # Definitivo: la contrasena cambio. Borrar y no reintentar jamas.
            logger.warning(
                "Re-login automatico rechazado (%s) para %s: se descarta la "
                "credencial y no se reintentara",
                status, connection.eggsys_user_id,
            )
            _clear_credential(connection, "invalid_credentials")
            await db.commit()
            return None
        logger.warning(
            "Re-login automatico fallo (%s) para %s, reintento con backoff",
            status, connection.eggsys_user_id,
        )
        return None
    except httpx.RequestError as exc:
        logger.warning(
            "Re-login automatico sin red (%s) para %s, reintento con backoff",
            type(exc).__name__, connection.eggsys_user_id,
        )
        return None

    token = _store_token(connection, login_result)
    connection.auto_relogin_attempts = 0
    connection.credential_fail_reason = None
    connection.credential_failed_at = None
    await db.commit()
    logger.info("Sesion LSG recuperada automaticamente para %s", connection.eggsys_user_id)
    return token


async def _resolve(connection: LsgConnection, db: AsyncSession) -> str | None:
    """La escalera propiamente dicha (ya bajo el lock del usuario)."""
    exp = as_aware(connection.user_token_expires_at)
    now = utcnow()

    if connection.user_token is not None and exp is not None:
        if (exp - now).total_seconds() >= _REFRESH_MARGIN_S:
            return connection.user_token

        if exp > now:
            # Aun vivo: deslizarlo es mas barato que un login completo.
            try:
                result = await lsg_auth_client.refresh_user_token(connection.user_token)
                token = _store_token(connection, result)
                await db.commit()
                return token
            except httpx.RequestError:
                # LSG inalcanzable: el token sigue siendo valido, no lo tiremos.
                # Un login fallaria por la misma razon, asi que ni se intenta.
                return connection.user_token
            except httpx.HTTPStatusError:
                pass  # LSG dice que no sirve: al re-login

    token = await _auto_relogin(connection, db)
    if token is not None:
        return token

    if connection.user_token is not None:
        connection.user_token = None
        await db.commit()
    return None


async def get_usable_token(connection: LsgConnection, db: AsyncSession) -> str | None:
    """Token listo para usar, o None si hace falta revincular a mano.

    Nunca lanza por errores de LSG: el caller trata None como "no se puede
    sincronizar todavia".
    """
    async with _locks[connection.eggsys_user_id]:
        return await _resolve(connection, db)
