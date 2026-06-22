"""Async data access for users, roles, and refresh tokens.

All methods take an ``AsyncSession`` and DO NOT commit — transaction boundaries
are owned by the service layer / request lifecycle. Roles are eager-loaded where
a caller needs role codes (e.g. building the public user response).
"""

from __future__ import annotations

import datetime as dt
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import hash_refresh_token
from app.models.rbac import RefreshToken, Role, User, UserRole

# Roles eagerly loaded as: user -> user_roles -> role
_ROLES_LOADER = selectinload(User.user_roles).selectinload(UserRole.role)


def role_codes(user: User) -> list[str]:
    """Return the sorted role codes for a user whose roles are loaded."""
    return sorted(ur.role.code for ur in user.user_roles)


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------
async def get_by_email(session: AsyncSession, email: str) -> User | None:
    """Fetch a user by email (case-insensitive via CITEXT) with roles loaded."""
    stmt = select(User).options(_ROLES_LOADER).where(User.email == email)
    return (await session.execute(stmt)).scalar_one_or_none()


async def get_by_id(session: AsyncSession, user_id: uuid.UUID) -> User | None:
    """Fetch a user by id with roles eager-loaded."""
    stmt = select(User).options(_ROLES_LOADER).where(User.id == user_id)
    return (await session.execute(stmt)).scalar_one_or_none()


async def get_by_google_sub(session: AsyncSession, google_sub: str) -> User | None:
    """Fetch a user by their Google subject id with roles loaded."""
    stmt = select(User).options(_ROLES_LOADER).where(User.google_sub == google_sub)
    return (await session.execute(stmt)).scalar_one_or_none()


async def create_user(
    session: AsyncSession,
    *,
    email: str,
    display_name: str,
    password_hash: str | None = None,
    google_sub: str | None = None,
    avatar_url: str | None = None,
    email_verified: bool = False,
) -> User:
    """Insert a new user and flush so its server-generated id is available."""
    user = User(
        email=email,
        display_name=display_name,
        password_hash=password_hash,
        google_sub=google_sub,
        avatar_url=avatar_url,
        email_verified=email_verified,
    )
    session.add(user)
    await session.flush()
    return user


async def attach_role(session: AsyncSession, user: User, role_code: str) -> None:
    """Grant ``role_code`` to ``user`` (idempotent). Raises if the role is unknown."""
    role = (
        await session.execute(select(Role).where(Role.code == role_code))
    ).scalar_one_or_none()
    if role is None:
        raise ValueError(f"unknown role: {role_code}")

    existing = (
        await session.execute(
            select(UserRole).where(
                UserRole.user_id == user.id, UserRole.role_id == role.id
            )
        )
    ).scalar_one_or_none()
    if existing is None:
        session.add(UserRole(user_id=user.id, role_id=role.id))
        await session.flush()


# ---------------------------------------------------------------------------
# Refresh tokens
# ---------------------------------------------------------------------------
async def store_refresh_token(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    raw_token: str,
    expires_at: dt.datetime,
    user_agent: str | None = None,
    ip: str | None = None,
) -> RefreshToken:
    """Persist a refresh token by its hash (never the raw value) and flush."""
    row = RefreshToken(
        user_id=user_id,
        token_hash=hash_refresh_token(raw_token),
        expires_at=expires_at,
        user_agent=user_agent,
        ip=ip,
    )
    session.add(row)
    await session.flush()
    return row


async def get_refresh_by_hash(
    session: AsyncSession, token_hash: str
) -> RefreshToken | None:
    """Look up a stored refresh token row by its SHA-256 hash."""
    stmt = select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    return (await session.execute(stmt)).scalar_one_or_none()


async def rotate_refresh_token(
    session: AsyncSession,
    *,
    current: RefreshToken,
    new_raw_token: str,
    expires_at: dt.datetime,
    user_agent: str | None = None,
    ip: str | None = None,
) -> RefreshToken:
    """Rotate a token: mark ``current`` revoked, insert + link its replacement."""
    new_row = RefreshToken(
        user_id=current.user_id,
        token_hash=hash_refresh_token(new_raw_token),
        expires_at=expires_at,
        user_agent=user_agent,
        ip=ip,
    )
    session.add(new_row)
    await session.flush()  # populate new_row.id before linking

    current.revoked_at = dt.datetime.now(dt.UTC)
    current.replaced_by = new_row.id
    await session.flush()
    return new_row


async def revoke_refresh_token(
    session: AsyncSession, token: RefreshToken
) -> None:
    """Revoke a single refresh token (no-op if already revoked)."""
    if token.revoked_at is None:
        token.revoked_at = dt.datetime.now(dt.UTC)
        await session.flush()


async def revoke_family(session: AsyncSession, user_id: uuid.UUID) -> int:
    """Revoke every still-active refresh token for a user (reuse-detection).

    Used when a previously-rotated (revoked) token is replayed: the safe response
    is to invalidate the whole chain so a stolen token cannot be leveraged.
    Returns the number of tokens revoked.
    """
    now = dt.datetime.now(dt.UTC)
    stmt = select(RefreshToken).where(
        RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None)
    )
    tokens = (await session.execute(stmt)).scalars().all()
    for tok in tokens:
        tok.revoked_at = now
    if tokens:
        await session.flush()
    return len(tokens)
