# BRIGHTLOOP — SUBSCRIPTION MANAGEMENT SYSTEM
## Single Source of Truth & Architecture Guide (PROJECT_CONTEXT.md)

> **Document Status**: Active / Baseline Initialized  
> **Initial Author**: Developer 1 (Project Setup Owner)  
> **Last Updated**: 2026-10-31  
> **Target Audience**: Developer 1, Developer 2, Developer 3, and automated coding agents  
> **Rule of Engagement**: *Never represent planned functionality as implemented functionality.*

---

## A. Project Overview

### 1. Project Name & Description
**Brightloop** is a high-performance, modular monolithic Subscription Management System designed for modern SaaS and recurring-service businesses. It unifies the entire recurring revenue lifecycle: product cataloging, multi-interval subscription terms, dynamic quoting, automated billing and invoice generation, regional taxation, promotional discounting, payment reconciliation, and customer self-service.

### 2. Problem Statement
Businesses handling recurring subscription models often struggle with fragmented tooling across quotation drafting, subscription lifecycle tracking (upgrades, pauses, cancellations), complex billing cycles (daily, weekly, monthly, yearly), tax liability calculations, and payment reconciliation. Brightloop delivers a unified, performant, and reliable platform capable of orchestrating thousands of concurrent subscriptions with sub-2-second response latency.

### 3. Core Objectives
1. **Unified Recurring Revenue Engine**: Provide an integrated suite spanning product definition to invoice reconciliation.
2. **Flexible Cadence Support**: Native scheduling for daily, weekly, monthly, and yearly billing cycles.
3. **High Performance & Low Latency**: Sub-2-second page response times under load across thousands of active subscriptions.
4. **Developer Isolation & Parallel Velocity**: Clear contract boundaries separating frontend, API routes, data models, and business logic for simultaneous multi-developer collaboration.

### 4. Functional Requirements
1. **User Authentication & Security**: User registration, JWT login, password reset, and role-based access control (Admin, Staff, Customer).
2. **Product Catalog**: Multi-variant products, add-on components, and pricing tiers.
3. **Subscription Plans**: Flexible terms, currencies, trial period definitions, and billing intervals (Daily, Weekly, Monthly, Yearly).
4. **Quotation Engine**: Reusable quotation templates, quotation drafting, customer approval workflow, and one-click conversion to active subscriptions.
5. **Subscription Lifecycle Management**: State machine transitions (`draft`, `trialing`, `active`, `paused`, `cancelled`, `expired`), prorations, renewals, and cancellations at period end.
6. **Automated Recurring Invoicing**: Scheduled invoice generation, PDF/HTML generation, due-date management, and balance tracking.
7. **Taxation Engine**: Regional, national, and item-specific tax rules with automated calculation.
8. **Discounts & Promotions**: Percentage-based and fixed-amount coupons with usage tracking and expiry dates.
9. **Payment Recording & Reconciliation**: Payment recording, manual/gateway transaction tracking, and automatic invoice balancing.
10. **Analytics & Reporting**: MRR (Monthly Recurring Revenue), ARR, churn rate, renewal rates, and cohort analytics.
11. **Customer Self-Service Portal**: Customer dashboard to inspect active plans, download invoices, request changes, and review payment history.

---

## B. Technology Stack

### Frontend
| Component | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Framework** | React | ^19.3.1 | Declarative component UI library |
| **Build Tool** | Vite | ^8.3.5 | Next-generation dev server & production bundler |
| **Styling** | Tailwind CSS | ^4.3.3 (@tailwindcss/vite) | Utility-first styling with zero runtime |
| **Routing** | React Router DOM | ^7.18.5 | Client-side routing and layout management |
| **HTTP Client** | Axios | ^1.21.0 | Interceptor-driven HTTP requests with token injection |
| **Authentication**| Firebase Modular SDK | ^12.8.0 | Official client-side Firebase authentication |
| **Analytics Charts**| Recharts | ^3.10.1 | Responsive SVG/canvas analytics visualizations |
| **Icons** | Lucide React | ^1.65.0 | Lightweight consistent iconography |
| **Linter** | Oxlint | ^1.89.0 | High-performance JavaScript/React linter |
| **Payments (Planned)**| Razorpay Standard Checkout | Test Mode | Client checkout modal (Planned for Phase 10) |

### Backend
| Component | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Language** | Python | `3.12.3` | Modern backend runtime |
| **Web Framework** | FastAPI | `0.115.6` | Asynchronous, OpenAPI-compliant REST framework |
| **ASGI Server** | Uvicorn | `0.34.0` | High-throughput asynchronous server |
| **ORM / Query Engine**| SQLAlchemy | `2.0.36` | Declarative 2.0 async/sync database toolkit |
| **Database Driver** | asyncpg | `0.30.0` | High-performance asynchronous PostgreSQL driver |
| **Sync Driver / CLI**| psycopg2-binary | `2.9.10` | Synchronous driver for migrations and tooling |
| **Schema Validation**| Pydantic / Pydantic Settings | `2.10.4` / `2.7.0` | Strict data validation and environment config |
| **Migrations** | Alembic | `1.14.0` | Database schema version control |
| **Authentication** | Firebase Admin SDK | `6.6.0` | Firebase ID token verification, user management, and link generation |
| **Testing** | Pytest & pytest-asyncio | `8.3.4` / `0.25.0` | Async automated test harness (in-memory SQLite + aiosqlite) |
| **Test Client** | HTTPX | `0.28.1` | Async ASGI testing client |

