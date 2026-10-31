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
| **Product Management & Variant Pricing UI** | Frontend | **IMPLEMENTED & TESTED** | Product catalogue (`/products`), server-side pagination, search, status/type filters, creation & editing modals, inline variant editor with live additive price preview (Base + Surcharge), cost price role restriction, soft-deactivation dialog, 46 tests passing |
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


---

## L. Frontend Implementation Status

### Phase 4: Product Catalogue, Variants and Pricing (Completed)
* **Catalogue View (`ProductsPage.jsx`)**: Full table with 300ms debounce search, status filtering (active/inactive), product type filtering (service, digital, physical), and pagination.
* **Pricing & Variants (`productPricing.js`, `ProductFormModal.jsx`)**: Additive variant pricing formula (`Base Price + Variant Surcharge = Customer Price`), real-time preview banner, SKU validation, inline variant creation and removal.
* **Role Permissions**: Admin and Staff permitted to create, edit, deactivate products. Admin role exclusively permitted to view cost prices and profit margins.
* **Deactivation Dialog (`ProductDeactivateDialog.jsx`)**: Soft-deactivation with clear business impact warnings.

### Phase 5: Subscription Plan Management & Tax Configuration (Completed)
* **Subscription Plan Catalogue (`PlansPage.jsx`)**:
  - Full server-side paginated catalogue with search across Plan Name, Code, and Description.
  - Billing Interval filter (`all`, `daily`, `weekly`, `monthly`, `yearly`).
  - Plan Status filter (`all`, `active`, `inactive / closed`).
  - Associated product name and SKU resolution via `productService`.
  - Responsive table with cadence badges, price formatted in plan currency, trial period days, and availability indicators.
* **Plan Creation & Editing (`PlanFormModal.jsx`)**:
  - Section A (Basic Information): Plan Code (unique, uppercase), Plan Name, Associated Product dropdown, Description.
  - Section B (Pricing & Cadence): Recurring Price, Currency selection (USD, INR, EUR, GBP), Billing Interval, Interval Count (cadence multiplier), Minimum Quantity, Trial Period Days. Live billing cadence preview banner.
  - Section C (Availability Window): Available From and Available Until pickers with live date range validation.
  - Section D (Lifecycle Policies): Active status toggle, explanation of automatic expiry and instant closure rules.
* **Plan Details (`PlanDetailsModal.jsx`)**:
  - Comprehensive inspection modal displaying key metrics, associated product details, cadence, availability window, lifecycle policies, and audit timestamps.
* **Plan Closure (`PlanCloseDialog.jsx`)**:
  - Safe plan closure modal integrating `POST /plans/{id}/close` (sets `is_active: false` and `available_until: now()`) while guaranteeing active customer subscriptions remain unaffected.
* **Tax Rules Management (`TaxesPage.jsx`)**:
  - Dedicated tax configuration interface with Country Code filter and Status filter.
  - Table displaying Tax Name, Code, Assessment (Percentage vs Fixed), Jurisdiction, Effective Dates, and Active status.
* **Tax Configuration Forms (`TaxFormModal.jsx`)**:
  - Jurisdictional inputs (Tax Name, unique Tax Code, 2-letter ISO Country Code, State/Region).
  - Rate input supporting both percentage-based levies (0-100%) and flat fixed fees.
  - Effective date range controls with validation.
  - Interactive Tax Engine Preview Box providing client-side deterministic verification of tax liability and total payable amount.
* **Tax Details & Deactivation (`TaxDetailsModal.jsx`, `TaxDeactivateDialog.jsx`)**:
  - Specification viewer with live verification calculator.
  - Safe soft-deactivation dialog preserving historical invoice audit ledgers.
* **API Service Architecture (`planService.js`, `taxService.js`)**:
  - `planService`: `listPlans`, `getPlan`, `createPlan`, `updatePlan`, `closePlan`, `reactivatePlan`.
  - `taxService`: `listTaxRules`, `getTaxRule`, `createTaxRule`, `updateTaxRule`, `deactivateTaxRule`, `reactivateTaxRule`.
* **Validation & Business Logic (`planAndTaxValidation.js`)**:
  - `validatePlanPayload`: Validates code, name, cadence, positive price, min quantity, date sequence.
  - `validateTaxPayload`: Validates code, name, rate [0, 100], 2-letter country code, date sequence.
  - `formatBillingCadence`: Generates human-readable cadence descriptions (e.g., "Every 3 months", "Weekly").
  - `calculateTaxPreview`: Deterministically mirrors backend `TaxDiscountService.calculate_tax` logic.
  - `isPlanExpired`: Pure timestamp evaluation utility.
