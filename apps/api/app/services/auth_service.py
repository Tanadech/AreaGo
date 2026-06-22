"""Authentication service: register, login, refresh-rotation, Google, logout.

Security posture:
- Passwords hashed with Argon2id; only hashes are stored.
- Refresh tokens are opaque CSPRNG strings; only SHA-256 hashes are persisted.
- Refresh rotation with reuse-detection: replaying a revoked token revokes the
  whole family and returns 401.
- Generic auth errors (no user-enumeration): invalid email and wrong password
  yield the same message.
- Secrets are never logged.

The service returns ``(user, access_token, raw_refresh_token)`` tuples; the
router is responsible for setting/reading the refresh cookie.
"""

from __future__ import annotations

import datetime as dt
from dataclasses import dataclass

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import (
    access_token_ttl_seconds,
    create_access_token,
    generate_refresh_token,
    hash_password,
    refresh_token_expires_at,
    verify_password,
)
from app.models.rbac import User
from app.repositories import user_repo

# Generic, non-enumerating credential error.
_INVALID_CREDENTIALS = "Invalid email or password."
DEFAULT_ROLE = "traveler"


@dataclass(slots=True)
class IssuedTokens:
    """Result of a successful auth flow."""

    user: User
    access_token: str
    refresh_token: str  # raw value — set as cookie by the router, never stored
    expires_in: int


def _issue_for_user(user: User) -> tuple[str, str, int]:
    """Mint an access token + a fresh raw refresh token for a user."""
    roles = user_repo.role_codes(user)
    access = create_access_token(str(user.id), extra_claims={"roles": roles})
    refresh = generate_refresh_token()
    return access, refresh, access_token_ttl_seconds()


async def register(
    session: AsyncSession,
    *,
    email: str,
    password: str,
    display_name: str,
    user_agent: str | None = None,
    ip: str | None = None,
) -> IssuedTokens:
    """Create a traveler account, reject duplicate email, and issue tokens."""
    existing = await user_repo.get_by_email(session, email)
    if existing is not None:
        # Distinct (409) here is acceptable: registration legitimately needs to
        # tell the client the email is taken. Login stays generic.
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    user = await user_repo.create_user(
        session,
        email=email,
        display_name=display_name,
        password_hash=hash_password(password),
    )
    await user_repo.attach_role(session, user, DEFAULT_ROLE)
    # Reload with roles eager-loaded so role_codes() works without lazy IO.
    user = await user_repo.get_by_id(session, user.id)
    assert user is not None  # just created

    access, refresh, ttl = _issue_for_user(user)
    await user_repo.store_refresh_token(
        session,
        user_id=user.id,
        raw_token=refresh,
        expires_at=refresh_token_expires_at(),
        user_agent=user_agent,
        ip=ip,
    )
    return IssuedTokens(user=user, access_token=access, refresh_token=refresh, expires_in=ttl)


async def authenticate(
    session: AsyncSession,
    *,
    email: str,
    password: str,
    user_agent: str | None = None,
    ip: str | None = None,
) -> IssuedTokens:
    """Verify credentials and issue access + refresh tokens."""
    user = await user_repo.get_by_email(session, email)
    # Always run a verify to keep timing roughly constant whether or not the
    # user exists (mitigates user-enumeration via response time).
    if user is None or not user.password_hash:
        # Burn time against a dummy hash, then fail generically.
        hash_password("timing-equalizer")  # noqa: S106 - intentional dummy work
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=_INVALID_CREDENTIALS
        )

    if not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=_INVALID_CREDENTIALS
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="This account is disabled."
        )

    access, refresh, ttl = _issue_for_user(user)
    await user_repo.store_refresh_token(
        session,
        user_id=user.id,
        raw_token=refresh,
        expires_at=refresh_token_expires_at(),
        user_agent=user_agent,
        ip=ip,
    )
    return IssuedTokens(user=user, access_token=access, refresh_token=refresh, expires_in=ttl)


