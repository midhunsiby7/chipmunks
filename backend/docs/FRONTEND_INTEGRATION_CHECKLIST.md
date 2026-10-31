# Brightloop — Frontend Integration Checklist & Workflow Guide

**Target Audience:** Frontend Engineer  
**Backend Base URL:** `http://localhost:8000/api/v1`  
**Authentication Standard:** HTTP Authorization Header `Bearer <firebase_id_token>`  
**Backend Status:** 65/65 Automated Tests Passing (including full E2E lifecycle)

---

## 1. Quick Integration Overview

The backend is fully operational with complete support for:
1. **Firebase Authentication + PostgreSQL RBAC (`admin`, `staff`, `customer`).**
2. **Product Catalog & Subscription Plans.**
3. **Quotation Drafting & Conversion Workflow.**
4. **Subscription Lifecycle (`active`, `paused`, `cancelled`, `closed`).**
5. **Automated & On-Demand Invoice Generation.**
6. **Printable HTML Invoices** (`GET /api/v1/invoices/{id}/html`).
7. **Razorpay Standard Checkout & HMAC Signature Verification.**
8. **Executive Analytics Dashboard** (`GET /api/v1/analytics/dashboard`).

---

## 2. Authentication & Profile Bootstrap Flow

### On User Sign-In / Registration:
Every authenticated request must include:
```javascript
headers: {
  Authorization: `Bearer ${await auth.currentUser.getIdToken()}`
}
```

### Initial Profile Sync:
Immediately after Firebase sign-in or signup, call:
```http
POST /api/v1/users/profile
Content-Type: application/json

{
  "full_name": "Alice Wonderland",
  "phone_number": "+1234567890",
  "company_name": "Wonderland Inc"
}
```
* **Returns:** Full PostgreSQL user profile with authoritative `role`: `"admin" | "staff" | "customer"`.
* **Note:** This endpoint is **idempotent**. If the user already exists, it safely returns their existing record.

### Fetching Current User State:
On app startup or route navigation:
```http
GET /api/v1/users/me
```
* Use `user.role` to conditionally render navigation links (`admin` sees all, `staff` sees operations, `customer` sees their subscriptions & invoices).

---

## 3. End-to-End Demo Subscription Workflow

Follow this step-by-step sequence to demonstrate the entire platform flow:

### Step 1: Admin Creates Product & Plan
* **Endpoint:** `POST /api/v1/products` (Requires `admin` role)
```json
{
  "name": "Cloud Pro Workspace",
  "sku": "PROD-CLOUD-PRO",
  "description": "High performance collaborative cloud workspace",
  "sales_price": "49.00",
  "variants": [
    {
      "name": "Extra 100GB Storage",
      "variant_code": "VAR-STORAGE-100GB",
      "price": "10.00"
    }
  ]
}
```
* **Endpoint:** `POST /api/v1/plans` (Requires `admin` role)
```json
{
  "name": "Pro Team Plan",
  "code": "PLAN-PRO-TEAM",
  "description": "Access to collaborative cloud workspace",
  "billing_interval": "monthly",
  "interval_count": 1,
  "price": "49.00",
  "minimum_quantity": 1,
  "is_active": true,
  "product_ids": ["<product_id_from_above>"]
}
```

### Step 2: Customer Discovers Available Plans
* **Endpoint:** `GET /api/v1/plans`
* Filters: `is_active=true` returns plans ready for customer self-signup.

### Step 3: Customer Subscribes
* **Endpoint:** `POST /api/v1/subscriptions` (Customer passes their own `customer_id` from `/users/me`)
```json
{
  "customer_id": "<user_id>",
  "plan_id": "<plan_id>",
  "quantity": 1,
  "payment_terms": "due_on_receipt",
  "lines": [
    {
      "product_variant_id": "<variant_id>",
      "description": "Extra 100GB Storage Add-on",
      "quantity": 1,
      "unit_price": "10.00"
    }
  ],
  "notes": "First direct customer subscription"
}
```
* **What happens behind the scenes:**
  1. Backend creates the `Subscription` with status `ACTIVE`.
  2. Backend **automatically generates the initial Period 1 Invoice** so the customer can pay immediately!

### Step 4: Invoice Retrieval & Printable View
* **List Invoices for Subscription:**
  ```http
  GET /api/v1/invoices?subscription_id=<subscription_id>
  ```
* **On-Demand Invoice Generation (Fallback / Refresh):**
  If an invoice is ever needed on-demand for the current cycle:
  ```http
  POST /api/v1/subscriptions/<subscription_id>/generate-invoice
  ```
* **Printable Invoice (HTML):**
  ```http
  GET /api/v1/invoices/<invoice_id>/html
  ```
  * Open this URL in a new browser tab (`window.open(url, '_blank')`) or render inside a hidden `<iframe>`.
  * The backend returns a fully styled, professional HTML invoice that automatically opens the browser's print dialog (`window.print()`).

