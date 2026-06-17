"""Shared Pydantic v2 schemas: error envelope, health, and generic pagination."""

from __future__ import annotations

from typing import Generic, Literal, TypeVar

from pydantic import BaseModel, ConfigDict, Field, computed_field

T = TypeVar("T")

DependencyStatus = Literal["ok", "down"]


class ErrorDetail(BaseModel):
    """Inner payload of the standardized error envelope."""

    code: str = Field(..., description="Stable machine-readable error code.")
    message: str = Field(..., description="Human-readable error message.")
    details: dict = Field(default_factory=dict, description="Optional structured context.")


class ErrorEnvelope(BaseModel):
    """Standardized error response for all handled errors.

    Shape: ``{ "error": { "code": str, "message": str, "details": {} } }``
    """

    error: ErrorDetail


class HealthResponse(BaseModel):
    """Response model for ``GET /api/v1/health``."""

    status: Literal["ok", "degraded"] = Field(..., description="Overall service status.")
    db: DependencyStatus = Field(..., description="Database connectivity.")
    redis: DependencyStatus = Field(..., description="Redis connectivity.")
    env: str = Field(..., description="Active environment (dev|uat|prod).")


class Page(BaseModel, Generic[T]):
    """Generic paginated response container."""

    model_config = ConfigDict(arbitrary_types_allowed=True)

    items: list[T] = Field(default_factory=list, description="Page of results.")
    total: int = Field(..., ge=0, description="Total number of matching records.")
    page: int = Field(..., ge=1, description="Current page number (1-based).")
    size: int = Field(..., ge=1, description="Page size.")

    @computed_field  # type: ignore[prop-decorator]
    @property
    def pages(self) -> int:
        """Total number of pages for the current page size (serialized in responses)."""
        if self.size <= 0:
            return 0
        return (self.total + self.size - 1) // self.size
