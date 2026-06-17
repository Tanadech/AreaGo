"""Authentication routes under ``/auth`` (mounted at /api/v1 by the orchestrator).

Endpoints (per docs/API.md):
- POST /auth/register  -> create traveler, set refresh cookie, return access token
- POST /auth/login     -> verify credentials, set refresh cookie, return access token
- POST /auth/google    -> verify Google id_token, upsert, set cookie, return token
- POST /auth/refresh   -> rotate refresh cookie, return new access token
- POST /auth/logout    -> revoke presented refresh token (clears cookie)
- GET  /auth/me        -> current user's profile + roles

The refresh token is delivered/consumed exclusively via an httpOnly,
SameSite=Strict cookie (Secure when ``COOKIE_SECURE``). The access token is
returned in the JSON body for the client to send as a Bearer header.
"""

from __future__ import annotations

from fastapi import APIRouter, Request, Response, status

from app.core.config import get_settings
from app.core.rate_limit import limiter
from app.deps import CurrentUser, SessionDep
from app.repositories import user_repo
from app.schemas.auth import (
    GoogleLoginRequest,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.services import auth_service
from app.services.auth_service import IssuedTokens

router = APIRouter(prefix="/auth", tags=["auth"])


# ---------------------------------------------------------------------------
# Cookie helpers
# ---------------------------------------------------------------------------
def _set_refresh_cookie(response: Response, raw_token: str) -> None:
    """Attach the refresh token as an httpOnly, SameSite=Strict cookie."""
    settings = get_settings()
    max_age = settings.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60
    response.set_cookie(
        key=settings.REFRESH_COOKIE_NAME,
        value=raw_token,
        max_age=max_age,
        expires=max_age,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="strict",
        domain=settings.COOKIE_DOMAIN,
        path="/api/v1/auth",
    )


def _clear_refresh_cookie(response: Response) -> None:
    """Remove the refresh cookie (used on logout)."""
    settings = get_settings()
    response.delete_cookie(
        key=settings.REFRESH_COOKIE_NAME,
        domain=settings.COOKIE_DOMAIN,
        path="/api/v1/auth",
    )


def _read_refresh_cookie(request: Request) -> str | None:
    """Read the raw refresh token from the request cookie, if present."""
    return request.cookies.get(get_settings().REFRESH_COOKIE_NAME)


def _client_meta(request: Request) -> tuple[str | None, str | None]:
    """Extract (user_agent, client_ip) for refresh-token bookkeeping."""
    user_agent = request.headers.get("user-agent")
    ip = request.client.host if request.client else None
    return user_agent, ip


def _to_token_response(response: Response, issued: IssuedTokens) -> TokenResponse:
    """Set the refresh cookie and build the access-token response body."""
    _set_refresh_cookie(response, issued.refresh_token)
    return TokenResponse(access_token=issued.access_token, expires_in=issued.expires_in)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new traveler account",
)
@limiter.limit("5/minute")
async def register(
    request: Request,
    response: Response,
    payload: RegisterRequest,
    session: SessionDep,
) -> TokenResponse:
    user_agent, ip = _client_meta(request)
    issued = await auth_service.register(
        session,
        email=str(payload.email),
        password=payload.password,
        display_name=payload.display_name,
        user_agent=user_agent,
        ip=ip,
    )
    await session.commit()
    return _to_token_response(response, issued)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Log in with email + password",
)
@limiter.limit("5/minute")
async def login(
    request: Request,
    response: Response,
    payload: LoginRequest,
    session: SessionDep,
) -> TokenResponse:
    user_agent, ip = _client_meta(request)
    issued = await auth_service.authenticate(
        session,
        email=str(payload.email),
        password=payload.password,
        user_agent=user_agent,
        ip=ip,
    )
    await session.commit()
    return _to_token_response(response, issued)


@router.post(
    "/google",
    response_model=TokenResponse,
    summary="Log in / sign up with a Google ID token",
)
@limiter.limit("10/minute")
async def google_login(
    request: Request,
    response: Response,
    payload: GoogleLoginRequest,
    session: SessionDep,
) -> TokenResponse:
    user_agent, ip = _client_meta(request)
    issued = await auth_service.google_login(
        session,
        id_token=payload.id_token,
        user_agent=user_agent,
        ip=ip,
    )
    await session.commit()
    return _to_token_response(response, issued)


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Rotate the refresh cookie and mint a new access token",
)
@limiter.limit("10/minute")
async def refresh(
    request: Request,
    response: Response,
    session: SessionDep,
) -> TokenResponse:
    raw = _read_refresh_cookie(request)
    issued = await auth_service.refresh(
        session,
        raw_refresh_token=raw,
        user_agent=request.headers.get("user-agent"),
        ip=request.client.host if request.client else None,
    )
    await session.commit()
    return _to_token_response(response, issued)


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Revoke the presented refresh token",
)
async def logout(
    request: Request,
    response: Response,
    session: SessionDep,
    _user: CurrentUser,
) -> Response:
    raw = _read_refresh_cookie(request)
    await auth_service.logout(session, raw_refresh_token=raw)
    await session.commit()
    _clear_refresh_cookie(response)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Current user's profile and roles",
)
async def me(user: CurrentUser) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        roles=user_repo.role_codes(user),
    )
