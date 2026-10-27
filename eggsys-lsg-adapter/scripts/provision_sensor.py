"""Fase 0: provisioning del sensor EggSys en LSG-Core.

Descubre (o guia la creacion de) el sensor EggSys, su endpoint y los IDs
reales de las dimensiones de puntos, e imprime las lineas de .env resultantes.

Uso:
    uv run python scripts/provision_sensor.py <email> <password>
    (login puntual de un researcher/admin; los catalogos son de lectura para
     cualquier rol. No hay cuenta de servicio persistente.)
"""

import asyncio
import sys

import httpx

from app.clients.lsg_auth import lsg_auth_client
from app.core.config import settings

# Nombres de dimension segun el dump real de LSG (bGames_backup.sql):
# Social, Fisica, Afectivo, Cognitivo, Linguistico
WANTED_DIMENSIONS = ("cognitivo", "afectivo", "linguistico")
SENSOR_NAME_HINT = "eggsys"


async def _get(client: httpx.AsyncClient, token: str, path: str):
    response = await client.get(
        f"{settings.lsg_core_base_url}{path}",
        headers={"Authorization": f"Bearer {token}"},
        timeout=15.0,
    )
    response.raise_for_status()
    return response.json()


async def main() -> None:
    if len(sys.argv) < 3:
        sys.exit("Uso: uv run python scripts/provision_sensor.py <email> <password>")
    email, password = sys.argv[1], sys.argv[2]

    login = await lsg_auth_client.login(email, password)
    token = login["access_token"]
    print(f"✔ Sesion iniciada como {email}\n")

    async with httpx.AsyncClient() as client:
        # 1. Sensores existentes
        sensors = await _get(client, token, "/sensors")
        print("Sensores registrados en LSG-Core:")
        eggsys_sensor = None
        for sensor in sensors:
            name = str(sensor.get("name", ""))
            sensor_id = sensor.get("id_sensor") or sensor.get("id")
            print(f"  [{sensor_id}] {name}")
            if SENSOR_NAME_HINT in name.lower():
                eggsys_sensor = sensor

        if eggsys_sensor is None:
            print(
                "\n✘ No existe un sensor con nombre que contenga 'eggsys'.\n"
                "  Pide al administrador de LSG-Core crearlo (POST /sensors) y re-ejecuta."
            )
            sensor_id = 0
            endpoint_id = 0
        else:
            sensor_id = eggsys_sensor.get("id_sensor") or eggsys_sensor.get("id")
            endpoints = await _get(client, token, f"/sensors/{sensor_id}/endpoints")
            print(f"\nEndpoints del sensor [{sensor_id}]:")
            for endpoint in endpoints:
                print(f"  [{endpoint.get('id_sensor_endpoint') or endpoint.get('id')}] {endpoint.get('name', '')}")
            first = endpoints[0] if endpoints else {}
            endpoint_id = first.get("id_sensor_endpoint") or first.get("id") or 0

        # 2. Dimensiones de puntos (atributos)
        attributes = await _get(client, token, "/attributes")
        print("\nDimensiones/atributos en LSG-Core:")
        dimension_ids: dict[str, int] = {}
        for attribute in attributes:
            name = str(attribute.get("name", ""))
            attr_id = (
                attribute.get("id_point_dimension")
                or attribute.get("id_attributes")
                or attribute.get("id")
            )
            print(f"  [{attr_id}] {name}")
            for wanted in WANTED_DIMENSIONS:
                if wanted in name.lower():
                    dimension_ids[wanted] = attr_id

    print("\n─── Lineas para el .env ───")
    print(f"EGGSYS_SENSOR_ID={sensor_id}")
    print(f"EGGSYS_SENSOR_ENDPOINT_ID={endpoint_id}")
    print(f"POINT_DIMENSION_COGNITIVO={dimension_ids.get('cognitivo', 0)}")
    print(f"POINT_DIMENSION_AFECTIVO={dimension_ids.get('afectivo', 0)}")
    print(f"POINT_DIMENSION_LINGUISTICO={dimension_ids.get('linguistico', 0)}")

    missing = [d for d in WANTED_DIMENSIONS if d not in dimension_ids]
    if missing or not sensor_id or not endpoint_id:
        print("\n⚠ Faltan IDs: verificar manualmente contra la API antes de produccion.")
        if missing:
            print(f"  Dimensiones no encontradas: {', '.join(missing)}")


if __name__ == "__main__":
    asyncio.run(main())
