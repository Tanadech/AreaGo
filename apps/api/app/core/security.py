"""Security helpers: password hashing (argon2) and JWT access tokens (pyjwt).

These are pure helper functions wired into auth flows in a later phase.
"""

from __future__ import annotations

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
