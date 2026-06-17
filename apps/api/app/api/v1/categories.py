"""Public catalog: place categories. Mounted by the orchestrator under /api/v1."""

from __future__ import annotations

from fastapi import APIRouter

from app.deps import SessionDep
from app.repositories import catalog_repo
from app.schemas.category import CategoryResponse

router = APIRouter(tags=["catalog"])


@router.get(
    "/categories",
    response_model=list[CategoryResponse],
    summary="List place categories",
)
async def list_categories(db: SessionDep) -> list[CategoryResponse]:
    """Return all place categories (public)."""
    rows = await catalog_repo.list_categories(db)
    return [CategoryResponse.model_validate(row) for row in rows]
