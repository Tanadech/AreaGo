"""Pydantic v2 schemas for place categories (public catalog read)."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class CategoryResponse(BaseModel):
    """A place category as exposed by ``GET /categories`` (from ``place_categories``)."""

    model_config = ConfigDict(from_attributes=True)

    id: int = Field(..., description="Category id (serial).")
    code: str = Field(..., description="Stable machine code, e.g. 'temple'.")
    name_th: str = Field(..., description="Thai display name.")
    name_en: str | None = Field(None, description="English display name.")
    icon: str | None = Field(None, description="Icon identifier.")
    sort_order: int | None = Field(None, description="Display ordering hint.")


__all__ = ["CategoryResponse"]
