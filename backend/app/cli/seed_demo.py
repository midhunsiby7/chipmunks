import asyncio
from datetime import datetime, timedelta, timezone
from decimal import Decimal
import logging
import sys
import uuid

from sqlalchemy import select
from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.models.discount import Discount, DiscountType
from app.models.invoice import Invoice, InvoiceLine, InvoiceStatus
from app.models.payment import Payment, PaymentMethod, PaymentStatus
from app.models.plan import BillingInterval, Plan
from app.models.product import Product, ProductVariant
from app.models.quotation import Quotation, QuotationLine, QuotationStatus
from app.models.subscription import Subscription, SubscriptionLine, SubscriptionStatus
from app.models.tax import TaxRule
from app.models.user import User, UserRole

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger("seed_demo")


async def run_seed():
    """
    Seeds rich, identifiable demo data for local hackathon demonstrations.
    Guards against running in production.
    """
    if settings.APP_ENV == "production":
        logger.error("Demo seeding is strictly forbidden in production mode (APP_ENV=production).")
        sys.exit(1)

    logger.info("Starting Brightloop demo seeding...")

    async with AsyncSessionLocal() as session:
        # 0. Primary Hackathon Evaluator Demo Accounts (Admin, Staff, Customer)
        demo_admin = await session.scalar(select(User).where(User.firebase_uid == "evaluator-uid-admin"))
        if not demo_admin:
            demo_admin = await session.scalar(select(User).where(User.email == "admin@brightloop.local"))
        if not demo_admin:
            demo_admin = User(
                firebase_uid="evaluator-uid-admin",
                email="admin@brightloop.local",
                full_name="Demo Administrator",
                role=UserRole.ADMIN,
                is_active=True,
            )
            session.add(demo_admin)
        else:
            demo_admin.firebase_uid = "evaluator-uid-admin"
            demo_admin.role = UserRole.ADMIN
            demo_admin.is_active = True

        demo_staff = await session.scalar(select(User).where(User.firebase_uid == "evaluator-uid-staff"))
        if not demo_staff:
            demo_staff = await session.scalar(select(User).where(User.email == "staff@brightloop.local"))
        if not demo_staff:
            demo_staff = User(
                firebase_uid="evaluator-uid-staff",
                email="staff@brightloop.local",
                full_name="Demo Operations Staff",
                role=UserRole.STAFF,
                is_active=True,
            )
            session.add(demo_staff)
        else:
            demo_staff.firebase_uid = "evaluator-uid-staff"
            demo_staff.role = UserRole.STAFF
            demo_staff.is_active = True

        # Demo Customer used by the Hackathon Evaluation quick-switcher
        c1 = await session.scalar(select(User).where(User.firebase_uid == "evaluator-uid-customer"))
        if not c1:
            c1 = await session.scalar(select(User).where(User.email == "customer@brightloop.local"))
        if not c1:
            c1 = User(
                firebase_uid="evaluator-uid-customer",
                email="customer@brightloop.local",
                full_name="Acme Global Corporation",
                company_name="Acme Global",
                role=UserRole.CUSTOMER,
                is_active=True,
            )
            session.add(c1)
        else:
            c1.firebase_uid = "evaluator-uid-customer"
            c1.role = UserRole.CUSTOMER
            c1.is_active = True
            if not c1.company_name:
                c1.company_name = "Acme Global"

        # Additional Demo Customers
        c2 = await session.scalar(select(User).where(User.email == "demo.customer2@brightloop.com"))
        if not c2:
            c2 = User(
                firebase_uid="demo-customer-2-uid",
                email="demo.customer2@brightloop.com",
                full_name="TechNova Labs Inc",
                company_name="TechNova Labs",
                role=UserRole.CUSTOMER,
                is_active=True,
            )
            session.add(c2)

        await session.flush()

        # 2. Demo Products & Variants
        p1 = await session.scalar(select(Product).where(Product.sku == "PROD-CLOUD-SUITE"))
        if not p1:
            p1 = Product(
                name="Brightloop Cloud Enterprise Suite",
                sku="PROD-CLOUD-SUITE",
                description="Comprehensive multi-cadence billing and subscription management SaaS engine.",
                product_type="service",
                sales_price=Decimal("499.00"),
                cost_price=Decimal("120.00"),
                is_active=True,
            )
            session.add(p1)
            await session.flush()

            v1 = ProductVariant(
                product_id=p1.id,
                name="Enterprise Dedicated Node",
                variant_code="VAR-CLOUD-NODE",
                price=Decimal("499.00"),
                price_difference=Decimal("0.00"),
                is_active=True,
            )
            v2 = ProductVariant(
                product_id=p1.id,
                name="Dedicated Support Add-on",
                variant_code="VAR-CLOUD-SUPP",
                price=Decimal("99.00"),
                price_difference=Decimal("99.00"),
                is_active=True,
            )
            session.add_all([v1, v2])

        p2 = await session.scalar(select(Product).where(Product.sku == "PROD-API-GATEWAY"))
        if not p2:
            p2 = Product(
                name="High-Throughput API Gateway",
                sku="PROD-API-GATEWAY",
                description="Sub-2-second recurring invoice batch dispatcher with webhook security.",
                product_type="service",
                sales_price=Decimal("199.00"),
                cost_price=Decimal("45.00"),
                is_active=True,
            )
            session.add(p2)

        await session.flush()

        # 3. Subscription Plans
        plan_starter_m = await session.scalar(select(Plan).where(Plan.code == "PLAN-STARTER-M"))
        if not plan_starter_m:
            plan_starter_m = Plan(
                code="PLAN-STARTER-M",
                name="Starter Tier (Monthly)",
                description="Essential subscription billing for growing startups and small teams.",
                billing_interval=BillingInterval.MONTHLY,
                interval_count=1,
                price=Decimal("49.00"),
                currency="USD",
                trial_period_days=7,
                minimum_quantity=1,
                product_id=p2.id if p2 else None,
                is_active=True,
            )
            session.add(plan_starter_m)

        plan_starter_y = await session.scalar(select(Plan).where(Plan.code == "PLAN-STARTER-Y"))
        if not plan_starter_y:
            plan_starter_y = Plan(
                code="PLAN-STARTER-Y",
                name="Starter Tier (Annual)",
                description="Annual starter billing with 2 months free included.",
                billing_interval=BillingInterval.YEARLY,
                interval_count=1,
                price=Decimal("490.00"),
                currency="USD",
                trial_period_days=14,
                minimum_quantity=1,
                product_id=p2.id if p2 else None,
                is_active=True,
            )
            session.add(plan_starter_y)

        plan_monthly = await session.scalar(select(Plan).where(Plan.code == "PLAN-PRO-MONTHLY"))
        if not plan_monthly:
            plan_monthly = Plan(
                code="PLAN-PRO-MONTHLY",
                name="Pro Growth (Monthly)",
                description="Full-featured subscription engine with automated recurring invoicing and tax calculation.",
                billing_interval=BillingInterval.MONTHLY,
                interval_count=1,
                price=Decimal("249.00"),
                currency="USD",
                trial_period_days=14,
                minimum_quantity=1,
                product_id=p1.id if p1 else None,
                is_active=True,
            )
            session.add(plan_monthly)

        plan_yearly = await session.scalar(select(Plan).where(Plan.code == "PLAN-ENT-YEARLY"))
        if not plan_yearly:
            plan_yearly = Plan(
                code="PLAN-ENT-YEARLY",
                name="Enterprise Cloud (Yearly)",
                description="High-capacity enterprise billing tier with annual billing cycle and priority SLA.",
                billing_interval=BillingInterval.YEARLY,
                interval_count=1,
                price=Decimal("2490.00"),
                currency="USD",
                trial_period_days=30,
                minimum_quantity=1,
                product_id=p1.id if p1 else None,
                is_active=True,
            )
            session.add(plan_yearly)

        await session.flush()

        # 4. Tax Rules
        tax_us = await session.scalar(select(TaxRule).where(TaxRule.tax_code == "TAX-US-CA"))
        if not tax_us:
            tax_us = TaxRule(
                name="California State Sales Tax",
                tax_code="TAX-US-CA",
                rate_percentage=Decimal("8.25"),
                country_code="US",
                state_or_region="California",
                is_active=True,
            )
            session.add(tax_us)

        tax_gst = await session.scalar(select(TaxRule).where(TaxRule.tax_code == "TAX-IN-GST"))
        if not tax_gst:
            tax_gst = TaxRule(
                name="India Integrated GST (SaaS)",
                tax_code="TAX-IN-GST",
                rate_percentage=Decimal("18.00"),
                country_code="IN",
                is_active=True,
            )
            session.add(tax_gst)

        await session.flush()

        # 5. Promotional Discounts
        disc1 = await session.scalar(select(Discount).where(Discount.code == "WELCOME20"))
        if not disc1:
            disc1 = Discount(
                code="WELCOME20",
                description="20% off for new hackathon subscribers",
                discount_type=DiscountType.PERCENTAGE,
                value=Decimal("20.00"),
                minimum_purchase_amount=Decimal("100.00"),
                minimum_quantity=1,
                valid_from=datetime.now(timezone.utc) - timedelta(days=1),
                valid_until=datetime.now(timezone.utc) + timedelta(days=90),
                max_redemptions=500,
                is_active=True,
            )
            session.add(disc1)

        await session.flush()

        # 6. Demo Quotation
        q1 = await session.scalar(select(Quotation).where(Quotation.quotation_number == "QUO-DEMO-00001"))
        if not q1:
            now = datetime.now(timezone.utc)
            q1 = Quotation(
                quotation_number="QUO-DEMO-00001",
                customer_id=c1.id,
                status=QuotationStatus.ACCEPTED,
                subtotal=Decimal("249.00"),
                discount_amount=Decimal("49.80"),
                tax_amount=Decimal("16.43"),
                total_amount=Decimal("215.63"),
                valid_until=now + timedelta(days=30),
                terms_and_conditions="Standard 30-day net payment terms.",
                notes="Demo quotation ready for subscription conversion.",
            )
            session.add(q1)
            await session.flush()

            ql = QuotationLine(
                quotation_id=q1.id,
                plan_id=plan_monthly.id,
                description=f"Subscription to {plan_monthly.name}",
                quantity=1,
                unit_price=plan_monthly.price,
                line_total=plan_monthly.price,
            )
            session.add(ql)

        # 7. Demo Subscription
        sub1 = await session.scalar(select(Subscription).where(Subscription.subscription_code == "SUB-DEMO-00001"))
        if not sub1:
            now = datetime.now(timezone.utc)
            sub1 = Subscription(
                subscription_code="SUB-DEMO-00001",
                customer_id=c1.id,
                plan_id=plan_monthly.id,
                status=SubscriptionStatus.ACTIVE,
                billing_interval=BillingInterval.MONTHLY,
                quantity=1,
                payment_terms="due_on_receipt",
                start_date=now - timedelta(days=15),
                next_billing_date=now + timedelta(days=15),
                current_period_start=now - timedelta(days=15),
                current_period_end=now + timedelta(days=15),
                subtotal=Decimal("249.00"),
                tax_amount=Decimal("20.54"),
                discount_amount=Decimal("0.00"),
                total_amount=Decimal("269.54"),
                notes="Primary active demo subscription",
            )
            session.add(sub1)
            await session.flush()

            sl = SubscriptionLine(
                subscription_id=sub1.id,
                description=f"Base Plan: {plan_monthly.name}",
                quantity=1,
                unit_price=Decimal("249.00"),
                line_total=Decimal("249.00"),
            )
            session.add(sl)

        # 8. Demo Invoices & Payment
        inv1 = await session.scalar(select(Invoice).where(Invoice.invoice_number == "INV-DEMO-00001"))
        if not inv1:
            now = datetime.now(timezone.utc)
            inv1 = Invoice(
                invoice_number="INV-DEMO-00001",
                customer_id=c1.id,
                subscription_id=sub1.id,
                status=InvoiceStatus.PAID,
                billing_period_start=now - timedelta(days=45),
                billing_period_end=now - timedelta(days=15),
                issue_date=now - timedelta(days=45),
                due_date=now - timedelta(days=30),
                subtotal=Decimal("249.00"),
                tax_amount=Decimal("20.54"),
                discount_amount=Decimal("0.00"),
                total_amount=Decimal("269.54"),
                amount_paid=Decimal("269.54"),
                amount_due=Decimal("0.00"),
                currency="USD",
                notes="Reconciled first cycle invoice",
            )
            session.add(inv1)
            await session.flush()

            inv_line = InvoiceLine(
                invoice_id=inv1.id,
                description=f"Monthly Subscription: {plan_monthly.name}",
                quantity=1,
                unit_price=Decimal("249.00"),
                line_total=Decimal("249.00"),
            )
            session.add(inv_line)

            pay1 = Payment(
                payment_reference="PAY-DEMO-00001",
                invoice_id=inv1.id,
                customer_id=c1.id,
                amount=Decimal("269.54"),
                currency="USD",
                payment_method=PaymentMethod.BANK_TRANSFER,
                status=PaymentStatus.COMPLETED,
                paid_at=now - timedelta(days=40),
                gateway_transaction_id="TXN-DEMO-9912",
                notes="Direct bank transfer confirmed",
            )
            session.add(pay1)

        # Outstanding second invoice
        inv2 = await session.scalar(select(Invoice).where(Invoice.invoice_number == "INV-DEMO-00002"))
        if not inv2:
            now = datetime.now(timezone.utc)
            inv2 = Invoice(
                invoice_number="INV-DEMO-00002",
                customer_id=c1.id,
                subscription_id=sub1.id,
                status=InvoiceStatus.ISSUED,
                billing_period_start=now - timedelta(days=15),
                billing_period_end=now + timedelta(days=15),
                issue_date=now - timedelta(days=15),
                due_date=now + timedelta(days=5),
                subtotal=Decimal("249.00"),
                tax_amount=Decimal("20.54"),
                discount_amount=Decimal("0.00"),
                total_amount=Decimal("269.54"),
                amount_paid=Decimal("0.00"),
                amount_due=Decimal("269.54"),
                currency="USD",
                notes="Current active invoice due soon",
            )
            session.add(inv2)
            await session.flush()

            inv_line2 = InvoiceLine(
                invoice_id=inv2.id,
                description=f"Monthly Subscription: {plan_monthly.name}",
                quantity=1,
                unit_price=Decimal("249.00"),
                line_total=Decimal("249.00"),
            )
            session.add(inv_line2)

        await session.commit()
        logger.info("Demo seeding completed successfully! All entities created and linked.")


def main():
    asyncio.run(run_seed())


if __name__ == "__main__":
    main()
