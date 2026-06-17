"""Pydantic v2 schemas for the public places catalog and PostGIS geo search.

The ORM ``Place.location`` column is a ``geography(Point, 4326)``. We never
serialize the raw geography blob; instead the repositories project longitude /
latitude (and an optional ``distance_m``) directly in the SQL ``SELECT`` using
``ST_X`` / ``ST_Y`` / ``ST_Distance``, and the service layer builds these models
from those scalar columns.
"""

from __future__ import annotations

import datetime as dt
import uuid
from enum import Enum
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Query enums / param models
# ---------------------------------------------------------------------------
class PlaceKind(str, Enum):
    """Discriminator for the kind of place (matches ``places.kind``)."""

    attraction = "attraction"
    restaurant = "restaurant"
    shop = "shop"


class PlaceSort(str, Enum):
    """Allowed sort keys for ``GET /places``.

    ``distance`` is only meaningful when a reference point is supplied
    (``GET /places/search``); the plain list endpoint exposes
    rating / popular / name per the API contract.
    """

    distance = "distance"
    rating = "rating"
    popular = "popular"
    name = "name"


# ---------------------------------------------------------------------------
# Read models
# ---------------------------------------------------------------------------
class ImageResponse(BaseModel):
    """An image attached to a place."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    url: str
    alt: str | None = None
    is_cover: bool | None = None
    sort_order: int | None = None


class TagResponse(BaseModel):
    """A tag attached to a place."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    name: str


class RestaurantExt(BaseModel):
    """Restaurant-specific extension attributes (1:1 with a place)."""

    model_config = ConfigDict(from_attributes=True)

    cuisine: list[str] | None = None
    price_range: str | None = None
    has_delivery: bool | None = None
    menu_url: str | None = None


class ShopExt(BaseModel):
    """Shop-specific extension attributes (1:1 with a place)."""

    model_config = ConfigDict(from_attributes=True)

    shop_type: str | None = None
    products: list[str] | None = None


class PlaceListItem(BaseModel):
    """Compact place representation for list / search responses.

    ``distance_m`` is populated only by the radius-search endpoint (and nearby);
    it is ``None`` for the plain catalog listing.
    """

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    kind: str
    category_id: int | None = None
    category: str | None = Field(
        None, description="Category code (e.g. 'temple'), if classified."
    )
    rating_avg: float = Field(..., description="Average rating (0-5).")
    rating_count: int = Field(..., description="Number of ratings.")
    price_level: int | None = Field(None, description="Price tier 1-4.")
    lat: float = Field(..., description="Latitude (WGS84).")
    lng: float = Field(..., description="Longitude (WGS84).")
    distance_m: float | None = Field(
        None, description="Distance in metres from the search point, if applicable."
    )


class PlaceDetail(BaseModel):
    """Full place detail: core fields + geo names + extension + tags + images."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    kind: str
    name: str
    slug: str | None = None
    description: str | None = None
    address: str | None = None
    phone: str | None = None
    website: str | None = None
    category_id: int | None = None
    category: str | None = Field(None, description="Category code, if classified.")
    province_id: int | None = None
    province_name: str | None = Field(None, description="Province Thai name.")
    district_id: int | None = None
    district_name: str | None = Field(None, description="District Thai name.")
    rating_avg: float
    rating_count: int
    price_level: int | None = None
    status: str
    opening_hours: dict | None = None
    lat: float = Field(..., description="Latitude (WGS84).")
    lng: float = Field(..., description="Longitude (WGS84).")
    created_at: dt.datetime
    updated_at: dt.datetime
    restaurant: RestaurantExt | None = Field(
        None, description="Present when kind == 'restaurant'."
    )
    shop: ShopExt | None = Field(None, description="Present when kind == 'shop'.")
    tags: list[TagResponse] = Field(default_factory=list)
    images: list[ImageResponse] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Validation bounds (also used by the route Query() definitions)
# ---------------------------------------------------------------------------
# Latitude / longitude constraints.
Latitude = Annotated[float, Field(ge=-90.0, le=90.0)]
Longitude = Annotated[float, Field(ge=-180.0, le=180.0)]

# Radius bounds for geo search (1 m .. 50 km).
RADIUS_M_MIN = 1
RADIUS_M_MAX = 50_000
RADIUS_M_DEFAULT = 5_000

# Pagination bounds.
PAGE_MIN = 1
SIZE_MIN = 1
SIZE_MAX = 100
SIZE_DEFAULT = 20


__all__ = [
    "PlaceKind",
    "PlaceSort",
    "ImageResponse",
    "TagResponse",
    "RestaurantExt",
    "ShopExt",
    "PlaceListItem",
    "PlaceDetail",
    "Latitude",
    "Longitude",
    "RADIUS_M_MIN",
    "RADIUS_M_MAX",
    "RADIUS_M_DEFAULT",
    "PAGE_MIN",
    "SIZE_MIN",
    "SIZE_MAX",
    "SIZE_DEFAULT",
]
