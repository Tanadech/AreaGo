"""Tests for the trips API.

Every trip endpoint requires authentication. The auth-gate tests below override
the DB-session dependency with a no-op (the 401 path never touches the session),
so they run anywhere — including locally without the async DB driver — and prove
the trips router is mounted under /api/v1, requires auth, and returns the
standardized error envelope. Full CRUD (create -> save -> list -> get -> delete)
is exercised by the DB-backed integration suite when a database is reachable
(CI), alongside the shared harness used by ``test_auth.py``.
"""

from __future__ import annotations

from collections.abc import AsyncIterator

import pytest
from httpx import AsyncClient

from app.core.db import get_session
from app.main import app

_TRIP = "/api/v1/trips/00000000-0000-0000-0000-000000000000"
_PLACE_JSON = {"place_id": "00000000-0000-0000-0000-000000000001"}
_REORDER_JSON = {
    "items": [
        {
            "id": "00000000-0000-0000-0000-000000000002",
            "day_no": 1,
            "sort_order": 0,
        }
    ]
}


async def _no_session() -> AsyncIterator[None]:
    """Override for get_session — the unauthenticated path never uses it."""
    yield None


@pytest.fixture
def no_db() -> AsyncIterator[None]:
    """Replace the real DB session dependency so auth-gate tests need no driver."""
    app.dependency_overrides[get_session] = _no_session
    try:
        yield
    finally:
        app.dependency_overrides.pop(get_session, None)


@pytest.mark.parametrize(
    ("method", "path", "json"),
    [
        ("get", "/api/v1/trips", None),
        ("post", "/api/v1/trips", {"title": "My Trip"}),
        ("get", _TRIP, None),
        ("patch", _TRIP, {"title": "Renamed"}),
        ("delete", _TRIP, None),
        ("post", f"{_TRIP}/items", _PLACE_JSON),
        ("put", f"{_TRIP}/reorder", _REORDER_JSON),
        ("delete", f"{_TRIP}/items/00000000-0000-0000-0000-000000000002", None),
    ],
)
async def test_trip_endpoints_require_auth(
    client: AsyncClient,
    no_db: None,
    method: str,
    path: str,
    json: dict | None,
) -> None:
    """Every trip endpoint must 401 (with the error envelope) when unauthenticated.

    A valid body is sent for write methods so authentication — not body
    validation — is the sole failure, yielding a deterministic 401.
    """
    resp = await client.request(method, path, json=json)
    assert resp.status_code == 401
    body = resp.json()
    assert body["error"]["code"] == "http_401"


async def test_trips_router_is_mounted(client: AsyncClient) -> None:
    """The OpenAPI schema should register the trip routes under /api/v1."""
    paths = (await client.get("/api/v1/openapi.json")).json()["paths"]
    assert "/api/v1/trips" in paths
    assert "/api/v1/trips/{trip_id}" in paths
    assert "/api/v1/trips/{trip_id}/items" in paths
    assert "/api/v1/trips/{trip_id}/items/{item_id}" in paths
    assert "/api/v1/trips/{trip_id}/reorder" in paths
    assert "put" in paths["/api/v1/trips/{trip_id}/reorder"]
