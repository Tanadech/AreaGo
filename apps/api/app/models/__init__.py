"""SQLAlchemy models package.

Import all model modules here so that ``Base.metadata`` is fully populated when
Alembic autogenerate imports this package. (No models exist yet in the
skeleton; add ``from app.models.<module> import <Model>`` lines as they land.)
"""

from app.models.base import Base

__all__ = ["Base"]
