from typing import Optional
import uuid
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, require_roles
from app.models.user import User, UserRole
from app.schemas.common import PaginatedResponse
from app.schemas.product import (
    ProductCreate,
    ProductResponse,
    ProductUpdate,
    ProductVariantCreate,
    ProductVariantResponse,
    ProductVariantUpdate,
)
from app.services.product_service import product_service

router = APIRouter()


@router.get("", response_model=PaginatedResponse[ProductResponse], summary="List Products")
async def list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    is_active: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaginatedResponse[ProductResponse]:
    return await product_service.list_products(
        db=db,
        page=page,
        page_size=page_size,
        is_active=is_active,
        search=search,
    )


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED, summary="Create Product")
async def create_product(
    data: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.STAFF)),
) -> ProductResponse:
    product = await product_service.create_product(db=db, current_user=current_user, data=data)
    return ProductResponse.model_validate(product)


@router.get("/{product_id}", response_model=ProductResponse, summary="Get Product Details")
async def get_product(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProductResponse:
    product = await product_service.get_product(db=db, product_id=product_id)
    return ProductResponse.model_validate(product)


@router.put("/{product_id}", response_model=ProductResponse, summary="Update Product")
async def update_product(
    product_id: uuid.UUID,
    data: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.STAFF)),
) -> ProductResponse:
    product = await product_service.update_product(
        db=db, current_user=current_user, product_id=product_id, data=data
    )
    return ProductResponse.model_validate(product)


@router.post("/{product_id}/variants", response_model=ProductVariantResponse, status_code=status.HTTP_201_CREATED, summary="Create Product Variant")
async def create_variant(
    product_id: uuid.UUID,
    data: ProductVariantCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.STAFF)),
) -> ProductVariantResponse:
    variant = await product_service.create_variant(
        db=db, current_user=current_user, product_id=product_id, data=data
    )
    return ProductVariantResponse.model_validate(variant)


@router.put("/variants/{variant_id}", response_model=ProductVariantResponse, summary="Update Product Variant")
async def update_variant(
    variant_id: uuid.UUID,
    data: ProductVariantUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.STAFF)),
) -> ProductVariantResponse:
    variant = await product_service.update_variant(
        db=db, current_user=current_user, variant_id=variant_id, data=data
    )
    return ProductVariantResponse.model_validate(variant)


@router.delete("/variants/{variant_id}", summary="Delete or Deactivate Product Variant")
async def delete_variant(
    variant_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.STAFF)),
) -> dict:
    deleted = await product_service.deactivate_or_delete_variant(
        db=db, current_user=current_user, variant_id=variant_id
    )
    return {
        "status": "success",
        "action": "deleted" if deleted else "deactivated",
        "message": "Variant deleted permanently." if deleted else "Variant has dependencies and was deactivated safely.",
    }