### Database & Infrastructure
| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Database** | PostgreSQL 16 (Alpine) | ACID-compliant relational data store |
| **Containerization**| Docker & Docker Compose | Local reproducible database runtime (`docker-compose.yml`) |
| **Version Control** | Git | Branching and code review management |

---

## C. Architecture

### 1. Modular Monolithic Architecture
Brightloop uses a clean **Modular Monolith** pattern. The application is maintained in a single version-controlled repository (monorepo) with strict decoupling between the frontend single-page application (SPA) and the backend API server.

```
       +-------------------------------------------------------+
       |                  React + Vite SPA                     |
       |  (Pages -> Components -> Layouts -> Context -> API)   |
       +---------------------------+---------------------------+
                                   | HTTP/REST (JSON + JWT)
                                   v
       +-------------------------------------------------------+
       |                  FastAPI Backend                      |
       |  [API Routers (/api/v1)]  -->  [Dependencies / Auth]  |
       |             |                                         |
       |             v                                         |
       |      [Services Layer]     -->  [Pydantic Schemas]     |
       |             |                                         |
       |             v                                         |
       |   [SQLAlchemy 2.0 Models] -->  [PostgreSQL Connection]|
       +-------------------------------------------------------+
```

### 2. Backend Responsibilities & Layer Separation
* **API Routers (`app/api/v1/`)**: Pure HTTP handling, status codes, query parameter parsing, and schema delegation. Routers contain no SQL queries or business computations.
* **Dependencies & Auth (`app/api/deps.py`, `app/core/security.py`)**: Token validation, session lifecycle injection, and role-based permissions (`admin`, `staff`, `customer`).
* **Services (`app/services/`)**: Core domain logic (subscription state transitions, recurring invoice billing loops, prorations, tax calculations).
* **Models (`app/models/`)**: SQLAlchemy 2.0 mapped entities defining tables, foreign keys, cascade rules, and indexes.
* **Schemas (`app/schemas/`)**: Pydantic models for incoming payload validation and JSON serialization.
* **Database & Config (`app/db/`, `app/core/config.py`)**: Connection pool management (`asyncpg` for request lifecycles, `psycopg2` for Alembic) and environment variable resolution.

### 3. Frontend Responsibilities & Layer Separation
* **UI Component Primitives (src/components/ui/)**: 14 accessible, reusable atomic/molecular components (Button, Input, Select, Textarea, Card, Badge, Modal, Table, SearchInput, PageHeader, LoadingIndicator, EmptyState, ErrorState, ConfirmationDialog).
* **Error Isolation (src/components/common/ErrorBoundary.jsx)**: React Error Boundary isolating runtime component failures with user-friendly recovery.
* **Layouts (src/layouts/MainLayout.jsx)**: Responsive shell hosting Navbar, collapsible mobile/desktop Sidebar, and router outlet.
* **Navigation Configuration (src/routes/navConfig.js)**: Centralized 11-destination navigation map with role filters (dmin, staff, customer).
* **Firebase Configuration (src/config/firebase.js)**: Official modular Firebase SDK initialization, singleton guarding, and environment key validation.
* **Authentication Boundary (src/services/authService.js)**: Decoupled service layer handling Firebase Auth token retrieval and auth state events.
* **API Client (src/services/apiClient.js & src/api/client.js)**: Centralized Axios client with automatic Bearer token injection, unauthorized (401) broadcast handling, and normalized ApiError structures.
* **Pages (src/pages/)**: Route-level domain views (DashboardPage, SubscriptionsPage, InvoicesPage, ModulePlaceholderPage for uncompleted modules, LoginPage, NotFoundPage).
* **Hooks & Context (src/hooks/, src/context/)**: AuthContext and useAuth hook managing user identity and roles.
* **Utilities (src/utils/)**: Domain constants and formatters.

### 4. API Communication Approach
* All API communication happens over HTTP/JSON under the `/api/v1` namespace.
* Standardized CORS policy allows requests from local Vite development servers (`http://localhost:5173`).
* Authentication uses `Authorization: Bearer <JWT_ACCESS_TOKEN>`.
* Responses follow predictable JSON envelopes. Errors return `{ "detail": "Descriptive message" }`.

---

## D. Directory Structure

The project has been initialized with the following structure:

