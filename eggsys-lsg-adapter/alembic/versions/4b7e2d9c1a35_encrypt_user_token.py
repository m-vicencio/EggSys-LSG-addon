"""encrypt user token

Revision ID: 4b7e2d9c1a35
Revises: 9e19786f63ee
Create Date: 2026-10-26 12:00:00.000000

El tipo de la columna no cambia (sigue siendo Text): lo que cambia es que
models.EncryptedToken guarda el token cifrado con Fernet. Los tokens que ya
estaban en claro se borran en vez de cifrarse aqui, para no meter las claves en
la migracion. Viven 120 min, asi que perderlos solo fuerza el re-login
automatico (si el usuario lo acepto) o una revinculacion.
"""
from alembic import op


revision = '4b7e2d9c1a35'
down_revision = '9e19786f63ee'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Todo token Fernet empieza por "gAAAAA" (byte de version 0x80 en base64).
    op.execute(
        "UPDATE lsg_connections SET user_token = NULL, user_token_expires_at = NULL "
        "WHERE user_token IS NOT NULL AND user_token NOT LIKE 'gAAAAA%'"
    )


def downgrade() -> None:
    # Los tokens borrados no se pueden recuperar, y los cifrados el codigo
    # anterior los leeria como basura: se borran tambien.
    op.execute("UPDATE lsg_connections SET user_token = NULL, user_token_expires_at = NULL")