* **Route & Navigation Integration**:
  - Promoted `plans` in `navConfig.js` to active status.
  - Added `taxes` route in `navConfig.js` under System section for `admin` and `staff`.
  - Connected `<PlansPage />` and `<TaxesPage />` behind `<RoleRoute allowedRoles={['admin', 'staff']}>` in `App.jsx`.
* **Testing & Quality Assurance**:
  - Unit Tests: 69 tests passing across 4 test suites (`authAndPolicy.test.js`, `phase3.test.js`, `products.test.js`, `plansAndTaxes.test.js`).
  - Linter: 0 warnings, 0 errors across 87 files (`oxlint`).
  - Production Build: 2,174 modules transformed cleanly in 3.28s (`vite build`).

### Phase 6: Quotation Management System (Completed)
* **Quotation Catalogue (`QuotationsPage.jsx`)**:
  - Full server-side paginated catalogue displaying Quotation Number (`QUO-YYYY-XXXXX`), Customer details, Issue Date, Expiry Date, Total Amount, and Status Badges.
  - Search filter with 300ms debouncing across quotation numbers and customer names/emails.
  - Status filter (`all`, `draft`, `sent`, `accepted`, `rejected`, `converted`).
  - Action buttons for Viewing document details, Sending draft quotes, Accepting/Rejecting sent quotes, and Converting accepted quotes to subscriptions.
  - Role-adaptive interface supporting Admin/Staff management and Customer self-service.
* **Quotation Creation (`QuotationFormModal.jsx`)**:
  - Section A (Customer & Template): Active customer dropdown from `userService` and optional quotation template pre-population from `quotationService.listTemplates`.
  - Section B (Validity & Notes): Validity Expiry Date (`valid_until`), default Terms & Conditions, and Customer Notes.
  - Section C (Itemized Lines): Multiple line item creator supporting catalog Product lines (with variant selection and pricing), Subscription Plan lines, and custom items. Full quantity and unit price editing with live line subtotal computation.
  - Section D (Taxes & Financial Summary): Tax rule association via `taxService`, optional promotional discount code, and real-time financial breakdown (Subtotal, Discount deduction, Tax liability, and Grand Total).
* **Document Presentation & PDF (`QuotationDetailsModal.jsx`)**:
  - Professional customer-facing document view detailing client information, validity deadlines, itemized breakdown, and terms.
  - Direct browser Print / Save as PDF integration (`window.print()`).
  - Documented status: Server-side PDF generation endpoint is planned for a future phase; native print styling provides instant PDF capture.
* **Lifecycle & Actions (`QuotationActionDialog.jsx`)**:
  - Full support for backend state machine transitions: Draft → Sent (`POST /quotations/{id}/send`) → Accepted (`POST /quotations/{id}/accept`) / Rejected (`POST /quotations/{id}/reject`).
  - One-click Conversion to Subscription (`POST /quotations/{id}/convert-to-subscription`) creating active subscriptions with idempotency checks.
* **API Service Architecture (`quotationService.js`)**:
  - Centralized Axios client integrating `listQuotations`, `getQuotation`, `createQuotation`, `sendQuotation`, `acceptQuotation`, `rejectQuotation`, `convertToSubscription`, `listTemplates`, and `createTemplate`.
* **Validation & Financial Formulas (`quotationValidation.js`)**:
  - Strict client-side validation ensuring valid customer assignment, positive line quantities, non-negative unit prices, and future expiration timestamps.
  - Deterministic quotation financial calculation engine mirroring backend rounding rules.
  - Status badge metadata generator.
* **Route & Navigation Integration**:
  - Promoted `quotations` in `navConfig.js` to active status for `admin`, `staff`, and `customer`.
  - Mounted `<QuotationsPage />` behind `<RoleRoute allowedRoles={['admin', 'staff', 'customer']}>` in `App.jsx`.
* **Testing & Quality Assurance**:
  - Unit Tests: 86 tests passing across 5 test suites (`authAndPolicy.test.js`, `phase3.test.js`, `products.test.js`, `plansAndTaxes.test.js`, `quotations.test.js`).
  - Linter: 0 warnings, 0 errors across 94 files (`oxlint`).
  - Production Build: 2,180 modules transformed cleanly in 1.12s (`vite build`).

