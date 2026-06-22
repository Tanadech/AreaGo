"""Health check endpoint.

Probes the database (``SELECT 1``) and Redis (``PING``). Each dependency is
checked independently and failures are caught: a degraded dependency reports
``"down"`` but the endpoint still returns HTTP 200 so orchestrators can read
component-level status instead of a hard failure.
"""

from __future__ import annotations

from fastapi import APIRouter
from redis.asyncio import Redis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.db import get_sessionmaker
from app.core.logging import get_logger
from app.core.redis import get_redis_client
from app.schemas.common import HealthResponse

router = APIRouter(tags=["health"])
logger = get_logger(__name__)


async def _check_db() -> bool:
    """Return True if a trivial query succeeds, False otherwise."""
    try:
        factory = get_sessionmaker()
        session: AsyncSession
        async with factory() as session:
            await session.execute(text("SELECT 1"))
        return True
    except Exception as exc:  # noqa: BLE001 - health checks must never raise
        logger.warning("health: database check failed", extra={"error": str(exc)})
        return False


async def _check_redis() -> bool:
    """Return True if Redis responds to PING, False otherwise."""
    try:
        client: Redis = get_redis_client()
        return bool(await client.ping())
    except Exception as exc:  # noqa: BLE001 - health checks must never raise
        logger.warning("health: redis check failed", extra={"error": str(exc)})
        return False


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Service health and dependency status",
)
async def health() -> HealthResponse:
    """Report overall and per-dependency health. Always returns HTTP 200."""
    settings = get_settings()

    db_ok = await _check_db()
    redis_ok = await _check_redis()

    return HealthResponse(
        status="ok" if (db_ok and redis_ok) else "degraded",
        db="ok" if db_ok else "down",
        redis="ok" if redis_ok else "down",
        env=settings.ENV,
    )
