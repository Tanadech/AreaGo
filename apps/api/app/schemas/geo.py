"""Pydantic v2 schemas for geography lookups (provinces, districts)."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class ProvinceResponse(BaseModel):
    """A province as exposed by ``GET /provinces``."""

    model_config = ConfigDict(from_attributes=True)

    id: int = Field(..., description="Province id (serial).")
    code: str | None = Field(None, description="Administrative code.")
    name_th: str = Field(..., description="Thai display name.")
    name_en: str | None = Field(None, description="English display name.")


class DistrictResponse(BaseModel):
    """A district as exposed by ``GET /provinces/{id}/districts``."""

    model_config = ConfigDict(from_attributes=True)

    id: int = Field(..., description="District id (serial).")
    province_id: int = Field(..., description="Parent province id.")
    code: str | None = Field(None, description="Administrative code.")
    name_th: str = Field(..., description="Thai display name.")
    name_en: str | None = Field(None, description="English display name.")


__all__ = ["ProvinceResponse", "DistrictResponse"]