### Phase 7: Discount and Promotion Management (Completed)
* **Discount Catalogue (`DiscountsPage.jsx`)**:
  - Full server-side paginated catalogue displaying Promotional Code (with quick copy), Campaign Description, Deduction Type & Value, Eligibility Criteria (Min Spend, Min Qty), Applicability Scope (Global, Product, Plan), Validity Window, Usage / Redemptions, and Status Badges.
  - KPI summary metrics: Total Promotions, Active Codes, Total Redemptions, and Type Split (Percentage vs Flat).
  - Search filter with 300ms debouncing across promo codes and campaign descriptions.
  - Filter toolbar for Discount Type (`all`, `percentage`, `fixed_amount`) and Status (`all`, `active`, `inactive`, `expired`, `exhausted`).
  - Action buttons for Viewing full discount specifications, Editing configuration, and Soft Deactivating/Reactivating promo codes.
* **Discount Creation & Editing (`DiscountFormModal.jsx`)**:
  - Section 1 (Code & Type): Unique promo code (auto-uppercased), Campaign description, Discount Type selection (Percentage vs Flat Amount in INR), and Value validation (with 100% ceiling for percentage discounts).
  - Section 2 (Eligibility Thresholds & Scope): Minimum purchase amount threshold (₹), Minimum item quantity requirement, and Scope selector (Global / Entire Order, Specific Product, or Specific Subscription Plan) with asynchronous product and plan lookups.
  - Section 3 (Validity & Redemption Ceiling): Start Date/Time (`valid_from`), Expiration Date/Time (`valid_until`), optional Redemption Cap (`max_redemptions`), and Active Status toggle.
* **Discount Inspection (`DiscountDetailsModal.jsx`)**:
  - Detailed promotional breakdown showing Deduction Value, Status badge (Active, Expired, Exhausted, Scheduled, Inactive), One-click Code Copy, Usage progress bar (`X / Y used`), Minimum Requirements, Scope details, Validity Window, and Audit Timestamps.
  - Direct triggers for Edit and Deactivate/Reactivate workflows.
* **Soft Deactivation & Reactivation (`DiscountDeactivateDialog.jsx`)**:
  - Confirmation dialog preventing further customer redemptions while preserving complete historical audit trails.
* **Quotation Real-Time Discount Validation (`QuotationFormModal.jsx`)**:
  - Interactive "Verify Code" button connected to backend validation API (`POST /api/v1/discounts/validate`).
  - Real-time feedback displaying deduction amount or eligibility errors (e.g. minimum spend threshold, expired code, usage cap exceeded).
  - Live preview updating quotation subtotal, applied discount deduction, and revised estimated grand total.
* **API Service Architecture (`discountService.js`)**:
  - Centralized Axios client integrating `listDiscounts`, `getDiscount`, `createDiscount`, `updateDiscount`, `deactivateDiscount`, `reactivateDiscount`, and `validateDiscountCode`.
* **Validation & Business Logic (`discountValidation.js`)**:
  - Strict client-side payload validation for unique codes, positive values, percentage ceilings, non-negative minimums, chronological date sequences, and redemption limits.
  - Value formatters for percentage and Indian Rupee displays.
  - Expiry and exhaustion evaluation utilities (`isDiscountExpired`, `isDiscountExhausted`).
  - Dynamic status badge resolver (`getDiscountStatus`).
  - Client-side deduction estimation engine (`calculateEstimatedDiscount`).
  - Role-based authority helper (`canManageDiscounts`).
* **Route & Navigation Integration**:
  - Promoted `discounts` in `navConfig.js` to active status for `admin` and `staff`.
  - Mounted `<DiscountsPage />` behind `<RoleRoute allowedRoles={['admin', 'staff']}>` in `App.jsx`.
* **Testing & Quality Assurance**:
  - Unit Tests: 118 tests passing across 6 test suites (`authAndPolicy.test.js`, `phase3.test.js`, `products.test.js`, `plansAndTaxes.test.js`, `quotations.test.js`, `discounts.test.js`).
  - Linter: 0 warnings, 0 errors across 101 files (`oxlint`).
  - Production Build: 2,186 modules transformed cleanly in 1.59s (`vite build`).