```
D:\odo\
├── .gitignore                      # Root ignore rules for Python, Node, env, IDE, DB
├── docker-compose.yml              # Local PostgreSQL 16 container definition
├── README.md                       # Quickstart onboarding guide
├── PROJECT_CONTEXT.md              # Central single source of truth (this document)
│
├── backend/
│   ├── .env.example                # Template backend configuration
│   ├── pyproject.toml              # Project metadata and tool configuration
│   ├── pytest.ini                  # Pytest configuration (asyncio mode auto)
│   ├── requirements.txt            # Locked Python backend dependencies
│   ├── alembic.ini                 # Alembic migration configuration
│   ├── alembic/
│   │   ├── env.py                  # Async migration runner linked to app.models
│   │   ├── script.py.mako          # Migration template
│   │   └── versions/               # Schema migration versions directory
│   ├── app/
│   │   ├── __init__.py             # Version metadata (0.1.0)
│   │   ├── main.py                 # FastAPI application factory, CORS, and root routes
│   │   ├── cli/
│   │   │   ├── __init__.py
│   │   │   └── bootstrap_admin.py  # One-time atomic admin bootstrap CLI
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── config.py           # Pydantic Settings (DB, CORS, Firebase, SMTP)
│   │   │   ├── firebase.py         # Firebase Admin SDK initialization & auth helpers
│   │   │   └── security.py         # Token verification bridge
│   │   ├── db/
│   │   │   ├── __init__.py
│   │   │   ├── base.py             # DeclarativeBase & TimestampMixin
│   │   │   └── session.py          # Async & sync SQLAlchemy engines, get_db dependency
│   │   ├── models/                 # SQLAlchemy 2.0 ORM Entities
│   │   │   ├── __init__.py         # Central export of all database models
│   │   │   ├── user.py             # User (firebase_uid) and UserRole enum
│   │   │   ├── product.py          # Product and ProductVariant
│   │   │   ├── plan.py             # Plan and BillingInterval enum
│   │   │   ├── quotation.py        # QuotationTemplate, Quotation, QuotationLine
│   │   │   ├── subscription.py     # Subscription, SubscriptionLine, SubscriptionStatus
│   │   │   ├── tax.py              # TaxRule
│   │   │   ├── discount.py         # Discount and DiscountType enum
│   │   │   ├── invoice.py          # Invoice, InvoiceLine, InvoiceStatus
│   │   │   └── payment.py          # Payment, PaymentMethod, PaymentStatus
│   │   ├── schemas/                # Pydantic Request/Response validation models
│   │   │   ├── __init__.py
│   │   │   ├── common.py           # HealthResponse, MessageResponse, PaginatedResponse
│   │   │   ├── token.py            # Token and TokenPayload
│   │   │   ├── user.py             # CustomerProfileCreateRequest, StaffCreate, UserResponse
│   │   │   ├── subscription.py     # SubscriptionCreate, SubscriptionUpdate, SubscriptionResponse
│   │   │   └── invoice.py          # InvoiceCreate, InvoiceResponse, InvoiceLineResponse
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── deps.py             # get_db, get_current_user, require_roles
│   │   │   └── v1/
│   │   │       ├── __init__.py
│   │   │       ├── router.py       # API router aggregating v1 endpoint routers
│   │   │       └── endpoints/
│   │   │           ├── __init__.py
│   │   │           ├── health.py   # System health diagnostic endpoint
│   │   │           └── users.py    # Profile, Staff provisioning, User listing endpoints
│   │   └── services/               # Domain service modules
│   │       ├── __init__.py
│   │       ├── email_service.py    # Transactional SMTP email delivery
│   │       └── user_service.py     # User domain & compensation lifecycle logic
│   └── tests/
│       ├── __init__.py
│       ├── conftest.py             # In-memory SQLite fixtures & Firebase mock spies
│       ├── test_health.py          # Verified health & root endpoint tests
│       ├── test_auth_firebase.py   # Firebase authentication & safe email sync tests
│       ├── test_users.py           # Staff provisioning, compensation & listing tests
│       ├── test_bootstrap_cli.py   # Atomic Admin bootstrap CLI tests
│       └── test_production_config.py # Production environment validation tests
│
└── frontend/
    ├── .env.example                # Frontend environment template (API base & Firebase keys)
    ├── .gitignore                  # Frontend ignore rules (env, node_modules, dist)
    ├── .oxlintrc.json              # Oxlint linter rules
    ├── package.json                # Dependencies: React 19, Firebase SDK, Tailwind v4, Recharts, Router
    ├── vite.config.js              # Vite configuration with @tailwindcss/vite
    ├── index.html                  # HTML entry point
    └── src/
        ├── main.jsx                # React root bootstrap
        ├── App.jsx                 # 11 navigation routes and AuthProvider wrapper
        ├── index.css               # Tailwind CSS v4 setup and typography
        ├── App.css                 # Custom styling enhancements
        ├── api/
        │   └── client.js           # Re-export client for backward compatibility
        ├── config/
        │   └── firebase.js         # Modular Firebase SDK setup, singleton, and env validation
        ├── services/
        │   ├── apiClient.js        # Centralized Axios client, Bearer injection, ApiError normalization
        │   └── authService.js      # Decoupled Firebase Auth service boundary
        ├── routes/
        │   └── navConfig.js        # Centralized 11-destination navigation map & role filters
        ├── components/
        │   ├── Navbar.jsx          # Top header with dynamic health polling, search & profile
        │   ├── Sidebar.jsx         # Responsive sidebar with drawer toggle for mobile
        │   ├── MetricCard.jsx      # Reusable dashboard metric card
        │   ├── StatusBadge.jsx     # Reusable colored status chip
        │   ├── common/
        │   │   └── ErrorBoundary.jsx # React Error Boundary for isolated crash recovery
        │   └── ui/                 # 14 Reusable UI primitives
        │       ├── index.js        # Central export
        │       ├── Button.jsx      # Variants: primary, secondary, outline, ghost, danger
        │       ├── Input.jsx       # Label, error, helperText, left/right icons, useId()
        │       ├── Select.jsx      # Styled select dropdown with chevron & options
        │       ├── Textarea.jsx    # Multiline text input
        │       ├── Card.jsx        # Card, CardHeader, CardTitle, CardContent, CardFooter
        │       ├── Badge.jsx       # Variants: default, primary, success, warning, danger, info
        │       ├── Modal.jsx       # Accessible modal dialog with backdrop & escape listener
        │       ├── Table.jsx       # Table, TableHeader, TableBody, TableRow, TableHead, TableCell
        │       ├── SearchInput.jsx # Input with Lucide search icon & clear button
        │       ├── PageHeader.jsx  # Page title, description, breadcrumbs & action slot
        │       ├── LoadingIndicator.jsx # Spinner & Skeleton placeholder loaders
        │       ├── EmptyState.jsx  # Zero-state illustration with title, message & actions
        │       ├── ErrorState.jsx  # Alert icon, error message & retry trigger
        │       └── ConfirmationDialog.jsx # Modal for confirm/cancel actions
        ├── layouts/
        │   └── MainLayout.jsx      # Shell layout hosting Navbar, Sidebar, and ErrorBoundary
        ├── pages/
        │   ├── DashboardPage.jsx   # Metrics, Recharts MRR area chart, transparency notice
        │   ├── SubscriptionsPage.jsx # Subscriptions table with responsive Table & Badges
        │   ├── InvoicesPage.jsx    # Invoices table with responsive Table & Badges
        │   ├── ModulePlaceholderPage.jsx # Transparent placeholder for upcoming modules
        │   ├── LoginPage.jsx       # Authentication entry view (Phase 2 integration)
        │   └── NotFoundPage.jsx    # 404 handler
        ├── hooks/
        │   └── useAuth.js          # Authentication hook consuming AuthContext
        ├── context/
        │   ├── authContextInstance.js # Dedicated createContext instance
        │   └── AuthContext.jsx     # AuthProvider with Firebase listener & 401 handler
        └── utils/
            ├── constants.js        # Domain intervals, statuses, and roles
            └── formatters.js       # Currency and date formatters
`

