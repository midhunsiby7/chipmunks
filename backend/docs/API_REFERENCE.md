# Brightloop — Backend API Integration Reference
**Version:** 1.0.0  
**Base URL:** `http://localhost:8000/api/v1`  
**Authentication Scheme:** HTTP Bearer token via Firebase ID Token (`Authorization: Bearer <firebase_id_token>`)

---

## 1. System & Diagnostics

### `GET /health`
* **Description:** Top-level and API health check endpoint.
* **Auth:** None (Public)
* **Response `200 OK`:**
```json
{
  "status": "healthy",
  "app_name": "Brightloop Subscription Management API",
  "version": "0.1.0",
  "timestamp": "2026-10-31T06:50:00Z"
}
```

---

## 2. Users & Identity (PostgreSQL RBAC + Firebase Auth)

### `POST /users/profile`
* **Description:** Initializes or retrieves current user profile. Guaranteed idempotent. Automatically assigns role `customer`.
* **Auth:** Required (Bearer Token)
* **Request Body:**
```json
{
  "full_name": "Jane Doe",
  "phone_number": "+1234567890",
  "company_name": "Acme Global"
}
```
* **Response `200 OK`:**
```json
{
  "id": "uuid",
  "firebase_uid": "string",
  "email": "jane@example.com",
  "full_name": "Jane Doe",
  "role": "customer",
  "is_active": true,
  "phone_number": "+1234567890",
  "company_name": "Acme Global",
  "created_at": "2026-10-31T06:00:00Z",
  "updated_at": "2026-10-31T06:00:00Z"
}
```
* **Errors:** `401 Unauthorized`, `409 Conflict` (if email belongs to another user).

### `GET /users/me`
* **Description:** Retrieves current user profile. Safely synchronizes email if verified on Firebase.
* **Auth:** Required (Bearer Token)
* **Response `200 OK`:** Same as `POST /users/profile`.
* **Errors:** `401 Unauthorized`, `403 Forbidden` (if deactivated), `404 Not Found` (if not initialized).

### `GET /users`
* **Description:** Lists users with pagination and filtering.
* **Auth:** Required (`admin` lists all; `staff` strictly restricted to `role=customer`; `customer` gets 403).
* **Query Params:** `page` (default 1), `page_size` (default 20), `role` (`admin`, `staff`, `customer`), `is_active` (`true`, `false`).
* **Response `200 OK`:**
```json
{
  "items": [ /* User objects */ ],
  "total": 45,
  "page": 1,
  "page_size": 20,
  "pages": 3
}
```

### `POST /users/staff`
* **Description:** Provisions a new Staff account on Firebase and PostgreSQL.
* **Auth:** Required (`admin` only)
* **Request Body:**
```json
{
  "email": "staff.member@brightloop.com",
  "full_name": "Staff Member",
  "phone_number": "+1987654321",
  "company_name": "Brightloop Internal"
}
```
* **Response `201 Created`:** User object with links in development mode.

---

## 3. Product Catalog & Variants

### `GET /products`
* **Description:** Lists products with their active variants.
* **Auth:** None (Public / Authenticated)
* **Query Params:** `page`, `page_size`, `product_type` (`goods`, `service`), `is_active` (`true`, `false`), `search` (string).
* **Response `200 OK`:** Paginated list of products with nested `variants` array.

### `POST /products`
* **Description:** Creates a product and optionally initial variants.
* **Auth:** Required (`admin` or `staff`)
* **Request Body:**
```json
{
  "name": "Cloud Computing Node",
  "sku": "SKU-CLOUD-01",
  "description": "Virtual compute instances",
  "product_type": "service",
  "sales_price": "99.00",
  "cost_price": "20.00",
  "variants": [
    {
      "name": "High RAM",
      "variant_code": "VAR-RAM-01",
      "sku": "SKU-CLOUD-01-RAM",
      "price": "149.00",
      "price_difference": "50.00"
    }
  ]
}
```
* **Response `201 Created`:** Product object.

### `GET /products/{id}`
* **Description:** Retrieves product details and all variants.
* **Auth:** None (Public / Authenticated)

### `PUT /products/{id}`
* **Description:** Updates product metadata.
* **Auth:** Required (`admin` or `staff`)

### `POST /products/{id}/variants`
* **Description:** Adds a variant to an existing product.
* **Auth:** Required (`admin` or `staff`)

