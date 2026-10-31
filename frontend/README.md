# Brightloop Frontend — Phase 1: Foundation

This directory houses the frontend Single-Page Application (SPA) for the **Brightloop Subscription Management System** (Odoo x Make-A-Ton 9.0 Hackathon 2026).

---

## Technology Stack

- **Framework**: React 19 (`^19.3.1`)
- **Build Tool**: Vite 8 (`^8.3.5`)
- **Styling**: Tailwind CSS v4 (`^4.3.3`) via `@tailwindcss/vite`
- **Routing**: React Router DOM (`^7.18.5`)
- **HTTP Client**: Axios (`^1.21.0`) with interceptors and token injection
- **Authentication**: Firebase Modular SDK (`^12.8.0`)
- **Analytics Visualizations**: Recharts (`^3.10.1`)
- **Icons**: Lucide React (`^1.65.0`)
- **Linter**: Oxlint (`^1.89.0`)

---

## Directory Architecture

```text
src/
├── api/                  # Backward compatibility client re-export
├── config/               # Configuration modules (Firebase initialization & validation)
├── services/             # Core service boundaries (apiClient, authService)
├── routes/               # Central navigation maps (navConfig.js with 11 destinations)
├── components/
│   ├── ui/               # 14 Reusable UI primitives (Button, Input, Select, Modal, etc.)
│   ├── common/           # ErrorBoundary and cross-cutting components
│   ├── Navbar.jsx        # Top header with dynamic API health check & profile
│   ├── Sidebar.jsx       # Responsive sidebar with mobile drawer toggle
│   ├── MetricCard.jsx    # Metric card widget
│   └── StatusBadge.jsx   # Status indicator badge
├── layouts/
│   └── MainLayout.jsx    # Application shell layout
├── pages/                # Route views (Dashboard, Subscriptions, Invoices, ModulePlaceholder, Login, 404)
├── context/              # AuthProvider and React Context instances
├── hooks/                # useAuth and custom React hooks
└── utils/                # Domain formatters and constants
```

---

## Environment Variables

Copy `.env.example` to `.env` to configure your environment:

```bash
copy .env.example .env
```

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Backend FastAPI server endpoint | `http://localhost:8000/api/v1` |
| `VITE_FIREBASE_API_KEY` | Firebase Web API Key | `AIzaSy...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain | `brightloop.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project ID | `brightloop-prod` |
| `VITE_FIREBASE_APP_ID` | Firebase Web App ID | `1:123456789:web:...` |

*Note: If Firebase environment variables are omitted, the application initializes gracefully in unconfigured mode with clear console warnings rather than crashing.*

---

## Available Scripts

- **`npm run dev`**: Starts the local Vite development server with HMR at `http://localhost:5173`.
- **`npm run build`**: Compiles production assets into `dist/`.
- **`npm run lint`**: Executes Oxlint on all source files with zero tolerance for warnings/errors.
- **`npm run preview`**: Serves the compiled production build locally for verification.

---

## Phase 1 Deliverables

1. **Centralized 11-Destination Navigation**: Overview, Customers, Products, Subscription Plans, Quotations, Subscriptions, Invoices, Discounts, Payments, Analytics, Settings.
2. **Transparent Module Placeholders**: Unimplemented modules render a clean `ModulePlaceholderPage` displaying the planned phase and backend dependencies, without fabricated records.
3. **14 Reusable UI Components**: Fully accessible, typed with clean props, and styled with consistent Tailwind tokens.
4. **Resilient Error Infrastructure**: Top-level `ErrorBoundary`, `ErrorState`, `EmptyState`, and `LoadingIndicator` (with `Skeleton`).
5. **Centralized API Client**: Normalizes errors into `ApiError` instances and automatically injects Bearer tokens.
6. **Firebase SDK Integration**: Initialized cleanly with singleton guarding and decoupled through `authService`.
