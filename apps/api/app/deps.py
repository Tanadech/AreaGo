"""Shared FastAPI dependencies.

Re-exports the common dependencies so routers can import them from a single
place, and provides annotated aliases for ergonomic typing in handlers.

Adds authentication/authorization dependencies:
- ``get_current_user`` decodes a Bearer access token and loads the user.
- ``CurrentUser`` is the annotated alias used in handler signatures.
- ``require_roles(*codes)`` builds a dependency that 403s unless the user holds
  every required role.
"""

from __future__ import annotations

import uuid
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.db import get_session
from app.core.redis import get_redis
from app.core.security import decode_access_token
from app.models.rbac import User
from app.repositories import user_repo

# Annotated dependency aliases — use as: `db: SessionDep` in a handler signature.
SessionDep = Annotated[AsyncSession, Depends(get_session)]
RedisDep = Annotated[Redis, Depends(get_redis)]
SettingsDep = Annotated[Settings, Depends(get_settings)]

# Bearer scheme. ``auto_error=False`` so we render the standardized envelope with
# our own 401 instead of Starlette's default body.
_bearer_scheme = HTTPBearer(auto_error=False)
BearerDep = Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer_scheme)]

_UNAUTHENTICATED = "Not authenticated."


async def get_current_user(
    session: SessionDep,
    credentials: BearerDep,
) -> User:
    """Resolve the authenticated user from a Bearer access token.

    Raises 401 for a missing/malformed/expired token or an unknown/inactive
    user. The loaded user has its roles eager-loaded.
    """
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=_UNAUTHENTICATED,
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        claims = decode_access_token(credentials.credentials)
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    subject = claims.get("sub")
    try:
        user_id = uuid.UUID(str(subject))
    except (ValueError, TypeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    user = await user_repo.get_by_id(session, user_id)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=_UNAUTHENTICATED,
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_roles(*codes: str):
    """Return a dependency that 403s unless the current user holds all ``codes``.

    Usage::

        @router.get("/admin/x", dependencies=[Depends(require_roles("admin"))])
    """

    async def _checker(user: CurrentUser) -> User:
        held = {ur.role.code for ur in user.user_roles}
        if not set(codes).issubset(held):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions.",
            )
        return user

    return _checker


__all__ = [
    "BearerDep",
    "CurrentUser",
    "RedisDep",
    "SessionDep",
    "SettingsDep",
    "get_current_user",
    "get_redis",
    "get_session",
    "get_settings",
    "require_roles",
]
