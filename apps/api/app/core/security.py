"""Security helpers: password hashing (argon2) and JWT access tokens (pyjwt).

These are pure helper functions wired into auth flows in a later phase.
"""

from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError

from app.core.config import get_settings

# Argon2id with library defaults — strong, modern memory-hard hashing.
_password_hasher = PasswordHasher()

# JWT algorithm used for symmetric (HS256) signing with JWT_SECRET.
JWT_ALGORITHM = "HS256"


# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------
def hash_password(password: str) -> str:
    """Hash a plaintext password using Argon2id."""
    return _password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a plaintext password against an Argon2 hash.

    Returns ``False`` for mismatches and malformed hashes rather than raising.
    """
    try:
        return _password_hasher.verify(password_hash, password)
    except (VerifyMismatchError, InvalidHashError):
        return False


def needs_rehash(password_hash: str) -> bool:
    """Return True if the hash should be upgraded to current parameters."""
    return _password_hasher.check_needs_rehash(password_hash)


# ---------------------------------------------------------------------------
# JWT access tokens
# ---------------------------------------------------------------------------
def create_access_token(
    subject: str,
    *,
    expires_minutes: int | None = None,
    extra_claims: dict[str, Any] | None = None,
) -> str:
    """Create a signed JWT access token.

    ``subject`` becomes the ``sub`` claim (typically a user id). ``exp`` and
    ``iat`` are set automatically; ``type`` is set to ``"access"``.
    """
    settings = get_settings()
    ttl = expires_minutes if expires_minutes is not None else settings.ACCESS_TOKEN_TTL_MIN
    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "sub": subject,
        "type": "access",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=ttl)).timestamp()),
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT, returning its claims.

    Raises ``jwt.PyJWTError`` (or a subclass) on invalid/expired tokens.
    """
    settings = get_settings()
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[JWT_ALGORITHM])


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode an *access* token and return its claims.

    Validates the signature/expiry (via :func:`decode_token`) and additionally
    asserts ``type == "access"`` so a refresh-style token can never be used as a
    bearer access token. Raises ``jwt.InvalidTokenError`` on a type mismatch and
    ``jwt.PyJWTError`` subclasses on signature/expiry failures.
    """
    claims = decode_token(token)
    if claims.get("type") != "access":
        raise jwt.InvalidTokenError("not an access token")
    return claims


# ---------------------------------------------------------------------------
# Refresh tokens (opaque, stored only as a SHA-256 hash)
# ---------------------------------------------------------------------------
# Refresh tokens are high-entropy random strings handed to the client in an
# httpOnly cookie. We persist ONLY their SHA-256 hash so a database leak does not
# expose usable tokens. SHA-256 (not Argon2) is appropriate here because the
# input is already 256 bits of CSPRNG entropy — there is nothing to brute-force.
def generate_refresh_token() -> str:
    """Return a new high-entropy opaque refresh token (URL-safe, 256-bit)."""
    return secrets.token_urlsafe(32)


def hash_refresh_token(token: str) -> str:
    """Return the SHA-256 hex digest used to store/look up a refresh token."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def verify_refresh_token(token: str, token_hash: str) -> bool:
    """Constant-time check that ``token`` hashes to the stored ``token_hash``."""
    return hmac.compare_digest(hash_refresh_token(token), token_hash)


def refresh_token_expires_at() -> datetime:
    """Return the absolute UTC expiry for a freshly-issued refresh token."""
    settings = get_settings()
    return datetime.now(UTC) + timedelta(days=settings.REFRESH_TOKEN_TTL_DAYS)


def access_token_ttl_seconds() -> int:
    """Return the access-token lifetime in seconds (for ``expires_in``)."""
    return get_settings().ACCESS_TOKEN_TTL_MIN * 60
