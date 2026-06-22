"""Trip planner endpoints (create / save / list / detail / update / delete + items).

Mounted by the orchestrator under /api/v1. Every route requires authentication
and is scoped to the current user; a trip owned by someone else is reported as
404 (existence is never leaked across accounts).
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, Path, Response, status

from app.deps import CurrentUser, SessionDep
from app.schemas.trip import (
    TripCreate,
    TripItemCreate,
    TripItemUpdate,
    TripListItem,
    TripReorder,
    TripResponse,
    TripUpdate,
)
from app.services import trip_service

router = APIRouter(tags=["trips"])

_NOT_FOUND = "Trip not found."
_ITEM_NOT_FOUND = "Trip item not found."


@router.post(
    "/trips",
    response_model=TripResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create and save a trip (optionally with itinerary)",
)
async def create_trip(
    db: SessionDep, user: CurrentUser, payload: TripCreate
) -> TripResponse:
    """Create a trip for the current user, including any inline itinerary items."""
    return await trip_service.create_trip(db, user=user, payload=payload)


@router.get(
    "/trips",
    response_model=list[TripListItem],
    summary="List the current user's trips",
)
async def list_trips(db: SessionDep, user: CurrentUser) -> list[TripListItem]:
    """Return the current user's trips (newest first)."""
    return await trip_service.list_trips(db, user=user)


@router.get(
    "/trips/{trip_id}",
    response_model=TripResponse,
    summary="Get one trip with its itinerary",
)
async def get_trip(
    db: SessionDep,
    user: CurrentUser,
    trip_id: uuid.UUID = Path(..., description="Trip id (UUID)."),
) -> TripResponse:
    trip = await trip_service.get_trip(db, user=user, trip_id=trip_id)
    if trip is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=_NOT_FOUND)
    return trip


@router.patch(
    "/trips/{trip_id}",
    response_model=TripResponse,
    summary="Update a trip's fields",
)
async def update_trip(
    db: SessionDep,
    user: CurrentUser,
    payload: TripUpdate,
    trip_id: uuid.UUID = Path(..., description="Trip id (UUID)."),
) -> TripResponse:
    trip = await trip_service.update_trip(db, user=user, trip_id=trip_id, payload=payload)
    if trip is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=_NOT_FOUND)
    return trip


@router.delete(
    "/trips/{trip_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a trip",
)
async def delete_trip(
    db: SessionDep,
    user: CurrentUser,
    trip_id: uuid.UUID = Path(..., description="Trip id (UUID)."),
) -> Response:
    deleted = await trip_service.delete_trip(db, user=user, trip_id=trip_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=_NOT_FOUND)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/trips/{trip_id}/items",
    response_model=TripResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a place to a trip",
)
async def add_trip_item(
    db: SessionDep,
    user: CurrentUser,
    payload: TripItemCreate,
    trip_id: uuid.UUID = Path(..., description="Trip id (UUID)."),
) -> TripResponse:
    trip = await trip_service.add_item(db, user=user, trip_id=trip_id, payload=payload)
    if trip is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=_NOT_FOUND)
    return trip


@router.patch(
    "/trips/{trip_id}/items/{item_id}",
    response_model=TripResponse,
    summary="Update an itinerary item",
)
async def update_trip_item(
    db: SessionDep,
    user: CurrentUser,
    payload: TripItemUpdate,
    trip_id: uuid.UUID = Path(..., description="Trip id (UUID)."),
    item_id: uuid.UUID = Path(..., description="Trip item id (UUID)."),
) -> TripResponse:
    trip = await trip_service.update_item(
        db, user=user, trip_id=trip_id, item_id=item_id, payload=payload
    )
    if trip is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=_ITEM_NOT_FOUND
        )
    return trip


@router.put(
    "/trips/{trip_id}/reorder",
    response_model=TripResponse,
    summary="Bulk-reorder a trip's itinerary items",
)
async def reorder_trip_items(
    db: SessionDep,
    user: CurrentUser,
    payload: TripReorder,
    trip_id: uuid.UUID = Path(..., description="Trip id (UUID)."),
) -> TripResponse:
    """Reposition (day_no + sort_order) multiple items in one transaction.

    Every supplied item id must belong to the owned trip; otherwise the request
    404s and nothing is written.
    """
    trip = await trip_service.reorder(db, user=user, trip_id=trip_id, payload=payload)
    if trip is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=_NOT_FOUND)
    return trip


@router.delete(
    "/trips/{trip_id}/items/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove an itinerary item",
)
async def delete_trip_item(
    db: SessionDep,
    user: CurrentUser,
    trip_id: uuid.UUID = Path(..., description="Trip id (UUID)."),
    item_id: uuid.UUID = Path(..., description="Trip item id (UUID)."),
) -> Response:
    deleted = await trip_service.delete_item(
        db, user=user, trip_id=trip_id, item_id=item_id
    )
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=_ITEM_NOT_FOUND
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
