"""Integration tests for the auth flow (register / login / refresh / me / logout).

These require a reachable PostgreSQL database and therefore SKIP automatically
when no database is available (e.g. local dev without Docker). They run in CI.

The ``db_app`` fixture:
- attempts a connection to ``settings.DATABASE_URL``; on failure -> pytest.skip,
- creates all tables and seeds the three roles,
- overrides the app's ``get_session`` dependency to use a test sessionmaker,
- tears the schema back down afterward.

NOTE: PostGIS types are used by some tables; creating the full metadata requires
the postgis/citext/pgcrypto extensions. CI provisions these via the initial
migration image, so ``create_all`` of the geography columns succeeds there.
"""

from __future__ import annotations

from collections.abc import AsyncIterator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import get_settings


async def _database_reachable(url: str) -> bool:
    # Guard the whole path: engine creation can raise if the async driver
    # (asyncpg) is not installed locally; connection can raise if no DB is up.
    # Either way we want a clean skip, not a collection error.
    try:
        engine = create_async_engine(url)
    except Exception:
        return False
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
    finally:
        await engine.dispose()


@pytest_asyncio.fixture
async def db_app() -> AsyncIterator[AsyncClient]:
    settings = get_settings()
    url = settings.DATABASE_URL

    if not await _database_reachable(url):
        pytest.skip("no database reachable; skipping auth integration tests")

    # Import models so Base.metadata is fully populated.
    from app.core.db import get_session
    from app.main import app
    from app.models import Base  # noqa: F401  (ensures all models imported)

    engine = create_async_engine(url)
    sessionmaker = async_sessionmaker(bind=engine, expire_on_commit=False, autoflush=False)

    # Bootstrap schema + required extensions + seed roles.
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS citext"))
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS pgcrypto"))
        await conn.run_sync(Base.metadata.create_all)
        for code, name in (("traveler", "Traveler"), ("merchant", "Merchant"), ("admin", "Admin")):
            await conn.execute(
                text(
                    "INSERT INTO roles (code, name) VALUES (:c, :n) "
                    "ON CONFLICT (code) DO NOTHING"
                ),
                {"c": code, "n": name},
            )

    async def _override_session() -> AsyncIterator:
        async with sessionmaker() as session:
            try:
                yield session
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_session] = _override_session

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client

    app.dependency_overrides.pop(get_session, None)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


def _unique_email() -> str:
    import uuid

    return f"user-{uuid.uuid4().hex[:12]}@example.com"


async def test_register_then_me(db_app: AsyncClient) -> None:
    email = _unique_email()
    r = await db_app.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "supersecret123", "display_name": "Tester"},
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["token_type"] == "bearer"
    assert body["expires_in"] > 0
    access = body["access_token"]

    me = await db_app.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {access}"})
    assert me.status_code == 200
    profile = me.json()
    assert profile["email"].lower() == email.lower()
    assert "traveler" in profile["roles"]


async def test_register_duplicate_email_conflicts(db_app: AsyncClient) -> None:
    email = _unique_email()
    payload = {"email": email, "password": "supersecret123", "display_name": "Dup"}
    first = await db_app.post("/api/v1/auth/register", json=payload)
    assert first.status_code == 201
    second = await db_app.post("/api/v1/auth/register", json=payload)
    assert second.status_code == 409


async def test_login_and_refresh_rotation(db_app: AsyncClient) -> None:
    email = _unique_email()
    await db_app.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "supersecret123", "display_name": "Login"},
    )
    # Fresh client cookie jar already holds the refresh cookie from register.
    login = await db_app.post(
        "/api/v1/auth/login", json={"email": email, "password": "supersecret123"}
    )
    assert login.status_code == 200
    cookie_name = get_settings().REFRESH_COOKIE_NAME
    assert cookie_name in db_app.cookies

    first_cookie = db_app.cookies.get(cookie_name)
    refreshed = await db_app.post("/api/v1/auth/refresh")
    assert refreshed.status_code == 200
    assert refreshed.json()["access_token"]
    # Rotation: the cookie value must change.
    assert db_app.cookies.get(cookie_name) != first_cookie


async def test_login_wrong_password_is_generic_401(db_app: AsyncClient) -> None:
    email = _unique_email()
    await db_app.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "supersecret123", "display_name": "Wrong"},
    )
    r = await db_app.post(
        "/api/v1/auth/login", json={"email": email, "password": "totally-wrong"}
    )
    assert r.status_code == 401
    # No user-enumeration: message identical to unknown-email path.
    assert r.json()["error"]["message"] == "Invalid email or password."


async def test_refresh_reuse_revokes_family(db_app: AsyncClient) -> None:
    email = _unique_email()
    await db_app.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "supersecret123", "display_name": "Reuse"},
    )
    cookie_name = get_settings().REFRESH_COOKIE_NAME
    stolen = db_app.cookies.get(cookie_name)

    # Legit rotation invalidates `stolen`.
    ok = await db_app.post("/api/v1/auth/refresh")
    assert ok.status_code == 200

    # Replaying the old (now revoked) token must 401 (and revoke the family).
    replay = await db_app.post(
        "/api/v1/auth/refresh", cookies={cookie_name: stolen}
    )
    assert replay.status_code == 401

    # Family revoked: even the current valid cookie is now dead.
    after = await db_app.post("/api/v1/auth/refresh")
    assert after.status_code == 401


async def test_me_requires_auth(db_app: AsyncClient) -> None:
    r = await db_app.get("/api/v1/auth/me")
    assert r.status_code == 401
