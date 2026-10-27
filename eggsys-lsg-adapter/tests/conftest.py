"""Fixtures compartidas: base de datos sqlite en memoria por test."""

import pytest
import pytest_asyncio
from cryptography.fernet import Fernet
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core import crypto
from app.core.config import Settings, settings
from app.models import Base


@pytest.fixture(autouse=True)
def isolate_settings(monkeypatch):
    """Aisla los tests del .env del desarrollador.

    `Settings` lee .env, asi que un CAP_DAILY=200 o una cuenta de servicio
    configurada en la maquina cambiaban el resultado de los tests (y hacian que
    sync intentara un login real contra LSG). Los valores vuelven a los defaults
    declarados en la clase; un test que necesite otra cosa hace su propio
    monkeypatch encima.

    La unica excepcion es la clave Fernet: sin ella no se puede escribir un
    user_token, asi que cada test arranca con una propia.
    """
    defaults = Settings.model_construct()
    for field in Settings.model_fields:
        monkeypatch.setattr(settings, field, getattr(defaults, field))
    monkeypatch.setattr(settings, "lsg_credential_keys", Fernet.generate_key().decode())
    crypto._fernet.cache_clear()
    yield
    crypto._fernet.cache_clear()


@pytest_asyncio.fixture
async def db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session
    await engine.dispose()
