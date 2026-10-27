# Endpoints de sensor en LSG: criterio de diseño

Documento de trabajo sobre cómo modelar los `sensor_endpoint` de LSG-Core para
que un consumidor externo (en particular el mod de Baldur's Gate 3) pueda dar
bonificaciones temporales según la actividad reciente del jugador.

Verificado contra `lsg.diinf.usach.cl/lsg-core-api` el 2026-07-27.

## El principio

> **Un endpoint por cada tipo de ingesta o actividad que otorga puntos.**
> No uno por aplicación.

Un `sensor_endpoint` en LSG **no** es la app ni la URL desde la que llegan los
datos: es la *clase de dato* que se ingesta. Es la unidad de granularidad que
ve cualquier consumidor externo.

### Cómo lo hace el ecosistema

| Sensor | Endpoints |
| --- | --- |
| Fitbit Demo | `Daily Steps` |
| SleepTracker Demo | `Nightly Sleep` |
| Hygiene and Safety | `Hygiene and Safety` |
| Chess.com | `Chess games won` |
| **Health Connect** | **`Sleep Data` + `Water Data`** |
| Lichess | `Lichess ingest` |

Health Connect es el precedente relevante: un sensor con dos endpoints, uno por
tipo de dato. Es el patrón a seguir cuando una app emite varias señales
distintas.

## Por qué importa

El consumidor (el mod) recibe eventos de **todos** los sensores del jugador
mezclados. Necesita clasificarlos, y solo tres campos son uniformes entre
plugins:

| Campo | Rol |
| --- | --- |
| `id_sensor_endpoint` | **Qué** actividad fue: identificador estable |
| `parsed_value` | **Cuánto**: escalar normalizado (8500 pasos, 5 km, 3 partidas) |
| `occurred_at` | **Cuándo** |

El `raw_payload`, en cambio, lo define cada plugin a su antojo y no comparte
esquema: en producción conviven `{date, steps}` y `{device_security}`. Un
consumidor que dependa del payload necesita un parser por plugin y se rompe
cada vez que alguien cambia el suyo.

Con endpoints por actividad, el mod se reduce a una tabla de configuración:

| endpoint | dimensión | umbral | bonificación |
| --- | --- | --- | --- |
| EggSys · Racha de registro | Mental | 4 / semana | +INT temporal |
| LSG-Routes · Trote | Físico | 3 / semana | +CON temporal |
| LSG-Routes · Bicicleta | Físico | 2 / semana | +DEX temporal |

Añadir un plugin nuevo es una fila más, sin tocar código.

Beneficios adicionales:

- **Activación por actividad**: `POST /sensors/players/{id}/link-endpoint` acepta
  `activated` por endpoint, así que el jugador puede apagar una señal concreta
  sin desconectar la app entera.
- **Segmentación analítica**: `/research/export/sensors` y
  `/analytics/sensors/quality` exponen `sensor_endpoint_name`. Segmentar por
  conducta sale gratis; con un endpoint único habría que parsear JSON en las
  consultas de análisis.
- **`watch_parameters`**: campo libre por endpoint donde declarar la semántica
  (dimensión, puntos base, topes). El consumidor la lee desde LSG en vez de
  llevarla hardcodeada.

### Lo que el endpoint NO determina

`SensorEndpointCreateRequest` solo acepta `name`, `description`, `url_endpoint`,
`token_parameters`, `specific_parameters` y `watch_parameters`. **No** lleva
dimensión de puntos ni reglas de puntuación: eso lo decide quien acredita
(en EggSys, las reglas viven en la BD del adaptador). El endpoint es
descriptivo, no normativo.

## EggSys: endpoints creados

Sensor `id_online_sensor = 8` ("Plugin EggSys: Gestión financiera").

| ID | Endpoint | `event_type` | Dimensión | Base | Topes |
| --- | --- | --- | --- | --- | --- |
| 8 | EggSys · Racha de registro | `streak.daily_logging` | Mental (4) | 5 | 1/sem, 4/mes |
| 9 | EggSys · Presupuesto cumplido | `budget.month_met` | Mental (4) | 15 | 3/mes |
| 10 | EggSys · Hito de ahorro | `savings.milestone` | Afectivo (3) | 10 × (umbral/25) | — |
| 11 | EggSys · Entrada descriptiva | `tx.descriptive_entry` | Lingüístico (5) | 2 | 3/día, 30/mes |

Los pesos y topes replican `app/services/rules.py` del adaptador y quedan
declarados en el `watch_parameters` de cada endpoint.

## LSG-Routes: propuesta

Sensor `id_online_sensor = 6`. **Sin endpoints todavía**: no puede emitir
eventos hasta que se le cree al menos uno.

La actividad física distingue modo de desplazamiento, y cada modo merece su
propia bonificación, así que corresponde un endpoint por modo:

| Endpoint sugerido | `parsed_value` | Dimensión | Bonificación BG3 (idea) |
| --- | --- | --- | --- |
| LSG-Routes · Caminata | km recorridos | Físico (2) | +CON leve |
| LSG-Routes · Trote | km recorridos | Físico (2) | +CON / velocidad |
| LSG-Routes · Bicicleta | km recorridos | Físico (2) | +DEX |

Decisiones que quedan abiertas:

- **¿`parsed_value` en km, minutos o calorías?** Debe ser un escalar comparable
  dentro del mismo endpoint. Los km son lo más legible para caminata/trote/bici.
- **¿Una ruta completada = un evento?** Recomendado: evita que el mod tenga que
  agregar tramos parciales.
- **¿Hace falta un cuarto endpoint para rutas mixtas?** Solo si la app permite
  registrar un recorrido con varios modos; si no, se descompone en eventos
  separados.

Se sugiere replicar el mismo `watch_parameters` que EggSys (`event_type`,
`point_dimension_id`, `base_points`, `caps`, descripción de `parsed_value`)
para que el mod lea ambos plugins con el mismo código.

## Cómo consume el mod

**Usar `GET /sensors/players/{player_id}/ingest-events`.** Devuelve
`id_sensor_endpoint`, `raw_payload`, `parsed_value`, `status`, `occurred_at`.

```
GET /sensors/players/{id}/ingest-events?limit=200
  → filtrar por occurred_at dentro de la ventana (7 días)
  → agrupar por id_sensor_endpoint
  → contar contra el umbral de cada fila de configuración
  → aplicar la bonificación temporal
```

### Limitaciones verificadas de la API

1. **`ingest-events` no acepta filtros** salvo `limit`: ni rango de fechas ni
   endpoint. El filtrado es responsabilidad del consumidor. No es grave por
   volumen: un jugador con meses de uso acumulaba 10 eventos.

2. **`/players/{id}/timeline` NO sirve para esto**, pese a que su documentación
   promete `sensor_ingest`. Comprobado con el jugador 42, que tiene 10 eventos
   de sensor reales: con `from_ts=2020-01-01`, `to_ts=2030-01-01` y `limit=500`
   devuelve 61 entradas, todas `points` o `redemption`, y **ninguna**
   `sensor_ingest`. Conviene reportarlo a los mantenedores de LSG-Core; si se
   corrige, el timeline pasa a ser mejor fuente por su filtro temporal nativo.

3. **El orden descendente por `occurred_at` no está documentado**, aunque se
   observa en la práctica. El consumidor debería ordenar por su cuenta.

## Implementación en el adaptador de EggSys

`EGGSYS_ENDPOINT_IDS` en el `.env` mapea cada conducta con su endpoint:

```
EGGSYS_ENDPOINT_IDS={"streak.daily_logging": 8, "budget.month_met": 9,
                     "savings.milestone": 10, "tx.descriptive_entry": 11}
```

- `settings.endpoint_id_for(event_type)` lo resuelve, con `EGGSYS_SENSOR_ENDPOINT_ID`
  como respaldo para tipos que no estén en el mapa.
- `LsgConnection.players_sensor_endpoints` cachea `{id_sensor_endpoint:
  id_players_sensor_endpoint}`: LSG asigna un pseid distinto por endpoint.
- `ensure_sensor_linked` activa todos los endpoints configurados al vincular, y
  si uno falla los demás siguen.

Añadir una conducta nueva es crear su endpoint en LSG-Core y agregar la entrada
al mapa; no requiere tocar código.
