import enum
import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class QuotationStatus(str, enum.Enum):
    DRAFT = "draft"
    SENT = "sent"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    EXPIRED = "expired"
    CONVERTED = "converted"


class QuotationTemplate(Base, TimestampMixin):
    """
    Reusable template for generating standard quotations.
    STATUS: PLANNED - Foundation entity schema.
    """
    __tablename__ = "quotation_templates"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    default_validity_days: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    terms_and_conditions: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class Quotation(Base, TimestampMixin):
    """
    Sales quotation proposed to prospective or existing customers.
    STATUS: PLANNED - Foundation entity schema.
    """
    __tablename__ = "quotations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    quotation_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True
    )
    template_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("quotation_templates.id", ondelete="SET NULL"),
        nullable=True
    )
    status: Mapped[QuotationStatus] = mapped_column(
        Enum(QuotationStatus, name="quotation_status_enum"),
        default=QuotationStatus.DRAFT,
        nullable=False,
        index=True
    )
    subtotal: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    discount_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    tax_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    total_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    valid_until: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    lines: Mapped[List["QuotationLine"]] = relationship("QuotationLine", back_populates="quotation", cascade="all, delete-orphan")


class QuotationLine(Base, TimestampMixin):
    """
    Itemized product/variant/plan entry on a quotation.
    STATUS: PLANNED - Foundation entity schema.
    """
    __tablename__ = "quotation_lines"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    quotation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("quotations.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    product_variant_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("product_variants.id", ondelete="SET NULL"),
        nullable=True
    )
    plan_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("plans.id", ondelete="SET NULL"),
        nullable=True
    )
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    line_total: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    # Relationships
    quotation: Mapped["Quotation"] = relationship("Quotation", back_populates="lines")