---

## E. Database Design (PLANNED)

The following database entities and schema relationships are planned. The foundational SQLAlchemy ORM models have been created in `backend/app/models/` and are ready for Alembic migration generation.

### Entity Relationship Diagram (Planned)

```mermaid
erDiagram
    USERS ||--o{ QUOTATIONS : "requests"
    USERS ||--o{ SUBSCRIPTIONS : "owns"
    USERS ||--o{ INVOICES : "billed_to"
    PRODUCTS ||--|{ PRODUCT_VARIANTS : "has"
    PLANS ||--o{ SUBSCRIPTIONS : "dictates"
    QUOTATION_TEMPLATES ||--o{ QUOTATIONS : "originates"
    QUOTATIONS ||--|{ QUOTATION_LINES : "contains"
    SUBSCRIPTIONS ||--|{ SUBSCRIPTION_LINES : "contains"
    SUBSCRIPTIONS ||--o{ INVOICES : "generates"
    INVOICES ||--|{ INVOICE_LINES : "contains"
    INVOICES ||--o{ PAYMENTS : "reconciled_by"

    USERS {
        uuid id PK
        string firebase_uid UK
        string email UK
        string full_name
        string role
        boolean is_active
        string phone_number
        string company_name
        timestamp created_at
        timestamp updated_at
    }

    PRODUCTS {
        uuid id PK
        string name
        string sku UK
        text description
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    PRODUCT_VARIANTS {
        uuid id PK
        uuid product_id FK
        string name
        string variant_code UK
        decimal price
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    PLANS {
        uuid id PK
        string code UK
        string name
        text description
        string billing_interval
        int interval_count
        decimal price
        string currency
        int trial_period_days
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    QUOTATION_TEMPLATES {
        uuid id PK
        string name
        text description
        int default_validity_days
        text terms_and_conditions
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    QUOTATIONS {
        uuid id PK
        string quotation_number UK
        uuid customer_id FK
        uuid template_id FK
        string status
        decimal subtotal
        decimal discount_amount
        decimal tax_amount
        decimal total_amount
        timestamp valid_until
        text notes
        timestamp created_at
        timestamp updated_at
    }

    QUOTATION_LINES {
        uuid id PK
        uuid quotation_id FK
        uuid product_variant_id FK
        uuid plan_id FK
        string description
        int quantity
        decimal unit_price
        decimal line_total
    }

    SUBSCRIPTIONS {
        uuid id PK
        string subscription_code UK
        uuid customer_id FK
        uuid plan_id FK
        string status
        timestamp current_period_start
        timestamp current_period_end
        boolean cancel_at_period_end
        timestamp cancelled_at
        timestamp paused_at
        timestamp trial_start
        timestamp trial_end
        timestamp created_at
        timestamp updated_at
    }

    SUBSCRIPTION_LINES {
        uuid id PK
        uuid subscription_id FK
        uuid product_variant_id FK
        int quantity
        decimal unit_price
    }

    TAX_RULES {
        uuid id PK
        string name
        string tax_code UK
        decimal rate_percentage
        string country_code
        string state_or_region
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    DISCOUNTS {
        uuid id PK
        string code UK
        string description
        string discount_type
        decimal value
        timestamp valid_from
        timestamp valid_until
        int max_redemptions
        int current_redemptions
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    INVOICES {
        uuid id PK
        string invoice_number UK
        uuid customer_id FK
        uuid subscription_id FK
        string status
        timestamp issue_date
        timestamp due_date
        decimal subtotal
        decimal tax_amount
        decimal discount_amount
        decimal total_amount
        decimal amount_paid
        decimal amount_due
        string currency
        text notes
        timestamp created_at
        timestamp updated_at
    }

    INVOICE_LINES {
        uuid id PK
        uuid invoice_id FK
        string description
        int quantity
        decimal unit_price
        decimal line_total
    }

    PAYMENTS {
        uuid id PK
        string payment_reference UK
        uuid invoice_id FK
        decimal amount
        string currency
        string payment_method
        string status
        timestamp paid_at
        string gateway_transaction_id
        text notes
        timestamp created_at
        timestamp updated_at
    }
```

### Proposed Additional Entities (Planned)
* **AuditLog**: `[PLANNED]` Tracking sensitive subscription actions (plan changes, cancellations, manual invoice adjustments).
* **PaymentMethod**: `[PLANNED]` Stored customer payment tokens or credit card profiles for automated recurring charges.

