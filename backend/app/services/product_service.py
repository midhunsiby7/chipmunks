import logging
import math
from typing import List, Optional
import uuid
from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.invoice import InvoiceLine
from app.models.product import Product, ProductVariant
from app.models.quotation import QuotationLine
from app.models.subscription import SubscriptionLine
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

logger = logging.getLogger(__name__)


class ProductService:
    @staticmethod
    def _check_manage_permission(current_user: User) -> None:
        if current_user.role not in (UserRole.ADMIN, UserRole.STAFF):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Customers are not permitted to manage products.",
            )

    async def list_products(
        self,
        db: AsyncSession,
        page: int = 1,
        page_size: int = 20,
        is_active: Optional[bool] = None,
        search: Optional[str] = None,
    ) -> PaginatedResponse[ProductResponse]:
        query = select(Product).options(selectinload(Product.variants))

        if is_active is not None:
            query = query.where(Product.is_active == is_active)

        if search:
            search_pat = f"%{search.strip()}%"
            query = query.where(
                or_(
                    Product.name.ilike(search_pat),
                    Product.sku.ilike(search_pat),
                    Product.description.ilike(search_pat),
                )
            )

        total = await db.scalar(select(func.count()).select_from(query.subquery())) or 0
        offset = (page - 1) * page_size
        results = await db.execute(query.order_by(Product.name.asc()).offset(offset).limit(page_size))
        products = results.scalars().all()

        return PaginatedResponse(
            items=[ProductResponse.model_validate(p) for p in products],
            total=total,
            page=page,
            page_size=page_size,
            pages=math.ceil(total / page_size) if page_size > 0 else 1,
        )

    async def get_product(self, db: AsyncSession, product_id: uuid.UUID) -> Product:
        query = (
            select(Product)
            .options(selectinload(Product.variants))
            .where(Product.id == product_id)
        )
        product = await db.scalar(query)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found.",
            )
        return product

    async def create_product(
        self,
        db: AsyncSession,
        current_user: User,
        data: ProductCreate,
    ) -> Product:
        self._check_manage_permission(current_user)

        # Check SKU uniqueness
        existing_sku = await db.scalar(select(Product).where(Product.sku == data.sku))
        if existing_sku:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Product with SKU '{data.sku}' already exists.",
            )

        product = Product(
            name=data.name,
            sku=data.sku,
            description=data.description,
            product_type=data.product_type,
            sales_price=data.sales_price,
            cost_price=data.cost_price,
            internal_notes=data.internal_notes,
            is_active=data.is_active,
        )
        db.add(product)
        await db.flush()

        if data.variants:
            for v_data in data.variants:
                # Check variant code uniqueness
                existing_var = await db.scalar(
                    select(ProductVariant).where(ProductVariant.variant_code == v_data.variant_code)
                )
                if existing_var:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"Variant with code '{v_data.variant_code}' already exists.",
                    )
                variant = ProductVariant(
                    product_id=product.id,
                    name=v_data.name,
                    variant_code=v_data.variant_code,
                    price=v_data.price,
                    price_difference=v_data.price_difference,
                    is_active=v_data.is_active,
                )
                db.add(variant)
            await db.flush()

        await db.commit()
        return await self.get_product(db, product.id)

    async def update_product(
        self,
        db: AsyncSession,
        current_user: User,
        product_id: uuid.UUID,
        data: ProductUpdate,
    ) -> Product:
        self._check_manage_permission(current_user)
        product = await self.get_product(db, product_id)

        if data.sku and data.sku != product.sku:
            existing_sku = await db.scalar(
                select(Product).where(Product.sku == data.sku, Product.id != product_id)
            )
            if existing_sku:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Product with SKU '{data.sku}' already exists.",
                )
            product.sku = data.sku

        for field in ("name", "description", "product_type", "sales_price", "cost_price", "internal_notes", "is_active"):
            val = getattr(data, field)
            if val is not None:
                setattr(product, field, val)

        await db.commit()
        return await self.get_product(db, product.id)

    async def create_variant(
        self,
        db: AsyncSession,
        current_user: User,
        product_id: uuid.UUID,
        data: ProductVariantCreate,
    ) -> ProductVariant:
        self._check_manage_permission(current_user)
        product = await self.get_product(db, product_id)

        existing_var = await db.scalar(
            select(ProductVariant).where(ProductVariant.variant_code == data.variant_code)
        )
        if existing_var:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Variant code '{data.variant_code}' already exists.",
            )

        variant = ProductVariant(
            product_id=product.id,
            name=data.name,
            variant_code=data.variant_code,
            price=data.price,
            price_difference=data.price_difference,
            is_active=data.is_active,
        )
        db.add(variant)
        await db.commit()
        await db.refresh(variant)
        return variant

    async def update_variant(
        self,
        db: AsyncSession,
        current_user: User,
        variant_id: uuid.UUID,
        data: ProductVariantUpdate,
    ) -> ProductVariant:
        self._check_manage_permission(current_user)
        variant = await db.scalar(select(ProductVariant).where(ProductVariant.id == variant_id))
        if not variant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product variant not found.",
            )

        if data.variant_code and data.variant_code != variant.variant_code:
            existing = await db.scalar(
                select(ProductVariant).where(
                    ProductVariant.variant_code == data.variant_code,
                    ProductVariant.id != variant_id,
                )
            )
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Variant code '{data.variant_code}' already exists.",
                )
            variant.variant_code = data.variant_code

        for field in ("name", "price", "price_difference", "is_active"):
            val = getattr(data, field)
            if val is not None:
                setattr(variant, field, val)

        await db.commit()
        await db.refresh(variant)
        return variant

    async def deactivate_or_delete_variant(
        self,
        db: AsyncSession,
        current_user: User,
        variant_id: uuid.UUID,
    ) -> bool:
        self._check_manage_permission(current_user)
        variant = await db.scalar(select(ProductVariant).where(ProductVariant.id == variant_id))
        if not variant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product variant not found.",
            )

        # Check references in subscriptions or quotations
        ref_sub = await db.scalar(
            select(func.count()).select_from(SubscriptionLine).where(SubscriptionLine.product_variant_id == variant_id)
        )
        ref_quote = await db.scalar(
            select(func.count()).select_from(QuotationLine).where(QuotationLine.product_variant_id == variant_id)
        )

        if (ref_sub and ref_sub > 0) or (ref_quote and ref_quote > 0):
            # Deactivate safely instead of hard deletion
            variant.is_active = False
            await db.commit()
            return False  # Deactivated

        await db.delete(variant)
        await db.commit()
        return True  # Deleted


product_service = ProductService()
