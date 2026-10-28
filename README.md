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

## Ejecución con Docker

El `docker-compose.yml` de la raíz levanta todo con un solo comando:

- `app` (`eggsys-app`, Next.js): puerto 3001. Aplica las migraciones de Prisma
  al arrancar, antes de abrir el puerto.
- `db` (`eggsys-db`, Postgres 16 de EggSys): puerto 5433 en el host, datos en el
  volumen `eggsys_pgdata`.
- `adapter` y `adapter-db` (adaptador LSG y su Postgres): se incluyen desde
  [eggsys-lsg-adapter/docker-compose.yml](eggsys-lsg-adapter/docker-compose.yml);
  el adaptador publica el puerto 14142 y su base no se publica.

Dentro de Docker la app habla con `db:5432` y `adapter:14142` por nombre de
servicio. La app no depende del adaptador para arrancar: si está caído, EggSys
sigue funcionando y los eventos quedan pendientes en el outbox.

### Requisitos previos

- Docker Engine 24+ con Compose v2.20 o superior (por `include:`); se invoca
  como `docker compose`, no `docker-compose`.
- Puertos 3001, 5433 y 14142 libres en el host. `npm run dev` también usa el 3001:
  hay que detenerlo antes de levantar el contenedor.

### Variables de entorno

Hay tres archivos, ninguno entra en la imagen (`.dockerignore`): el compose los
inyecta al arrancar.

**`.env`** (raíz; lo leen el compose para interpolar y la CLI de Prisma):

- `EGGSYS_DB_PASSWORD`: obligatoria. Contraseña del usuario `eggsys`: con ella se
  inicializa `db` y se arma el `DATABASE_URL` de la app. Sin ella el compose no
  arranca. Postgres solo la aplica al crear el volumen: cambiarla después exige
  cambiarla también dentro de la base.
- `DATABASE_URL`: solo para la CLI de Prisma y `npm run dev` desde el host:
  `postgresql://eggsys:<password>@localhost:5433/eggsys`. Dentro del contenedor
  la sobreescribe el compose.
- `EGGSYS_DB_VOLUME`: opcional. Nombre del volumen de datos de `db` (por defecto
  `eggsys_pgdata`); sirve para reutilizar el volumen de una base creada antes.

**`.env.local`** (raíz):

- `NEXTAUTH_URL`: obligatoria. URL pública con la que se accede a la app (p. ej.
  `http://192.168.1.10:3001` o el dominio detrás de Caddy). Con `localhost`, el
  login desde otro dispositivo redirige a ese dispositivo.
- `NEXTAUTH_SECRET`: obligatoria. Generar con `openssl rand -base64 32`.
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_PORT`: opcionales. Solo para el
  correo de recuperación de contraseña; sin ellas falla ese envío y nada más.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`:
  opcionales. Subida de imágenes de perfil.
- `LSG_ADDON_ENABLED`: `true` para activar el addon LifeSync-Games; ausente o
  `false` lo deja inerte (el adaptador se levanta igual, pero no recibe nada).
- `LSG_INGEST_SECRET`: secreto compartido con el adaptador. Debe coincidir con
  `EGGSYS_INGEST_SECRET` del `.env` del adaptador.
- `LSG_ADAPTER_URL`: no hace falta en Docker, el compose la fija en
  `http://adapter:14142`.

**`eggsys-lsg-adapter/.env`**: obligatorio aunque el addon esté apagado, porque
el compose del adaptador lo carga. Partir de
[eggsys-lsg-adapter/.env.example](eggsys-lsg-adapter/.env.example), que documenta
cada variable; como mínimo, `EGGSYS_INGEST_SECRET` y `LSG_CREDENTIAL_KEYS`.

### Despliegue

1. **Configurar** los tres archivos de la sección anterior:

   ```bash
   cp eggsys-lsg-adapter/.env.example eggsys-lsg-adapter/.env
   # completar .env, .env.local y eggsys-lsg-adapter/.env
   ```

2. **Construir y levantar**. La primera vez crea las bases y aplica las
   migraciones de ambos lados:

   ```bash
   docker compose up -d --build
   docker compose ps                 # db y adapter deben quedar "healthy"
   docker compose logs -f app        # migraciones y luego escuchando en :3001
   curl http://localhost:14142/health
   ```

3. **Datos de ejemplo** (opcional, una sola vez):

   ```bash
   docker compose run --rm app npm run seed
   ```

4. **Provisión del sensor LSG** (solo con `LSG_ADDON_ENABLED=true`): descubrir
   los IDs reales con `scripts/provision_sensor.py`, completar
   `EGGSYS_SENSOR_ID`, `EGGSYS_SENSOR_ENDPOINT_ID` y `POINT_DIMENSION_*` en el
   `.env` del adaptador y reiniciarlo. Detalle en
   [eggsys-lsg-adapter/README.md](eggsys-lsg-adapter/README.md).

   ```bash
   docker compose exec adapter uv run python scripts/provision_sensor.py <email> <password>
   docker compose up -d adapter
   ```

Para actualizar tras un `git pull`: `docker compose up -d --build`. Recrea los
contenedores cuya imagen cambió y aplica las migraciones nuevas al arrancar.

Para detener todo: `docker compose down`. Los datos sobreviven en los volúmenes;
`docker compose down -v` los borra.
