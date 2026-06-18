"""Add google_place_id to places (dedupe places saved from Google Places).

A unique index lets the save endpoint be idempotent: saving the same Google
place twice returns the existing row instead of creating a duplicate. The column
is nullable (admin-curated places have no Google id), and Postgres treats NULLs
as distinct so many rows may have a NULL google_place_id.

Revision ID: 0004_place_google_place_id
Revises: 0003_refresh_token_hash_unique
Create Date: 2026-06-18
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "0004_place_google_place_id"
down_revision = "0003_refresh_token_hash_unique"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("places", sa.Column("google_place_id", sa.Text(), nullable=True))
    op.create_index(
        "ix_places_google_place_id",
        "places",
        ["google_place_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_places_google_place_id", table_name="places")
    op.drop_column("places", "google_place_id")