---

## F. API Contracts (PLANNED)

All endpoints below are prefixed with `/api/v1` and are marked with their implementation status.

### 1. System & Health
* `GET /api/v1/health` — **[IMPLEMENTED & TESTED]**  
  Returns system health, app name, version, and server timestamp.
* `GET /` — **[IMPLEMENTED & TESTED]**  
  Root API discovery endpoint linking to docs and health checks.

### 2. Authentication & Users
* `POST /api/v1/users/profile` — **[IMPLEMENTED & TESTED]**  
  Headers: `Authorization: Bearer <firebase_id_token>`  
  Body: `{ full_name, phone_number, company_name }` (optional)  
  Initializes or retrieves the authenticated user's `CUSTOMER` profile in PostgreSQL. Fully idempotent under concurrent calls.
* `GET /api/v1/users/me` — **[IMPLEMENTED & TESTED]**  
  Headers: `Authorization: Bearer <firebase_id_token>`  
  Returns the current user profile. Safely synchronizes verified Firebase email if changed (with duplicate collision protection).
* `POST /api/v1/users/staff` — **[IMPLEMENTED & TESTED]**  
  Role: `ADMIN` only  
  Body: `{ email, full_name, phone_number, company_name }`  
  Creates a Firebase account and PostgreSQL `STAFF` record. Generates password setup and email verification links. Reverts Firebase account via transactional compensation if PostgreSQL commit fails. In development mode (`APP_ENV=development` & `DEBUG=True`), links are returned in response; in production, delivered via SMTP.
* `POST /api/v1/users/staff/{id}/resend-setup-link` — **[IMPLEMENTED & TESTED]**  
  Role: `ADMIN` only  
  Re-generates password setup and email verification links for pending staff accounts. Rejects with HTTP 409 Conflict if the staff account has already verified their email.
* `GET /api/v1/users` — **[IMPLEMENTED & TESTED]**  
  Role: `ADMIN` (can list all users or filter by role) or `STAFF` (strictly restricted to viewing `customer` users only). Customers receive HTTP 403 Forbidden.  
  Query params: `role`, `skip`, `limit`  
  Returns: `list[UserResponse]`
* `CLI: app.cli.bootstrap_admin` — **[IMPLEMENTED & TESTED]**  
  One-time administrator bootstrap script protected by PostgreSQL advisory transaction lock (`pg_advisory_xact_lock(42424242)`). Requires pre-existing verified Firebase identity and aborts if an active administrator already exists.  
  Usage: `python -m app.cli.bootstrap_admin --firebase-uid <UID> --email <EMAIL> --full-name <NAME>`

### 3. Products & Product Variants
* GET /api/v1/products — **[IMPLEMENTED & TESTED]**  
  Returns paginated list of products with active variants and pricing details.
* POST /api/v1/products — **[IMPLEMENTED & TESTED]**  
  Role: ADMIN, STAFF  
  Body: { name, sku, description, product_type, sales_price, cost_price, variants: [...] }
* GET /api/v1/products/{product_id} — **[IMPLEMENTED & TESTED]**  
  Returns product details with all associated variants.
* PUT /api/v1/products/{product_id} — **[IMPLEMENTED & TESTED]**  
  Role: ADMIN, STAFF  
  Updates product metadata and properties.
* POST /api/v1/products/{product_id}/variants — **[IMPLEMENTED & TESTED]**  
  Role: ADMIN, STAFF  
  Body: { name, variant_code, sku, price, price_difference, attributes }
* DELETE /api/v1/products/{product_id}/variants/{variant_id} — **[IMPLEMENTED & TESTED]**  
  Role: ADMIN, STAFF  
  Safely deactivates variant without breaking historical quotation or subscription lines.

### 4. Plans
* GET /api/v1/plans — **[IMPLEMENTED & TESTED]**  
  Query params: illing_interval, is_active, page, page_size  
  Returns paginated list of subscription plans.
* POST /api/v1/plans — **[IMPLEMENTED & TESTED]**  
  Role: ADMIN  
  Body: { code, name, description, billing_interval, interval_count, price, currency, trial_period_days, minimum_quantity, available_from, available_until, product_id }
* GET /api/v1/plans/{plan_id} — **[IMPLEMENTED & TESTED]**  
  Returns plan details.
* PUT /api/v1/plans/{plan_id} — **[IMPLEMENTED & TESTED]**  
  Role: ADMIN  
  Updates plan settings.
* POST /api/v1/plans/{plan_id}/close — **[IMPLEMENTED & TESTED]**  
  Role: ADMIN  
  Closes plan to new signups (is_active = False) while preserving active subscriptions.

### 5. Taxes & Discounts
* GET /api/v1/taxes — **[IMPLEMENTED & TESTED]**  
  Lists active tax rules.
* POST /api/v1/taxes — **[IMPLEMENTED & TESTED]**  
  Role: ADMIN, STAFF  
  Body: { name, tax_code, rate_percentage, is_fixed, country_code, state_or_region }
* GET /api/v1/discounts — **[IMPLEMENTED & TESTED]**  
  Lists promotional discounts.
* POST /api/v1/discounts — **[IMPLEMENTED & TESTED]**  
  Role: ADMIN, STAFF  
  Body: { code, discount_type, value, minimum_amount, minimum_quantity, max_redemptions, valid_from, valid_until, plan_id }
* POST /api/v1/discounts/validate — **[IMPLEMENTED & TESTED]**  
  Public/Authenticated validation endpoint returning calculated discount and validity checks.

