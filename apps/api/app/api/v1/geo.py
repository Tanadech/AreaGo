"""Public geo lookups: provinces and their districts. Mounted under /api/v1."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Path

from app.deps import SessionDep
from app.repositories import catalog_repo
from app.schemas.geo import DistrictResponse, ProvinceResponse

router = APIRouter(tags=["catalog"])


@router.get(
    "/provinces",
    response_model=list[ProvinceResponse],
    summary="List provinces",
)
async def list_provinces(db: SessionDep) -> list[ProvinceResponse]:
    """Return all provinces (public)."""
    rows = await catalog_repo.list_provinces(db)
    return [ProvinceResponse.model_validate(row) for row in rows]


@router.get(
    "/provinces/{province_id}/districts",
    response_model=list[DistrictResponse],
    summary="List districts of a province",
)
async def list_districts(
    db: SessionDep,
    province_id: int = Path(..., ge=1, description="Province id."),
) -> list[DistrictResponse]:
    """Return districts belonging to ``province_id`` (public)."""
    if not await catalog_repo.province_exists(db, province_id):
        raise HTTPException(status_code=404, detail="Province not found.")
    rows = await catalog_repo.list_districts_by_province(db, province_id)
    return [DistrictResponse.model_validate(row) for row in rows]
