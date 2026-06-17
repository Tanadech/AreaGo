"""Aggregates all v1 sub-routers under a single APIRouter."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1 import auth, categories, geo, health, places

api_router = APIRouter()

# Sub-routers. Add new feature routers here as they are implemented.
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(categories.router)
api_router.include_router(geo.router)
api_router.include_router(places.router)