### 6. Quotation Templates & Quotations
* GET /api/v1/quotations/templates — **[IMPLEMENTED & TESTED]**  
  Lists reusable quotation templates.
* POST /api/v1/quotations/templates — **[IMPLEMENTED & TESTED]**  
  Role: ADMIN, STAFF  
  Creates quotation template.
* GET /api/v1/quotations — **[IMPLEMENTED & TESTED]**  
  Lists quotations (filtered by customer role for customer isolation).
* POST /api/v1/quotations — **[IMPLEMENTED & TESTED]**  
  Creates formal quotation with calculated subtotals, taxes, and discounts.
* POST /api/v1/quotations/{id}/send — **[IMPLEMENTED & TESTED]**  
  Transitions quotation status to SENT.
* POST /api/v1/quotations/{id}/accept — **[IMPLEMENTED & TESTED]**  
  Customer or Staff acceptance endpoint. Transitions status to ACCEPTED.
* POST /api/v1/quotations/{id}/convert — **[IMPLEMENTED & TESTED]**  
  Idempotently converts ACCEPTED quotation into an ACTIVE Subscription. Rejects duplicate conversions with HTTP 409 Conflict.

### 7. Subscriptions
* GET /api/v1/subscriptions — **[IMPLEMENTED & TESTED]**  
  Query params: status, customer_id, page, page_size. Enforces customer data isolation.
* POST /api/v1/subscriptions — **[IMPLEMENTED & TESTED]**  
  Creates active subscription directly from a plan, validating minimum quantities and availability dates.
* GET /api/v1/subscriptions/{id} — **[IMPLEMENTED & TESTED]**  
  Returns subscription details with line items.
* POST /api/v1/subscriptions/{id}/pause — **[IMPLEMENTED & TESTED]**  
  Transitions ACTIVE subscription to PAUSED.
* POST /api/v1/subscriptions/{id}/resume — **[IMPLEMENTED & TESTED]**  
  Transitions PAUSED subscription to ACTIVE.
* POST /api/v1/subscriptions/{id}/cancel — **[IMPLEMENTED & TESTED]**  
  Cancels subscription immediately or schedules cancellation at period end.
* POST /api/v1/subscriptions/{id}/close — **[IMPLEMENTED & TESTED]**  
  Role: ADMIN, STAFF  
  Closes subscription permanently.

### 8. Invoices & Recurring Billing
* GET /api/v1/invoices — **[IMPLEMENTED & TESTED]**  
  Query params: customer_id, subscription_id, status. Enforces customer data isolation.
* POST /api/v1/invoices — **[IMPLEMENTED & TESTED]**  
  Role: ADMIN, STAFF  
  Manual invoice generation with itemized lines, taxes, and discounts.
* GET /api/v1/invoices/{id} — **[IMPLEMENTED & TESTED]**  
  Returns invoice details, lines, and payment history.
* GET /api/v1/invoices/{id}/html — **[IMPLEMENTED & TESTED]**  
  Returns printable standalone HTML invoice view with CSS print styling and window.print() trigger.
* POST /api/v1/invoices/generate-recurring — **[IMPLEMENTED & TESTED]**  
  Role: ADMIN, STAFF  
  Idempotent recurring billing engine scanning due subscriptions and advancing billing periods. Guarded against duplicate invoices for the same period by uq_invoice_sub_period.
* POST /api/v1/invoices/{id}/cancel — **[IMPLEMENTED & TESTED]**  
  Role: ADMIN, STAFF  
  Cancels an unpaid invoice. Rejects cancellation if payments have been recorded.

### 9. Payments & Razorpay Integration
* GET /api/v1/payments — **[IMPLEMENTED & TESTED]**  
  Lists recorded payments with customer isolation.
* POST /api/v1/payments — **[IMPLEMENTED & TESTED]**  
  Records offline or online payments, enforces balance reconciliation, and prevents overpayment.
* POST /api/v1/payments/razorpay/create-order — **[IMPLEMENTED & TESTED]**  
  Creates server-side Razorpay order for customer checkout modal.
* POST /api/v1/payments/razorpay/verify — **[IMPLEMENTED & TESTED]**  
  Cryptographically verifies Razorpay HMAC-SHA256 signature, records payment, and reconciles invoice balance.
* POST /api/v1/payments/razorpay/webhook — **[IMPLEMENTED & TESTED]**  
  Idempotent webhook processor with signature validation and duplicate event deduplication.

### 10. Analytics & Reporting
* GET /api/v1/analytics/dashboard — **[IMPLEMENTED & TESTED]**  
  Role: ADMIN, STAFF (Customers return HTTP 403 Forbidden).  
  Returns executive dashboard metrics: total customers, products, active/paused/closed subscriptions, total revenue, total collections, outstanding amounts, overdue count, MRR, ARR, recent subscriptions, and recent payments.

---

### 10. Razorpay Standard Checkout Architecture (Planned Phase 10)
For the hackathon demonstration, payments will use Razorpay Standard Checkout in Test Mode.
The end-to-end architecture is strictly coordinated between frontend and backend:
1. **Payment Initiation**: Frontend requests payment initiation from FastAPI backend for a specific invoice.
2. **Order Creation**: FastAPI backend invokes Razorpay Orders API using server-side credentials and returns order_id, mount, and currency.
3. **Checkout Modal**: Frontend receives order data and initializes Razorpay Standard Checkout modal with test keys.
4. **Customer Payment**: Customer completes test payment in the modal.
5. **Callback & Verification**: Razorpay returns 
azorpay_payment_id, 
azorpay_order_id, and 
azorpay_signature to the frontend callback.
6. **Signature Verification**: Frontend forwards callback data to FastAPI backend (POST /api/v1/payments/verify-razorpay).
7. **Server-Side Authorization**: Backend independently verifies HMAC-SHA256 signature using RAZORPAY_KEY_SECRET.
8. **Ledger Recording**: Backend records the verified transaction in Payment entity.
9. **Invoice Balancing**: Backend reconciles mount_paid and mount_due on the corresponding Invoice.
10. **Security Boundaries**:
    - RAZORPAY_KEY_SECRET is NEVER exposed to the frontend.
    - Frontend client is NEVER trusted as authoritative for payment success.
    - Invoices are NEVER marked as paid directly from the frontend.

