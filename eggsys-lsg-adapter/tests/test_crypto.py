"""Cifrado de credenciales: roundtrip, binding al usuario y rotacion de claves."""

import pytest
from cryptography.fernet import Fernet

from app.core import crypto
from app.core.config import settings

KEY_A = Fernet.generate_key().decode()
KEY_B = Fernet.generate_key().decode()

PASSWORD = "contrasena-de-prueba"


@pytest.fixture
def with_key(monkeypatch):
    """Configura una clave y limpia el cache de _fernet antes y despues."""
    monkeypatch.setattr(settings, "lsg_credential_keys", KEY_A)
    crypto._fernet.cache_clear()
    yield
    crypto._fernet.cache_clear()


def test_roundtrip(with_key):
    blob = crypto.encrypt_credential("usr1", PASSWORD)
    assert crypto.decrypt_credential("usr1", blob) == PASSWORD


def test_ciphertext_does_not_contain_plaintext(with_key):
    blob = crypto.encrypt_credential("usr1", PASSWORD)
    assert PASSWORD not in blob


def test_blob_from_another_user_is_rejected(with_key):
    """El binding al uid: un blob movido de fila no se acepta."""
    blob = crypto.encrypt_credential("usr1", PASSWORD)
    with pytest.raises(crypto.CredentialCryptoError):
        crypto.decrypt_credential("usr2", blob)


def test_wrong_key_raises(with_key, monkeypatch):
    blob = crypto.encrypt_credential("usr1", PASSWORD)
    monkeypatch.setattr(settings, "lsg_credential_keys", KEY_B)
    crypto._fernet.cache_clear()
    with pytest.raises(crypto.CredentialCryptoError):
        crypto.decrypt_credential("usr1", blob)


def test_tampered_blob_raises(with_key):
    blob = crypto.encrypt_credential("usr1", PASSWORD)
    tampered = blob[:-4] + ("AAAA" if not blob.endswith("AAAA") else "BBBB")
    with pytest.raises(crypto.CredentialCryptoError):
        crypto.decrypt_credential("usr1", tampered)


def test_multifernet_rotation(with_key, monkeypatch):
    """Anteponer una clave nueva sigue descifrando lo cifrado con la vieja."""
    old_blob = crypto.encrypt_credential("usr1", PASSWORD)

    monkeypatch.setattr(settings, "lsg_credential_keys", f"{KEY_B},{KEY_A}")
    crypto._fernet.cache_clear()

    assert crypto.decrypt_credential("usr1", old_blob) == PASSWORD
    # Lo nuevo se cifra con la primera clave: ya no depende de la vieja.
    new_blob = crypto.encrypt_credential("usr1", PASSWORD)
    monkeypatch.setattr(settings, "lsg_credential_keys", KEY_B)
    crypto._fernet.cache_clear()
    assert crypto.decrypt_credential("usr1", new_blob) == PASSWORD


def test_unavailable_when_no_keys(monkeypatch):
    monkeypatch.setattr(settings, "lsg_credential_keys", "")
    crypto._fernet.cache_clear()
    assert crypto.crypto_available() is False
    with pytest.raises(crypto.CredentialCryptoError):
        crypto.encrypt_credential("usr1", PASSWORD)
    with pytest.raises(crypto.CredentialCryptoError):
        crypto.decrypt_credential("usr1", "loquesea")
    crypto._fernet.cache_clear()


def test_available_with_key(with_key):
    assert crypto.crypto_available() is True


def test_invalid_key_raises_without_leaking_it(monkeypatch):
    monkeypatch.setattr(settings, "lsg_credential_keys", "esto-no-es-una-clave-fernet")
    crypto._fernet.cache_clear()
    with pytest.raises(ValueError) as excinfo:
        crypto.crypto_available()
    assert "esto-no-es-una-clave-fernet" not in str(excinfo.value)
    crypto._fernet.cache_clear()


# ─── Token de sesion ──────────────────────────────────────────────────────────


def test_token_roundtrip(with_key):
    blob = crypto.encrypt_token("eyJhbGciOi.token.firma")
    assert "eyJhbGciOi" not in blob
    assert crypto.decrypt_token(blob) == "eyJhbGciOi.token.firma"


def test_plaintext_token_from_before_reads_as_none(with_key):
    """Un JWT guardado en claro antes del cifrado se trata como token muerto."""
    assert crypto.decrypt_token("eyJhbGciOi.token.firma") is None


def test_token_without_key_cannot_be_stored_and_reads_as_none(with_key, monkeypatch):
    blob = crypto.encrypt_token("tok")
    monkeypatch.setattr(settings, "lsg_credential_keys", "")
    crypto._fernet.cache_clear()
    with pytest.raises(crypto.CredentialCryptoError):
        crypto.encrypt_token("tok")
    assert crypto.decrypt_token(blob) is None
