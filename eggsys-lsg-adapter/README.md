# eggsys-lsg-adapter

Adaptador sensor de EggSys para la plataforma **LifeSync-Games** (puerto 14142).
Recibe eventos conductuales de autorregulación financiera desde EggSys (sin
montos), aplica reglas de puntaje anti-farmeo y sincroniza con LSG-Core vía
`POST /sensors/ingest/webhook` + `POST /players/{id}/points/adjust`.

EggSys nunca habla con LSG directamente ni calcula puntos: solo **detecta**
conductas; el adaptador **puntúa** (reglas editables en `lsg_event_rules`).

## Autenticación

El **ingest** (`POST /sensors/ingest/webhook`) va siempre con el **token del
propio usuario**: es `player`-self y LSG-Core asigna los puntos desde ahí. Esa
frontera no se cruza. El **adjust** sí usa la cuenta de servicio
(`LSG_SERVICE_*`, rol admin/cross-player) cuando está configurada, con fallback
al token del usuario; en producción el `adjust` desaparece; solo se usa en
pruebas, donde las cuentas son `researcher` y `adjust` exige ese rol.

### Reconexión automática

LSG-Auth **no emite refresh token durable**: `/token/refresh` exige el Bearer
todavía vivo. Si el adaptador está caído más que la vida del token (120 min),
éste muere y no queda con qué recuperarlo.

Para que la reconexión ocurra sin el usuario delante, éste puede **optar
explícitamente** por que su contraseña LSG se guarde **cifrada** (Fernet,
`LSG_CREDENTIAL_KEYS`) y el adaptador re-loguee solo. Es opt-in, está desmarcado
por defecto, y sin marcarlo el comportamiento es idéntico al de antes. Se revoca
sin desvincular desde `/lifesync`.

Salvaguardas: la contraseña se liga al `eggsys_user_id` dentro del texto cifrado
(un blob movido de fila se rechaza); un `401` al re-loguear se trata como
definitivo: se borra la credencial y **no se reintenta nunca**, así que jamás
hay más de un login fallido por credencial; y si falta la clave, lo guardado
**no** se borra: solo se desactiva la reconexión hasta reponerla.

El token de sesión (`user_token`) también se guarda cifrado con esas claves
(`app/models::EncryptedToken`), haya consentimiento o no. Por eso
`LSG_CREDENTIAL_KEYS` es **obligatoria**: sin ella `/link` responde 503
(`TOKEN_STORAGE_UNAVAILABLE`) y no se vincula a nadie. Un token ilegible (sin
clave, clave retirada o guardado en claro antes de cifrar) se trata como muerto.

El ciclo de vida del token (deslizar / re-loguear / rendirse) está centralizado
en `app/services/token.py::get_usable_token`; no se duplica en `sync.py` ni en el
worker. Dos jobs lo sostienen (`app/services/retry_worker.py::register_jobs`):
`retry_failed_events` cada 60 s y `maintain_user_tokens` cada 5 min. Ambos con
`next_run_time` al arranque, porque un trigger `interval` no dispara hasta pasado
el intervalo completo y la ventana ciega caía justo al despertar la máquina, que
es cuando el token acaba de morir.

## Arranque

```bash
cp .env.example .env        # completar EGGSYS_INGEST_SECRET, LSG_CREDENTIAL_KEYS
                            # (obligatoria: cifra el token de sesión) y los IDs
                            # de Fase 0
docker compose up -d
curl http://localhost:14142/health   # {"status":"ok","db":"ok"}
```

En EggSys (`.env.local`):

```bash
LSG_ADDON_ENABLED=true
LSG_ADAPTER_URL=http://localhost:14142
LSG_INGEST_SECRET=<mismo valor que EGGSYS_INGEST_SECRET>
```

## Migraciones

El esquema lo gobierna **Alembic**, y solo Alembic: `app/main.py::lifespan` no
llama a `create_all` (crea tablas faltantes pero nunca añade columnas a una
tabla existente, así que una columna nueva jamás llegaría a una BD ya
desplegada) y se limita a sembrar las reglas v1.

El `command` del compose migra **antes** de abrir el puerto: si el esquema no
queda al día, el contenedor falla ruidosamente en vez de servir peticiones contra
columnas inexistentes.