### Phase 8: Subscription Management and Lifecycle (Completed)
* **Subscription Catalogue (`SubscriptionsPage.jsx`)**:
  - Live server-side paginated catalogue displaying Subscription Code (with quick copy), Subscriber details, Plan & Cadence, Period & Next Billing dates, Total Amount, and Status Badges.
  - KPI summary metrics: Total Subscriptions, Active Contracts, Paused/Trialing count, and loaded Period Contract Value sum.
  - Search filter with 300ms debouncing across subscription codes, notes, and customer names/emails.
  - Filter toolbar for Subscription Status (`all`, `active`, `paused`, `trialing`, `cancelled`, `closed`, `expired`, `confirmed`, `draft`), Cadence (`all`, `monthly`, `yearly`, `weekly`, `daily`), and Customer Account (Admin & Staff only).
  - Deep-linking URL param support (`?id=...` and `?customer_id=...`) for instant inspection from Quotations or Customer directories.
  - Action buttons for Viewing full contract specifications, and quick lifecycle triggers (Pause, Resume, Cancel, Close).
* **Subscription Creation (`SubscriptionFormModal.jsx`)**:
  - Section A (Customer Assignment): Active customer dropdown from `userService` for Admin/Staff, or auto-locked to authenticated user profile for Customer self-service.
  - Section B (Plan Association & Seats): Plan selector with dynamic cadence and minimum quantity enforcement.
  - Section C (Supplementary Product Lines): Multi-item product variant add-on picker with live unit price and line subtotal calculations.
  - Section D (Terms & Schedule): Effective Start Date/Time, Payment Terms (`due_on_receipt`, `net_15`, `net_30`, `net_60`), Trial Days, and internal/contract notes.
  - Section E (Financial Summary & Coupons): Tax rule association, live promotional discount code verification via `discountService.validateDiscountCode`, and real-time financial summary (Subtotal, Discount deduction, Tax liability, and Grand Total).
* **Subscription Inspection (`SubscriptionDetailsModal.jsx`)**:
  - Detailed contract breakdown showing Contract Value, Status badge, One-click Code Copy, Customer Account details, Plan Association & Cadence, and Next Billing Event.
  - Itemized Lines Table detailing Base Plan and supplementary variant add-ons.
  - Financial Breakdown (Subtotal, Discount, Tax, Grand Total).
  - Lifecycle History Audit Timeline displaying chronological provisioning, effective start, pause, cancellation, closure, and scheduled billing milestones.
  - Action toolbar triggering lifecycle state transitions according to backend rules.
* **Lifecycle State Transitions (`SubscriptionActionDialog.jsx`)**:
  - Subscription Pause (`POST /subscriptions/{id}/pause`): Suspends recurring billing with optional reason logging.
  - Subscription Resume (`POST /subscriptions/{id}/resume`): Restores paused contract to Active status.
  - Subscription Cancellation (`POST /subscriptions/{id}/cancel`): Supports cancellation at current period end (`cancel_at_period_end = true`) or immediate termination (`cancel_at_period_end = false`) with reason logging.
  - Subscription Closure (`POST /subscriptions/{id}/close`): Permanent contract closure restricted to Admin and Staff.
* **Quotation Conversion Integration (`QuotationDetailsModal.jsx`)**:
  - Direct deep link from accepted converted quotation to the provisioned subscription record (`/subscriptions?id=...`).
* **API Service Architecture (`subscriptionService.js`)**:
  - Centralized Axios client integrating `listSubscriptions`, `getSubscription`, `createSubscription`, `pauseSubscription`, `resumeSubscription`, `cancelSubscription`, `closeSubscription`, and `convertQuotationToSubscription`.
* **Validation & Business Logic (`subscriptionValidation.js`)**:
  - Payload validation ensuring valid customer and plan selection, minimum plan quantity compliance, non-negative add-on pricing, and non-negative trial days.
  - Status badge metadata generator for all 9 backend subscription statuses (`active`, `paused`, `cancelled`, `closed`, `expired`, `trialing`, `confirmed`, `draft`, `quotation`).
  - State machine transition authorization helpers (`canPauseSubscription`, `canResumeSubscription`, `canCancelSubscription`, `canCloseSubscription`).
  - Deterministic subscription financial calculation preview engine.
