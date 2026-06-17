"""Pure unit tests for app.core.security (no database, no network).

Covers: Argon2 password round-trip, JWT access-token encode/decode + expiry +
type enforcement, and refresh-token generation/hash/verify.
"""

from __future__ import annotations

import time

import jwt
import pytest

from app.core.security import (
    access_token_ttl_seconds,
    create_access_token,
    decode_access_token,
    decode_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    needs_rehash,
    verify_password,
    verify_refresh_token,
)


# ---------------------------------------------------------------------------
# Passwords (Argon2id)
# ---------------------------------------------------------------------------
def test_password_round_trip() -> None:
    hashed = hash_password("correct horse battery staple")
    assert hashed != "correct horse battery staple"
    assert hashed.startswith("$argon2id$")  # argon2id variant
    assert verify_password("correct horse battery staple", hashed) is True


def test_password_wrong_returns_false() -> None:
    hashed = hash_password("s3cret-value")
    assert verify_password("not-the-password", hashed) is False


def test_verify_password_handles_malformed_hash() -> None:
    # Must not raise on a non-argon2 string.
    assert verify_password("anything", "not-a-valid-hash") is False


def test_needs_rehash_false_for_current_params() -> None:
    assert needs_rehash(hash_password("x" * 12)) is False


# ---------------------------------------------------------------------------
# Access tokens (JWT)
# ---------------------------------------------------------------------------
def test_access_token_encode_decode_roundtrip() -> None:
    token = create_access_token("user-123", extra_claims={"roles": ["traveler"]})
    claims = decode_access_token(token)
    assert claims["sub"] == "user-123"
    assert claims["type"] == "access"
    assert claims["roles"] == ["traveler"]
    assert "exp" in claims and "iat" in claims


def test_access_token_expired_raises() -> None:
    token = create_access_token("user-123", expires_minutes=-1)
    with pytest.raises(jwt.ExpiredSignatureError):
        decode_access_token(token)


def test_decode_access_token_rejects_non_access_type() -> None:
    # Hand-craft a token whose type != "access" but with a valid signature.
    from app.core.config import get_settings
    from app.core.security import JWT_ALGORITHM

    secret = get_settings().JWT_SECRET
    token = jwt.encode(
        {"sub": "u", "type": "refresh", "exp": int(time.time()) + 60},
        secret,
        algorithm=JWT_ALGORITHM,
    )
    # decode_token (no type check) succeeds...
    assert decode_token(token)["type"] == "refresh"
    # ...but decode_access_token enforces the access type.
    with pytest.raises(jwt.InvalidTokenError):
        decode_access_token(token)


def test_access_token_bad_signature_raises() -> None:
    token = create_access_token("user-123")
    with pytest.raises(jwt.InvalidSignatureError):
        jwt.decode(token, "wrong-secret", algorithms=["HS256"])


def test_access_token_ttl_seconds_positive() -> None:
    assert access_token_ttl_seconds() > 0


# ---------------------------------------------------------------------------
# Refresh tokens (opaque + SHA-256)
# ---------------------------------------------------------------------------
def test_refresh_token_is_random_and_unique() -> None:
    a = generate_refresh_token()
    b = generate_refresh_token()
    assert a != b
    assert len(a) >= 32  # token_urlsafe(32) -> ~43 chars


def test_refresh_token_hash_is_deterministic_and_hex() -> None:
    token = generate_refresh_token()
    h1 = hash_refresh_token(token)
    h2 = hash_refresh_token(token)
    assert h1 == h2
    assert len(h1) == 64  # sha256 hexdigest
    int(h1, 16)  # valid hex


def test_refresh_token_verify() -> None:
    token = generate_refresh_token()
    digest = hash_refresh_token(token)
    assert verify_refresh_token(token, digest) is True
    assert verify_refresh_token("tampered", digest) is False
