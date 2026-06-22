"""Pytest fixtures: async HTTP client bound to the ASGI app via httpx.

The client uses ``httpx.ASGITransport`` so requests are dispatched in-process
without binding a socket. NOTE: ASGITransport does NOT run the app's lifespan, so
startup/shutdown hooks do not fire here. The health check still works because the
DB engine and Redis client initialize lazily on first use. When a test needs
lifespan-initialized state, wrap the client with asgi-lifespan's ``LifespanManager``.
"""

from __future__ import annotations

from collections.abc import AsyncIterator

import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest_asyncio.fixture
async def client() -> AsyncIterator[AsyncClient]:
    """Yield an AsyncClient wired to the FastAPI app (lifespan NOT run; see module docstring)."""
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://testserver",
    ) as http_client:
        yield http_client