* **Missing Backend Capabilities Documented**:
  - `PUT /api/v1/subscriptions/{id}`: Not exposed in backend router.
  - Manual on-demand renewal endpoint `POST /api/v1/subscriptions/{id}/renew`: Renewal is handled automatically via recurring invoice generation in `invoice_service.py` (Phase 9).
  - Dedicated lifecycle audit history endpoint `GET /api/v1/subscriptions/{id}/history`: Historical events are derived from timestamps (`paused_at`, `cancelled_at`, `closed_at`) and `subscription.notes`.
* **Testing & Quality Assurance**:
  - Unit Tests: 138 tests passing across 7 test suites (`authAndPolicy.test.js`, `phase3.test.js`, `products.test.js`, `plansAndTaxes.test.js`, `quotations.test.js`, `discounts.test.js`, `subscriptions.test.js`).
  - Linter: 0 warnings, 0 errors across 107 files (`oxlint`).
  - Production Build: 2,191 modules transformed cleanly in 3.52s (`vite build`).

### Phase 9: Invoice Management and Recurring Billing (Completed)
* **Invoice Catalogue (`InvoicesPage.jsx`)**:
  - Full server-side paginated catalogue displaying Invoice Number (with quick copy), Customer Billed-To details, Related Subscription link, Issue & Due Dates, Total Amount, Balance Due (with Overdue indicator badge), and Status Badges.
  - KPI summary metrics: Total Invoices, Total Receivables, Outstanding Overdue Balance, and Total Settled Invoices.
  - Search filter with 300ms debouncing across invoice numbers, notes, and customer names/emails.
  - Filter toolbar for Invoice Status (`all`, `draft`, `confirmed`, `issued`, `paid`, `partially_paid`, `overdue`, `cancelled`, `void`), Overdue quick toggle, and Customer Account filter (Admin & Staff only).
  - Deep-linking URL param support (`?id=...`, `?subscription_id=...`, and `?customer_id=...`) for instant inspection from Subscriptions, Quotations, or Customer directories.
  - Action buttons for Viewing full invoice specifications, direct HTML Print/PDF preview, and Cancellation triggers.
* **Manual Invoice Creation (`InvoiceFormModal.jsx`)**:
  - Section A (Recipient & Contract Scoping): Billed Customer dropdown (Admin/Staff), and optional dynamic Related Subscription selector linked to customer's active contracts.
  - Section B (Terms, Dates & Currency): Issue Date (defaulting to today), Due Date, Currency selector (USD, INR, EUR, GBP), and Internal / Payment Notes.
  - Section C (Itemized Billing Lines): Dynamic multi-line editor supporting description, integer quantity, unit price, and automatic line subtotal.
  - Section D (Taxes & Promotional Deductions): Tax rule selector and live promotional coupon validation via `discountService.validateDiscountCode`.
  - Financial Summary Card: Real-time calculation preview of Subtotal, Applied Discount deduction, Tax Liability, and Grand Total.
* **Invoice Document Preview & Details (`InvoiceDetailsModal.jsx`)**:
  - Header with Invoice Number, status badge, overdue warning alert (if past due with positive balance), and print action button.
  - Company & Recipient Cards: Issuer info (Brightloop Technologies) and Customer billing contact details.
  - Contract Metadata: Related subscription reference code, currency, issue date, and due date.
  - Itemized Lines Table: Description, quantity, unit price, and line totals.
  - Comprehensive Financial Breakdown: Subtotal, Discount deduction, Tax liability, Total Amount, Amount Paid, and Remaining Amount Due.
  - Standalone Print-Ready Integration: Directly launches print preview via `GET /api/v1/invoices/{id}/html` opened in a dedicated browser window with automatic `@media print` styling and print dialog trigger.
* **Invoice Cancellation (`InvoiceCancelDialog.jsx`)**:
  - Confirmation dialog calling `POST /api/v1/invoices/{id}/cancel` for Admin and Staff.
  - Strict business validation ensuring invoices with recorded payments (`amount_paid > 0`) or already cancelled invoices cannot be cancelled.
* **Recurring Billing Automation Dashboard (`RecurringBillingModal.jsx`)**:
  - Administrative execution trigger calling `POST /api/v1/invoices/generate-recurring`.
  - Target Evaluation Date picker allowing billing simulation and on-demand billing run execution.
  - Visual explanation of backend duplicate billing prevention architecture: database constraint `uq_invoice_sub_period` guarantees that duplicate invoices are never generated for the same subscription period.
  - Live execution results report displaying count of newly generated invoices, skipped subscriptions, and execution feedback message.
