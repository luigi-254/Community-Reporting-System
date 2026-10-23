# MTAA Fix — Community Reporting & Accountability System

MTAA Fix is a professional community issue-reporting and accountability platform designed for Kisii County, Kenya. It enables citizens to report local infrastructure and service delivery issues, while providing government officials with the tools to track, manage, and resolve these reports transparently.

## 🚀 Project Overview

The system bridges the gap between citizens and government by digitizing the reporting process and enforcing accountability through structured workflows, SLA tracking, and escalation paths.

### Intended Users
- **Citizens:** Report issues, track status, and verify resolutions.
- **Government Officers:** Field officers, technical supervisors, and department heads who process and resolve reports.
- **Administrators:** Oversee system configuration, manage user roles, and monitor county-wide performance.

## ✨ Key Features

### For Citizens
- **Secure Reporting:** Submit detailed reports with category, priority, and location.
- **Anonymous Submission:** Option to report issues without revealing identity.
- **Status Tracking:** Real-time visibility into the progress of submitted reports.
- **Resolution Verification:** Ability to provide feedback and verify if a reported issue was actually resolved.

### For Government
- **Structured Workflow:** Reports move through a defined lifecycle from `SUBMITTED` → `UNDER_REVIEW` → `ASSIGNED` → `RESOLVED`.
- **Automated Routing:** Intelligent assignment of reports to the correct department and officer based on category and location.
- **Escalation Management:** Built-in mechanism to escalate stagnant reports to higher authorities.
- **Field Inspections:** Tools for officers to document findings and actions taken during on-site visits.
- **Audit Trails:** Complete history of status changes and actor logs for every report.

### For Administration
- **User & Role Management:** Granular control over 20+ specialized roles (e.g., `CECM`, `WARD_ADMIN`, `TECHNICAL_HEAD`).
- **Organizational Mapping:** Management of Counties, Sub-Counties, Wards, and Departments.
- **SLA Policy Configuration:** Define target resolution hours and automated escalation targets.
- **System Monitoring:** Dashboards for tracking resolution progress and operational bottlenecks.

## 🏗 Application Architecture

The system follows a decoupled architecture:

- **Backend:** A Node.js/Express REST API handling business logic, authentication, and data persistence.
- **Database:** PostgreSQL managed via Prisma ORM.
- **Frontends:** Three specialized Next.js applications:
    - **Citizen Frontend:** Public-facing portal for reporting and tracking.
    - **Government Frontend:** Portal for officers to manage assignments and updates.
    - **Admin Dashboard:** High-level management interface for system configuration.

### Technology Stack
- **Backend:** Node.js, Express, Prisma ORM, PostgreSQL
- **Frontend:** Next.js (React), Tailwind CSS
- **Authentication:** JWT (JSON Web Tokens) with access and refresh token rotation
- **Validation:** Zod
- **Security:** Helmet, CORS, express-rate-limit

## 📂 Repository Structure

```text
.
├── admin-dashboard/      # Next.js app for system administrators
├── backend/              # Node.js/Express API & Prisma schema
│   ├── controllers/     # Request handlers
│   ├── repositories/     # Data access layer
│   ├── services/         # Business logic (Routing, SLA, Workflow)
│   ├── routes/           # API endpoints
│   ├── prisma/           # Database schema and seeds
│   └── tests/            # Integration tests
├── citizen-frontend/      # Next.js app for citizens
├── government-frontend/   # Next.js app for government officers
└── docs/                 # Technical and planning documentation
```

## 🛠 Setup & Installation

### Prerequisites
- **Node.js:** v18.x or newer
- **PostgreSQL:** v14.x or newer
- **npm:** v9.x or newer

### 1. Backend Setup
```bash
cd backend
npm install
```

**Environment Configuration:**
Create a `.env` file in the `backend/` directory based on `.env.example`:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:password@localhost:5432/community_reporting?schema=public"
JWT_SECRET=your_access_token_secret
JWT_REFRESH_SECRET=your_refresh_token_secret
CLIENT_URL=http://localhost:3000
```

**Database Initialization:**
```bash
npx prisma db push
npm run db:seed
```

**Start Backend:**
```bash
npm run dev
```

### 2. Frontend Setup
Each frontend (Admin, Citizen, Government) follows the same setup pattern:

```bash
cd <frontend-directory>
npm install
npm run dev
```

- **Citizen Frontend:** `http://localhost:3000` (default)
- **Admin Dashboard:** `http://localhost:3001` (configure port in package.json or env)
- **Government Frontend:** `http://localhost:3002` (configure port in package.json or env)

## 🧪 Testing & Quality Assurance

The backend includes a suite of integration tests to verify core functionality.

**Run all tests:**
```bash
cd backend
npm test
```

**Run specific test groups:**
- Auth: `npm run test:auth`
- Reports: `npm run test:reports`
- Monitoring: `npm run test:monitoring`

## 🔒 Security & Privacy

- **Authorization:** Role-Based Access Control (RBAC) ensures users only access data permitted by their role.
- **Authentication:** Secure password hashing using `bcryptjs` and stateful session management via JWT.
- **Data Integrity:** Input validation using Zod on all API endpoints.
- **Privacy:** Anonymous reporting mode allows citizens to submit issues without storing personal identifiers.

## ⚠️ Project Status & Limitations

- **Current State:** Core reporting and resolution workflows are implemented and verified.
- **Known Limitations:**
    - Email notifications via Resend are optional and require API key configuration.
    - Deployment scripts are not yet fully automated for production environments.
    - Frontend-to-Backend proxy configurations (`proxy.js`) may require local adjustment depending on the environment.
