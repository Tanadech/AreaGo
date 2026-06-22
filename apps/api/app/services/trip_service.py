"""Business logic for trips (create / save / list / update / delete + items).

All operations are scoped to the authenticated user: a trip that does not exist
*or* is not owned by the user is treated identically (the router returns 404),
so trip existence is never leaked across accounts. Item-mutating endpoints
return the full updated :class:`TripResponse` so the client always has the
current trip state after a change.
"""

from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.rbac import User
from app.models.trips import Trip
from app.repositories import trip_repo
from app.schemas.trip import (
    TripCreate,
    TripItemCreate,
    TripItemResponse,
    TripItemUpdate,
    TripListItem,
    TripReorder,
    TripResponse,
    TripUpdate,
)


def _to_float(value) -> float | None:
    return float(value) if value is not None else None


async def _build_response(session: AsyncSession, trip: Trip) -> TripResponse:
    """Assemble a full TripResponse (trip fields + ordered, place-enriched items)."""
    rows = await trip_repo.items_with_place(session, trip_id=trip.id)
    items = [
        TripItemResponse(
            id=r.id,
            place_id=r.place_id,
            place_name=r.place_name,
            lat=_to_float(r.lat),
            lng=_to_float(r.lng),
            day_no=r.day_no,
            sort_order=r.sort_order,
            start_time=r.start_time,
            duration_min=r.duration_min,
            est_cost=_to_float(r.est_cost),
            note=r.note,
        )
        for r in rows
    ]
    return TripResponse(
        id=trip.id,
        title=trip.title,
        province_id=trip.province_id,
        start_date=trip.start_date,
        days=trip.days,
        budget=_to_float(trip.budget),
        status=trip.status,
        created_at=trip.created_at,
        updated_at=trip.updated_at,
        items=items,
    )


async def create_trip(
    session: AsyncSession, *, user: User, payload: TripCreate
) -> TripResponse:
    """Create (and save) a trip plus any inline itinerary items."""
    trip = await trip_repo.create_trip(
        session,
        user_id=user.id,
        title=payload.title,
        province_id=payload.province_id,
        start_date=payload.start_date,
        days=payload.days,
        budget=payload.budget,
    )
    for item in payload.items:
        await trip_repo.add_item(
            session,
            trip_id=trip.id,
            place_id=item.place_id,
            day_no=item.day_no,
            sort_order=item.sort_order,
            start_time=item.start_time,
            duration_min=item.duration_min,
            est_cost=item.est_cost,
            note=item.note,
        )
    await session.commit()
    await session.refresh(trip)
    return await _build_response(session, trip)


async def list_trips(session: AsyncSession, *, user: User) -> list[TripListItem]:
    """Return the user's trips (newest first), each with an item count."""
    rows = await trip_repo.list_for_user(session, user_id=user.id)
    return [
        TripListItem(
            id=r.Trip.id,
            title=r.Trip.title,
            province_id=r.Trip.province_id,
            start_date=r.Trip.start_date,
            days=r.Trip.days,
            budget=_to_float(r.Trip.budget),
            status=r.Trip.status,
            item_count=r.item_count,
            created_at=r.Trip.created_at,
            updated_at=r.Trip.updated_at,
        )
        for r in rows
    ]


async def get_trip(
    session: AsyncSession, *, user: User, trip_id: uuid.UUID
) -> TripResponse | None:
    """Return one owned trip with its itinerary, or None if not found/owned."""
    trip = await trip_repo.get_owned(session, user_id=user.id, trip_id=trip_id)
    if trip is None:
        return None
    return await _build_response(session, trip)


async def update_trip(
    session: AsyncSession, *, user: User, trip_id: uuid.UUID, payload: TripUpdate
) -> TripResponse | None:
    """Patch an owned trip's own fields; returns the updated trip or None."""
    trip = await trip_repo.get_owned(session, user_id=user.id, trip_id=trip_id)
    if trip is None:
        return None
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(trip, field, value)
    await session.commit()
    await session.refresh(trip)
    return await _build_response(session, trip)


async def delete_trip(
    session: AsyncSession, *, user: User, trip_id: uuid.UUID
) -> bool:
    """Delete an owned trip (cascades to items). False if not found/owned."""
    trip = await trip_repo.get_owned(session, user_id=user.id, trip_id=trip_id)
    if trip is None:
        return False
    await trip_repo.delete_trip(session, trip=trip)
    await session.commit()
    return True


async def add_item(
    session: AsyncSession,
    *,
    user: User,
    trip_id: uuid.UUID,
    payload: TripItemCreate,
) -> TripResponse | None:
    """Add a place to an owned trip; returns the updated trip or None."""
    trip = await trip_repo.get_owned(session, user_id=user.id, trip_id=trip_id)
    if trip is None:
        return None
    await trip_repo.add_item(
        session,
        trip_id=trip.id,
        place_id=payload.place_id,
        day_no=payload.day_no,
        sort_order=payload.sort_order,
        start_time=payload.start_time,
        duration_min=payload.duration_min,
        est_cost=payload.est_cost,
        note=payload.note,
    )
    await session.commit()
    await session.refresh(trip)
    return await _build_response(session, trip)


async def update_item(
    session: AsyncSession,
    *,
    user: User,
    trip_id: uuid.UUID,
    item_id: uuid.UUID,
    payload: TripItemUpdate,
) -> TripResponse | None:
    """Patch an item within an owned trip; returns the updated trip or None."""
    item = await trip_repo.get_owned_item(
        session, user_id=user.id, trip_id=trip_id, item_id=item_id
    )
    if item is None:
        return None
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    await session.commit()
    trip = await trip_repo.get_owned(session, user_id=user.id, trip_id=trip_id)
    assert trip is not None  # ownership already established via the item
    return await _build_response(session, trip)


async def reorder(
    session: AsyncSession,
    *,
    user: User,
    trip_id: uuid.UUID,
    payload: TripReorder,
) -> TripResponse | None:
    """Bulk-reposition an owned trip's items in one transaction.

    Returns None (treated as 404) if the trip is not owned, or if any supplied
    item id does not belong to the trip — in which case nothing is written
    (all ids are validated before any mutation).
    """
    trip = await trip_repo.get_owned(session, user_id=user.id, trip_id=trip_id)
    if trip is None:
        return None
    orders = [(o.id, o.day_no, o.sort_order) for o in payload.items]
    ok = await trip_repo.reorder_items(session, trip_id=trip.id, orders=orders)
    if not ok:
        await session.rollback()
        return None
    await session.commit()
    await session.refresh(trip)
    return await _build_response(session, trip)


async def delete_item(
    session: AsyncSession,
    *,
    user: User,
    trip_id: uuid.UUID,
    item_id: uuid.UUID,
) -> bool:
    """Delete an item within an owned trip. False if not found/owned."""
    item = await trip_repo.get_owned_item(
        session, user_id=user.id, trip_id=trip_id, item_id=item_id
    )
    if item is None:
        return False
    await trip_repo.delete_item(session, item=item)
    await session.commit()
    return True


__all__ = [
    "create_trip",
    "list_trips",
    "get_trip",
    "update_trip",
    "delete_trip",
    "add_item",
    "update_item",
    "reorder",
    "delete_item",
]
