"""Punto de entrada principal del adaptador EggSys-LSG."""

from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.routes import admin, events, health, link
from app.core.logging import setup_logging

setup_logging()


@asynccontextmanager
async def lifespan(application: FastAPI):
    """Siembra reglas v1 e inicia el scheduler de reintentos.

    El esquema NO se crea aqui: lo gobierna Alembic (`alembic upgrade head` en el
    command del compose). `create_all` creaba tablas faltantes pero nunca anadia
    columnas a una tabla existente, asi que una columna nueva no llegaba jamas a
    una BD ya creada. Un solo dueno del DDL.
    """
    from app.db.session import AsyncSessionLocal
    from app.services.rules import seed_default_rules

    async with AsyncSessionLocal() as db:
        await seed_default_rules(db)

    from app.services.retry_worker import register_jobs, scheduler
    register_jobs()
    scheduler.start()
    yield
    scheduler.shutdown()


app = FastAPI(
    title="EggSys LSG Adapter",
    description=(
        "Adaptador sensor de EggSys para la plataforma LifeSync-Games. "
        "Recibe eventos conductuales de autorregulacion financiera (sin montos), "
        "aplica reglas de puntaje anti-farmeo y sincroniza con LSG-Core."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(health.router)
app.include_router(link.router)
app.include_router(events.router)
app.include_router(admin.router)
