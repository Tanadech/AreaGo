"""Auth request/response schemas (Pydantic v2).

Public-facing models for the ``/api/v1/auth/*`` endpoints. Read models that are
hydrated from ORM objects set ``from_attributes=True``.
"""

from __future__ import annotations

import uuid

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterRequest(BaseModel):
    """Payload for ``POST /auth/register``."""

    email: EmailStr = Field(..., description="Account email (case-insensitive).")
    password: str = Field(..., min_length=8, max_length=128, description="Plaintext password.")
    display_name: str = Field(..., min_length=1, max_length=120, description="Public display name.")


class LoginRequest(BaseModel):
    """Payload for ``POST /auth/login``."""

    email: EmailStr = Field(..., description="Account email.")
    password: str = Field(..., min_length=1, max_length=128, description="Plaintext password.")


class GoogleLoginRequest(BaseModel):
    """Payload for ``POST /auth/google``."""

    id_token: str = Field(..., min_length=1, description="Google OIDC ID token (JWT).")


class TokenResponse(BaseModel):
    """Access-token response. The refresh token is delivered via httpOnly cookie."""

    access_token: str = Field(..., description="Signed JWT access token.")
    token_type: str = Field(default="bearer", description="Always 'bearer'.")
    expires_in: int = Field(..., description="Access-token lifetime in seconds.")


class UserResponse(BaseModel):
    """Public user profile returned by ``GET /auth/me`` and after auth flows."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID = Field(..., description="User id.")
    email: str = Field(..., description="Account email.")
    display_name: str = Field(..., description="Public display name.")
    avatar_url: str | None = Field(default=None, description="Avatar image URL.")
    roles: list[str] = Field(default_factory=list, description="Role codes the user holds.")
