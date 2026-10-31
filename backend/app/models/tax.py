import uuid
from sqlalchemy import Boolean, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class TaxRule(Base, TimestampMixin):
    """
    Tax rule entity for regional or product tax rates.
    STATUS: PLANNED - Foundation entity schema.
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
    country_code: Mapped[str] = mapped_column(String(2), nullable=False, index=True)
    state_or_region: Mapped[str | None] = mapped_column(String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
