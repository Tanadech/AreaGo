"""SQLAlchemy models package.

Import all model modules here so that ``Base.metadata`` is fully populated when
Alembic autogenerate imports this package. Every mapped class must be reachable
from here for the metadata to be complete.
"""

from app.models.base import Base
from app.models.catalog import (
    Activity,
    Image,
    Place,
    PlaceCategory,
    PlaceTag,
    Restaurant,
    Shop,
    Tag,
)
from app.models.geo import District, Province
from app.models.rbac import RefreshToken, Role, User, UserRole
from app.models.social import Favorite, Review
from app.models.trips import Trip, TripItem

__all__ = [
    "Base",
    # rbac
    "Role",
    "User",
    "UserRole",
    "RefreshToken",
    # geo
    "Province",
    "District",
    # catalog
    "PlaceCategory",
    "Place",
    "Restaurant",
    "Shop",
    "Activity",
    "Tag",
    "PlaceTag",
    "Image",
    # social
    "Review",
    "Favorite",
    # trips
    "Trip",
    "TripItem",
]