* **API Service Architecture (`invoiceService.js`)**:
  - Centralized Axios client integrating `listInvoices`, `getInvoice`, `createInvoice`, `getInvoiceHtml`, `generateRecurringInvoices`, and `cancelInvoice`.
* **Validation & Business Logic (`invoiceValidation.js`)**:
  - Payload validation ensuring customer selection, valid due date, positive line quantities, and non-negative unit prices.
  - Status badge metadata generator for all 8 backend statuses (`draft`, `confirmed`, `issued`, `paid`, `partially_paid`, `overdue`, `cancelled`, `void`).
  - Overdue status detector (`isInvoiceOverdue`).
  - Cancellation eligibility check (`canCancelInvoice`).
  - Client-side financial estimation preview engine (`calculateEstimatedInvoiceTotals`).
* **Route & Navigation Integration**:
  - Promoted `invoices` in `navConfig.js` to active status for `admin`, `staff`, and `customer`.
  - Mounted `<InvoicesPage />` behind `<RoleRoute allowedRoles={['admin', 'staff', 'customer']}>` in `App.jsx`.
* **Scope Boundary & Missing Backend Endpoints Documented**:
  - Payments and Razorpay checkout belong strictly to Phase 10 (no payment recording was implemented in Phase 9).
  - `POST /api/v1/invoices/{id}/send`: No email dispatch endpoint exists in backend router (quotations has `/send`, but invoices does not).
  - `PUT /api/v1/invoices/{id}`: Direct invoice editing is not exposed.
* **Testing & Quality Assurance**:
  - Unit Tests: 162 tests passing across 8 test suites (`authAndPolicy.test.js`, `phase3.test.js`, `products.test.js`, `plansAndTaxes.test.js`, `quotations.test.js`, `discounts.test.js`, `subscriptions.test.js`, `invoices.test.js`).
  - Linter: 0 warnings, 0 errors across 114 files (`oxlint`).
  - Production Build: 2,197 modules transformed cleanly in 3.59s (`vite build`).

### Phase 10: Payment Management and Razorpay Integration (Completed)
* **Payment Catalogue (`PaymentsPage.jsx`)**:
  - Full server-side paginated catalogue displaying Payment Reference (`PAY-2026-XXXXX` with quick copy), Customer Billed-To details, Target Invoice link, Payment Date & Time, Payment Method with online/offline source badge, Transaction Amount, and Status Badges.
  - KPI summary metrics: Total Settled Volume (INR/USD), Completed Transactions count, Pending / Processing count, and Razorpay Online vs Manual Offline split.
  - Search filter with 300ms debouncing across payment references, transaction/gateway IDs, notes, and customer names/emails.
  - Filter toolbar for Payment Status (`all`, `completed`, `pending`, `failed`, `refunded`), Payment Method (`all`, `razorpay`, `bank_transfer`, `credit_card`, `cash`, `manual`, `stripe`, `paypal`), Customer Account filter, and Invoice link filter.
  - Deep-linking URL param support (`?id=...`, `?invoice_id=...`, and `?customer_id=...`) for instant inspection from Invoices or Customer directories.
  - Action buttons for Viewing full payment transaction specifications and recording manual payments.
* **Manual Payment Recording & Invoice Allocation (`PaymentRecordModal.jsx`)**:
  - Customer selection filter and dynamic target invoice selector listing unpaid and partially paid invoices.
  - Live Ledger Reconciliation Preview:
    - Displays Invoice Total, Currently Paid, and Outstanding Balance Due.
    - "Autofill Full Balance" shortcut button that autofills exact `amount_due`.
    - Live transaction arrow displaying post-payment paid amount, remaining balance, and resulting status (`PAID` or `PARTIALLY_PAID`).
    - Overpayment protection guard: entering amounts exceeding remaining `amount_due` is automatically flagged and blocked.
  - Supported Payment Methods: Cash, Bank Transfer (NEFT/RTGS/IMPS), Credit / Debit Card (Offline), Manual Accounting Adjustment, Stripe, PayPal.
  - Transaction Reference input (e.g. UTR / Cheque number), Currency selector, and internal accounting notes.