### `DELETE /products/{id}/variants/{variant_id}`
* **Description:** Safely deactivates variant (`is_active = false`) to preserve historical line integrity.
* **Auth:** Required (`admin` or `staff`)

---

## 4. Subscription Plans

### `GET /plans`
* **Description:** Lists subscription pricing plans.
* **Auth:** None (Public / Authenticated)
* **Query Params:** `page`, `page_size`, `billing_interval` (`daily`, `weekly`, `monthly`, `yearly`), `is_active` (`true`, `false`), `search` (string).
* **Response `200 OK`:** Paginated plans list.

### `POST /plans`
* **Description:** Creates a subscription plan with cadence and constraints.
* **Auth:** Required (`admin` only)
* **Request Body:**
```json
{
  "code": "PLAN-PRO-MONTHLY",
  "name": "Pro Growth Tier",
  "description": "Unlimited team seats and priority support",
  "billing_interval": "monthly",
  "interval_count": 1,
  "price": "199.00",
  "currency": "USD",
  "trial_period_days": 14,
  "minimum_quantity": 1,
  "available_from": null,
  "available_until": null,
  "product_id": "uuid",
  "is_active": true
}
```
* **Response `201 Created`:** Plan object.

### `POST /plans/{id}/close`
* **Description:** Closes a plan to new signups without affecting existing active subscriptions.
* **Auth:** Required (`admin` only)

---

## 5. Tax Rules & Promotional Discounts

### `GET /taxes` & `POST /taxes`
* **Description:** List or create tax rules (e.g. 10% VAT / GST).
* **Auth:** `POST` requires `admin` or `staff`.

### `GET /discounts` & `POST /discounts`
* **Description:** List or create discount promo codes (`percentage` or `fixed_amount`).
* **Auth:** `POST` requires `admin` or `staff`.

### `POST /discounts/validate`
* **Description:** Validates a coupon code and returns calculated discount deduction.
* **Auth:** None (Public / Authenticated)
* **Request Body:** `{ "code": "SAVE20", "amount": 100.00, "quantity": 1, "plan_id": "uuid" }`
* **Response `200 OK`:** `{ "valid": true, "discount_amount": 20.00, "message": "Applied successfully" }`

---

## 6. Quotations & Quotation Templates

### `GET /quotations/templates` & `POST /quotations/templates`
* **Description:** Manage reusable quotation drafting templates.

### `GET /quotations`
* **Description:** Lists quotations. Customers can only see their own quotations.
* **Auth:** Required (Customer sees self; Admin/Staff sees all).

### `POST /quotations`
* **Description:** Creates formal quotation with auto-calculated subtotals, taxes, and discounts.
* **Auth:** Required (Admin/Staff or Customer for self).

### `POST /quotations/{id}/accept`
* **Description:** Customer or Staff accepts quotation. Status transitions to `accepted`.

### `POST /quotations/{id}/convert`
* **Description:** Converts `accepted` quotation into an `active` Subscription. Rejects duplicate calls with `409 Conflict`.
* **Response `200 OK`:** Created `SubscriptionResponse`.

---

## 7. Subscriptions & Lifecycle

### `GET /subscriptions`
* **Description:** Lists subscriptions. Strictly isolated: customers see only their own.
* **Query Params:** `page`, `page_size`, `status` (`active`, `paused`, `cancelled`, `closed`), `customer_id`.

### `POST /subscriptions`
* **Description:** Direct plan signup. Enforces minimum quantity and availability window.
* **Auth:** Required (Customer for self; Admin/Staff for any).
* **Request Body:**
```json
{
  "customer_id": "uuid",
  "plan_id": "uuid",
  "quantity": 2,
  "discount_code": "SAVE10",
  "payment_terms": "due_on_receipt",
  "notes": "Direct customer checkout"
}
```

### `POST /subscriptions/{id}/pause`
* **Description:** Transitions `active` -> `paused`. Halts recurring billing.
* **Body:** `{ "reason": "Summer break" }`

### `POST /subscriptions/{id}/resume`
* **Description:** Transitions `paused` -> `active`.

### `POST /subscriptions/{id}/cancel`
* **Description:** Immediate cancellation or scheduled cancellation at period end.
* **Body:** `{ "reason": "Switching provider", "cancel_at_period_end": true }`

