<p align="center">
  <img src="assets/brand/mtaa-fix-logo.png" alt="Mtaa Fix logo" width="120" height="120" />
</p>

<h1 align="center">Mtaa Fix</h1>

<p align="center">Community Reporting &amp; Accountability System for Kisii County, Kenya</p>

[![Node.js](https://img.shields.io/badge/Node.js-18.x-blue?logo=node.js)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14.x-blue?logo=postgresql)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma)](https://www.prisma.io/)
[![License: ISC](https://img.shields.io/badge/License-ISC-lightgrey)](LICENSE)

A civic technology platform that connects citizens of Kisii County with their county government. Residents report local infrastructure and service delivery issues, while government officials—across 14 distinct roles—track, assign, and resolve those reports through structured workflows with SLA tracking and escalation paths.

## Overview

### What Mtaa Fix does

Mtaa Fix digitizes the end-to-end community reporting lifecycle. A citizen submits an issue (a pothole, blocked drain, failed streetlight, unsafe facility), and the report flows through a defined workflow: submission → review → assignment → field work → resolution → citizen verification. Every status change is audited, every assignment is traced, and every resolution must be confirmed by the citizen who reported it.

### Who uses it

| User | What they do |
|------|-------------|
| **Citizen** | Register, submit reports with GPS location and photo evidence, track status, verify resolutions, manage profile |
| **Field Officer** | View assigned cases, record inspection findings, upload evidence, submit work updates |
| **Technical Supervisor** | Supervise field officers, review inspections, approve work |
| **Chief Officer / CECM** | Departmental oversight, SLA compliance, escalation monitoring |
| **Governor** | County-wide performance, department accountability, critical escalations |
| **Ward / Sub-County Administrator** | Monitor local reports, follow up on unresolved issues, escalate when needed |
| **Disaster / Enforcement Officer** | Manage hazard and enforcement cases within their department |
| **Platform Super Admin** | User & role management, organizational mapping, system audit |

### Verified capabilities (implemented in code)

- **Multi-role authentication** — JWT access/refresh token rotation with bcrypt password hashing; 14 roles enforced server-side
- **Citizen reporting** — Submit reports with category, priority, location, GPS coordinates, and media uploads; anonymous guest reporting supported
- **Report lifecycle** — 20 statuses with validated transitions (SUBMITTED → UNDER_REVIEW → ASSIGNED → IN_PROGRESS → RESOLVED → CITIZEN VERIFICATION → CLOSED)
- **Assignments & routing** — Reports assigned to officers with reason tracking; routing rules route by category and location
- **Field operations** — Inspections, work updates, evidence uploads, resolution submissions
- **Citizen verification** — Citizens confirm, reject, or flag partial resolutions; rejection reopens the report
- **Escalations** — Stagnant reports can be escalated with priority and resolution tracking
- **Audit logging** — Every status change and actor action is recorded with timestamp
- **Geographic scoping** — Kisii County seeded with 9 sub-counties and 45 wards; reports carry ward/sub-county/county references
- **Categories & taxonomy** — 7 categories (Roads, Water & Sewerage, Drainage, Solid Waste, Street Lighting, Public Facilities, Public Safety) with 130 subcategories
- **SLA policies** — Configurable target resolution hours with escalation targets
- **Rate limiting** — Auth endpoints rate-limited; guest report submissions limited

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Backend** | Node.js, Express 5 | REST API, business logic, auth |
| **Frontend** | Next.js 16 (React 19), Tailwind CSS | Citizen portal, government dashboard, admin dashboard |
| **Database** | PostgreSQL 18, Prisma ORM | Data persistence, 32 models |
| **Authentication** | JWT (access + refresh), bcrypt | Stateless sessions with rotation |
| **Validation** | Zod v4 | Request schema validation |
| **Security** | Helmet, CORS, express-rate-limit | Headers, origin control, rate limiting |
| **File storage** | Multer (local) + Cloudinary (optional) | Report evidence uploads |
| **Email** | Resend (optional) | Verification & password reset |
| **Testing** | Native Node.js `http` | Integration test suites |

## System Architecture

```mermaid
graph TB
    subgraph Citizen["Citizen Frontend (Next.js :3000)"]
        C1[Dashboard & Reports]
        C2[Report Submission Wizard]
        C3[Profile & Verification]
    end

    subgraph Gov["Government Frontend (Next.js :302)"]
        G1[Role-Based Dashboard]
        G2[Report Management]
        G3[Field Work & Inspections]
    end

    subgraph Admin["Admin Dashboard (Next.js :301)"]
        A1[System Administration]
        A2[User & Role Management]
        A3[Reports & Settings]
    end

    subgraph API["Backend API (Express :5000)"]
        R1[Auth: login, register, refresh, verify]
        R2[Reports: CRUD, status, assignments]
        R3[Dashboard: scoped overview & stats]
        R4[Categories, Departments, Locations]
        R5[Escalations, Notifications, Audit Logs]
        R6[Uploads: evidence & media]
    end

    subgraph DB["PostgreSQL 18 (Prisma ORM)"]
        D1[32 models: User, Report, Assignment, Inspection, ...]
        D2[Refresh tokens, verification, password reset]
        D3[Audit logs, SLA policies, routing rules]
    end

    subgraph Ext["External Services"]
        E1[Cloudinary: image storage]
        E2[Resend: email delivery]
    end

    Citizen --> API
    Gov --> API
    Admin --> API
    API --> DB
    API -.-> Ext
```

## User Workflows

### Citizen reporting lifecycle

```mermaid
sequenceDiagram
    participant C as Citizen
    participant F as Frontend
    participant B as Backend API
    participant D as Database

    C->>F: Register / log in
    F->>B: POST /api/auth/register
    B->>D: Create user (CITIZEN role)
    B-->>F: Access + refresh tokens
    C->>F: Submit report (category, location, photos)
    F->>B: POST /api/reports
    B->>D: Create report (SUBMITTED) + reference code
    B->>B: Apply routing rules → assign department
    B-->>F: Report created with reference code
    C->>F: Track report status
    F->>B: GET /api/reports/me
    B-->>F: Report history with statuses
```

### Government resolution chain

```mermaid
sequenceDiagram
    participant FO as Field Officer
    participant TS as Technical Supervisor
    participant TH as Technical Head
    participant C as Citizen

    FO->>B: View assigned cases
    FO->>B: Record inspection findings + upload evidence
    FO->>B: Submit work update
    TS->>B: Review inspection + approve/reject work
    TH->>B: Submit resolution (RESOLVED)
    B->>C: Notification: resolution ready
    C->>B: Accept or reject resolution
    alt Accepted
        B->>D: Mark CLOSED
    else Rejected
        B->>D: Reopen to IN_PROGRESS
    end
```

## Project Structure

```
mtaa-fix/
├── backend/                  # Node.js/Express REST API (port 5000)
│   ├── controllers/          # Request handlers (auth, reports, dashboard, etc.)
│   ├── repositories/         # Data access layer (Prisma + memory store fallback)
│   ├── services/             # Business logic (routing, SLA, workflow, jurisdiction)
│   ├── routes/               # API endpoint definitions (20+ route files)
│   ├── prisma/               # Schema, migrations, seed scripts
│   ├── validators/           # Zod validation schemas
│   ├── middlewares/          # Auth, role, validation, rate limiting, error handling
│   ├── utils/                # JWT, Cloudinary, notifier
│   ├── tests/                # Integration test suites (auth, reports, categories, etc.)
│   ├── uploads/              # Stored report evidence
│   ├── index.js              # Application entry point
│   └── .env.example          # Environment variable template
├── citizen-frontend/         # Next.js citizen portal (port 3000)
│   ├── app/
│   │   ├── dashboard/        # Citizen dashboard: reports, verification, profile
│   │   ├── report-issue/     # Report submission wizard
│   │   ├── login, register   # Authentication
│   │   └── reports/[id]      # Individual report detail
│   └── .env.example
├── government-frontend/      # Next.js government portal (port 302)
│   ├── app/
│   │   ├── government/       # Role-based dashboard (14 roles)
│   │   ├── login/            # Government authentication
│   │   ├── auth/callback/    # Auth handoff exchange
│   │   └── api/session/      # Session cookie management
│   ├── lib/
│   │   ├── api.js            # Authenticated API client
│   │   ├── auth-context.js   # Session state management
│   │   └── roles-config.ts   # Role-to-route & sidebar configuration
│   └── .env.example
├── admin-dashboard/          # Next.js admin dashboard (port 301)
│   ├── app/                  # System administration UI
│   └── .env.example
├── docs/
│   ├── assets/               # Visual assets (banner, screenshots)
│   ├── brand-verification/   # App screenshots & favicon variants
│   └── mtaa-fix-planning/    # PRD, schema, role matrix, implementation plan
├── scripts/                  # Backfill and utility scripts
├── package.json              # Root launcher (concurrently runs all 4 apps)
└── README.md
```

## Installation & Local Development

### Prerequisites

- **Node.js** v18.x or newer
- **PostgreSQL** v14.x or newer
- **npm** v9.x or newer

### 1. Clone the repository

```bash
git clone https://github.com/your-org/mtaa-fix.git
cd mtaa-fix
```

### 2. Backend setup

```bash
cd backend
npm install
```

Create `backend/.env` from `backend/.env.example`:

```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://user:password@localhost:5432/mtaa_fix?schema=public"
JWT_SECRET=your_access_token_secret_change_in_production
JWT_REFRESH_SECRET=your_refresh_token_secret_change_in_production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000,http://localhost:3001,http://localhost:3002
RESEND_API_KEY=re_your_resend_key          # optional; dev logs codes to console
EMAIL_FROM=noreply@yourdomain.org
CLOUDINARY_CLOUD_NAME=your_cloud_name     # optional; for image uploads
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
```

Initialize the database:

```bash
npx prisma db push
npm run db:seed          # Seeds counties, departments, categories, Kisii geography
node prisma/dev-seed.js  # Seeds test accounts for all 14 roles
```

Start the backend:

```bash
npm run dev
```

### 3. Frontend setup

Each frontend follows the same pattern:

```bash
cd citizen-frontend
npm install
npm run dev -- --port 3000
```

| App | Port | Purpose |
|-----|------|---------|
| Citizen Frontend | 3000 | Public reporting portal |
| Admin Dashboard | 3001 | System administration |
| Government Frontend | 302 | Government officer dashboard |

### 4. Run all applications together

From the repository root:

```bash
npm install          # installs concurrently launcher
npm run dev          # starts all 4 apps
```

## Configuration & Integrations

### Cloudinary (image storage)

Report evidence uploads support Cloudinary. Configure `CLOUDINARY_*` variables in `backend/.env`. Without Cloudinary, uploads are stored locally in `backend/uploads/` and served via `/uploads`.

### Resend (email delivery)

Verification codes and password reset emails are sent via Resend when `RESEND_API_KEY` is set. In development without a key, codes are logged to the console.

### Supabase / Neon (PostgreSQL)

The backend connects via `DATABASE_URL`. For Supabase connection pooling (port 6543), use explicit `PGHOST`/`PGPORT`/`PGUSER`/`PGPASSWORD`/`PGDATABASE` variables (see `backend/repositories/client.js`).

### Environment variables (never commit `.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Access token signing key |
| `JWT_REFRESH_SECRET` | Yes | Refresh token signing key |
| `CLIENT_URL` | Yes | Comma-separated allowed CORS origins |
| `RESEND_API_KEY` | No | Email delivery (falls back to console log) |
| `CLOUDINARY_*` | No | Image storage (falls back to local `/uploads`) |

## Testing

Backend integration tests use native Node.js `http` against a running server.

```bash
cd backend
npm test               # All suites: auth, reports, categories, locations, departments, officers, operations, escalation
npm run test:auth      # Authentication flows
npm run test:reports   # Report CRUD, status transitions, jurisdiction
npm run test:categories # Category & subcategory management
npm run test:locations # County, sub-county, ward data
npm run test:departments # Department management
npm run test:officers  # Officer management
npm run test:operations # End-to-end report workflow
npm run test:monitoring # Dashboard & escalation audit
```

## Security

Security controls are enforced **server-side**, not just in the UI:

- **Authentication** — JWT access tokens (15-minute expiry) with refresh token rotation; refresh tokens stored in database and revoked on logout/password change
- **Password security** — bcrypt hashing with 10 salt rounds
- **Authorization** — Role-based access control on every mutation endpoint; jurisdiction scoping ensures a Ward Administrator cannot access another ward's reports, a Field Officer cannot access unassigned reports
- **Input validation** — Zod schemas validate all request bodies
- **Rate limiting** — 100 requests/15min for auth, 15/15min for sensitive auth, 5/15min for guest reports
- **CORS** — Restricted to configured origins; localhost allowed in development
- **Security headers** — Helmet middleware
- **Session management** — httpOnly cookies for refresh tokens; tab-scoped sessionStorage for access tokens in government frontend
- **Audit logging** — Status changes and actor actions recorded with timestamps

> **Note:** Some dashboard APIs (`/api/dashboard/*`) currently return all reports rather than jurisdiction-scoped data. This is a known gap identified in the project planning documents (`docs/mtaa-fix-planning/07-role-permission-matrix.md`).

## Roadmap

The following improvements are identified in the project planning documents (`docs/mtaa-fix-planning/`):

- **Backend:** Jurisdiction-scoping for dashboard APIs; role-specific dashboard summary endpoints
- **Government Dashboard:** Role-specific stats, charts, and tables per the 14-role specification (currently shares generic data across roles with role-specific menus)
- **Citizen Dashboard:** Pending tasks, overdue work, notifications polish
- **Admin Dashboard:** System health, audit logs, role/permission management UI (currently UI structure without full API wiring)
- **Technical resolution UI:** Inspection, work update, and resolution submission interfaces for supervisors and field officers
- **Administrative follow-up UI:** Ward/Sub-County Admin follow-up queue

## Test Accounts

The development seeder creates the following accounts (all use password `TestPassword123!`):

| Email | Role |
|-------|------|
| citizen.alice@example.com | Citizen |
| citizen.bob@example.com | Citizen |
| governor.kisii@example.com | Governor |
| cecm.infrastructure@example.com | CECM |
| chief.officer.infra@example.com | Chief Officer |
| tech.head.infra@example.com | Technical Head |
| tech.supervisor.infra@example.com | Technical Supervisor |
| field.officer.1@example.com | Field Officer |
| ward.admin.bassicentral@example.com | Ward Administrator |
| subcounty.admin.bobasi@example.com | Sub-County Administrator |
| disaster.manager@example.com | Disaster Manager |
| enforcement.officer@example.com | Enforcement Officer |
| officer.general@example.com | Officer |
| dept.admin.infra@example.com | Departmental Administrator |
| admin.county@example.com | Administrator |
| admin.platform@example.com | Super Admin |

## Screenshots

Existing application screenshots are available in `docs/brand-verification/`:

- Citizen portal home — `browser-citizen-home.png`
- Citizen sign-in — `browser-citizen-signin.png`
- Government dashboard — `browser-gov-dashboard.png`
- Government login — `browser-gov-login.png`
- Admin login — `browser-admin-login.png`

Favicon variants for each frontend are also in `docs/brand-verification/`.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Make your changes
4. Run the test suite (`npm test` from `backend/`)
5. Commit and push (`git push origin feature/your-feature`)
6. Open a pull request

## License

This project is licensed under the ISC License — see `LICENSE` for details.

---

*Built for Kisii County, Kenya — connecting citizens with accountable government service delivery.*