---

## 4. Razorpay Test Mode Payment Flow

### Step A: Generate Razorpay Order
When customer clicks **"Pay Now"** on an invoice:
```http
POST /api/v1/payments/razorpay/create-order
(Or alias: POST /api/v1/payments/razorpay/order)
Content-Type: application/json

{
  "invoice_id": "<invoice_id>"
}
```
**Response received:**
```json
{
  "order_id": "order_xyz123456",
  "amount": 5900,
  "currency": "INR",
  "key_id": "rzp_test_...",
  "invoice_id": "<invoice_id>",
  "customer_email": "alice@example.com",
  "customer_name": "Alice Wonderland"
}
```
*(Note: `amount` is in the smallest currency unit — paise, so 59.00 = 5900).*

### Step B: Launch Razorpay Modal
In your React component, load Razorpay script (`https://checkout.razorpay.com/v1/checkout.js`) and initialize:
```javascript
const options = {
  key: orderData.key_id,
  amount: orderData.amount,
  currency: orderData.currency,
  name: "Brightloop Subscriptions",
  description: `Payment for Invoice #${invoice.invoice_number}`,
  order_id: orderData.order_id,
  prefill: {
    name: orderData.customer_name,
    email: orderData.customer_email,
  },
  theme: {
    color: "#0284c7",
  },
  handler: async function (response) {
    // Step C: Verify signature on backend
    await handlePaymentSuccess(response);
  },
};

const rzp = new window.Razorpay(options);
rzp.open();
```

### Step C: Verify Payment Signature on Backend
In your `handler` callback, send the cryptographic tokens to the backend:
```http
POST /api/v1/payments/razorpay/verify
Content-Type: application/json

{
  "razorpay_order_id": response.razorpay_order_id,
  "razorpay_payment_id": response.razorpay_payment_id,
  "razorpay_signature": response.razorpay_signature
}
```
* **Success Result:**
  * Backend cryptographically verifies HMAC-SHA256 signature using `RAZORPAY_KEY_SECRET`.
  * Creates a completed `Payment` record in PostgreSQL.
  * Transitions `Invoice` status to **`PAID`** (`amount_due = 0.00`).
  * Reconciles subscription billing state.
  * Refresh the invoice view or redirect user to a "Payment Successful" confirmation!

---

## 5. Analytics Dashboard Integration (`/analytics/dashboard`)

* **Endpoint:** `GET /api/v1/analytics/dashboard`
* **Access Control:** Restricted to `admin` and `staff` (Returns `403 Forbidden` if called by `customer`).
* **Returned Fields for UI:**
  * `total_customers`: Number of registered accounts.
  * `active_subscriptions`: Active recurring subscriptions.
  * `total_revenue`: Total invoiced revenue.
  * `total_collections`: Total completed payments.
  * `mrr`: Monthly Recurring Revenue.
  * `arr`: Annual Recurring Revenue.
  * `revenue_trends`: Formatted for Recharts:
    ```json
    [
      { "date_label": "May", "month": "May", "mrr": 14200.0, "collections": 28100.0 },
      { "date_label": "Jun", "month": "Jun", "mrr": 14200.0, "collections": 28100.0 }
    ]
    ```
    *(Both `month` and `date_label` properties are provided for direct Recharts `<XAxis dataKey="month" />` compatibility).*
  * `recent_subscriptions`: Array of the latest 5 subscriptions with customer name, plan, and status.
  * `recent_payments`: Array of the latest 5 completed payments with invoice number and customer name.

---

## 6. HTTP Error Handling Guide

| Status Code | Meaning | Action to Take |
|-------------|---------|----------------|
| **401 Unauthorized** | Firebase ID token missing, expired, or invalid. | Refresh token via `auth.currentUser.getIdToken(true)` or redirect to `/login`. |
| **403 Forbidden** | Role permission check failed or customer isolation boundary enforced. | Show "Access Denied" or redirect to permitted dashboard. |
| **404 Not Found** | Record does not exist. | Display friendly 404 state. |
| **409 Conflict** | Business rule conflict (e.g. Quotation already converted, duplicate email). | Display the backend `detail` message in an error banner. |
| **422 Unprocessable** | Request schema validation failed. | Inspect `error.response.data.detail` to identify the missing or malformed parameter. |

---

## 7. Multi-Tenant Customer Isolation Guarantee

The backend strictly enforces tenant boundary isolation:
* Customers **cannot** read or pay other customers' invoices.
* Customers **cannot** view or modify other customers' subscriptions.
* Any unauthorized cross-customer ID reference automatically returns **`403 Forbidden`**.
