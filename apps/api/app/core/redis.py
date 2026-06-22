"""Async Redis client factory and FastAPI dependency."""

from __future__ import annotations

from collections.abc import AsyncGenerator

import redis.asyncio as aioredis
from redis.asyncio import Redis

from app.core.config import get_settings

# Process-wide client (holds a connection pool internally). Created lazily.
_client: Redis | None = None


def get_redis_client() -> Redis:
    """Return the process-wide async Redis client, creating it on first use."""
    global _client
    if _client is None:
        settings = get_settings()
        _client = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            health_check_interval=30,
        )
    return _client


async def get_redis() -> AsyncGenerator[Redis, None]:
    """FastAPI dependency yielding the shared async Redis client."""
    yield get_redis_client()


async def close_redis() -> None:
    """Close the Redis client and its pool (called on application shutdown)."""
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None
