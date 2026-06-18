"""Pydantic v2 schemas for trips and their itinerary items (``trip_items``).

Numeric money/rating values are exposed as ``float`` (not ``Decimal``) so the
JSON contract stays numeric and the generated TS client types them as numbers.
"""

from __future__ import annotations

import datetime as dt
import uuid

from pydantic import BaseModel, ConfigDict, Field

TITLE_MAX = 200
NOTE_MAX = 2000
DAYS_MIN = 1
DAYS_MAX = 30
_STATUS_PATTERN = "^(draft|saved|archived)$"


# ---------------------------------------------------------------------------
# Itinerary items (trip_items)
# ---------------------------------------------------------------------------
class TripItemCreate(BaseModel):
    """A place to add to a trip's itinerary."""

    place_id: uuid.UUID
    day_no: int = Field(1, ge=1, le=DAYS_MAX)
    sort_order: int = Field(0, ge=0)
    start_time: dt.time | None = None
    duration_min: int | None = Field(None, ge=0)
    est_cost: float | None = Field(None, ge=0)
    note: str | None = Field(None, max_length=NOTE_MAX)


class TripItemUpdate(BaseModel):
    """Partial update of an itinerary item (only provided fields change)."""

    place_id: uuid.UUID | None = None
    day_no: int | None = Field(None, ge=1, le=DAYS_MAX)
    sort_order: int | None = Field(None, ge=0)
    start_time: dt.time | None = None
    duration_min: int | None = Field(None, ge=0)
    est_cost: float | None = Field(None, ge=0)
    note: str | None = Field(None, max_length=NOTE_MAX)


class TripItemResponse(BaseModel):
    """An itinerary item enriched with its place name + coordinates (for the map)."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    place_id: uuid.UUID | None = None
    place_name: str | None = None
    lat: float | None = None
    lng: float | None = None
    day_no: int
    sort_order: int
    start_time: dt.time | None = None
    duration_min: int | None = None
    est_cost: float | None = None
    note: str | None = None


# ---------------------------------------------------------------------------
# Trips
# ---------------------------------------------------------------------------
class TripCreate(BaseModel):
    """Create (and save) a trip, optionally with its itinerary in one call."""

    title: str = Field(..., min_length=1, max_length=TITLE_MAX)
    province_id: int | None = Field(None, ge=1)
    start_date: dt.date | None = None
    days: int = Field(1, ge=DAYS_MIN, le=DAYS_MAX)
    budget: float | None = Field(None, ge=0)
    items: list[TripItemCreate] = Field(default_factory=list)


class TripUpdate(BaseModel):
    """Partial update of a trip's own fields."""

    title: str | None = Field(None, min_length=1, max_length=TITLE_MAX)
    province_id: int | None = Field(None, ge=1)
    start_date: dt.date | None = None
    days: int | None = Field(None, ge=DAYS_MIN, le=DAYS_MAX)
    budget: float | None = Field(None, ge=0)
    status: str | None = Field(None, pattern=_STATUS_PATTERN)


class TripListItem(BaseModel):
    """Compact trip representation for ``GET /trips`` (no items, with a count)."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    province_id: int | None = None
    start_date: dt.date | None = None
    days: int
    budget: float | None = None
    status: str
    item_count: int = 0
    created_at: dt.datetime
    updated_at: dt.datetime


class TripResponse(BaseModel):
    """Full trip detail including its ordered itinerary items."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    province_id: int | None = None
    start_date: dt.date | None = None
    days: int
    budget: float | None = None
    status: str
    created_at: dt.datetime
    updated_at: dt.datetime
    items: list[TripItemResponse] = Field(default_factory=list)


__all__ = [
    "TripItemCreate",
    "TripItemUpdate",
    "TripItemResponse",
    "TripCreate",
    "TripUpdate",
    "TripListItem",
    "TripResponse",
]
