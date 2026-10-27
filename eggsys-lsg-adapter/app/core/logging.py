"""Configuracion de logging del adaptador EggSys-LSG."""

import logging
import sys


def setup_logging() -> None:
    """Configura el sistema de logging de la aplicacion."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)],
    )
