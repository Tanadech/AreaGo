"""Business logic for the public places catalog and geo search.

Orchestrates :mod:`app.repositories.place_repo`, maps result rows / ORM objects
onto the response schemas in :mod:`app.schemas.place`, and assembles
``Page[...]`` containers from :mod:`app.schemas.common`.
"""

from __future__ import annotations

import uuid

from sqlalchemy import Row
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.catalog import Place
from app.models.rbac import User
from app.repositories import place_repo
from app.repositories.place_repo import PlaceFilters
from app.schemas.common import Page
from app.schemas.place import (
    ImageResponse,
    PlaceCreate,
    PlaceDetail,
    PlaceListItem,
    RestaurantExt,
    ShopExt,
    TagResponse,
)


def _row_to_list_item(row: Row) -> PlaceListItem:
    """Map a projected list/search row onto :class:`PlaceListItem`."""
    mapping = row._mapping
    return PlaceListItem(
        id=mapping["id"],
        name=mapping["name"],
        kind=mapping["kind"],
        category_id=mapping["category_id"],
        category=mapping["category"],
        rating_avg=mapping["rating_avg"],
        rating_count=mapping["rating_count"],
        price_level=mapping["price_level"],
        lat=mapping["lat"],
        lng=mapping["lng"],
        distance_m=mapping.get("distance_m"),
    )


async def list_places(session: AsyncSession, filters: PlaceFilters) -> Page[PlaceListItem]:
    """Return a paginated page of approved places matching ``filters``."""
    rows, total = await place_repo.list_places(session, filters)
    items = [_row_to_list_item(r) for r in rows]
    return Page[PlaceListItem](
        items=items, total=total, page=filters.page, size=filters.size
    )


async def search_radius(
    session: AsyncSession,
    *,
    lat: float,
    lng: float,
    radius_m: float,
    category_id: int | None,
    page: int,
    size: int,
) -> Page[PlaceListItem]:
    """Return approved places within ``radius_m`` ordered by distance, paginated."""
    offset = (page - 1) * size
    rows = await place_repo.search_radius(
        session,
        lat=lat,
        lng=lng,
        radius_m=radius_m,
        category_id=category_id,
        limit=size,
        offset=offset,
    )
    total = await place_repo.search_radius_count(
        session, lat=lat, lng=lng, radius_m=radius_m, category_id=category_id
    )
    items = [_row_to_list_item(r) for r in rows]
    return Page[PlaceListItem](items=items, total=total, page=page, size=size)


async def get_detail(session: AsyncSession, place_id: uuid.UUID) -> PlaceDetail | None:
    """Return full detail for an approved place, or None if not found."""
    row = await place_repo.get_detail(session, place_id)
    if row is None:
        return None

    place: Place = row.Place
    mapping = row._mapping

    category_code = await place_repo.get_category_code(session, place.category_id)
    images = await place_repo.get_images(session, place.id)

    restaurant = (
        RestaurantExt.model_validate(place.restaurant)
        if place.restaurant is not None
        else None
    )
    shop = ShopExt.model_validate(place.shop) if place.shop is not None else None
    tags = [
        TagResponse.model_validate(pt.tag) for pt in place.place_tags if pt.tag is not None
    ]
    image_models = [ImageResponse.model_validate(img) for img in images]

    return PlaceDetail(
        id=place.id,
        kind=place.kind,
        name=place.name,
        slug=place.slug,
        description=place.description,
        address=place.address,
        phone=place.phone,
        website=place.website,
        category_id=place.category_id,
        category=category_code,
        province_id=place.province_id,
        province_name=mapping["province_name"],
        district_id=place.district_id,
        district_name=mapping["district_name"],
        rating_avg=place.rating_avg,
        rating_count=place.rating_count,
        price_level=place.price_level,
        status=place.status,
        opening_hours=place.opening_hours,
        lat=float(mapping["lat"]),
        lng=float(mapping["lng"]),
        created_at=place.created_at,
        updated_at=place.updated_at,
        restaurant=restaurant,
        shop=shop,
        tags=tags,
        images=image_models,
    )


async def nearby(
    session: AsyncSession,
    *,
    place_id: uuid.UUID,
    radius_m: float,
    limit: int = 20,
) -> list[PlaceListItem] | None:
    """Return places near an anchor place, or None if the anchor is not found."""
    rows = await place_repo.nearby(
        session, place_id=place_id, radius_m=radius_m, limit=limit
    )
    if rows is None:
        return None
    return [_row_to_list_item(r) for r in rows]


async def create_place(
    session: AsyncSession, *, user: User, payload: PlaceCreate
) -> PlaceDetail:
    """Save a place selected from Google Places into the catalog (status=approved).

    Idempotent on ``google_place_id``: saving the same Google place again returns
    the existing record instead of creating a duplicate.
    """
    if payload.google_place_id:
        existing = await place_repo.get_by_google_place_id(
            session, payload.google_place_id
        )
        if existing is not None:
            detail = await get_detail(session, existing.id)
            if detail is not None:
                return detail

    place = await place_repo.create_place(
        session,
        name=payload.name,
        lat=payload.lat,
        lng=payload.lng,
        address=payload.address,
        google_place_id=payload.google_place_id,
        category_id=payload.category_id,
        phone=payload.phone,
        website=payload.website,
        kind=payload.kind.value,
        owner_id=user.id,
        status="approved",
    )
    await session.commit()
    detail = await get_detail(session, place.id)
    if detail is None:  # pragma: no cover - a just-created approved place is visible
        raise RuntimeError("Saved place could not be retrieved.")
    return detail


__all__ = ["list_places", "search_radius", "get_detail", "nearby", "create_place"]
