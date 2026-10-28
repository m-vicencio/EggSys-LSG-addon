# Addon LifeSync-Games: sensor conductual de EggSys

Documentación de diseño e implementación del mod que convierte a EggSys en un
sensor de la plataforma LifeSync-Games (LSG).

**Alcance.** Este documento cubre **solo el addon**. El núcleo de EggSys
(cuentas, transacciones, presupuestos, mascota virtual) queda fuera salvo en los
dos puntos donde el addon se engancha a él.

---

## 1. Contexto y objetivo

LifeSync-Games es una plataforma de gamificación del ecosistema de la USACH
(`lsg.diinf.usach.cl`) donde un jugador acumula puntos en varias dimensiones
(cognitiva, afectiva, lingüística, física, social) a partir de señales que le
envían aplicaciones externas llamadas **sensores**. Un consumidor final (en el
caso de referencia, un mod de *Baldur's Gate 3*) lee esos puntos y otorga
bonificaciones dentro del juego.

EggSys es una aplicación de finanzas personales. El objetivo del addon es que
las **conductas de autorregulación financiera** del usuario (registrar con
constancia, cumplir un presupuesto, alcanzar una meta de ahorro, describir sus
gastos) se traduzcan en puntos LSG, sin que EggSys deje de ser una aplicación
financiera utilizable por sí sola.

De ese objetivo salen tres restricciones que gobiernan todo el diseño:

1. **El dinero no puntúa; puntúa la conducta.** Ningún peso depende de montos, y
   ningún payload enviado a LSG contiene montos, saldos ni texto libre.
2. **El addon es opcional e inerte.** Con `LSG_ADDON_ENABLED` ausente o en
   `false`, EggSys se comporta exactamente igual que antes de que el addon
   existiera.
3. **El sensor nunca puede romper una operación financiera.** Registrar una
   transacción debe funcionar aunque LSG esté caído, el adaptador apagado o la
   sesión expirada.

---

## 2. Arquitectura en una página

El addon son **dos procesos separados** y esa separación es la decisión
estructural principal.

```
┌────────────────────────────┐        ┌──────────────────────────────┐
│  EggSys (Next.js)          │        │  eggsys-lsg-adapter          │
│                            │        │  (FastAPI, :14142)           │
│  DETECTA conductas         │  HTTP  │                              │
│  · lsg-emit.service.ts     │───────▶│  PUNTÚA según reglas en BD   │
│  · LsgEventOutbox          │ Bearer │  · rules.py (pesos y topes)  │
│  · LsgConnection           │ secret │  · sync.py → LSG-Core        │
│                            │        │  · token.py (sesión LSG)     │
│  NO calcula puntos         │        │  · Postgres propio           │
│  NO habla con LSG          │        │                              │
└────────────────────────────┘        └───────────────┬──────────────┘
                                                      │ JWT del usuario
                                                      ▼
                                        ┌──────────────────────────────┐
                                        │  LSG-Auth / LSG-Core (USACH) │
                                        │  Infraestructura ajena       │
                                        └──────────────────────────────┘
```

**Por qué dos procesos y no uno.** EggSys detecta, el adaptador puntúa. Se
separó por tres razones concretas:

- **Las reglas de puntaje son material de investigación y cambian.** Viven en la
  tabla `lsg_event_rules` del adaptador, editables vía `PATCH /admin/rules` sin
  redesplegar EggSys.
- **El acoplamiento con LSG queda contenido.** LSG-Core es infraestructura ajena
  que no controlamos: su cliente, su modelo de autenticación y sus rarezas viven
  en un servicio que se puede reiniciar, migrar o apagar sin tocar la aplicación
  financiera.
- **El patrón es reutilizable.** LSG-Routes, el otro plugin del ecosistema, tiene
  el mismo problema; un adaptador por plugin es un molde repetible.

El precio de esta decisión es un salto de red más y dos bases de datos que
mantener sincronizadas en lo conceptual. Se asumió a cambio de que un fallo del
addon jamás alcance al núcleo.

---

## 3. Desarrollo por prototipos

El addon se construyó en nueve incrementos. Cada uno es desplegable y observable
por sí mismo; ninguno deja el sistema en un estado intermedio inservible.

### Prototipo 0: descubrimiento y provisionamiento

**Qué resuelve:** LSG-Core identifica todo por IDs numéricos (el sensor, cada
endpoint, cada dimensión de puntos), que son distintos en cada despliegue. Nada
de eso se puede hardcodear.

Se escribió `scripts/provision_sensor.py`, un script de un solo uso que hace
login con una cuenta *researcher*, descubre los IDs reales y los imprime listos
para copiar al `.env`. No guarda credenciales.

Aquí apareció la primera trampa del ecosistema, y costó cara: **`attribute_id`
no es `id_point_dimension`**. No coinciden para la dimensión lingüística
(`attribute_id=5` corresponde a `id_point_dimension=7`, mientras que el 5 es
*condición física*). Una configuración basada en el campo equivocado habría
acreditado puntos a la dimensión incorrecta de forma silenciosa, invalidando los
datos del estudio sin que nada fallara visiblemente. Quedó documentado en el
`.env.example` en mayúsculas.

### Prototipo 1: persistencia y bandeja de salida

**Qué resuelve:** que ningún evento conductual se pierda aunque todo lo demás
esté caído.

Dos modelos en Prisma:

- `LsgConnection`: el vínculo usuario EggSys ↔ jugador LSG, más el interruptor
  por usuario. **Sin credenciales**, por decisión desde el primer commit.
- `LsgEventOutbox`: la bandeja de salida, con **doble barrera anti-duplicado**.

La doble barrera merece explicación porque es la base de toda la idempotencia
del addon. El primer nivel es `clientRef`, un UUIDv5 determinista calculado como
`uuid5("{eventType}:{periodKey}:{userId}")`: el mismo evento conceptual produce
siempre el mismo UUID, en cualquier proceso y sin coordinación. El segundo es un
`@@unique(userId, eventType, periodKey)` en la base. Reintentar una emisión no
duplica nada: choca contra el índice y es un no-op.

El patrón *outbox* se eligió sobre la llamada directa porque desacopla la
detección del envío. El evento se persiste primero y se sincroniza después,
cuando se pueda.

### Prototipo 2: detectores de conducta

**Qué resuelve:** traducir actividad financiera a señales conductuales.

`src/services/lsg-emit.service.ts` implementa cuatro detectores:

| Conducta | Criterio | Clave de periodo |
| --- | --- | --- |
| `streak.daily_logging` | ≥5 días distintos con registro en la semana ISO | `2026-W29` |
| `budget.month_met` | Gasto ≤ presupuesto, y presupuesto creado ≥15 días antes del cierre | `2026-06:budgetId` |
| `savings.milestone` | Cruce al alza de 25/50/75/100 % de la meta | `accountId:75` |
| `tx.descriptive_entry` | ≥1 etiqueta y comentario ≥20 caracteres, no repetido | `tx:transactionId` |

Tres decisiones de diseño relevantes:

**Los payloads llevan señales, no datos.** `budget.month_met` envía
`spent_ratio: 0.82`, no cuánto se gastó. `tx.descriptive_entry` envía
`comment_length: 47` y `tag_count: 2`, nunca el comentario. La privacidad no es
una política aplicada después, es la forma de los datos.

**Anti-farmeo en el propio criterio.** El presupuesto debe existir con ≥15 días
de antelación al cierre del mes, para que no valga crear uno laxo el día 28 y
cobrarlo. El comentario descriptivo no puede ser idéntico al anterior. El hito
de ahorro solo cuenta cruces *hacia arriba*, registrados en
`SavingProgress.lastMilestone`.

**El evaluador mensual es perezoso.** No hay cron: `budget.month_met` se evalúa
al registrar transacciones, mirando el mes anterior. Es una simplificación
consciente, y funciona porque el `@@unique` del outbox absorbe las
repeticiones. Si algún día hay un
scheduler real, la llamada se mueve allí.

Los enganches al núcleo son exactamente dos, `createTransaction` y
`syncPetProgressByAccount`, ambos con importación dinámica y `.catch(() => {})`.

### Prototipo 3: superficie de API y pantalla

**Qué resuelve:** que el usuario pueda vincular, ver y controlar.

Tres rutas bajo `/api/lsg` siguiendo el contrato del resto del proyecto (sesión
→ 401, Zod `safeParse` → 400, delegar al servicio), su cliente tipado en
`src/lib/api/lsg.ts`, y la vista `/lifesync` con cuatro componentes: tarjeta de
conexión, formulario de configuración, historial de eventos y badge de estado.

La pantalla se diseñó alrededor de la **transparencia**: el usuario ve
exactamente qué eventos se emitieron, cuándo y en qué estado quedaron. Es un
requisito ético del estudio antes que una función de producto.

Se documentaron las rutas en el spec OpenAPI hecho a mano (`src/lib/openapi.ts`),
que el proyecto mantiene como fuente de verdad de su API.

### Prototipo 4: adaptador de puntuación

**Qué resuelve:** puntuar, aplicar topes y sincronizar con LSG-Core.

El servicio FastAPI dockerizado, con su propio Postgres. Contiene el cliente de
LSG-Auth, el de LSG-Core, el motor de reglas, el orquestador de sincronización,
un worker de reintentos con backoff exponencial y tests con pytest y respx.

**El orden del flujo de sincronización es una decisión, no una casualidad:**
primero `POST /sensors/ingest/webhook` (auditoría), después
`POST /players/{id}/points/adjust` (acreditación). Si el ingest falla no se
acreditan puntos. El criterio explícito es *un evento auditable sin puntos vale
más que puntos sin auditoría*, porque el estudio longitudinal se sostiene sobre
la trazabilidad, no sobre el saldo.

**Los topes anti-farmeo son de dos niveles**: por regla (`max_per_day/week/month`,
contando eventos ya sincronizados) y globales (20 puntos/día, 60/semana,
150/mes). `savings.milestone` queda **exento** de los globales, y hay una razón:
es una vez por cuenta y umbral para siempre, luego no es farmeable, y su peso
máximo (40) supera por diseño el tope diario, así que el tope lo anularía.

Cada intento deja una fila en `lsg_sync_logs` con request, response y código
HTTP. La clasificación de errores es explícita: 403/422 son rechazo permanente,
404 de jugador es vínculo roto, todo lo demás es transitorio y se reintenta.

### Prototipo 5: granularidad por conducta

**Qué resuelve:** que un consumidor externo pueda distinguir las conductas.

Hasta aquí las cuatro conductas viajaban bajo un único `sensor_endpoint_id`, así
que llegaban a LSG-Core indistinguibles. El análisis del ecosistema
(`docs/lsg-sensor-endpoints.md`) mostró por qué eso no servía: un consumidor
recibe eventos de *todos* los sensores del jugador mezclados, y de los campos
disponibles solo tres son uniformes entre plugins: `id_sensor_endpoint`,
`parsed_value` y `occurred_at`. El `raw_payload` lo define cada plugin a su
antojo; depender de él obliga a un parser por plugin.

Se adoptó el principio **un endpoint por tipo de ingesta, no uno por
aplicación**, siguiendo el precedente de Health Connect en la misma plataforma.
Se crearon cuatro endpoints (IDs 8–11) y `EGGSYS_ENDPOINT_IDS` mapea cada
`event_type` al suyo, con el valor anterior como respaldo para que la
configuración vieja siguiera funcionando. `players_sensor_endpoints` pasó de
escalar a diccionario, porque LSG asigna un identificador distinto por endpoint.

El resultado es que añadir una conducta no requiere tocar código: se crea el
endpoint en LSG-Core y se agrega una entrada al mapa.

En el mismo trabajo se verificaron y documentaron **dos limitaciones reales de
LSG-Core**: `ingest-events` no acepta más filtro que `limit`, y
`/players/{id}/timeline` no devuelve entradas `sensor_ingest` pese a
documentarlo (comprobado con un jugador con 10 eventos reales).

### Prototipo 6: robustez operativa

**Qué resuelve:** dos fallos detectados en uso real.

**Acceso desde móvil.** El menú lateral no se renderiza en móvil y la barra
inferior no incluía `/lifesync`, así que desde la PWA no había forma de llegar a
la vinculación salvo escribiendo la URL. Se resolvió con una tarjeta
"Conexiones" en la pestaña Cuenta, y no con un sexto ítem en la barra: vincular
es una acción de una sola vez y los cinco huecos los ocupan funciones diarias.

**Fallo ruidoso en configuración incompleta.** `seed_default_rules` sembraba las
cuatro reglas con `point_dimension_id = 0` si el `.env` no tenía las dimensiones,
y como la función no re-siembra cuando ya hay filas, el error quedaba
**congelado para siempre**: LSG-Core respondía 404 y todos los eventos morían en
el adjust. Ahora arranca con `RuntimeError` explícito. Es el patrón general que
adoptó el addon: ante configuración ausente, fallar visible en vez de degradar
en silencio.

### Prototipo 7: sesión autónoma y consentimiento

**Qué resuelve:** que el usuario deje de tener que revincular a mano.

Este prototipo nace de un problema de uso: **el vínculo se caía solo y había que
rehacerlo constantemente**.

La causa es estructural. El token de LSG vive 120 minutos y es deslizante, pero
**LSG-Auth no emite refresh token durable**: `POST /token/refresh` exige el
Bearer *todavía vivo*. Como la contraseña se descartaba al vincular, un token ya
expirado no dejaba ningún artefacto con el que recuperarse. Y el despliegue es
un portátil con Docker Desktop, donde estar apagado más de dos horas (una noche,
una suspensión) es lo normal: el token moría prácticamente cada día.

Se evaluaron tres caminos:

1. **Usar la cuenta de servicio también para el ingest.** Era la opción más
   limpia y más segura: elimina el token por usuario y no guarda ninguna
   credencial. Se **descartó** porque el webhook es *player-self* y la
   metodología del estudio exige que el evento venga autenticado como el propio
   jugador. La cuenta de servicio se mantiene solo para el `adjust`, donde ya
   estaba.
2. **Pedir a LSG una credencial de máquina** (API key o token de larga duración
   con alcance acotado). Es la solución correcta de fondo para una integración
   servidor-a-servidor, pero la plataforma es ajena y no modificable.
3. **Guardar la contraseña cifrada y re-loguear.** La única vía plenamente
   autónoma dentro de las restricciones. Es la que se implementó.

La decisión se tomó reconociendo que **es un retroceso de seguridad real**:
guardar una contraseña de forma reversible, de otra plataforma y potencialmente
reutilizada, es peor que no guardarla. El diseño acota el daño en lugar de
pretender que no existe:

- **Consentimiento explícito, desmarcado por defecto.** Sin marcarlo, el
  comportamiento es idéntico al anterior. La autonomía es una elección por
  usuario, no una política del sistema.
- **Cifrado autenticado con `MultiFernet`**, con la clave fuera de la base
  (`LSG_CREDENTIAL_KEYS`) y rotación por anteposición.
- **Ligado al usuario.** Fernet no tiene AAD, así que el `eggsys_user_id` viaja
  dentro del texto cifrado y se verifica al descifrar: mover un blob de una fila
  a otra se rechaza.
- **Imposible bloquear la cuenta LSG.** Un `401` al re-loguear significa que la
  contraseña cambió y se trata como definitivo: se borra la credencial y no se reintenta
  jamás. Como máximo un login fallido por credencial, nunca un bucle contra
  LSG-Auth. Es una garantía más fuerte que cualquier backoff.
- **Perder la clave no destruye nada.** Sin `LSG_CREDENTIAL_KEYS` la reconexión
  se desactiva y se avisa, pero lo guardado queda intacto; reponerla restaura el
  servicio sin revincular.
- **El token de sesión también va cifrado.** Mientras vive permite actuar en LSG
  en nombre del usuario, así que `user_token` se guarda con las mismas claves
  (`models.EncryptedToken`) y la clave pasa a ser obligatoria: sin ella `/link`
  devuelve 503. La migración `4b7e2d9c1a35` borra los tokens que quedaban en
  claro.
- **Borrar la cuenta desvincula primero.** La cascada de Prisma no llega al
  adaptador: antes, una cuenta borrada dejaba su fila allí con el token
  renovándose cada 5 minutos. Ahora EggSys borra el vínculo del adaptador antes
  que la cuenta, y si el adaptador no lo confirma no borra nada (503).
- **Falla cerrado.** Pedir consentimiento sin cifrado configurado devuelve 503
  antes de gastar un login, en lugar de vincular en silencio descartando el
  consentimiento.
- **Revocable sin desvincular**, conservando la sesión vigente.

En el mismo prototipo se consolidó el ciclo de vida del token en
`app/services/token.py`. Antes había dos caminos que decidían por su cuenta si
un token servía (uno en `sync.py`, otro en el worker) y discrepaban entre sí.

El trabajo destapó cuatro defectos que impedían que la recuperación desatendida
funcionara aunque el re-login existiese, y uno de seguridad:

| Defecto | Efecto | Corrección |
| --- | --- | --- |
| El job de mantenimiento no corría hasta 30 min *después* de arrancar (trigger `interval`) | Ventana ciega justo cuando el token muere al despertar la máquina | `next_run_time` al arranque, intervalo a 5 min, `misfire_grace_time=None` |
| Cada pasada con la sesión muerta gastaba un intento del presupuesto de 5 | Eventos varados **para siempre** aunque la sesión volviera | No se gastan intentos ni se escriben trazas en esa rama; el token se resuelve una vez por conexión |
| Un 404 apagaba `connection.enabled`, que es el interruptor del usuario | La UI leía el campo de Prisma y mostraba "Activo" con la conexión rota | Columna propia `broken_reason` |
| `needsRelink()` devolvía `false` ante cualquier fallo | Un adaptador caído se veía como "Activo" mientras nada se sincronizaba | Estado propio `adapterReachable` |
| `password: str` en el esquema Pydantic | Pydantic devuelve el valor ofensor en el cuerpo de un 422: una contraseña larga volvía **en claro** | `SecretStr` |

Se migró además el esquema del adaptador a **Alembic**. Hasta entonces lo creaba
`Base.metadata.create_all`, que crea tablas ausentes pero **nunca añade columnas**
a una tabla existente, así que las columnas nuevas jamás habrían llegado a la
base ya desplegada.

### Prototipo 8: despliegue en contenedor

**Qué resuelve:** que EggSys deje de depender de una terminal abierta.

Hasta aquí el adaptador estaba dockerizado y la aplicación no: corría con
`npm run dev`, de modo que cerrar la sesión o reiniciar el equipo la apagaba. Un
estudio longitudinal necesita que el sensor esté encendido cuando el usuario
registra, no cuando el investigador se acuerda de levantarlo. Se añadieron
`Dockerfile`, `docker-compose.yml` y `.dockerignore` en la raíz, con
`restart: unless-stopped`, que es la línea que cumple el objetivo del prototipo.

**La imagen no usa `output: "standalone"`**, porque ese modo obliga a copiar a
mano el client de Prisma y sus binarios al artefacto final. Copiar la aplicación
entera da una imagen más grande, pero con menos piezas que se rompan en
silencio. El `prisma generate` del build no necesita `DATABASE_URL` porque el
datasource no declara `url`: la conexión la abre el driver adapter en tiempo de
ejecución.

**Un solo compose levanta todo el sistema.** El de la raíz define `app` y `db`
(`eggsys-db`, antes un contenedor creado a mano) e incluye con `include:` el
compose del adaptador, que sigue siendo autónomo y puede levantarse solo. Dentro
de Docker la app llega a la base y al adaptador por nombre de servicio
(`db:5432`, `adapter:14142`). Desplegar en un equipo nuevo se reduce a completar
los `.env` y ejecutar `docker compose up -d --build`, sin pasos manuales que el
repositorio no registre.

Dos decisiones sostienen esa unificación:

- **La app migra al arrancar**, con `prisma migrate deploy` antes de `npm start`,
  igual que el adaptador corre `alembic upgrade head` antes de uvicorn. Un esquema
  desfasado hace fallar el arranque en vez de servir peticiones contra columnas
  inexistentes.
- **La app no depende del adaptador para arrancar**: solo espera a que `db` esté
  sana. Con el adaptador caído EggSys sigue funcionando y los eventos esperan en
  el outbox, que es el contrato del addon desde el prototipo 1.

Los volúmenes llevan nombre fijo para no perder datos al cambiar de proyecto: el
del adaptador conserva el nombre que tenía cuando se levantaba solo, y el de
`db` se puede apuntar con `EGGSYS_DB_VOLUME` al de la base creada antes a mano.

`eggsys-caddy` queda fuera del compose porque publica también otros proyectos del
mismo equipo; sigue alcanzando la app por `host.docker.internal:3001`. El precio
de publicar ese puerto es que `eggsys-app` y `npm run dev` lo usan los dos y hay
que bajar uno antes de levantar el otro; a cambio, desarrollo y producción usan
la misma URL y la configuración de Caddy no cambia.

La dockerización destapó un defecto que el modo desarrollo escondía: `mailer.ts`
creaba el transporter SMTP **al importar el módulo**, así que el `next build`
fallaba sin `SMTP_*` configurado aunque nadie fuera a enviar un correo. Se pasó a
creación perezosa en el primer envío. Es la contrapartida del criterio del
prototipo 6 (fallar visible ante configuración ausente) y no una excepción a él:
lo que debe fallar es el envío sin SMTP, no el build de una aplicación que puede
no usarlo nunca.

---

## 4. Historias de usuario

### Usuario final

| ID | Historia | Criterios de aceptación |
| --- | --- | --- |
| **HU-01** | Como usuario de EggSys, quiero vincular mi cuenta de LifeSync-Games para que mis hábitos financieros sumen puntos en el juego. | Ingreso correo y contraseña LSG; si son válidas queda vinculado y se muestra mi número de jugador; si no, un error claro. La contraseña no se guarda salvo que yo lo autorice. |
| **HU-02** | Como usuario, quiero ver exactamente qué información se envía sobre mí, para decidir con conocimiento si sigo conectado. | La pantalla `/lifesync` lista cada evento emitido con tipo, periodo, fecha y estado de sincronización. Ningún payload contiene montos ni el texto de mis comentarios. |
| **HU-03** | Como usuario, quiero apagar el envío, completo o por conducta, sin desvincular. | Un interruptor general y uno por tipo de evento. Apagado, deja de emitirse de inmediato. |
| **HU-04** | Como usuario, quiero desvincular mi cuenta cuando quiera. | El vínculo local se elimina; el historial ya sincronizado permanece en LSG por ser dato del estudio. |
| **HU-05** | Como usuario, quiero que mi sesión con LSG se mantenga sola, para no tener que revincular cada día. | Si lo autorizo, la sesión se renueva sin intervención tras cualquier apagón. Si no lo autorizo, se me avisa cuando expira. |
| **HU-06** | Como usuario que autorizó guardar su contraseña, quiero poder retirar esa autorización sin perder el vínculo. | Un botón borra la credencial guardada; la sesión vigente sigue funcionando hasta expirar. |
| **HU-07** | Como usuario, quiero saber cuándo el sistema no está sincronizando, en lugar de creer que todo va bien. | Estados distinguibles para: activo, sesión expirada, vínculo roto y adaptador inalcanzable. |
| **HU-08** | Como usuario de móvil, quiero llegar a la vinculación desde la aplicación instalada. | Acceso desde Configuración → Cuenta → Conexiones, sin escribir la URL. |
| **HU-09** | Como usuario, quiero que EggSys siga funcionando aunque LifeSync falle. | Registrar transacciones, presupuestos y cuentas funciona con el adaptador apagado, LSG caído o el addon deshabilitado. |

### Investigador

| ID | Historia | Criterios de aceptación |
| --- | --- | --- |
| **HU-10** | Como investigador, quiero ajustar pesos y topes sin redesplegar, para calibrar durante el estudio. | `GET /admin/rules` las lista y `PATCH /admin/rules/{event_type}` modifica puntos base, topes y activación. |
| **HU-11** | Como investigador, quiero trazabilidad completa de cada intento de sincronización. | Cada intento registra paso, request, response, código HTTP y motivo en `lsg_sync_logs`. |
| **HU-12** | Como investigador, quiero que ninguna conducta puntúe dos veces. | Idempotencia por `client_ref` determinista, índice único por periodo y verificación contra el ledger de LSG antes de acreditar. |
| **HU-13** | Como investigador, quiero descubrir los IDs reales de la plataforma sin hardcodearlos. | `provision_sensor.py` los descubre e imprime; el adaptador no arranca si faltan. |
| **HU-15** | Como investigador, quiero que EggSys siga encendido tras reiniciar el equipo, sin dejar una terminal abierta. | La aplicación y el adaptador arrancan solos con Docker y siguen alcanzándose entre sí; no hace falta intervención para que la captura de datos continúe. |

### Consumidor externo (mod)

| ID | Historia | Criterios de aceptación |
| --- | --- | --- |
| **HU-14** | Como desarrollador del mod, quiero clasificar la actividad por tipo sin parsear payloads propietarios. | Cada conducta viaja por su propio `id_sensor_endpoint`; añadir una conducta es una fila de configuración, no código. |

---

## 5. Requisitos funcionales

### Vinculación y sesión

| ID | Requisito |
| --- | --- |
| **RF-01** | El sistema debe permitir vincular una cuenta EggSys con un jugador LSG validando las credenciales contra LSG-Auth y almacenando únicamente el identificador de jugador. |
| **RF-02** | El sistema debe distinguir credenciales inválidas (401) de plataforma no disponible (502/503) y comunicarlo con mensajes distintos. |
| **RF-03** | El sistema debe mantener viva la sesión LSG deslizándola mediante `POST /token/refresh` antes de que expire. |
| **RF-04** | El sistema debe ofrecer, como opción explícita desmarcada por defecto, almacenar cifrada la contraseña LSG para restablecer la sesión sin intervención del usuario. |
| **RF-05** | El sistema debe permitir revocar el almacenamiento de la credencial sin deshacer el vínculo ni invalidar la sesión vigente. |
| **RF-06** | El sistema debe permitir desvincular, eliminando el vínculo local y conservando el historial sincronizado en LSG. |
| **RF-07** | El sistema debe exponer estados diferenciados de vínculo: activo, sesión expirada, credencial inválida, vínculo roto y adaptador inalcanzable. |

### Detección de conductas

| ID | Requisito |
| --- | --- |
| **RF-08** | El sistema debe detectar **racha de registro**: ≥5 días distintos con transacciones dentro de la misma semana ISO. |
| **RF-09** | El sistema debe detectar **presupuesto cumplido**: gasto del mes ≤ monto ideal, considerando solo presupuestos creados ≥15 días antes del cierre. |
| **RF-10** | El sistema debe detectar **hito de ahorro** en los cruces al alza de 25/50/75/100 % de la meta, una sola vez por cuenta y umbral. |
| **RF-11** | El sistema debe detectar **entrada descriptiva**: transacción con ≥1 etiqueta y comentario de ≥20 caracteres, distinto del comentario anterior. |
| **RF-12** | El sistema debe registrar cada conducta detectada en una bandeja de salida local antes de intentar cualquier envío. |

### Puntuación y sincronización

| ID | Requisito |
| --- | --- |
| **RF-13** | El adaptador debe calcular los puntos a partir de reglas persistidas y editables en caliente, nunca en función de montos. |
| **RF-14** | El adaptador debe aplicar topes por regla (día/semana/mes) y topes globales acumulados, exceptuando de estos últimos a los hitos de ahorro. |
| **RF-15** | El adaptador debe sincronizar registrando primero el evento de auditoría y acreditando puntos solo si ese registro tuvo éxito. |
| **RF-16** | El adaptador debe enviar cada tipo de conducta por su propio `sensor_endpoint`, configurable sin cambios de código. |
| **RF-17** | El adaptador debe garantizar exactamente-una-acreditación mediante `client_ref` determinista, restricción única por periodo y verificación previa contra el ledger de LSG. |
| **RF-18** | El adaptador debe reintentar los fallos transitorios con backoff exponencial hasta un máximo configurable, y no reintentar los rechazos permanentes. |
| **RF-19** | El adaptador debe registrar cada intento con paso, petición, respuesta, código HTTP y motivo. |
| **RF-20** | El adaptador debe recuperar por sí mismo las sesiones expiradas de forma periódica, aunque no haya tráfico de eventos. |

### Control del usuario y administración

| ID | Requisito |
| --- | --- |
| **RF-21** | El sistema debe ofrecer un interruptor general y desactivación selectiva por tipo de evento; lo desactivado no se emite. |
| **RF-22** | El sistema debe mostrar al usuario el historial de eventos emitidos con su estado de sincronización. |
| **RF-23** | El sistema debe exponer la gestión de reglas de puntaje mediante API administrativa autenticada. |
| **RF-24** | El sistema debe permitir reincorporar eventos que quedaran fuera del presupuesto de reintentos por causas ajenas a ellos. |

---

## 6. Requisitos no funcionales

### Privacidad y protección de datos

| ID | Requisito | Cómo se satisface |
| --- | --- | --- |
| **RNF-01** | Ningún dato enviado fuera de EggSys puede contener montos, saldos ni texto libre del usuario. | Los payloads transportan conteos, longitudes, razones y porcentajes. Es la forma de los datos, no un filtro posterior. |
| **RNF-02** | Las credenciales LSG no se persisten sin consentimiento explícito y revocable. | Opt-in desmarcado por defecto; sin él la contraseña se descarta tras el login. |
| **RNF-03** | Toda credencial almacenada debe estarlo con cifrado autenticado, con la clave fuera de la base de datos y rotable. | `MultiFernet` (AES-128-CBC + HMAC-SHA256), clave en variable de entorno, rotación por anteposición. |
| **RNF-04** | Una credencial cifrada no debe ser utilizable fuera de la fila a la que pertenece. | El identificador de usuario va dentro del texto cifrado y se verifica con comparación en tiempo constante. |
| **RNF-05** | Las contraseñas no deben aparecer en registros, trazas ni respuestas de error. | `SecretStr` en el esquema, registro de solo códigos de estado y tipos de excepción, y prueba automatizada que lo verifica. |

### Fiabilidad y tolerancia a fallos

| ID | Requisito | Cómo se satisface |
| --- | --- | --- |
| **RNF-06** | Un fallo del addon no puede afectar a ninguna operación financiera. | Enganches con importación dinámica y `.catch(() => {})`; el núcleo nunca espera al sensor. |
| **RNF-07** | Con el addon deshabilitado, el comportamiento debe ser idéntico al de la aplicación sin addon. | `LSG_ADDON_ENABLED` cortocircuita emisión y sincronización. |
| **RNF-08** | Ningún evento detectado puede perderse por indisponibilidad de servicios externos. | Bandeja de salida persistente, reintentos con backoff y recuperación posterior. |
| **RNF-09** | Los eventos no deben agotar su presupuesto de reintentos por causas ajenas a ellos. | Los fallos por sesión expirada o vínculo roto no consumen intentos. |
| **RNF-10** | El sistema debe recuperarse por sí solo de una parada más larga que la vida de la sesión. | Reconexión automática con credencial cifrada, más un job de mantenimiento que corre desde el arranque. |
| **RNF-11** | La reconexión automática no puede provocar bloqueo de la cuenta en la plataforma externa. | Un rechazo definitivo descarta la credencial y no se reintenta nunca; el backoff cubre solo fallos transitorios. |

### Integridad de los datos del estudio

| ID | Requisito | Cómo se satisface |
| --- | --- | --- |
| **RNF-12** | Ninguna conducta puede acreditarse más de una vez. | Tres barreras independientes: UUIDv5 determinista, índice único por periodo y verificación contra el ledger. |
| **RNF-13** | No debe existir acreditación sin registro auditable. | El orden auditoría → acreditación es obligatorio; si falla la primera no se ejecuta la segunda. |
| **RNF-14** | Toda acreditación debe ser reconstruible a posteriori. | `lsg_sync_logs` guarda cada intento; el `client_ref` viaja en el motivo del movimiento del ledger. |
| **RNF-15** | El ingest debe autenticarse como el propio jugador. | Se usa el token del usuario; la cuenta de servicio queda restringida al `adjust`. |

### Operación y mantenibilidad

| ID | Requisito | Cómo se satisface |
| --- | --- | --- |
| **RNF-16** | Ningún identificador de la plataforma externa puede estar hardcodeado. | Descubrimiento en fase 0 y configuración por entorno. |
| **RNF-17** | Una configuración incompleta debe fallar de forma visible, nunca degradar en silencio. | El adaptador no arranca sin dimensiones de puntos; el consentimiento sin cifrado devuelve 503. |
| **RNF-18** | Los cambios de esquema deben aplicarse de forma reproducible sobre bases ya desplegadas. | Migraciones Alembic ejecutadas antes de abrir el puerto; Prisma en el lado de EggSys. |
| **RNF-19** | Las reglas de puntaje deben modificarse sin redesplegar. | Persistidas en base de datos y expuestas por API administrativa. |
| **RNF-20** | Añadir una conducta nueva no debe requerir cambios de código en el enrutado. | Mapa `event_type → sensor_endpoint` por configuración. |
| **RNF-21** | La comunicación EggSys ↔ adaptador debe estar autenticada. | Secreto compartido comparado en tiempo constante. |
| **RNF-22** | La lógica no trivial debe tener verificación automatizada. | 49 pruebas en el adaptador (pytest + respx) y auto-verificación en los detectores. |
| **RNF-27** | El despliegue debe sobrevivir a un reinicio del equipo sin intervención manual. | Imagen de producción con `restart: unless-stopped`, misma política en el compose del adaptador; la sesión LSG se restablece sola por la vía del prototipo 7. |

### Usabilidad

| ID | Requisito | Cómo se satisface |
| --- | --- | --- |
| **RNF-23** | El usuario debe poder auditar qué se envía en su nombre. | Historial visible con estado por evento. |
| **RNF-24** | Los estados de error deben ser distinguibles y accionables, sin falsos positivos de normalidad. | Cuatro estados diferenciados; un adaptador caído nunca se muestra como activo. |
| **RNF-25** | El consentimiento debe presentarse en lenguaje llano, indicando qué se guarda, para qué y cómo revocarlo. | Texto explícito junto a la casilla, que declara el almacenamiento cifrado y la alternativa. |
| **RNF-26** | Las funciones del addon deben ser accesibles desde la aplicación instalada en móvil. | Entrada desde Configuración → Cuenta → Conexiones. |

---

## 7. Trazabilidad

| Requisito | Implementación |
| --- | --- |
| RF-01, RF-02 | `app/api/routes/link.py::link_user` · `src/services/lsg.service.ts::linkConnection` |
| RF-03, RF-20, RNF-10 | `app/services/token.py::get_usable_token` · `retry_worker.py::maintain_user_tokens` |
| RF-04, RNF-02…05 | `app/core/crypto.py` · `schemas.py::LinkRequest` · `ConnectionCard.tsx` |
| RF-05 | `link.py::revoke_credential` · `src/app/api/lsg/connection/credential/route.ts` |
| RF-07, RNF-24 | `token.py::connection_status` · `lsg.service.ts::getAdapterStatus` · `ConnectionCard.tsx::StatusBadge` |
| RF-08…RF-12, RNF-01 | `src/services/lsg-emit.service.ts` |
| RF-13, RF-14 | `app/services/rules.py` |
| RF-15…RF-19, RNF-13 | `app/services/sync.py` |
| RF-16, RNF-20 | `config.py::endpoint_id_for` · `EGGSYS_ENDPOINT_IDS` |
| RF-17, RNF-12 | `lsg-emit.service.ts::uuid5` · `@@unique` del outbox · `sync.py::_ledger_already_credited` |
| RF-21, RF-22 | `src/app/api/lsg/config` · `events` · `src/views/core/lifesync/` |
| RF-23, RF-24 | `app/api/routes/admin.py` |
| RNF-06, RNF-07 | `transaction.service.ts:85` · `pet.service.ts:119` · `lsgAddonEnabled()` |
| RNF-11 | `token.py::_auto_relogin` (rechazo definitivo sin reintento) |
| RNF-18 | `alembic/versions/` · `prisma/migrations/` |
| RNF-21 | `app/core/security.py::verify_ingest_secret` |
| HU-15, RNF-27 | `Dockerfile` · `docker-compose.yml` · `eggsys-lsg-adapter/docker-compose.yml` |

---

## 8. Limitaciones conocidas

- **La clave de cifrado convive con la base de datos** en la misma máquina, de
  modo que comprometer el equipo entrega ambas. El consentimiento y la
  revocación acotan el daño; no lo eliminan. Mitigarlo de verdad exige un
  gestor de claves externo.
- **Guardar la contraseña sigue siendo un compromiso**, aceptado solo porque la
  plataforma no ofrece credenciales de máquina. Si LSG llegara a emitir tokens
  de larga duración o claves de API con alcance acotado, esta pieza debería
  retirarse.
- **El bloqueo por usuario es local al proceso.** Basta con un worker de
  uvicorn, que es como se despliega; con varios haría falta bloqueo en base de
  datos. El despliegue es un único host con Docker Desktop, así que la
  suposición se sostiene mientras eso no cambie.
- **La imagen de EggSys copia la aplicación entera** en vez de usar el modo
  standalone de Next.js: pesa bastante más a cambio de no gestionar a mano el
  client de Prisma. Si el tamaño llegara a importar, ahí está el ajuste.
- **El evaluador de presupuestos es perezoso** y depende de que el usuario
  registre transacciones. Un mes sin actividad no se evalúa hasta la siguiente.
- **Dos limitaciones de LSG-Core** documentadas y no resueltas por ser ajenas:
  `ingest-events` sin filtros y el timeline que no devuelve `sensor_ingest`.
- **Sin suite de pruebas en el lado EggSys**, por convención del repositorio; la
  verificación es lint, build y auto-verificación en los detectores. La cobertura
  automatizada vive en el adaptador.

---

## 9. Referencias

- `eggsys-lsg-adapter/README.md`: puesta en marcha, autenticación y verificación
  extremo a extremo.
- `docs/lsg-sensor-endpoints.md`: criterio de granularidad de endpoints,
  endpoints creados, propuesta para LSG-Routes y limitaciones verificadas.
- `src/lib/openapi.ts`: contrato de la API, servido en `/api/docs`.
