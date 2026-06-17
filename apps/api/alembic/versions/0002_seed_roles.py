"""Seed the three application roles (traveler, merchant, admin).

Data migration only — no schema changes. Idempotent on upgrade (skips codes that
already exist); downgrade removes exactly these three role codes.

Revision ID: 0002_seed_roles
Revises: 0001_initial
Create Date: 2026-06-17
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "0002_seed_roles"
down_revision = "0001_initial"
branch_labels = None
depends_on = None

# (code, display name)
_ROLES: list[tuple[str, str]] = [
    ("traveler", "Traveler"),
    ("merchant", "Merchant"),
    ("admin", "Admin"),
]


def upgrade() -> None:
    for code, name in _ROLES:
        # ON CONFLICT keeps the migration idempotent if a role already exists.
        op.execute(
            sa.text(
                "INSERT INTO roles (code, name) VALUES (:code, :name) "
                "ON CONFLICT (code) DO NOTHING"
            ).bindparams(code=code, name=name)
        )


def downgrade() -> None:
    codes = tuple(code for code, _ in _ROLES)
    op.execute(
        sa.text("DELETE FROM roles WHERE code IN :codes").bindparams(
            sa.bindparam("codes", value=codes, expanding=True)
        )
    )
