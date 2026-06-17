"""PostGIS helper expressions for building geography points and distances.

These functions return SQLAlchemy Core expressions (never raw SQL strings) so
they compose into the repository queries and bind their parameters safely.

Reference (DATABASE.md):
    :pt = ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
    ST_DWithin(location, :pt, :radius_m)   -- uses the GIST index
    ST_Distance(location, :pt)             -- metres (geography)
"""

from __future__ import annotations

from geoalchemy2 import Geography, Geometry
from sqlalchemy import ColumnElement, Float, cast, func


def make_point(lat: float, lng: float) -> ColumnElement:
    """Build a ``geography(Point, 4326)`` expression from latitude / longitude.

    Note the argument order to ``ST_MakePoint`` is (lng, lat) — PostGIS takes
    X (longitude) first, then Y (latitude).
    """
    return cast(
        func.ST_SetSRID(func.ST_MakePoint(lng, lat), 4326),
        Geography(geometry_type="POINT", srid=4326),
    )


def distance_m(location: ColumnElement, point: ColumnElement) -> ColumnElement:
    """Distance in metres between a geography column and a point expression."""
    return func.ST_Distance(location, point)


def within_radius(
    location: ColumnElement, point: ColumnElement, radius_m: float
) -> ColumnElement:
    """``ST_DWithin`` predicate (true when ``location`` is within ``radius_m``).

    On a ``geography`` column with a GIST index this is index-accelerated.
    """
    return func.ST_DWithin(location, point, radius_m)


def lng_of(location: ColumnElement) -> ColumnElement:
    """Longitude (X) of a geography point, as a float column for the SELECT.

    ``ST_X`` / ``ST_Y`` operate on *geometry*, so the geography column is cast
    to geometry first (``location::geometry``).
    """
    return cast(func.ST_X(cast(location, Geometry(geometry_type="POINT", srid=4326))), Float)


def lat_of(location: ColumnElement) -> ColumnElement:
    """Latitude (Y) of a geography point, as a float column for the SELECT."""
    return cast(func.ST_Y(cast(location, Geometry(geometry_type="POINT", srid=4326))), Float)


__all__ = ["make_point", "distance_m", "within_radius", "lng_of", "lat_of"]