* **Payment Details Inspection (`PaymentDetailsModal.jsx`)**:
  - Header with Payment Reference, status badge (`Completed`, `Pending`, `Failed`, `Refunded`), payment source indicator (Razorpay Online vs Offline Manual), and one-click reference copy.
  - Financial Hero: Transaction Amount, Currency, Payment Method, and recorded timestamp.
  - Entity Cards: Customer account details and Target Invoice link with direct deep link navigation (`/invoices?id=...`).
  - Audit & Gateway Identifiers: Gateway reference / Cheque number, Razorpay Order ID, Razorpay Payment ID, and verified HMAC-SHA256 signature hash.
  - Internal / Transaction Notes display.
* **Razorpay Standard Checkout Integration (`RazorpayCheckoutModal.jsx` & `razorpay.js`)**:
  - Standard Checkout operating strictly in **TEST MODE ONLY** without custom collection of payment card credentials.
  - Dynamic SDK Loader (`loadRazorpayCheckout`) safely loading official script from `https://checkout.razorpay.com/v1/checkout.js` with headless/SSR safety.
  - Trusted Order Initiation: Calls `POST /api/v1/payments/razorpay/create-order` receiving trusted `order_id`, `amount` in paise, `currency`, `key_id`, `invoice_id`, and customer prefill information.
  - Client-Side Checkout Execution: Launches Razorpay Checkout modal with prefilled customer details, brand theme, and event handlers for payment success, failure, and window dismissal.
  - Cryptographic Signature Verification: Sends `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }` to `POST /api/v1/payments/razorpay/verify`.
  - Atomically balances the target invoice upon verification, prevents false positives, and provides clear success celebration or retry states.
* **Invoice Reconciliation & Payment History Integration (`InvoiceDetailsModal.jsx`)**:
  - Added dedicated "Payment History & Settlement Records" table to invoice details displaying all historical transactions against the invoice.
  - Prominent "Pay Online (Razorpay)" action button for customer and staff when `amount_due > 0` and invoice is eligible.
  - "Record Payment" administrative trigger for staff and admins to record offline settlements.
  - Automatically re-evaluates overdue flags and updates ledger status upon payment completion.
* **API Service Architecture (`paymentService.js`)**:
  - Centralized Axios client integrating `listPayments`, `getPayment`, `recordPayment`, `createRazorpayOrder`, and `verifyRazorpayPayment`.
* **Validation & Business Logic (`paymentValidation.js`)**:
  - Payload validation ensuring valid invoice, positive non-zero amounts, overpayment prevention against `invoice.amount_due`, valid method enum, and 3-letter currency code.
  - Visual status and method badge helpers (`getPaymentStatusBadge`, `getPaymentMethodBadge`).
  - Deterministic balance reconciliation calculator (`calculateReconciledBalance`).
  - Role-based authorization helpers (`canRecordManualPayment`, `canPayOnline`).
* **Route & Navigation Integration**:
  - Promoted `payments` in `navConfig.js` to active status for `admin`, `staff`, and `customer`.
  - Replaced `ModulePlaceholderPage` at `/payments` with live `<PaymentsPage />` in `App.jsx`.
* **Testing & Quality Assurance**:
  - Unit Tests: 186 tests passing across 9 test suites (`authAndPolicy.test.js`, `phase3.test.js`, `products.test.js`, `plansAndTaxes.test.js`, `quotations.test.js`, `discounts.test.js`, `subscriptions.test.js`, `invoices.test.js`, `payments.test.js`).
  - Linter: 0 warnings, 0 errors across 122 files (`oxlint`).
  - Production Build: 2,204 modules transformed cleanly in 3.35s (`vite build`).

### Phase 11: Customer Portal and Self-Service Experience (Completed)
* **Customer Navigation & Role Isolation (`navConfig.js`, `Sidebar.jsx`, `Navbar.jsx`)**:
  - Added `profile` (`/profile`) route and navigation entry to `NAV_ITEMS`.
  - Configured `getNavItemsForRole('customer')` to strictly deliver self-service views with friendly, customer-centric labels in prescribed order:
    1. `Overview` (`/`)
    2. `My Quotations` (`/quotations`)
    3. `My Subscriptions` (`/subscriptions`)
    4. `My Invoices` (`/invoices`)
    5. `My Payments` (`/payments`)
    6. `My Profile` (`/profile`)
  - Guaranteed administrative route isolation: links to Users/Customers, Products, Plans, Taxes, Discounts, Analytics, and System Settings are strictly excluded from the customer navigation.
  - Linked the user avatar pill in `Navbar.jsx` to `/profile` for fast access across all authenticated roles.
