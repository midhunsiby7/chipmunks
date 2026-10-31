import enum
import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class InvoiceStatus(str, enum.Enum):
    DRAFT = "draft"
    CONFIRMED = "confirmed"
    ISSUED = "issued"
    PAID = "paid"
    PARTIALLY_PAID = "partially_paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"
    VOID = "void"


class Invoice(Base, TimestampMixin):
    """
    Recurring or one-off billing invoice entity with strict period uniqueness.
    """
    __tablename__ = "invoices"
    __table_args__ = (
        UniqueConstraint("subscription_id", "billing_period_start", "billing_period_end", name="uq_invoice_sub_period"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    invoice_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True
    )
    subscription_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("subscriptions.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    status: Mapped[InvoiceStatus] = mapped_column(
        Enum(InvoiceStatus, name="invoice_status_enum", values_callable=lambda x: [e.value for e in x]),
        default=InvoiceStatus.DRAFT,
        nullable=False,
        index=True
    )
    billing_period_start: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    billing_period_end: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    issue_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    due_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    subtotal: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    tax_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    discount_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    total_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    amount_paid: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    amount_due: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    lines: Mapped[List["InvoiceLine"]] = relationship("InvoiceLine", back_populates="invoice", cascade="all, delete-orphan")
    payments: Mapped[List["Payment"]] = relationship("Payment", back_populates="invoice")
    customer = relationship("User", foreign_keys=[customer_id])
    subscription = relationship("Subscription", foreign_keys=[subscription_id])


class InvoiceLine(Base, TimestampMixin):
    """
    Itemized entries on an invoice.
    """
    __tablename__ = "invoice_lines"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    invoice_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("invoices.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    line_total: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    # Relationships
    invoice: Mapped["Invoice"] = relationship("Invoice", back_populates="lines")