---

## G. Implementation Status Matrix

| Module / Component | Category | Current Status | Notes |
| :--- | :--- | :--- | :--- |
| **Project Directory & Git Scaffold** | Setup | **IMPLEMENTED** | Dedicated initialization branch created |
| **React + Vite Frontend Scaffold** | Frontend | **IMPLEMENTED** | Vite 8 + React 19 + Tailwind v4 compiling |
| **FastAPI Backend Core & Lifespan** | Backend | **IMPLEMENTED** | Async lifespan, CORS, settings management |
| **Health Check & Diagnostics** | API | **TESTED** | `/api/v1/health` and `/` passing pytest suite |
| **SQLAlchemy 2.0 ORM Entity Models** | Database | **IMPLEMENTED** | All 13 core entities modeled in `app/models/` |
| **Alembic Database Migration Runner**| Database | **IMPLEMENTED** | Async migration runner linked to model metadata |
| **Docker Compose PostgreSQL Service**| Database | **IMPLEMENTED** | PostgreSQL 16 Alpine container configured |
| **Frontend Layout & Navigation** | Frontend | **IMPLEMENTED** | MainLayout, Navbar, Sidebar with 11 destinations, responsive drawer |
| **Frontend UI Component Suite** | Frontend | **IMPLEMENTED** | 14 atomic/molecular primitives (Button, Input, Select, Modal, etc.) |
| **Frontend Error Infrastructure** | Frontend | **IMPLEMENTED** | ErrorBoundary, ErrorState, EmptyState, LoadingIndicator, Skeleton |
| **Frontend Centralized API Client** | Frontend | **IMPLEMENTED** | Base URL resolution, Bearer token injection, ApiError normalization |
| **Firebase SDK & Auth Boundary** | Frontend | **IMPLEMENTED** | Modular Firebase SDK initialized, singleton guarding, authService |
| **Frontend Recharts Integration** | Frontend | **IMPLEMENTED** | Working MRR AreaChart on DashboardPage |
| **Frontend Axios API Client** | Frontend | **IMPLEMENTED** | Token interceptors & health service integration |
| **User Authentication (Firebase Auth & PostgreSQL RBAC)**| Backend | **IMPLEMENTED & TESTED** | Firebase ID token verification, safe email sync, staff provisioning, atomic admin bootstrap CLI, 31 pytest tests passing |
| **User Authentication & Role-Based Access Control** | Frontend | **IMPLEMENTED & TESTED** | Firebase modular auth, Customer self-registration, Login, Forgot & Reset Password, ProtectedRoute, RoleRoute, 9-char password policy, AuthContext RBAC |
| **Role-Based Dashboards (Admin, Staff, Customer)** | Frontend | **IMPLEMENTED & TESTED** | Admin, Staff, and Customer views with real PostgreSQL counts, 9 reusable dashboard widgets, Recharts containers, INR currency formatting, dynamic role router |
| **User Directory & Staff Provisioning** | Frontend | **IMPLEMENTED & TESTED** | User directory (`/users` & `/customers`), server-side pagination, role filtering, debounce search, admin-only staff provisioning modal (`POST /api/v1/users/staff`), credential setup link handling |
| **Product & Variant Catalog Engine** | Domain | **IMPLEMENTED & TESTED** | Dynamic variant generator, SKU validation, soft-delete, 6 tests passing |
| **Subscription Plan Management** | Domain | **IMPLEMENTED & TESTED** | Calendar-based billing engine (leap years & month-end), availability guards, 5 tests passing |
| **Quotation Templates & Quoting** | Domain | **IMPLEMENTED & TESTED** | Dynamic quoting, approval workflow, one-click subscription conversion, 3 tests passing |
| **Subscription Lifecycle Machine** | Domain | **IMPLEMENTED & TESTED** | Complete state machine (active, paused, cancelled, closed), customer isolation, 3 tests passing |
| **Automated Recurring Invoicing** | Domain | **IMPLEMENTED & TESTED** | In-process background scheduler (illing_scheduler), consecutive periods loop, uq_invoice_sub_period guard, overdue transition, 5 tests passing |
| **Tax Rules & Calculations** | Domain | **IMPLEMENTED & TESTED** | Percentage & fixed tax engine with country/region scoping, 4 tests passing |
| **Promotional Discount Engine** | Domain | **IMPLEMENTED & TESTED** | Percentage & fixed discounts, min amount/qty, redemptions tracking, 4 tests passing |
| **Payment Reconciliation Engine & Razorpay** | Domain | **IMPLEMENTED & TESTED** | Balance reconciliation, overpayment guards, Razorpay test mode orders & HMAC verification, 3 tests passing |
| **Executive Analytics & Reporting** | Domain | **IMPLEMENTED & TESTED** | MRR, ARR, collections, overdue balances, trends, RBAC protection, 1 test passing |
| **Customer Self-Service Portal** | Frontend | **PLANNED** | Customer-facing route permissions planned |

