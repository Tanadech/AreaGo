"""Data access for trips and trip_items.

Ownership is always enforced by filtering on ``Trip.user_id`` (callers pass the
authenticated user's id). Every query is a parameterized SQLAlchemy select — no
raw f-strings. Itinerary items are projected together with their place name and
longitude/latitude (via :mod:`app.services.geo`) so the client can render the
saved trip on the map without extra round-trips.
"""

from __future__ import annotations

import datetime as dt
import decimal
import uuid

from sqlalchemy import Row, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.catalog import Place
from app.models.trips import Trip, TripItem
from app.services import geo


async def create_trip(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    title: str,
    province_id: int | None,
    start_date: dt.date | None,
    days: int,
    budget: decimal.Decimal | float | None,
    status: str = "saved",
) -> Trip:
    """Insert a trip (flushed so its id is available). Caller commits."""
    trip = Trip(
        user_id=user_id,
        title=title,
        province_id=province_id,
        start_date=start_date,
        days=days,
        budget=budget,
        status=status,
    )
    session.add(trip)
    await session.flush()
    return trip


async def add_item(
    session: AsyncSession,
    *,
    trip_id: uuid.UUID,
    place_id: uuid.UUID | None,
    day_no: int,
    sort_order: int,
    start_time: dt.time | None,
    duration_min: int | None,
    est_cost: decimal.Decimal | float | None,
    note: str | None,
) -> TripItem:
    """Insert a single itinerary item (flushed). Caller commits."""
    item = TripItem(
        trip_id=trip_id,
        place_id=place_id,
        day_no=day_no,
        sort_order=sort_order,
        start_time=start_time,
        duration_min=duration_min,
        est_cost=est_cost,
        note=note,
    )
    session.add(item)
    await session.flush()
    return item


async def get_owned(
    session: AsyncSession, *, user_id: uuid.UUID, trip_id: uuid.UUID
) -> Trip | None:
    """Return the trip iff it exists AND belongs to ``user_id`` (else None)."""
    stmt = select(Trip).where(Trip.id == trip_id, Trip.user_id == user_id)
    return (await session.execute(stmt)).scalar_one_or_none()


async def list_for_user(session: AsyncSession, *, user_id: uuid.UUID) -> list[Row]:
    """Return the user's trips (newest first) each with its item count."""
    item_count = (
        select(func.count())
        .select_from(TripItem)
        .where(TripItem.trip_id == Trip.id)
        .correlate(Trip)
        .scalar_subquery()
    )
    stmt = (
        select(Trip, item_count.label("item_count"))
        .where(Trip.user_id == user_id)
        .order_by(Trip.updated_at.desc())
    )
    return list((await session.execute(stmt)).all())


async def items_with_place(session: AsyncSession, *, trip_id: uuid.UUID) -> list[Row]:
    """Return a trip's ordered items, each with place name + lat/lng projected.

    ``place_id`` may be NULL (a free-form stop), in which case name/lat/lng are
    NULL via the outer join.
    """
    stmt = (
        select(
            TripItem.id,
            TripItem.place_id,
            TripItem.day_no,
            TripItem.sort_order,
            TripItem.start_time,
            TripItem.duration_min,
            TripItem.est_cost,
            TripItem.note,
            Place.name.label("place_name"),
            geo.lat_of(Place.location).label("lat"),
            geo.lng_of(Place.location).label("lng"),
        )
        .select_from(TripItem)
        .outerjoin(Place, TripItem.place_id == Place.id)
        .where(TripItem.trip_id == trip_id)
        .order_by(TripItem.day_no.asc(), TripItem.sort_order.asc())
    )
    return list((await session.execute(stmt)).all())


async def get_owned_item(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    trip_id: uuid.UUID,
    item_id: uuid.UUID,
) -> TripItem | None:
    """Return an item iff it belongs to ``trip_id`` owned by ``user_id``."""
    stmt = (
        select(TripItem)
        .join(Trip, TripItem.trip_id == Trip.id)
        .where(
            TripItem.id == item_id,
            TripItem.trip_id == trip_id,
            Trip.user_id == user_id,
        )
    )
    return (await session.execute(stmt)).scalar_one_or_none()


async def place_exists(session: AsyncSession, *, place_id: uuid.UUID) -> bool:
    """True if a place with this id exists (FK also enforces it on insert)."""
    stmt = select(func.count()).select_from(Place).where(Place.id == place_id)
    return int((await session.execute(stmt)).scalar_one()) > 0


async def delete_trip(session: AsyncSession, *, trip: Trip) -> None:
    """Delete a trip (cascades to its items). Caller commits."""
    await session.delete(trip)


async def delete_item(session: AsyncSession, *, item: TripItem) -> None:
    """Delete a single itinerary item. Caller commits."""
    await session.delete(item)


__all__ = [
    "create_trip",
    "add_item",
    "get_owned",
    "list_for_user",
    "items_with_place",
    "get_owned_item",
    "place_exists",
    "delete_trip",
    "delete_item",
]
