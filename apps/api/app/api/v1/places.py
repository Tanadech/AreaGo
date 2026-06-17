"""Public places catalog + PostGIS geo search. Mounted by the orchestrator
under /api/v1. All routes are PUBLIC (no auth) per the API contract.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, Path, Query

from app.deps import SessionDep
from app.repositories.place_repo import PlaceFilters
from app.schemas.common import Page
from app.schemas.place import (
    PAGE_MIN,
    RADIUS_M_DEFAULT,
    RADIUS_M_MAX,
    RADIUS_M_MIN,
    SIZE_DEFAULT,
    SIZE_MAX,
    SIZE_MIN,
    PlaceDetail,
    PlaceKind,
    PlaceListItem,
    PlaceSort,
)
from app.services import place_service

router = APIRouter(tags=["places"])


@router.get(
    "/places",
    response_model=Page[PlaceListItem],
    summary="List places (filter / sort / paginate)",
)
async def list_places(
    db: SessionDep,
    category_id: int | None = Query(None, ge=1, description="Filter by category id."),
    kind: PlaceKind | None = Query(None, description="Filter by place kind."),
    province_id: int | None = Query(None, ge=1, description="Filter by province id."),
    q: str | None = Query(None, min_length=1, max_length=200, description="Text search."),
    sort: PlaceSort = Query(PlaceSort.rating, description="Sort key."),
    page: int = Query(PAGE_MIN, ge=PAGE_MIN, description="1-based page number."),
    size: int = Query(SIZE_DEFAULT, ge=SIZE_MIN, le=SIZE_MAX, description="Page size."),
) -> Page[PlaceListItem]:
    """Return a paginated list of approved places."""
    filters = PlaceFilters(
        category_id=category_id,
        kind=kind.value if kind is not None else None,
        province_id=province_id,
        q=q,
        sort=sort.value,
        page=page,
        size=size,
    )
    return await place_service.list_places(db, filters)


@router.get(
    "/places/search",
    response_model=Page[PlaceListItem],
    summary="Geo radius search (PostGIS)",
)
async def search_places(
    db: SessionDep,
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude (WGS84)."),
    lng: float = Query(..., ge=-180.0, le=180.0, description="Longitude (WGS84)."),
    radius_m: int = Query(
        RADIUS_M_DEFAULT,
        ge=RADIUS_M_MIN,
        le=RADIUS_M_MAX,
        description="Search radius in metres.",
    ),
    category_id: int | None = Query(None, ge=1, description="Filter by category id."),
    page: int = Query(PAGE_MIN, ge=PAGE_MIN, description="1-based page number."),
    size: int = Query(SIZE_DEFAULT, ge=SIZE_MIN, le=SIZE_MAX, description="Page size."),
) -> Page[PlaceListItem]:
    """Return approved places within ``radius_m`` of (lat, lng), ordered by distance."""
    return await place_service.search_radius(
        db,
        lat=lat,
        lng=lng,
        radius_m=radius_m,
        category_id=category_id,
        page=page,
        size=size,
    )


@router.get(
    "/places/{place_id}",
    response_model=PlaceDetail,
    summary="Place detail",
)
async def get_place(
    db: SessionDep,
    place_id: uuid.UUID = Path(..., description="Place id (UUID)."),
) -> PlaceDetail:
    """Return full detail (images, tags, restaurant/shop extension) for one place."""
    detail = await place_service.get_detail(db, place_id)
    if detail is None:
        raise HTTPException(status_code=404, detail="Place not found.")
    return detail


@router.get(
    "/places/{place_id}/nearby",
    response_model=list[PlaceListItem],
    summary="Places near a given place",
)
async def nearby_places(
    db: SessionDep,
    place_id: uuid.UUID = Path(..., description="Anchor place id (UUID)."),
    radius_m: int = Query(
        RADIUS_M_DEFAULT,
        ge=RADIUS_M_MIN,
        le=RADIUS_M_MAX,
        description="Search radius in metres.",
    ),
) -> list[PlaceListItem]:
    """Return approved places near the anchor place, ordered by distance."""
    items = await place_service.nearby(db, place_id=place_id, radius_m=radius_m)
    if items is None:
        raise HTTPException(status_code=404, detail="Place not found.")
    return items