* **Customer Overview Dashboard (`CustomerDashboardView.jsx` & `dashboardService.js`)**:
  - Replaced legacy mock metrics with live backend customer aggregation via `computeCustomerMetrics`:
    - Queries active customer subscriptions, pending quotations, itemized invoices, and historical payments.
    - Aggregates true outstanding balance (`amount_due` across unpaid/partially paid non-cancelled invoices).
    - Identifies earliest upcoming subscription renewal date from active contracts.
    - Zero fabricated statistics or simulated financial trends.
  - Actionable customer notification banners:
    - High-priority overdue/unpaid balance alert with direct "Pay Online" action.
    - Pending quotation alert with direct "Review & Accept" action.
  - Self-service quick-action hub providing deep links to Subscriptions, Quotations, Invoices, Payments, and Profile.
  - Responsive tables for Subscribed Services, Recent Invoices, and Recent Payments with empty-state guidance.
* **My Quotations Customer Experience (`QuotationDetailsModal.jsx` & `quotationValidation.js`)**:
  - Maintained customer quotation acceptance and rejection capabilities for quotations in `sent` status.
  - Guarded "Convert to Active Subscription" button with `canManage`: customers are strictly prevented from administratively converting accepted quotations into live subscriptions.
  - Exported permission helpers `canCustomerRespond`, `canConvertToSubscription`, and `canCreateOrEditQuotation`.
* **My Subscriptions Customer Experience (`SubscriptionsPage.jsx` & `subscriptionValidation.js`)**:
  - Role-aware page title: renders "My Subscriptions" for customers and "Subscriptions" for admin/staff.
  - Hidden administrative "New Subscription" provisioning button for customers.
  - Contextual customer empty state offering direct navigation to "My Quotations" when no active subscriptions exist.
  - Permitted self-service lifecycle controls (pause active subscriptions, resume paused subscriptions, cancel where permitted) while strictly prohibiting administrative closure (`canCloseSubscription`).
* **My Invoices & My Payments Customer Experience (`InvoicesPage.jsx`, `PaymentsPage.jsx`, `InvoiceDetailsModal.jsx`)**:
  - Customer invoice inspection with live overdue notices, financial breakdown, and print-ready HTML preview.
  - Integrated online settlement via Razorpay Test Mode Checkout guarded by `canPayOnline` (strictly enforces invoice ownership `invoice.customer_id === currentUser.id`).
  - Customer payment history inspection with status badges and transaction identifiers.
  - Enforced prohibition of manual offline payment recording for customers (`canRecordManualPayment`).
* **Customer Profile & Account Settings (`ProfilePage.jsx` & `customerPortalValidation.js`)**:
  - Created `/profile` page mounted behind `<RoleRoute allowedRoles={['admin', 'staff', 'customer']}>`.
  - Account Identity Hero displaying user name, email, role badge, and account status.
  - Profile Attributes Card displaying Full Name, Email Address, Phone Number, Company / Organization, Role, and Registration Date.
  - Firebase Password Reset Email Trigger: allows users to safely dispatch password reset emails to their registered address via Firebase Authentication SDK.
  - Missing Backend Endpoint Documented: The backend router currently lacks `PUT /api/v1/users/me` or `PATCH /api/v1/users/me` (it only provides `GET /api/v1/users/me` and idempotent registration `POST /api/v1/users/profile`). The profile page renders attributes in verified read-only mode and informs the user of the missing update endpoint.
* **Payment Security Audit Findings (Read-Only Review of Phase 10)**:
  - Cryptographic Signature Verification: Backend uses `hmac.compare_digest` in `verify_razorpay_payment` to verify HMAC-SHA256 signatures generated from `order_id + "|" + payment_id` against the configured Razorpay key secret.
  - Ownership Enforcement: Order creation and payment verification strictly authenticate invoice and order ownership against `current_user.id`.
  - Overpayment & Replay Protection: Amount balance checks prevent overpayment, and unique constraints on `Payment.razorpay_payment_id` block transaction replay.
  - Webhook Idempotency: Webhook endpoint validates raw payload signatures and stores processed event IDs in `webhook_events` to prevent duplicate processing.
* **Testing & Quality Assurance**:
  - Unit Tests: 213 tests passing across 10 test suites (`customerPortal.test.js` added with 27 individual assertions).
  - Linter: 0 warnings, 0 errors across 125 files (`oxlint`).
  - Production Build: 2,206 modules transformed cleanly in 3.50s (`vite build`).
