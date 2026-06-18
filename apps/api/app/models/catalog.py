"""Catalog models: place_categories, places, restaurants, shops, activities,
tags, place_tags, images."""

from __future__ import annotations

import datetime as dt
import decimal
import uuid

from geoalchemy2 import Geography
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class PlaceCategory(Base):
    """Top-level classification for a place (lookup table)."""

    __tablename__ = "place_categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)
    name_th: Mapped[str] = mapped_column(String(120), nullable=False)
    name_en: Mapped[str | None] = mapped_column(String(120))
    icon: Mapped[str | None] = mapped_column(String(40))
    sort_order: Mapped[int | None] = mapped_column(
        SmallInteger, server_default=text("0")
    )

    places: Mapped[list[Place]] = relationship(back_populates="category")


class Place(Base):
    """A point of interest: attraction, restaurant, or shop."""

    __tablename__ = "places"
    __table_args__ = (
        CheckConstraint(
            "price_level BETWEEN 1 AND 4", name="price_level_range"
        ),
        Index("ix_places_location", "location", postgresql_using="gist"),
        Index(
            "ix_places_name_trgm",
            "name",
            postgresql_using="gin",
            postgresql_ops={"name": "gin_trgm_ops"},
        ),
        Index("ix_places_category", "category_id"),
        Index("ix_places_status", "status"),
        Index("ix_places_kind", "kind"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    category_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("place_categories.id")
    )
    province_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("provinces.id")
    )
    district_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("districts.id")
    )
    owner_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id")
    )
    kind: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default=text("'attraction'")
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str | None] = mapped_column(String(220), unique=True)
    description: Mapped[str | None] = mapped_column(Text)
    address: Mapped[str | None] = mapped_column(Text)
    phone: Mapped[str | None] = mapped_column(String(40))
    website: Mapped[str | None] = mapped_column(Text)
    google_place_id: Mapped[str | None] = mapped_column(
        Text, unique=True, index=True
    )
    location: Mapped[object] = mapped_column(
        Geography(geometry_type="POINT", srid=4326, spatial_index=False),
        nullable=False,
    )
    rating_avg: Mapped[decimal.Decimal] = mapped_column(
        Numeric(2, 1), nullable=False, server_default=text("0")
    )
    rating_count: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("0")
    )
    price_level: Mapped[int | None] = mapped_column(SmallInteger)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default=text("'pending'")
    )
    opening_hours: Mapped[dict | None] = mapped_column(JSONB)
    created_at: Mapped[dt.datetime] = mapped_column(
        server_default=func.now(), nullable=False
    )
    updated_at: Mapped[dt.datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now(), nullable=False
    )

    category: Mapped[PlaceCategory | None] = relationship(back_populates="places")
    province: Mapped[Province | None] = relationship(  # noqa: F821
        back_populates="places"
    )
    district: Mapped[District | None] = relationship(  # noqa: F821
        back_populates="places"
    )
    owner: Mapped[User | None] = relationship(  # noqa: F821
        back_populates="owned_places"
    )

    restaurant: Mapped[Restaurant | None] = relationship(
        back_populates="place", cascade="all, delete-orphan", uselist=False
    )
    shop: Mapped[Shop | None] = relationship(
        back_populates="place", cascade="all, delete-orphan", uselist=False
    )
    activities: Mapped[list[Activity]] = relationship(
        back_populates="place", cascade="all, delete-orphan"
    )
    place_tags: Mapped[list[PlaceTag]] = relationship(
        back_populates="place", cascade="all, delete-orphan"
    )
    reviews: Mapped[list[Review]] = relationship(  # noqa: F821
        back_populates="place", cascade="all, delete-orphan"
    )
    favorites: Mapped[list[Favorite]] = relationship(  # noqa: F821
        back_populates="place", cascade="all, delete-orphan"
    )


class Restaurant(Base):
    """Restaurant-specific attributes (1:1 extension of places)."""

    __tablename__ = "restaurants"

    place_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("places.id", ondelete="CASCADE"),
        primary_key=True,
    )
    cuisine: Mapped[list[str] | None] = mapped_column(ARRAY(String(80)))
    price_range: Mapped[str | None] = mapped_column(String(20))
    has_delivery: Mapped[bool | None] = mapped_column(
        Boolean, server_default=text("false")
    )
    menu_url: Mapped[str | None] = mapped_column(Text)

    place: Mapped[Place] = relationship(back_populates="restaurant")


class Shop(Base):
    """Shop-specific attributes (1:1 extension of places)."""

    __tablename__ = "shops"

    place_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("places.id", ondelete="CASCADE"),
        primary_key=True,
    )
    shop_type: Mapped[str | None] = mapped_column(String(40))
    products: Mapped[list[str] | None] = mapped_column(ARRAY(Text))

    place: Mapped[Place] = relationship(back_populates="shop")


class Activity(Base):
    """A bookable/doable activity offered at a place."""

    __tablename__ = "activities"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    place_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("places.id", ondelete="CASCADE")
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    duration_min: Mapped[int | None] = mapped_column(Integer)
    price: Mapped[decimal.Decimal | None] = mapped_column(Numeric(10, 2))
    category: Mapped[str | None] = mapped_column(String(60))

    place: Mapped[Place | None] = relationship(back_populates="activities")


class Tag(Base):
    """A free-form label that can be attached to places."""

    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String(60), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(80), nullable=False)

    place_tags: Mapped[list[PlaceTag]] = relationship(
        back_populates="tag", cascade="all, delete-orphan"
    )


class PlaceTag(Base):
    """Join table linking places and tags (composite PK)."""

    __tablename__ = "place_tags"

    place_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("places.id", ondelete="CASCADE"),
        primary_key=True,
    )
    tag_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("tags.id", ondelete="CASCADE"),
        primary_key=True,
    )

    place: Mapped[Place] = relationship(back_populates="place_tags")
    tag: Mapped[Tag] = relationship(back_populates="place_tags")


class Image(Base):
    """A polymorphic image record (owner_type/owner_id) stored in GCS."""

    __tablename__ = "images"
    __table_args__ = (Index("ix_images_owner", "owner_type", "owner_id"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    owner_type: Mapped[str] = mapped_column(String(20), nullable=False)
    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    alt: Mapped[str | None] = mapped_column(String(200))
    is_cover: Mapped[bool | None] = mapped_column(
        Boolean, server_default=text("false")
    )
    sort_order: Mapped[int | None] = mapped_column(
        SmallInteger, server_default=text("0")
    )
    created_at: Mapped[dt.datetime] = mapped_column(
        server_default=func.now(), nullable=False
    )


__all__ = [
    "PlaceCategory",
    "Place",
    "Restaurant",
    "Shop",
    "Activity",
    "Tag",
    "PlaceTag",
    "Image",
]
