# EggSys


    src/
    ├── app/                  # CAPA DE PRESENTACIÓN (FRONTEND + RUTAS)
    │   ├── (auth)/           # Grupos de rutas (login, register)
    │   ├── (dashboard)/      # Rutas protegidas
    │   └── api/              # CAPA DE API (BACKEND - Rutas tradicionales)
    │
    ├── components/           # UI ATÓMICA
    │   ├── ui/               # Componentes básicos (Button, Input de Shadcn)
    │   └── shared/           # Componentes complejos (Navbar, Sidebar)
    │
    ├── lib/                  # CONFIGURACIÓN DE NÚCLEO
    │   └── prisma.ts         # Instancia global de Prisma Client (Singleton)
    │
    ├── services/             # CAPA DE ACCESO A DATOS (BACKEND LOGIC)
    │   ├── user-service.ts   # Consultas directas a DB con Prisma
    │   └── expense-service.ts
    │
    ├── actions/              # SERVER ACTIONS (EL "NUEVO" BACKEND)
    │   ├── user-actions.ts   # Funciones 'use server' que llaman a services
    │   └── auth-actions.ts
    │
    ├── hooks/                # LÓGICA DE CLIENTE (STATE/FETCHING)
    ├── types/                # INTERFACES Y SCHEMAS
    prisma/               # CONFIGURACIÓN DE BASE DE DATOS
        └── schema.prisma     # Modelo de datos
    |
    public
        └──

## Addon LifeSync-Games

EggSys detecta conductas financieras y el adaptador las puntúa y sincroniza con
LSG-Core. Con `LSG_ADDON_ENABLED` ausente o en `false`, el addon queda inerte.
Diseño completo en [docs/lsg-addon.md](docs/lsg-addon.md).

    src/                                  # LADO EGGSYS (DETECTA, NO PUNTÚA)
    ├── app/
    │   ├── (dashboard)/lifesync/         # Ruta /lifesync
    │   └── api/lsg/                      # API del addon
    │       ├── connection/               # Vincular, estado, desvincular
    │       │   └── credential/           # Revocar la contraseña guardada
    │       ├── config/                   # Interruptores por tipo de evento
    │       └── events/                   # Historial del outbox
    ├── lib/api/lsg.ts                    # Cliente tipado (lsgApi)
    ├── services/
    │   ├── lsg-emit.service.ts           # Detectores de conducta → LsgEventOutbox
    │   └── lsg.service.ts                # Comunicación con el adaptador
    └── views/core/lifesync/              # Pantalla: conexión, configuración, historial

    prisma/migrations/                    # Tablas LsgConnection y LsgEventOutbox
    ├── 20260720000000_add_lsg_addon/
    ├── 20260728200048_lsg_credential_consent/
    └── 20260821024220_lsg_event_points_dimension/

    eggsys-lsg-adapter/                   # ADAPTADOR (FastAPI :14142, Postgres propio)
    ├── app/
    │   ├── api/routes/                   # link, events, admin (reglas), health
    │   ├── clients/                      # LSG-Auth, LSG-Core, cuenta de servicio
    │   ├── core/                         # Config, cifrado Fernet, secreto compartido
    │   ├── models/                       # Modelos SQLAlchemy
    │   └── services/
    │       ├── rules.py                  # Pesos y topes anti-farmeo
    │       ├── sync.py                   # Ingest (auditoría) → adjust (puntos)
    │       ├── token.py                  # Ciclo de vida del token LSG
    │       └── retry_worker.py           # Reintentos y mantenimiento de sesiones
    ├── alembic/versions/                 # Migraciones del esquema del adaptador
    ├── scripts/provision_sensor.py       # Fase 0: descubre los IDs reales de LSG
    ├── tests/                            # pytest + respx
    └── docker-compose.yml

    docs/
    ├── lsg-addon.md                      # Diseño, prototipos, requisitos y trazabilidad
    ├── lsg-sensor-endpoints.md           # Granularidad de endpoints en LSG-Core
    └── diagrams/                         # Diagramas de componentes (Excalidraw + PNG)

    scripts/perf-lsg.ts                   # Benchmark de /api/transactions con el addon OFF/ON

Puntos de contacto con el núcleo:

- `src/services/transaction.service.ts` y `src/services/pet.service.ts`: los dos
  enganches que emiten eventos, con importación dinámica y `.catch(() => {})`.
- `src/app/api/users/delete-account/route.ts`: borra el vínculo en el adaptador
  antes de borrar la cuenta.
- `src/views/core/configuration/components/account.tsx`: tarjeta "Conexiones"
  que lleva a `/lifesync` desde móvil.
- `src/lib/openapi.ts`: documentación de las rutas `/api/lsg`.
- `Dockerfile` y `docker-compose.yml`: imagen de EggSys en el puerto 3001.

Puesta en marcha del adaptador en
[eggsys-lsg-adapter/README.md](eggsys-lsg-adapter/README.md).
