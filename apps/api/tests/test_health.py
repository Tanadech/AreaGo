"""Tests for the health endpoint.

The health check degrades gracefully: even with no database or Redis available
in the test environment, the endpoint must return HTTP 200 with a valid body.
"""

from __future__ import annotations

from httpx import AsyncClient


async def test_health_returns_200_and_status(client: AsyncClient) -> None:
    response = await client.get("/api/v1/health")

    assert response.status_code == 200

    body = response.json()
    # Contract: status + per-dependency fields + env are always present.
    assert "status" in body
    assert body["status"] in {"ok", "degraded"}
    assert body["db"] in {"ok", "down"}
    assert body["redis"] in {"ok", "down"}
    assert "env" in body


async def test_openapi_served_under_v1_prefix(client: AsyncClient) -> None:
    response = await client.get("/api/v1/openapi.json")

    assert response.status_code == 200
    schema = response.json()
    assert schema["info"]["title"] == "AreaScan API"
    # Health path is registered under the v1 prefix.
    assert "/api/v1/health" in schema["paths"]
