# Brightloop — Subscription Management System

Brightloop is a modular monolithic Subscription Management System designed to handle complex billing cadences (daily, weekly, monthly, yearly), multi-variant product catalogs, dynamic quotation workflows, automated recurring invoicing, tax and discount logic, and payment reconciliation for modern SaaS businesses.

---

## Architecture & Single Source of Truth

Please read **[PROJECT_CONTEXT.md](PROJECT_CONTEXT.md)** in the repository root before writing code or modifying database schemas. It defines:
* The complete directory structure and architectural layer boundaries.
* The entity-relationship model for all 13 planned database models.
* The planned REST API endpoints and schema contracts.
* The implementation status of every module.
* Developer responsibilities for parallel feature development across Developer 1, Developer 2, and Developer 3.

---

## Quickstart Guide

### Prerequisites
* **Node.js**: v18+ (tested on v24.14.0)
* **Python**: v3.11+ (tested on v3.12.3)
* **Docker & Docker Compose** (for local PostgreSQL 16)

### 1. Start the Database
```bash
docker compose up -d
```
Default connection: `postgresql://brightloop_user:brightloop_password@localhost:5432/brightloop_db`

### 2. Run the Backend API Server
```bash
cd backend
python -m venv .venv

# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# Linux / macOS:
# source .venv/bin/activate

pip install -r requirements.txt
copy .env.example .env

# Verify backend health test
pytest -v

# Start FastAPI development server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
* **Swagger API Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
* **Health Check**: [http://127.0.0.1:8000/api/v1/health](http://127.0.0.1:8000/api/v1/health)

### 3. Run the Frontend Development Server
```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```
* **Web Application**: [http://localhost:5173](http://localhost:5173)

---

## Project Structure Overview

```
odo/
├── docker-compose.yml       # Local PostgreSQL database container
├── PROJECT_CONTEXT.md       # Central architectural specification and status matrix
├── README.md                # Onboarding and setup instructions
├── backend/                 # FastAPI backend application
│   ├── app/
│   │   ├── api/             # API v1 routes and dependency injection
│   │   ├── core/            # Configuration and JWT security
│   │   ├── db/              # SQLAlchemy session and engine setup
│   │   ├── models/          # 13 ORM models (Users, Subscriptions, Invoices, etc.)
│   │   ├── schemas/         # Pydantic validation schemas
│   │   └── services/        # Business logic services
│   ├── alembic/             # Database migration scripts
│   └── tests/               # Pytest async test suite
└── frontend/                # React + Vite + Tailwind CSS frontend
    └── src/
        ├── api/             # Axios client with interceptors
        ├── components/      # Reusable UI components
        ├── context/         # AuthContext and state management
        ├── layouts/         # Main layout with navigation
        ├── pages/           # Route views (Dashboard, Subscriptions, Invoices)
        └── utils/           # Formatters and constants
```

---

## Parallel Development Rules

1. **API Contracts**: All planned endpoints must adhere to the contracts documented in `PROJECT_CONTEXT.md`. Do not break existing schema contracts without synchronizing with the team.
2. **Database Migrations**: Generate new Alembic migrations only within `backend/alembic/versions` with descriptive revision messages.
3. **Status Reporting**: Update `PROJECT_CONTEXT.md` status badges as modules transition from `PLANNED` to `IN PROGRESS` and `IMPLEMENTED`.
