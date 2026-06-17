"""Shared FastAPI dependencies.

Re-exports the common dependencies so routers can import them from a single
place, and provides annotated aliases for ergonomic typing in handlers.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.db import get_session
from app.core.redis import get_redis

# Annotated dependency aliases — use as: `db: SessionDep` in a handler signature.
SessionDep = Annotated[AsyncSession, Depends(get_session)]
RedisDep = Annotated[Redis, Depends(get_redis)]
SettingsDep = Annotated[Settings, Depends(get_settings)]

__all__ = [
    "RedisDep",
    "SessionDep",
    "SettingsDep",
    "get_redis",
    "get_session",
    "get_settings",
]
