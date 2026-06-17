"""Shared slowapi rate limiter.

A single ``Limiter`` instance is created here so that both the application
factory (which registers its exception handler and middleware/state) and the
feature routers (which decorate endpoints with ``@limiter.limit(...)``) reference
the *same* object.

Storage: uses Redis when ``REDIS_URL`` is set (shared across workers), otherwise
falls back to slowapi's in-memory storage so the app runs without Redis (e.g.
local dev and unit tests).
"""

from __future__ import annotations

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import get_settings


def _storage_uri() -> str | None:
    """Return the limiter storage URI (Redis if configured, else in-memory)."""
    settings = get_settings()
    redis_url = (settings.REDIS_URL or "").strip()
    return redis_url or None


# key_func partitions limits by client IP. storage_uri=None -> memory:// default.
limiter = Limiter(key_func=get_remote_address, storage_uri=_storage_uri())
