"""Tests for the public places / catalog / geo track.

Two layers:

1. Pure unit tests that compile the PostGIS expressions to SQL strings and assert
   they reference ST_DWithin / ST_Distance / ST_MakePoint — these need NO database.
2. Integration tests against the live ASGI app; each is guarded by a fixture that
   probes the database and SKIPS when none is reachable (they run in CI).
"""

from __future__ import annotations

import pytest
import pytest_asyncio
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.dialects import postgresql

from app.api.v1 import categories as categories_router
from app.api.v1 import geo as geo_router
from app.api.v1 import places as places_router
from app.core.db import get_session
from app.models.catalog import Place
from app.repositories.place_repo import PlaceFilters, _list_select
from app.services import geo


async def _stub_session():
    """A no-op session dependency for pure validation tests.

    Query-param validation (422) fires before the handler body runs, so a stub
    session is never actually used by the negative tests — this just lets the
    dependency resolve without importing the asyncpg driver / opening a DB.
    """
    yield None


def _build_app(*, stub_db: bool) -> FastAPI:
    """Build a minimal app mounting only this track's routers under /api/v1.

    Mounting locally keeps these tests independent of the orchestrator that wires
    routers into the production app's ``router.py`` (which this track must not edit).
    When ``stub_db`` is True the real session dependency is overridden so pure
    validation tests don't require a database driver.
    """
    test_app = FastAPI()
    test_app.include_router(places_router.router, prefix="/api/v1")
    test_app.include_router(categories_router.router, prefix="/api/v1")
    test_app.include_router(geo_router.router, prefix="/api/v1")
    if stub_db:
        test_app.dependency_overrides[get_session] = _stub_session
    return test_app


# App that uses the real DB session (for DB-guarded integration tests).
_app = _build_app(stub_db=False)
# App with a stubbed session (for pure query-param validation tests).
_validation_app = _build_app(stub_db=True)


def _compile(expr) -> str:
    """Compile a SQLAlchemy expression to a PostgreSQL SQL string."""
    return str(
        expr.compile(
            dialect=postgresql.dialect(),
            compile_kwargs={"literal_binds": True},
        )
    )


# ---------------------------------------------------------------------------
# Pure unit tests — no database required
# ---------------------------------------------------------------------------
def test_make_point_builds_geography_point() -> None:
    sql = _compile(geo.make_point(lat=18.79, lng=98.98))
    assert "ST_SetSRID" in sql
    assert "ST_MakePoint" in sql
    # PostGIS takes (lng, lat); longitude must appear before latitude.
    assert sql.index("98.98") < sql.index("18.79")


def test_distance_expression_uses_st_distance() -> None:
    point = geo.make_point(lat=13.75, lng=100.5)
    sql = _compile(geo.distance_m(Place.location, point))
    assert "ST_Distance" in sql


def test_within_radius_uses_st_dwithin() -> None:
    point = geo.make_point(lat=13.75, lng=100.5)
    sql = _compile(geo.within_radius(Place.location, point, 5000))
    assert "ST_DWithin" in sql
    assert "5000" in sql


def test_lat_lng_helpers_extract_coordinates() -> None:
    lat_sql = _compile(geo.lat_of(Place.location))
    lng_sql = _compile(geo.lng_of(Place.location))
    assert "ST_Y" in lat_sql
    assert "ST_X" in lng_sql


def test_list_select_filters_to_approved_status() -> None:
    stmt = _list_select(PlaceFilters(sort="rating"))
    sql = _compile(stmt)
    assert "'approved'" in sql
    # Coordinate projection is present in the select list.
    assert "ST_X" in sql
    assert "ST_Y" in sql


def test_list_select_applies_filters_and_trgm_search() -> None:
    stmt = _list_select(
        PlaceFilters(category_id=3, kind="restaurant", province_id=1, q="cafe", sort="rating")
    )
    sql = _compile(stmt)
    assert "category_id" in sql
    assert "kind" in sql
    assert "province_id" in sql
    # pg_trgm operator and ILIKE fallback both present.
    assert "%" in sql
    assert "ILIKE" in sql.upper()


def test_search_radius_query_orders_by_distance() -> None:
    from app.repositories import place_repo

    point = geo.make_point(lat=13.75, lng=100.5)
    stmt = (
        select(Place.id)
        .where(Place.status == place_repo.APPROVED)
        .where(geo.within_radius(Place.location, point, 1000))
        .order_by(geo.distance_m(Place.location, point).asc())
    )
    sql = _compile(stmt)
    assert "ST_DWithin" in sql
    assert "ORDER BY" in sql.upper()
    assert "ST_Distance" in sql


# ---------------------------------------------------------------------------
# Integration tests — guarded to SKIP without a reachable database
# ---------------------------------------------------------------------------
async def _db_reachable() -> bool:
    """Probe the configured database; True if a trivial query succeeds."""
    from sqlalchemy import text

    from app.core.db import get_sessionmaker

    try:
        factory = get_sessionmaker()
        async with factory() as session:
            await session.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


@pytest_asyncio.fixture
async def db_client() -> AsyncClient:
    """Yield an ASGI client, skipping the test if no database is reachable."""
    if not await _db_reachable():
        pytest.skip("No database reachable; skipping DB-dependent integration test.")
    transport = ASGITransport(app=_app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client


@pytest.mark.asyncio
async def test_list_places_returns_page_shape(db_client: AsyncClient) -> None:
    resp = await db_client.get("/api/v1/places", params={"page": 1, "size": 5})
    assert resp.status_code == 200
    body = resp.json()
    assert set(body) >= {"items", "total", "page", "size"}
    assert body["page"] == 1
    assert body["size"] == 5


@pytest.mark.asyncio
async def test_categories_returns_list(db_client: AsyncClient) -> None:
    resp = await db_client.get("/api/v1/categories")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_provinces_returns_list(db_client: AsyncClient) -> None:
    resp = await db_client.get("/api/v1/provinces")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_search_requires_lat_lng(db_client: AsyncClient) -> None:
    # Missing lat/lng must fail validation (422) before touching the DB.
    resp = await db_client.get("/api/v1/places/search")
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_unknown_place_returns_404(db_client: AsyncClient) -> None:
    resp = await db_client.get("/api/v1/places/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Validation tests — these do not need a DB (422 fires before the handler)
# ---------------------------------------------------------------------------
@pytest_asyncio.fixture
async def client() -> AsyncClient:
    transport = ASGITransport(app=_validation_app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client


@pytest.mark.asyncio
async def test_search_rejects_out_of_range_radius(client: AsyncClient) -> None:
    resp = await client.get(
        "/api/v1/places/search",
        params={"lat": 13.75, "lng": 100.5, "radius_m": 999999},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_search_rejects_bad_latitude(client: AsyncClient) -> None:
    resp = await client.get(
        "/api/v1/places/search",
        params={"lat": 200, "lng": 100.5, "radius_m": 1000},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_list_rejects_page_zero(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/places", params={"page": 0})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_list_rejects_oversized_size(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/places", params={"size": 9999})
    assert resp.status_code == 422
