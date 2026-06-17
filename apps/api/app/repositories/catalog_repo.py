"""Data-access for the public catalog lookups: categories, provinces, districts.

All queries are parameterized SQLAlchemy 2.0 Core/ORM selects (no raw f-strings).
"""

from __future__ import annotations

from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.catalog import PlaceCategory
from app.models.geo import District, Province


async def list_categories(session: AsyncSession) -> Sequence[PlaceCategory]:
    """Return all place categories ordered by ``sort_order`` then ``id``."""
    stmt = select(PlaceCategory).order_by(
        PlaceCategory.sort_order.asc().nulls_last(),
        PlaceCategory.id.asc(),
    )
    result = await session.execute(stmt)
    return result.scalars().all()


async def list_provinces(session: AsyncSession) -> Sequence[Province]:
    """Return all provinces ordered by Thai name."""
    stmt = select(Province).order_by(Province.name_th.asc())
    result = await session.execute(stmt)
    return result.scalars().all()


async def province_exists(session: AsyncSession, province_id: int) -> bool:
    """Return True if a province with ``province_id`` exists."""
    stmt = select(Province.id).where(Province.id == province_id)
    result = await session.execute(stmt)
    return result.scalar_one_or_none() is not None


async def list_districts_by_province(
    session: AsyncSession, province_id: int
) -> Sequence[District]:
    """Return districts belonging to ``province_id`` ordered by Thai name."""
    stmt = (
        select(District)
        .where(District.province_id == province_id)
        .order_by(District.name_th.asc())
    )
    result = await session.execute(stmt)
    return result.scalars().all()


__all__ = [
    "list_categories",
    "list_provinces",
    "province_exists",
    "list_districts_by_province",
]
