"""Trip models: trips, trip_items."""

from __future__ import annotations

import datetime as dt
import decimal
import uuid

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,
    Time,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Trip(Base):
    """A user-planned trip (optionally AI-generated)."""

    __tablename__ = "trips"
    __table_args__ = (
        CheckConstraint("days BETWEEN 1 AND 30", name="days_range"),
        Index("ix_trips_user", "user_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    province_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("provinces.id")
    )
    start_date: Mapped[dt.date | None] = mapped_column(Date)
    days: Mapped[int] = mapped_column(
        SmallInteger, nullable=False, server_default=text("1")
    )
    budget: Mapped[decimal.Decimal | None] = mapped_column(Numeric(12, 2))
    is_ai: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    ai_meta: Mapped[dict | None] = mapped_column(JSONB)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default=text("'draft'")
    )
    created_at: Mapped[dt.datetime] = mapped_column(
        server_default=func.now(), nullable=False
    )
    updated_at: Mapped[dt.datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user: Mapped[User] = relationship(back_populates="trips")  # noqa: F821
    province: Mapped[Province | None] = relationship(  # noqa: F821
        back_populates="trips"
    )
    items: Mapped[list[TripItem]] = relationship(
        back_populates="trip", cascade="all, delete-orphan"
    )


class TripItem(Base):
    """A single stop within a trip's day-by-day itinerary."""

    __tablename__ = "trip_items"
    __table_args__ = (
        Index("ix_trip_items_trip", "trip_id", "day_no", "sort_order"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    trip_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("trips.id", ondelete="CASCADE"),
        nullable=False,
    )
    place_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("places.id")
    )
    day_no: Mapped[int] = mapped_column(
        SmallInteger, nullable=False, server_default=text("1")
    )
    sort_order: Mapped[int] = mapped_column(
        SmallInteger, nullable=False, server_default=text("0")
    )
    start_time: Mapped[dt.time | None] = mapped_column(Time)
    duration_min: Mapped[int | None] = mapped_column(Integer)
    est_cost: Mapped[decimal.Decimal | None] = mapped_column(Numeric(10, 2))
    note: Mapped[str | None] = mapped_column(Text)

    trip: Mapped[Trip] = relationship(back_populates="items")
    place: Mapped[Place | None] = relationship()  # noqa: F821


__all__ = ["Trip", "TripItem"]
