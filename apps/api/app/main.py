"""FastAPI application factory and ASGI entrypoint.

Responsibilities:
- Lifespan: warm up the async DB engine and Redis pool on startup, dispose on
  shutdown.
- Middleware: CORS (from ``CORS_ORIGINS``) and security headers
  (CSP / HSTS / X-Content-Type-Options / Referrer-Policy).
- Error handling: every handled error renders the standardized envelope
  ``{ "error": { "code", "message", "details" } }``.
- Routing: mounts the v1 API under ``/api/v1`` with OpenAPI at
  ``/api/v1/openapi.json``.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.db import dispose_engine, get_engine
from app.core.logging import configure_logging, get_logger
from app.core.rate_limit import limiter
from app.core.redis import close_redis, get_redis_client
from app.schemas.common import ErrorDetail, ErrorEnvelope

API_V1_PREFIX = "/api/v1"

logger = get_logger(__name__)


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Open shared resources on startup and release them on shutdown."""
    settings = get_settings()
    configure_logging(level="INFO")
    logger.info("startup: initializing resources", extra={"env": settings.ENV})

    # Instantiate the engine and redis client so pools are ready to serve the
    # first request. Connectivity itself is validated lazily by the health check.
    get_engine()
    # Redis is optional: if it isn't configured/reachable, keep serving (rate
    # limiting falls back to in-memory storage). Never let it crash startup.
    try:
        get_redis_client()
    except Exception:  # noqa: BLE001 - startup must not depend on Redis
        logger.warning("redis client unavailable at startup; continuing without it")

    try:
        yield
    finally:
        logger.info("shutdown: releasing resources")
        await dispose_engine()
        await close_redis()


# ---------------------------------------------------------------------------
# Security headers middleware
# ---------------------------------------------------------------------------
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Attach common security headers to every response."""

    def __init__(self, app: ASGIApp, *, enable_hsts: bool) -> None:
        super().__init__(app)
        self._enable_hsts = enable_hsts

    async def dispatch(self, request: Request, call_next):  # type: ignore[override]
        response = await call_next(request)
        headers = response.headers
        headers.setdefault("X-Content-Type-Options", "nosniff")
        headers.setdefault("X-Frame-Options", "DENY")
        headers.setdefault("Referrer-Policy", "no-referrer")
        headers.setdefault(
            "Content-Security-Policy",
            "default-src 'self'; frame-ancestors 'none'; base-uri 'self'",
        )
        headers.setdefault(
            "Permissions-Policy",
            "geolocation=(), microphone=(), camera=()",
        )
        # Only advertise HSTS in production (avoids pinning HTTPS in local dev).
        if self._enable_hsts:
            headers.setdefault(
                "Strict-Transport-Security",
                "max-age=31536000; includeSubDomains; preload",
            )
        return response


# ---------------------------------------------------------------------------
# Error envelope helpers
# ---------------------------------------------------------------------------
def _envelope_response(
    status_code: int,
    code: str,
    message: str,
    details: dict | None = None,
) -> JSONResponse:
    payload = ErrorEnvelope(
        error=ErrorDetail(code=code, message=message, details=details or {})
    )
    return JSONResponse(status_code=status_code, content=jsonable_encoder(payload))


def _register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(
        request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        detail = exc.detail if isinstance(exc.detail, str) else "HTTP error"
        return _envelope_response(
            status_code=exc.status_code,
            code=f"http_{exc.status_code}",
            message=detail,
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return _envelope_response(
            status_code=422,
            code="validation_error",
            message="Request validation failed.",
            details={"errors": jsonable_encoder(exc.errors())},
        )

    @app.exception_handler(RateLimitExceeded)
    async def rate_limit_handler(
        request: Request, exc: RateLimitExceeded
    ) -> JSONResponse:
        return _envelope_response(
            status_code=429,
            code="rate_limited",
            message="Too many requests. Please slow down.",
            details={"limit": str(exc.detail)},
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        logger.exception("unhandled exception", extra={"path": request.url.path})
        return _envelope_response(
            status_code=500,
            code="internal_error",
            message="An unexpected error occurred.",
        )


# ---------------------------------------------------------------------------
# Application factory
# ---------------------------------------------------------------------------
def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="AreaScan API",
        version="0.1.0",
        description="AreaScan Tourism Platform backend.",
        openapi_url=f"{API_V1_PREFIX}/openapi.json",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # Rate limiting (slowapi). Register the shared limiter on app.state, add its
    # middleware (emits X-RateLimit-* headers), and wire the 429 handler.
    app.state.limiter = limiter
    app.add_middleware(SlowAPIMiddleware)

    # CORS — explicit allowlist from settings.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Security headers (HSTS only in production).
    app.add_middleware(SecurityHeadersMiddleware, enable_hsts=settings.is_prod)

    # Standardized error envelopes.
    _register_exception_handlers(app)

    # Mount v1 API.
    app.include_router(api_router, prefix=API_V1_PREFIX)

    return app


app = create_app()
