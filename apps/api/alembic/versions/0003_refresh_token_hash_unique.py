"""Add a unique index on refresh_tokens.token_hash.

Makes get_refresh_by_hash an index lookup instead of a full table scan (hot path
on every /auth/refresh and /auth/logout) and enforces the uniqueness that the
rotation / reuse-detection logic implicitly assumes.

Revision ID: 0003_refresh_token_hash_unique
Revises: 0002_seed_roles
Create Date: 2026-06-17
"""

from __future__ import annotations

from alembic import op

# revision identifiers, used by Alembic.
revision = "0003_refresh_token_hash_unique"
down_revision = "0002_seed_roles"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        "ix_refresh_tokens_token_hash",
        "refresh_tokens",
        ["token_hash"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_refresh_tokens_token_hash", table_name="refresh_tokens")
