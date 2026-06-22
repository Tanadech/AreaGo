"""Data-access for places: catalog listing, PostGIS radius search, detail, nearby.

Only ``status = 'approved'`` places are visible through these public reads.
Every query is a parameterized SQLAlchemy Core/ORM select — no raw f-strings.
Longitude / latitude (and distance, where relevant) are projected in the SELECT
via the helpers in :mod:`app.services.geo` so the geography blob never leaves
the database.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass

from geoalchemy2 import WKTElement
from sqlalchemy import Row, Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.catalog import Image, Place, PlaceCategory, PlaceTag
from app.models.geo import District, Province
from app.services import geo

APPROVED = "approved"


@dataclass(frozen=True)
class PlaceFilters:
    """Filter / sort / pagination inputs for :func:`list_places`."""

    category_id: int | None = None
    kind: str | None = None
    province_id: int | None = None
    q: str | None = None
    sort: str = "rating"
    page: int = 1
    size: int = 20


def _base_columns(*, with_distance_point=None):
    """Column list shared by list/search projections.

    Returns scalar columns (never the raw geography) so results map cleanly onto
    ``PlaceListItem``. When ``with_distance_point`` is provided, a ``distance_m``
    column is appended.
    """
    columns = [
        Place.id,
        Place.name,
        Place.kind,
        Place.category_id,
        PlaceCategory.code.label("category"),
        Place.rating_avg,
        Place.rating_count,
        Place.price_level,
        geo.lat_of(Place.location).label("lat"),
        geo.lng_of(Place.location).label("lng"),
    ]
    if with_distance_point is not None:
        columns.append(geo.distance_m(Place.location, with_distance_point).label("distance_m"))
    return columns


def _list_select(filters: PlaceFilters) -> Select:
    """Build the filtered (un-paginated) SELECT for the catalog listing."""
    stmt = (
        select(*_base_columns())
        .select_from(Place)
        .outerjoin(PlaceCategory, Place.category_id == PlaceCategory.id)
        .where(Place.status == APPROVED)
    )

    if filters.category_id is not None:
        stmt = stmt.where(Place.category_id == filters.category_id)
    if filters.kind is not None:
        stmt = stmt.where(Place.kind == filters.kind)
    if filters.province_id is not None:
        stmt = stmt.where(Place.province_id == filters.province_id)
    if filters.q:
        # pg_trgm fuzzy match (GIN index on name) with an ILIKE fallback so a
        # bare substring also matches; both are parameterized.
        pattern = f"%{filters.q}%"
        stmt = stmt.where(Place.name.op("%")(filters.q) | Place.name.ilike(pattern))

    return stmt


def _apply_sort(stmt: Select, sort: str, q: str | None) -> Select:
    """Apply an ORDER BY clause for the catalog listing."""
    if sort == "name":
        return stmt.order_by(Place.name.asc())
    if sort == "popular":
        return stmt.order_by(Place.rating_count.desc(), Place.rating_avg.desc())
    if sort == "rating":
        return stmt.order_by(Place.rating_avg.desc(), Place.rating_count.desc())
    # "distance" is not meaningful without a reference point on the plain list;
    # fall back to similarity (if searching) else rating.
    if q:
        return stmt.order_by(func.similarity(Place.name, q).desc())
    return stmt.order_by(Place.rating_avg.desc(), Place.rating_count.desc())


async def list_places(
    session: AsyncSession, filters: PlaceFilters
) -> tuple[list[Row], int]:
    """Return one page of approved places plus the total matching count."""
    base = _list_select(filters)

    count_stmt = select(func.count()).select_from(base.order_by(None).subquery())
    total = (await session.execute(count_stmt)).scalar_one()

    ordered = _apply_sort(base, filters.sort, filters.q)
    offset = (filters.page - 1) * filters.size
    paged = ordered.limit(filters.size).offset(offset)

    rows = (await session.execute(paged)).all()
    return list(rows), int(total)


async def search_radius(
    session: AsyncSession,
    *,
    lat: float,
    lng: float,
    radius_m: float,
    category_id: int | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[Row]:
    """Geo radius search ordered by distance (uses ST_DWithin on the GIST index)."""
    point = geo.make_point(lat, lng)
    stmt = (
        select(*_base_columns(with_distance_point=point))
        .select_from(Place)
        .outerjoin(PlaceCategory, Place.category_id == PlaceCategory.id)
        .where(Place.status == APPROVED)
        .where(geo.within_radius(Place.location, point, radius_m))
    )
    if category_id is not None:
        stmt = stmt.where(Place.category_id == category_id)

    stmt = stmt.order_by(geo.distance_m(Place.location, point).asc()).limit(limit).offset(offset)
    return list((await session.execute(stmt)).all())


async def search_radius_count(
    session: AsyncSession,
    *,
    lat: float,
    lng: float,
    radius_m: float,
    category_id: int | None = None,
) -> int:
    """Total count of approved places within ``radius_m`` of (lat, lng)."""
    point = geo.make_point(lat, lng)
    stmt = (
        select(func.count())
        .select_from(Place)
        .where(Place.status == APPROVED)
        .where(geo.within_radius(Place.location, point, radius_m))
    )
    if category_id is not None:
        stmt = stmt.where(Place.category_id == category_id)
    return int((await session.execute(stmt)).scalar_one())


async def get_detail(session: AsyncSession, place_id: uuid.UUID) -> Row | None:
    """Return one approved place with eager-loaded extension/tags/images + geo names.

    Returns a Row of ``(Place, province_name, district_name, lat, lng)`` or None.
    The Place's restaurant/shop/tags/images relationships are eagerly loaded.
    """
    stmt = (
        select(
            Place,
            Province.name_th.label("province_name"),
            District.name_th.label("district_name"),
            geo.lat_of(Place.location).label("lat"),
            geo.lng_of(Place.location).label("lng"),
        )
        .select_from(Place)
        .outerjoin(Province, Place.province_id == Province.id)
        .outerjoin(District, Place.district_id == District.id)
        .where(Place.id == place_id)
        .where(Place.status == APPROVED)
        .options(
            selectinload(Place.restaurant),
            selectinload(Place.shop),
            selectinload(Place.place_tags).selectinload(PlaceTag.tag),
        )
    )
    row = (await session.execute(stmt)).first()
    if row is None:
        return None
    return row


async def get_category_code(session: AsyncSession, category_id: int | None) -> str | None:
    """Resolve a category id to its code (for detail mapping). None-safe."""
    if category_id is None:
        return None
    stmt = select(PlaceCategory.code).where(PlaceCategory.id == category_id)
    return (await session.execute(stmt)).scalar_one_or_none()


async def get_images(session: AsyncSession, place_id: uuid.UUID) -> list[Image]:
    """Return images belonging to a place ordered by cover flag then sort order."""
    stmt = (
        select(Image)
        .where(Image.owner_type == "place")
        .where(Image.owner_id == place_id)
        .order_by(Image.is_cover.desc().nulls_last(), Image.sort_order.asc().nulls_last())
    )
    return list((await session.execute(stmt)).scalars().all())


async def place_location(
    session: AsyncSession, place_id: uuid.UUID
) -> tuple[float, float] | None:
    """Return (lat, lng) of an approved place, or None if not found."""
    stmt = (
        select(
            geo.lat_of(Place.location).label("lat"),
            geo.lng_of(Place.location).label("lng"),
        )
        .where(Place.id == place_id)
        .where(Place.status == APPROVED)
    )
    row = (await session.execute(stmt)).first()
    if row is None:
        return None
    return float(row.lat), float(row.lng)


async def nearby(
    session: AsyncSession,
    *,
    place_id: uuid.UUID,
    radius_m: float,
    limit: int = 20,
) -> list[Row] | None:
    """Approved places within ``radius_m`` of ``place_id`` (excluding itself).

    Returns None if the anchor place does not exist / is not approved.
    """
    origin = await place_location(session, place_id)
    if origin is None:
        return None
    lat, lng = origin
    point = geo.make_point(lat, lng)
    stmt = (
        select(*_base_columns(with_distance_point=point))
        .select_from(Place)
        .outerjoin(PlaceCategory, Place.category_id == PlaceCategory.id)
        .where(Place.status == APPROVED)
        .where(Place.id != place_id)
        .where(geo.within_radius(Place.location, point, radius_m))
        .order_by(geo.distance_m(Place.location, point).asc())
        .limit(limit)
    )
    return list((await session.execute(stmt)).all())


async def get_by_google_place_id(
    session: AsyncSession, google_place_id: str
) -> Place | None:
    """Return the place previously saved for this Google place id, if any."""
    stmt = select(Place).where(Place.google_place_id == google_place_id)
    return (await session.execute(stmt)).scalar_one_or_none()


async def create_place(
    session: AsyncSession,
    *,
    name: str,
    lat: float,
    lng: float,
    address: str | None,
    google_place_id: str | None,
    category_id: int | None,
    phone: str | None,
    website: str | None,
    kind: str,
    owner_id: uuid.UUID,
    status: str = "approved",
) -> Place:
    """Insert a place from Google Places data (flushed). Caller commits.

    The geography point is built from (lng, lat) via WKTElement so PostGIS stores
    a proper SRID 4326 geography Point.
    """
    place = Place(
        name=name,
        location=WKTElement(f"POINT({lng} {lat})", srid=4326),
        address=address,
        google_place_id=google_place_id,
        category_id=category_id,
        phone=phone,
        website=website,
        kind=kind,
        owner_id=owner_id,
        status=status,
    )
    session.add(place)
    await session.flush()
    return place


__all__ = [
    "PlaceFilters",
    "list_places",
    "search_radius",
    "search_radius_count",
    "get_detail",
    "get_category_code",
    "get_images",
    "place_location",
    "nearby",
    "get_by_google_place_id",
    "create_place",
]
