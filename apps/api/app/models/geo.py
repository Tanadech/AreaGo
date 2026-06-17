"""Geography lookup models: provinces, districts."""

from __future__ import annotations

from geoalchemy2 import Geography
from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Province(Base):
    """A Thai province (administrative level 1)."""

    __tablename__ = "provinces"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str | None] = mapped_column(String(10), unique=True)
    name_th: Mapped[str] = mapped_column(String(120), nullable=False)
    name_en: Mapped[str | None] = mapped_column(String(120))
    centroid: Mapped[object | None] = mapped_column(
        Geography(geometry_type="POINT", srid=4326, spatial_index=False)
    )
    geom: Mapped[object | None] = mapped_column(
        Geography(geometry_type="MULTIPOLYGON", srid=4326, spatial_index=False)
    )

    districts: Mapped[list[District]] = relationship(
        back_populates="province", cascade="all, delete-orphan"
    )
    places: Mapped[list["Place"]] = relationship(back_populates="province")  # noqa: F821
    trips: Mapped[list["Trip"]] = relationship(back_populates="province")  # noqa: F821


class District(Base):
    """A district (amphoe) within a province (administrative level 2)."""

    __tablename__ = "districts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    province_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("provinces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    code: Mapped[str | None] = mapped_column(String(10))
    name_th: Mapped[str] = mapped_column(String(120), nullable=False)
    name_en: Mapped[str | None] = mapped_column(String(120))
    centroid: Mapped[object | None] = mapped_column(
        Geography(geometry_type="POINT", srid=4326, spatial_index=False)
    )
    geom: Mapped[object | None] = mapped_column(
        Geography(geometry_type="MULTIPOLYGON", srid=4326, spatial_index=False)
    )

    province: Mapped[Province] = relationship(back_populates="districts")
    places: Mapped[list["Place"]] = relationship(back_populates="district")  # noqa: F821


__all__ = ["Province", "District"]
