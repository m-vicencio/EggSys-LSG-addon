"""Configuracion del adaptador EggSys-LSG usando Pydantic Settings."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuracion principal del adaptador EggSys-LSG."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Base de datos
    database_url: str = "postgresql+asyncpg://lsg:lsgthesismv@localhost:5433/eggsys_lsg"

    # Servidor
    host: str = "0.0.0.0"
    port: int = 14142
    debug: bool = False

    # URLs de servicios LSG
    lsg_auth_base_url: str = "https://lsg.diinf.usach.cl/lsg-auth"
    lsg_core_base_url: str = "https://lsg.diinf.usach.cl/lsg-core-api"

    # Secreto compartido con EggSys (Bearer maquina a maquina)
    eggsys_ingest_secret: str = ""

    # Cuenta de servicio (rol admin/cross-player): acredita puntos en nombre de
    # cualquier jugador. Vacia -> fallback al token del propio usuario.
    lsg_service_email: str = ""
    lsg_service_password: str = ""

    # Claves Fernet para cifrar en reposo el token de sesion de cada usuario y,
    # si lo acepto, su contrasena (reconexion automatica). Separadas por comas y
    # la mas nueva primero. Rotar = anteponer una clave nueva; las viejas siguen
    # descifrando. Obligatoria: vacio -> /link responde 503 y no hay vinculo.
    # Generar: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    lsg_credential_keys: str = ""

    # Configuracion del sensor EggSys en LSG-Core (Fase 0: provision_sensor.py)
    eggsys_sensor_id: int = 0
    # Endpoint por defecto: se usa para los event_type que no esten en el mapa.
    eggsys_sensor_endpoint_id: int = 0
    # Un endpoint por conducta (ver docs/lsg-sensor-endpoints.md). En el .env va
    # como JSON: EGGSYS_ENDPOINT_IDS={"streak.daily_logging": 8, ...}
    eggsys_endpoint_ids: dict[str, int] = {}

    # IDs de dimension de puntos (Fase 0: descubiertos via GET /attributes)
    point_dimension_cognitivo: int = 0
    point_dimension_afectivo: int = 0
    point_dimension_linguistico: int = 0

    # Topes globales anti-farmeo
    cap_daily: int = 20
    cap_weekly: int = 60
    cap_monthly: int = 150

    # Reintentos
    retry_max_attempts: int = 5

    # Ventana maxima para eventos con occurred_at antiguo (dias)
    event_max_age_days: int = 30

    def endpoint_id_for(self, event_type: str) -> int:
        """id_sensor_endpoint de la conducta, o el endpoint por defecto."""
        return self.eggsys_endpoint_ids.get(event_type) or self.eggsys_sensor_endpoint_id

    @property
    def configured_endpoint_ids(self) -> list[int]:
        """Endpoints a activar para un jugador al vincularlo, sin repetidos."""
        ids = list(self.eggsys_endpoint_ids.values())
        if not ids and self.eggsys_sensor_endpoint_id:
            ids = [self.eggsys_sensor_endpoint_id]
        return sorted({i for i in ids if i})


settings = Settings()