---

## H. Developer Responsibilities

To ensure non-conflicting parallel execution across developers on different machines:

### Developer 1 (Initial Setup Owner & Backend Lead)
* **Scope**: Project initialization, Core Backend Infrastructure, Database Schema & Migrations, Billing & Invoicing Engine.
* **Key Tasks**:
  1. Complete project setup, repository scaffolding, and single source of truth documentation.
  2. Implement Database Migrations via Alembic for all planned models.
  3. Implement the Plan & Product Catalog service and endpoints (`/api/v1/products`, `/api/v1/plans`).
  4. Implement the Recurring Billing Engine & Invoice Generator service (`/api/v1/invoices`).
  5. Implement Payment Recording & Reconciliation logic (`/api/v1/payments`).

### Developer 2 (Frontend Lead & Authentication Specialist)
* **Scope**: Authentication & Authorization, Customer & Admin Frontend Pages, Self-Service Portal.
* **Key Tasks**:
  1. Implement Authentication endpoints in backend (`/api/v1/auth/register`, `/api/v1/auth/login`, `/api/v1/users/me`).
  2. Connect Frontend `AuthContext` to backend token endpoints.
  3. Build full UI pages for Subscriptions, Plans, Products, and Invoices using the established design system.
  4. Implement Customer Self-Service Portal views (read-only subscriptions, invoice download, payment review).
  5. Coordinate API contracts with Developer 1 before modifying endpoint shapes.

### Developer 3 (Analytics, Tax & Quotation Specialist)
* **Scope**: Quotations Engine, Tax & Discount Engines, Revenue & Subscription Analytics.
* **Key Tasks**:
  1. Implement Quotation Templates and Quotations CRUD (`/api/v1/quotations`).
  2. Implement Quotation-to-Subscription conversion workflow.
  3. Implement Tax Rules calculator and Discount redemption validator.
  4. Build analytics aggregation queries (MRR, churn rate, cohort retention).
  5. Implement rich Recharts analytics dashboards on the frontend.

---

## I. Technical Decisions

1. **Modular Monolith over Microservices**:
   * *Decision*: Structure both backend and frontend inside a single monorepo while keeping them independently deployable.
   * *Rationale*: For a fast-paced hackathon and sub-2-second latency requirements, in-process service boundaries eliminate network serialization overhead, distributed transactions, and deployment complexities.

2. **SQLAlchemy 2.0 with Asyncpg & Psycopg2**:
   * *Decision*: Use `asyncpg` for high-concurrency async endpoint handling, and `psycopg2-binary` for synchronous Alembic migrations.
   * *Rationale*: Async I/O handles high concurrency without blocking the event loop. Sync Alembic ensures simple, reliable migration execution without async event loop collisions.

3. **Tailwind CSS v4 with `@tailwindcss/vite`**:
   * *Decision*: Use the official Vite plugin for Tailwind v4 with zero-config `@import "tailwindcss";`.
   * *Rationale*: Lightning-fast build times (under 1.3 seconds for production builds), clean CSS bundle sizes, and full utility styling without maintaining extensive CSS files.

4. **Firebase Authentication with PostgreSQL RBAC**:
   * *Decision*: Delegate customer registration, password management, email verification, and session tokens to Firebase Authentication. Store business profiles and authorize roles (`admin`, `staff`, `customer`) strictly inside PostgreSQL.
   * *Rationale*: Eliminates password storage and cryptographic token signing vulnerabilities in the application layer while enforcing strict multi-tenant authorization and auditability in relational PostgreSQL.

---

## J. Known Issues & Limitations

1. **Database Container Not Running Automatically**:
   * *Limitation*: PostgreSQL requires Docker to be running locally (`docker compose up -d`). If Docker is not available, a local PostgreSQL server or SQLite fallback can be configured in `.env`.
2. **Mock Data on Frontend Pages**:
   * *Limitation*: The Subscriptions and Invoices pages currently display placeholder mock data until Developer 1 and Developer 2 implement the corresponding API endpoints.
3. **Pending Seed Data**:
   * *Limitation*: Database seed scripts for initial admin users and sample subscription plans are planned for Phase 2.

---

## K. Setup Instructions

### Prerequisites
* **Node.js**: v18+ (verified on v24.14.0) and **npm** v9+ (verified on v11.9.0)
* **Python**: 3.11+ (verified on Python 3.12.3)
* **Docker & Docker Compose** (optional, for local PostgreSQL)

### Step 1: Clone and Checkout Branch
```bash
git clone <repository-url>
cd odo
git checkout init/project-setup
```

### Step 2: Start PostgreSQL Database
```bash
# Start PostgreSQL via Docker Compose
docker compose up -d

# Verify container is healthy
docker compose ps
```

### Step 3: Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create virtual environment (if not already created)
python -m venv .venv

# Activate virtual environment
# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# Linux/macOS:
source .venv/bin/activate

# Install locked dependencies
pip install -r requirements.txt

# Create environment configuration
copy .env.example .env

# Run automated tests to verify setup
pytest -v

# Start backend server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
* **Interactive API Documentation (Swagger)**: http://127.0.0.1:8000/docs  
* **ReDoc Documentation**: http://127.0.0.1:8000/redoc  
* **Health Check**: http://127.0.0.1:8000/api/v1/health  

### Step 4: Frontend Setup
```bash
# In a new terminal, navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create environment configuration
copy .env.example .env

# Start Vite development server
npm run dev
```
* **Frontend Application**: http://localhost:5173  
* The navigation bar will automatically indicate `Backend v0.1.0 Connected` once the backend server is active.