### `POST /subscriptions/{id}/close`
* **Description:** Permanently closes subscription.
* **Auth:** Required (`admin` or `staff` only).

### `POST /subscriptions/{id}/generate-invoice`
* **Description:** Generates or retrieves the active billing period invoice for this subscription on demand. Idempotent.
* **Auth:** Required (Customer can only generate for own subscription; Admin/Staff for all).
* **Response `200 OK`:** Created or retrieved `InvoiceResponse`.

---

## 8. Invoices, Recurring Billing & HTML Print View

### `GET /invoices`
* **Description:** Lists invoices with pagination and customer data isolation.
* **Query Params:** `page`, `page_size`, `status` (`confirmed`, `issued`, `paid`, `partially_paid`, `overdue`, `cancelled`), `customer_id`, `subscription_id`.

### `POST /invoices`
* **Description:** Creates manual invoice.
* **Auth:** Required (`admin` or `staff` only).

### `GET /invoices/{id}`
* **Description:** Retrieves invoice details, itemized lines, and payment ledger.

### `GET /invoices/{id}/html`
* **Description:** Standalone styled HTML invoice view with `@media print` CSS and `window.print()` trigger.
* **Auth:** Required (Customer can only view own; Admin/Staff can view all).
* **Response `200 OK`:** `text/html; charset=utf-8`.

### `POST /invoices/generate-recurring`
* **Description:** Scans due subscriptions and advances billing cycles. Idempotent. Guarded by `uq_invoice_sub_period`.
* **Auth:** Required (`admin` or `staff` only).
* **Body:** `{ "target_date": "2026-10-31T00:00:00Z" }`

### `POST /invoices/{id}/cancel`
* **Description:** Cancels unpaid invoice. Rejects with 400 if payments have been recorded.
* **Auth:** Required (`admin` or `staff` only).

---

## 9. Payments & Razorpay Test Mode

### `GET /payments` & `POST /payments`
* **Description:** List or record payments. Enforces overpayment prevention (`payment <= amount_due`). Auto-balances invoice to `paid` or `partially_paid`.

### `POST /payments/razorpay/create-order` (Alias: `POST /payments/razorpay/order`)
* **Description:** Generates server-side Razorpay order for checkout modal.
* **Auth:** Required (Customer for own invoice; Admin/Staff for all).
* **Request Body:** `{ "invoice_id": "uuid" }`
* **Response `200 OK`:**
```json
{
  "order_id": "order_abc12345",
  "amount": 19900,
  "currency": "INR",
  "key_id": "rzp_test_public_key",
  "invoice_id": "uuid",
  "customer_email": "customer@example.com",
  "customer_name": "Jane Doe"
}
```

### `POST /payments/razorpay/verify`
* **Description:** Verifies HMAC-SHA256 signature using `RAZORPAY_KEY_SECRET`. Reconciles invoice balance.
* **Request Body:**
```json
{
  "razorpay_order_id": "order_abc12345",
  "razorpay_payment_id": "pay_xyz67890",
  "razorpay_signature": "hex_signature"
}
```
* **Response `200 OK`:** Recorded `PaymentResponse`.

### `POST /payments/razorpay/webhook`
* **Description:** Webhook callback from Razorpay. Verifies `X-Razorpay-Signature`. Idempotent deduplication via `WebhookEvent`. Failed payment events never mark invoices paid.

---

## 10. Analytics & Reporting

### `GET /analytics/dashboard`
* **Description:** Executive dashboard aggregations.
* **Auth:** Required (`admin` or `staff` only. Customers receive `403 Forbidden`).
* **Response `200 OK`:**
```json
{
  "total_customers": 12,
  "total_products": 6,
  "active_subscriptions": 18,
  "paused_subscriptions": 2,
  "closed_subscriptions": 1,
  "total_revenue": "34500.00",
  "total_collections": "28100.00",
  "outstanding_invoices_count": 4,
  "outstanding_amount": "6400.00",
  "overdue_invoices_count": 1,
  "overdue_amount": "1200.00",
  "mrr": "14200.00",
  "arr": "170400.00",
  "revenue_trends": [
    { "date_label": "May", "month": "May", "mrr": 14200.0, "collections": 28100.0 }
  ],
  "recent_subscriptions": [ /* Recent items */ ],
  "recent_payments": [ /* Recent items */ ]
}
```
