"""Internal user read/update schemas (Pydantic v2).

Kept intentionally minimal — public auth responses live in ``app.schemas.auth``.
These are for internal service/repository use and future profile editing.
"""

from __future__ import annotations

import datetime as dt
import uuid

from pydantic import BaseModel, ConfigDict, Field


class UserRead(BaseModel):
    """Full internal user read model (from ORM)."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    display_name: str
    avatar_url: str | None = None
    is_active: bool
    email_verified: bool
    created_at: dt.datetime
    updated_at: dt.datetime


class UserUpdate(BaseModel):
    """Partial update for a user's editable profile fields."""

    display_name: str | None = Field(default=None, min_length=1, max_length=120)
    avatar_url: str | None = Field(default=None, max_length=2048)