```bash
docker compose exec adapter uv run alembic upgrade head          # aplicar
docker compose exec adapter uv run alembic revision --autogenerate -m "..."
```

Fuera de Docker hay que migrar a mano antes de levantar uvicorn: el `CMD` del
`Dockerfile` no migra, lo hace el `command` del compose.

```bash
uv run alembic upgrade head && uv run uvicorn app.main:app --port 14142
```

Historial: `c1a1a8cf0fd5` (baseline) → `9e19786f63ee` (credential_consent). El
`prepend_sys_path = .` de `alembic.ini` es necesario para que `env.py` encuentre
el paquete `app`.

## Fase 0: provisioning

Descubre los IDs reales del sensor, su endpoint y las dimensiones de puntos
(nunca se hardcodean):

```bash
docker compose exec adapter uv run python scripts/provision_sensor.py <email> <password>
# login puntual de un researcher/admin (no se guarda); copiar las líneas
# EGGSYS_SENSOR_ID / EGGSYS_SENSOR_ENDPOINT_ID / POINT_DIMENSION_* al .env y reiniciar
```

## Eventos v1

| Evento | Dimensión | Peso | Tope |
|--------|-----------|------|------|
| `streak.daily_logging` | Cognitivo | 5 | 1/semana, 4/mes |
| `budget.month_met` | Cognitivo | 15 | 3/mes |
| `savings.milestone` | Afectivo | 10–40 (según umbral 25/50/75/100 %) | 1 por cuenta y umbral, para siempre |
| `tx.descriptive_entry` | Lingüístico | 2 | 3/día, 30/mes |

Topes globales: 20 pts/día, 60/semana, 150/mes (`CAP_*` en `.env`;
`savings.milestone` está exento por ser no farmeable). No se asignan puntos
Físicos ni Sociales.

## API

Todas las rutas menos `/health` exigen el secreto compartido con EggSys como
`Authorization: Bearer <EGGSYS_INGEST_SECRET>`, comparado en tiempo constante
(`app/core/security.py::verify_ingest_secret`).

| Ruta | Uso |
|------|-----|
| `GET /health` | liveness + ping a la BD |
| `POST /link` | vincular; acepta el opt-in de credencial cifrada |
| `GET /link/{eggsys_user_id}` | estado del vínculo, para pintar la UI |
| `DELETE /link/{eggsys_user_id}/credential` | revocar la contraseña guardada sin desvincular |
| `DELETE /link/{eggsys_user_id}` | desvincular |
| `POST /events` | ingesta del outbox de EggSys |
| `GET /events/{eggsys_user_id}` | historial con estado de sincronización |
| `GET /admin/rules` · `PATCH /admin/rules/{event_type}` | calibrar pesos, topes y activación en caliente |
| `POST /admin/events/unstick` | reincorporar eventos varados por sesión expirada |

## Tests

49 pruebas (pytest + respx). No necesitan Alembic: `conftest.py` monta un sqlite
en memoria por test y aísla el `.env` del desarrollador.

```bash
uv sync
uv run pytest
```

## Verificación end-to-end

1. `docker compose up -d` → `/health` responde ok.
2. Vincular un usuario desde EggSys (`/lifesync`) → aparece su `id_players`.
3. Registrar transacciones en 5 días distintos de la semana → evento
   `streak.daily_logging` en `lsg_events` con estado `SYNCED`.
4. `GET /points/ledger?player_id=<id>&source_type=ADJUST` en LSG-Core →
   movimiento con el `client_ref` en `reason`.
5. Reenviar el mismo lote → `DUPLICATE`, saldo sin cambios.
6. `docker compose stop adapter-db` → eventos `ERROR`/`PENDING`; al volver,
   el `retry_worker` los sincroniza (backoff exponencial, máx. 5 intentos).
7. Con `LSG_CREDENTIAL_KEYS` y consentimiento: parar el adaptador más de 120 min
   y volver a levantarlo → `maintain_user_tokens` re-loguea solo y los eventos
   pendientes salen sin revincular a mano.

## Más documentación

- `docs/lsg-addon.md`: diseño del addon: arquitectura, desarrollo por
  prototipos, historias de usuario, requisitos y trazabilidad.
- `docs/lsg-sensor-endpoints.md`: criterio de granularidad de endpoints en LSG y
  limitaciones verificadas de LSG-Core.
