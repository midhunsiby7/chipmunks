import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import Boolean, DateTime, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class TaxRule(Base, TimestampMixin):
    """
    Tax rule entity for regional, national, and fixed or percentage rates.
    """
    __tablename__ = "tax_rules"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    tax_code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    rate_percentage: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    is_fixed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    country_code: Mapped[str] = mapped_column(String(2), nullable=False, index=True)
    state_or_region: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    effective_from: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    effective_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