async def refresh(
    session: AsyncSession,
    *,
    raw_refresh_token: str | None,
    user_agent: str | None = None,
    ip: str | None = None,
) -> IssuedTokens:
    """Validate + ROTATE a refresh token. Detect reuse -> revoke family + 401."""
    if not raw_refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing refresh token."
        )

    from app.core.security import hash_refresh_token

    token_hash = hash_refresh_token(raw_refresh_token)
    row = await user_repo.get_refresh_by_hash(session, token_hash)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token."
        )

    now = dt.datetime.now(dt.UTC)

    # Reuse detection: a token that was already revoked (i.e. previously rotated)
    # is being replayed -> a likely theft. Revoke the entire family.
    if row.revoked_at is not None:
        await user_repo.revoke_family(session, row.user_id)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been revoked.",
        )

    if row.expires_at <= now:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired."
        )

    user = await user_repo.get_by_id(session, row.user_id)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token."
        )

    new_refresh = generate_refresh_token()
    await user_repo.rotate_refresh_token(
        session,
        current=row,
        new_raw_token=new_refresh,
        expires_at=refresh_token_expires_at(),
        user_agent=user_agent,
        ip=ip,
    )
    roles = user_repo.role_codes(user)
    access = create_access_token(str(user.id), extra_claims={"roles": roles})
    return IssuedTokens(
        user=user,
        access_token=access,
        refresh_token=new_refresh,
        expires_in=access_token_ttl_seconds(),
    )


async def google_login(
    session: AsyncSession,
    *,
    id_token: str,
    user_agent: str | None = None,
    ip: str | None = None,
) -> IssuedTokens:
    """Verify a Google ID token and upsert the user by google_sub / email."""
    settings = get_settings()
    if not settings.GOOGLE_OAUTH_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google login is not configured.",
        )

    # Imported lazily so the dependency is only required when this path runs.
    from google.auth.transport import requests as google_requests
    from google.oauth2 import id_token as google_id_token

    try:
        claims = google_id_token.verify_oauth2_token(
            id_token,
            google_requests.Request(),
            settings.GOOGLE_OAUTH_CLIENT_ID,
        )
    except ValueError as exc:  # invalid token / wrong audience / expired
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google credential.",
        ) from exc

    google_sub = claims.get("sub")
    email = claims.get("email")
    if not google_sub or not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google credential.",
        )

    display_name = claims.get("name") or email.split("@")[0]
    avatar_url = claims.get("picture")
    email_verified = bool(claims.get("email_verified", False))

    user = await user_repo.get_by_google_sub(session, google_sub)
    if user is None:
        # Link to an existing email account if present, otherwise create.
        user = await user_repo.get_by_email(session, email)
        if user is None:
            user = await user_repo.create_user(
                session,
                email=email,
                display_name=display_name,
                google_sub=google_sub,
                avatar_url=avatar_url,
                email_verified=email_verified,
            )
            await user_repo.attach_role(session, user, DEFAULT_ROLE)
            user = await user_repo.get_by_id(session, user.id)
            assert user is not None
        else:
            # SECURITY: only auto-link a Google identity to an EXISTING local
            # account when Google asserts the email is verified. Otherwise an
            # attacker holding an unverified Google address equal to a victim's
            # registered email could bind their google_sub and take the account.
            if not email_verified:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid Google credential.",
                )
            user.google_sub = google_sub
            if not user.avatar_url and avatar_url:
                user.avatar_url = avatar_url
            user.email_verified = True
            await session.flush()

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="This account is disabled."
        )

    access, refresh, ttl = _issue_for_user(user)
    await user_repo.store_refresh_token(
        session,
        user_id=user.id,
        raw_token=refresh,
        expires_at=refresh_token_expires_at(),
        user_agent=user_agent,
        ip=ip,
    )
    return IssuedTokens(user=user, access_token=access, refresh_token=refresh, expires_in=ttl)


async def logout(session: AsyncSession, *, raw_refresh_token: str | None) -> None:
    """Revoke the presented refresh token (idempotent / best-effort)."""
    if not raw_refresh_token:
        return

    from app.core.security import hash_refresh_token

    row = await user_repo.get_refresh_by_hash(session, hash_refresh_token(raw_refresh_token))
    if row is not None:
        await user_repo.revoke_refresh_token(session, row)
