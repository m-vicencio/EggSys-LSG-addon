"""Cifrado en reposo de los secretos LSG: credencial guardada y token de sesion.

LSG-Auth no emite refresh token durable: /token/refresh exige el Bearer aun
vivo, asi que un token muerto solo se recupera con un login nuevo. Para que esa
reconexion ocurra sin el usuario delante hay que conservar su contrasena, y
conservarla obliga a cifrarla de forma reversible. El token de sesion tambien
se cifra: mientras vive, permite actuar en LSG en nombre del usuario.

Se usa MultiFernet (AES-128-CBC + HMAC-SHA256, cifrado autenticado) con las
claves de LSG_CREDENTIAL_KEYS, la mas nueva primero: cifra con la primera y
descifra con cualquiera, que es toda la historia de rotacion. Sin esa lista no
se guarda ningun secreto: ni credencial ni token, y por tanto no hay vinculo.
"""

import json
import logging
import secrets
from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken, MultiFernet

from app.core.config import settings

logger = logging.getLogger(__name__)

_ENVELOPE_VERSION = 1


class CredentialCryptoError(RuntimeError):
    """La credencial guardada no se pudo descifrar o no pertenece a este usuario."""


@lru_cache(maxsize=1)
def _fernet() -> MultiFernet | None:
    """MultiFernet con las claves configuradas, o None si no hay ninguna.

    Cacheado para que importar el modulo nunca reviente sin claves; los tests
    hacen _fernet.cache_clear() tras parchear settings.
    """
    raw = settings.lsg_credential_keys.strip()
    if not raw:
        return None
    keys = [k.strip() for k in raw.split(",") if k.strip()]
    try:
        return MultiFernet([Fernet(k) for k in keys])
    except (ValueError, TypeError) as exc:
        # Nunca incluir la clave en el mensaje: acaba en logs.
        raise ValueError(
            f"LSG_CREDENTIAL_KEYS invalida ({type(exc).__name__}): se esperan "
            "claves Fernet urlsafe-base64 de 32 bytes separadas por comas"
        ) from None


def crypto_available() -> bool:
    """True si hay clave configurada y por tanto se pueden guardar credenciales."""
    return _fernet() is not None


def encrypt_credential(uid: str, secret: str) -> str:
    """Cifra `secret` ligandolo a `uid`.

    Fernet no tiene AAD, asi que el uid viaja dentro del texto cifrado: el HMAC
    lo cubre, de modo que nadie puede alterarlo sin la clave, y mover el blob
    entero a otra fila se detecta al descifrar.
    """
    fernet = _fernet()
    if fernet is None:
        raise CredentialCryptoError("no hay LSG_CREDENTIAL_KEYS configurada")
    envelope = json.dumps(
        {"v": _ENVELOPE_VERSION, "uid": uid, "pw": secret}, separators=(",", ":")
    )
    return fernet.encrypt(envelope.encode()).decode()


def decrypt_credential(uid: str, blob: str) -> str:
    """Descifra la credencial de `uid`.

    Raises:
        CredentialCryptoError: sin clave, clave equivocada, blob manipulado o
            perteneciente a otro usuario. El caller trata todos esos casos como
            "credencial inservible" y nunca intenta un login con basura.
    """
    fernet = _fernet()
    if fernet is None:
        raise CredentialCryptoError("no hay LSG_CREDENTIAL_KEYS configurada")
    try:
        envelope = json.loads(fernet.decrypt(blob.encode()).decode())
    except (InvalidToken, ValueError, UnicodeDecodeError) as exc:
        raise CredentialCryptoError(f"credencial ilegible ({type(exc).__name__})") from None
    if envelope.get("v") != _ENVELOPE_VERSION:
        raise CredentialCryptoError(f"version de sobre desconocida: {envelope.get('v')!r}")
    stored_uid = envelope.get("uid", "")
    if not secrets.compare_digest(stored_uid, uid):
        raise CredentialCryptoError("la credencial pertenece a otro usuario")
    return envelope["pw"]


def encrypt_token(token: str) -> str:
    """Cifra el token de sesion LSG para guardarlo.

    Sin sobre ni uid, a diferencia de la credencial: lo usa la columna
    `user_token` (models.EncryptedToken), que no ve la fila. El token vive 120
    min, asi que mover un blob entre filas da poco y exige escribir en la BD.

    Raises:
        CredentialCryptoError: no hay clave configurada.
    """
    fernet = _fernet()
    if fernet is None:
        raise CredentialCryptoError("no hay LSG_CREDENTIAL_KEYS configurada")
    return fernet.encrypt(token.encode()).decode()


def decrypt_token(blob: str) -> str | None:
    """Token en claro, o None si no se puede leer.

    None cubre sin clave, clave retirada de la lista y los tokens guardados en
    claro antes de cifrarlos. Para token.py es lo mismo que un token muerto.
    """
    fernet = _fernet()
    if fernet is None:
        return None
    try:
        return fernet.decrypt(blob.encode()).decode()
    except (InvalidToken, UnicodeDecodeError):
        return None
