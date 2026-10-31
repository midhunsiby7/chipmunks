"""002_complete_domain_schema

Revision ID: 002_complete_domain_schema
Revises: 001_phase1_users_schema
Create Date: 2026-10-31 12:10:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '002_complete_domain_schema'
down_revision: Union[str, None] = '001_phase1_users_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()

    # 1. Create Enums
    billing_interval_enum = postgresql.ENUM('daily', 'weekly', 'monthly', 'yearly', name='billing_interval_enum')
    billing_interval_enum.create(bind, checkfirst=True)

    discount_type_enum = postgresql.ENUM('percentage', 'fixed_amount', name='discount_type_enum')
    discount_type_enum.create(bind, checkfirst=True)

    quotation_status_enum = postgresql.ENUM('draft', 'sent', 'accepted', 'rejected', 'expired', 'converted', name='quotation_status_enum')
    quotation_status_enum.create(bind, checkfirst=True)

    subscription_status_enum = postgresql.ENUM('draft', 'quotation', 'confirmed', 'active', 'paused', 'closed', 'cancelled', 'expired', 'trialing', name='subscription_status_enum')
    subscription_status_enum.create(bind, checkfirst=True)

    sub_billing_interval_enum = postgresql.ENUM('daily', 'weekly', 'monthly', 'yearly', name='sub_billing_interval_enum')
    sub_billing_interval_enum.create(bind, checkfirst=True)

    invoice_status_enum = postgresql.ENUM('draft', 'confirmed', 'issued', 'paid', 'partially_paid', 'overdue', 'cancelled', 'void', name='invoice_status_enum')
    invoice_status_enum.create(bind, checkfirst=True)

    payment_method_enum = postgresql.ENUM('cash', 'bank_transfer', 'razorpay', 'credit_card', 'manual', 'stripe', 'paypal', name='payment_method_enum')
    payment_method_enum.create(bind, checkfirst=True)

    payment_status_enum = postgresql.ENUM('pending', 'completed', 'failed', 'refunded', name='payment_status_enum')
    payment_status_enum.create(bind, checkfirst=True)

    # 2. Products table
    op.create_table(
        'products',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('sku', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('product_type', sa.String(length=50), nullable=False, server_default='service'),
        sa.Column('sales_price', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'),
        sa.Column('cost_price', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'),
        sa.Column('internal_notes', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_products_id'), 'products', ['id'], unique=False)
    op.create_index(op.f('ix_products_name'), 'products', ['name'], unique=False)
    op.create_index(op.f('ix_products_sku'), 'products', ['sku'], unique=True)

    # 3. Product Variants table
    op.create_table(
        'product_variants',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('product_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('variant_code', sa.String(length=100), nullable=False),
        sa.Column('price', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('price_difference', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_product_variants_id'), 'product_variants', ['id'], unique=False)
    op.create_index(op.f('ix_product_variants_product_id'), 'product_variants', ['product_id'], unique=False)
    op.create_index(op.f('ix_product_variants_variant_code'), 'product_variants', ['variant_code'], unique=True)

    # 4. Plans table
    op.create_table(
        'plans',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('code', sa.String(length=100), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('billing_interval', postgresql.ENUM('daily', 'weekly', 'monthly', 'yearly', name='billing_interval_enum', create_type=False), nullable=False),
        sa.Column('interval_count', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('price', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('currency', sa.String(length=3), nullable=False, server_default='USD'),
        sa.Column('trial_period_days', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('minimum_quantity', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('available_from', sa.DateTime(timezone=True), nullable=True),
        sa.Column('available_until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('product_id', sa.UUID(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_plans_id'), 'plans', ['id'], unique=False)
    op.create_index(op.f('ix_plans_code'), 'plans', ['code'], unique=True)
    op.create_index(op.f('ix_plans_billing_interval'), 'plans', ['billing_interval'], unique=False)

    # 5. Tax Rules table
    op.create_table(
        'tax_rules',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('tax_code', sa.String(length=50), nullable=False),
        sa.Column('rate_percentage', sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column('is_fixed', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('country_code', sa.String(length=2), nullable=False),
        sa.Column('state_or_region', sa.String(length=100), nullable=True),
        sa.Column('effective_from', sa.DateTime(timezone=True), nullable=True),
        sa.Column('effective_until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_tax_rules_id'), 'tax_rules', ['id'], unique=False)
    op.create_index(op.f('ix_tax_rules_tax_code'), 'tax_rules', ['tax_code'], unique=True)
    op.create_index(op.f('ix_tax_rules_country_code'), 'tax_rules', ['country_code'], unique=False)

    # 6. Discounts table
    op.create_table(
        'discounts',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('discount_type', postgresql.ENUM('percentage', 'fixed_amount', name='discount_type_enum', create_type=False), nullable=False),
        sa.Column('value', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('minimum_purchase_amount', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'),
        sa.Column('minimum_quantity', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('valid_from', sa.DateTime(timezone=True), nullable=False),
        sa.Column('valid_until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('max_redemptions', sa.Integer(), nullable=True),
        sa.Column('current_redemptions', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('applicable_product_id', sa.UUID(), nullable=True),
        sa.Column('applicable_plan_id', sa.UUID(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['applicable_plan_id'], ['plans.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['applicable_product_id'], ['products.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_discounts_id'), 'discounts', ['id'], unique=False)
    op.create_index(op.f('ix_discounts_code'), 'discounts', ['code'], unique=True)

    # 7. Quotation Templates
    op.create_table(
        'quotation_templates',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('default_validity_days', sa.Integer(), nullable=False, server_default='30'),
        sa.Column('terms_and_conditions', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_quotation_templates_id'), 'quotation_templates', ['id'], unique=False)

    # 8. Subscriptions
    op.create_table(
        'subscriptions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('subscription_code', sa.String(length=50), nullable=False),
        sa.Column('customer_id', sa.UUID(), nullable=False),
        sa.Column('plan_id', sa.UUID(), nullable=False),
        sa.Column('status', postgresql.ENUM('draft', 'quotation', 'confirmed', 'active', 'paused', 'closed', 'cancelled', 'expired', 'trialing', name='subscription_status_enum', create_type=False), nullable=False),
        sa.Column('billing_interval', postgresql.ENUM('daily', 'weekly', 'monthly', 'yearly', name='sub_billing_interval_enum', create_type=False), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('payment_terms', sa.String(length=100), nullable=False, server_default='due_on_receipt'),
        sa.Column('start_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('next_billing_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('expiry_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('current_period_start', sa.DateTime(timezone=True), nullable=False),
        sa.Column('current_period_end', sa.DateTime(timezone=True), nullable=False),
        sa.Column('subtotal', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'),
        sa.Column('tax_amount', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'),
        sa.Column('discount_amount', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'),
        sa.Column('total_amount', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'),
        sa.Column('cancel_at_period_end', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('cancelled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('paused_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('closed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('trial_start', sa.DateTime(timezone=True), nullable=True),
        sa.Column('trial_end', sa.DateTime(timezone=True), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['customer_id'], ['users.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['plan_id'], ['plans.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_subscriptions_id'), 'subscriptions', ['id'], unique=False)
    op.create_index(op.f('ix_subscriptions_subscription_code'), 'subscriptions', ['subscription_code'], unique=True)
    op.create_index(op.f('ix_subscriptions_customer_id'), 'subscriptions', ['customer_id'], unique=False)
    op.create_index(op.f('ix_subscriptions_plan_id'), 'subscriptions', ['plan_id'], unique=False)
    op.create_index(op.f('ix_subscriptions_status'), 'subscriptions', ['status'], unique=False)

    # 9. Subscription Lines
    op.create_table(
        'subscription_lines',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('subscription_id', sa.UUID(), nullable=False),
        sa.Column('product_variant_id', sa.UUID(), nullable=True),
        sa.Column('description', sa.String(length=255), nullable=False, server_default='Subscription Item'),
        sa.Column('quantity', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('unit_price', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('line_total', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['product_variant_id'], ['product_variants.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['subscription_id'], ['subscriptions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_subscription_lines_id'), 'subscription_lines', ['id'], unique=False)
    op.create_index(op.f('ix_subscription_lines_subscription_id'), 'subscription_lines', ['subscription_id'], unique=False)

    # 10. Quotations
    op.create_table(
        'quotations',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('quotation_number', sa.String(length=50), nullable=False),
        sa.Column('customer_id', sa.UUID(), nullable=False),
        sa.Column('template_id', sa.UUID(), nullable=True),
        sa.Column('converted_subscription_id', sa.UUID(), nullable=True),
        sa.Column('status', postgresql.ENUM('draft', 'sent', 'accepted', 'rejected', 'expired', 'converted', name='quotation_status_enum', create_type=False), nullable=False),
        sa.Column('subtotal', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'),
        sa.Column('discount_amount', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'),
        sa.Column('tax_amount', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'),
        sa.Column('total_amount', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'),
        sa.Column('valid_until', sa.DateTime(timezone=True), nullable=False),
        sa.Column('terms_and_conditions', sa.Text(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['customer_id'], ['users.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['template_id'], ['quotation_templates.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['converted_subscription_id'], ['subscriptions.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_quotations_id'), 'quotations', ['id'], unique=False)
    op.create_index(op.f('ix_quotations_quotation_number'), 'quotations', ['quotation_number'], unique=True)
    op.create_index(op.f('ix_quotations_customer_id'), 'quotations', ['customer_id'], unique=False)
    op.create_index(op.f('ix_quotations_status'), 'quotations', ['status'], unique=False)

    # 11. Quotation Lines
    op.create_table(
        'quotation_lines',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('quotation_id', sa.UUID(), nullable=False),
        sa.Column('product_variant_id', sa.UUID(), nullable=True),
        sa.Column('plan_id', sa.UUID(), nullable=True),
        sa.Column('description', sa.String(length=255), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('unit_price', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('discount_amount', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'),
        sa.Column('tax_amount', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'),
        sa.Column('line_total', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['plan_id'], ['plans.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['product_variant_id'], ['product_variants.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['quotation_id'], ['quotations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_quotation_lines_id'), 'quotation_lines', ['id'], unique=False)
    op.create_index(op.f('ix_quotation_lines_quotation_id'), 'quotation_lines', ['quotation_id'], unique=False)

    # 12. Invoices
    op.create_table(
        'invoices',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('invoice_number', sa.String(length=50), nullable=False),
        sa.Column('customer_id', sa.UUID(), nullable=False),
        sa.Column('subscription_id', sa.UUID(), nullable=True),
        sa.Column('status', postgresql.ENUM('draft', 'confirmed', 'issued', 'paid', 'partially_paid', 'overdue', 'cancelled', 'void', name='invoice_status_enum', create_type=False), nullable=False),
        sa.Column('billing_period_start', sa.DateTime(timezone=True), nullable=True),
        sa.Column('billing_period_end', sa.DateTime(timezone=True), nullable=True),
        sa.Column('issue_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('due_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('subtotal', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'),
        sa.Column('tax_amount', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'),
        sa.Column('discount_amount', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'),
        sa.Column('total_amount', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'),
        sa.Column('amount_paid', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'),
        sa.Column('amount_due', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'),
        sa.Column('currency', sa.String(length=3), nullable=False, server_default='USD'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['customer_id'], ['users.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['subscription_id'], ['subscriptions.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('subscription_id', 'billing_period_start', 'billing_period_end', name='uq_invoice_sub_period')
    )
    op.create_index(op.f('ix_invoices_id'), 'invoices', ['id'], unique=False)
    op.create_index(op.f('ix_invoices_invoice_number'), 'invoices', ['invoice_number'], unique=True)
    op.create_index(op.f('ix_invoices_customer_id'), 'invoices', ['customer_id'], unique=False)
    op.create_index(op.f('ix_invoices_subscription_id'), 'invoices', ['subscription_id'], unique=False)
    op.create_index(op.f('ix_invoices_status'), 'invoices', ['status'], unique=False)

    # 13. Invoice Lines
    op.create_table(
        'invoice_lines',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('invoice_id', sa.UUID(), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('unit_price', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('line_total', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['invoice_id'], ['invoices.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_invoice_lines_id'), 'invoice_lines', ['id'], unique=False)
    op.create_index(op.f('ix_invoice_lines_invoice_id'), 'invoice_lines', ['invoice_id'], unique=False)

    # 14. Payments
    op.create_table(
        'payments',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('payment_reference', sa.String(length=100), nullable=False),
        sa.Column('invoice_id', sa.UUID(), nullable=False),
        sa.Column('customer_id', sa.UUID(), nullable=False),
        sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('currency', sa.String(length=3), nullable=False, server_default='USD'),
        sa.Column('payment_method', postgresql.ENUM('cash', 'bank_transfer', 'razorpay', 'credit_card', 'manual', 'stripe', 'paypal', name='payment_method_enum', create_type=False), nullable=False),
        sa.Column('status', postgresql.ENUM('pending', 'completed', 'failed', 'refunded', name='payment_status_enum', create_type=False), nullable=False),
        sa.Column('paid_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('gateway_transaction_id', sa.String(length=255), nullable=True),
        sa.Column('razorpay_order_id', sa.String(length=255), nullable=True),
        sa.Column('razorpay_payment_id', sa.String(length=255), nullable=True),
        sa.Column('razorpay_signature', sa.String(length=255), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['customer_id'], ['users.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['invoice_id'], ['invoices.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_payments_id'), 'payments', ['id'], unique=False)
    op.create_index(op.f('ix_payments_payment_reference'), 'payments', ['payment_reference'], unique=True)
    op.create_index(op.f('ix_payments_invoice_id'), 'payments', ['invoice_id'], unique=False)
    op.create_index(op.f('ix_payments_customer_id'), 'payments', ['customer_id'], unique=False)
    op.create_index(op.f('ix_payments_status'), 'payments', ['status'], unique=False)
    op.create_index(op.f('ix_payments_razorpay_order_id'), 'payments', ['razorpay_order_id'], unique=False)

    # 15. Razorpay Orders
    op.create_table(
        'razorpay_orders',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('order_id', sa.String(length=100), nullable=False),
        sa.Column('invoice_id', sa.UUID(), nullable=False),
        sa.Column('customer_id', sa.UUID(), nullable=False),
        sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('currency', sa.String(length=3), nullable=False, server_default='INR'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='created'),
        sa.Column('receipt', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['customer_id'], ['users.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['invoice_id'], ['invoices.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_razorpay_orders_id'), 'razorpay_orders', ['id'], unique=False)
    op.create_index(op.f('ix_razorpay_orders_order_id'), 'razorpay_orders', ['order_id'], unique=True)
    op.create_index(op.f('ix_razorpay_orders_invoice_id'), 'razorpay_orders', ['invoice_id'], unique=False)

    # 16. Webhook Events
    op.create_table(
        'webhook_events',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('event_id', sa.String(length=100), nullable=False),
        sa.Column('event_type', sa.String(length=100), nullable=False),
        sa.Column('processed_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('payload', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_webhook_events_id'), 'webhook_events', ['id'], unique=False)
    op.create_index(op.f('ix_webhook_events_event_id'), 'webhook_events', ['event_id'], unique=True)


def downgrade() -> None:
    bind = op.get_bind()

    op.drop_table('webhook_events')
    op.drop_table('razorpay_orders')
    op.drop_table('payments')
    op.drop_table('invoice_lines')
    op.drop_table('invoices')
    op.drop_table('quotation_lines')
    op.drop_table('quotations')
    op.drop_table('subscription_lines')
    op.drop_table('subscriptions')
    op.drop_table('quotation_templates')
    op.drop_table('discounts')
    op.drop_table('tax_rules')
    op.drop_table('plans')
    op.drop_table('product_variants')
    op.drop_table('products')

    postgresql.ENUM(name='payment_status_enum').drop(bind, checkfirst=True)
    postgresql.ENUM(name='payment_method_enum').drop(bind, checkfirst=True)
    postgresql.ENUM(name='invoice_status_enum').drop(bind, checkfirst=True)
    postgresql.ENUM(name='sub_billing_interval_enum').drop(bind, checkfirst=True)
    postgresql.ENUM(name='subscription_status_enum').drop(bind, checkfirst=True)
    postgresql.ENUM(name='quotation_status_enum').drop(bind, checkfirst=True)
    postgresql.ENUM(name='discount_type_enum').drop(bind, checkfirst=True)
    postgresql.ENUM(name='billing_interval_enum').drop(bind, checkfirst=True)
