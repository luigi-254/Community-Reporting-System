# MTAA FIX — GOVERNMENT PORTAL ROLE & DASHBOARD IMPLEMENTATION AUDIT (Part 1)

## Scope & Method
Read-only investigation. No code modified, no DB records changed, no features added/removed. Based on source code inspection of backend/prisma, backend/services, backend/routes, backend/controllers, government-frontend, admin-dashboard, and docs/mtaa-fix-planning.

## 1. ALL EXISTING GOVERNMENT ROLES (as implemented)
Source: backend/prisma/schema.prisma lines 13-29; backend/prisma/dev-seed.js lines 46-182.

14 total roles including CITIZEN => 13 government roles:
| # | Role | Seeded account | Jurisdiction |
|---|------|---------------|--------------|
| 1 | GOVERNOR | governor.kisii@example.com | County-wide Kisii |
| 2 | CECM | cecm.infrastructure@example.com | Dept INFRA |
| 3 | CHIEF_OFFICER | chief.officer.infra@example.com | Dept INFRA |
| 4 | TECHNICAL_HEAD | tech.head.infra@example.com | Dept INFRA |
| 5 | TECHNICAL_SUPERVISOR | tech.supervisor.infra@example.com | Dept INFRA, Ward Bassi Central |
| 6 | SUBCOUNTY_ADMIN | subcounty.admin.bobasi@example.com | Sub-County Bobasi |
| 7 | WARD_ADMIN | ward.admin.bassicentral@example.com | Ward Bassi Central |
| 8 | FIELD_OFFICER | field.officer.1@example.com | Dept INFRA, Ward Bassi Central |
| 9 | DISASTER_MANAGER | disaster.manager@example.com | Dept DISASTER |
| 10 | ENFORCEMENT_OFFICER | enforcement.officer@example.com | Dept ENFORCEMENT |
| 11 | OFFICER | (not seeded) | None |
| 12 | DEPARTMENTAL_ADMIN | (not seeded) | None |
| 13 | ADMIN | (not seeded) | None |
| 14 | SUPER_ADMIN | admin.platform@example.com | System-wide |

Roles defined but NOT seeded: OFFICER, DEPARTMENTAL_ADMIN, ADMIN.

## 2. LOGIN EXPERIENCE & ROLE REDIRECTION
Government Portal (government-frontend/app/login/page.tsx):
- POSTs to /api/auth/login.
- Allow-list of government roles enforced (lines 63-83). CITIZEN explicitly rejected.
- On success: stores crs_government_access_token, redirects to /government.
- All government roles share same login page and same /government destination. No per-role landing.

Platform Admin (admin-dashboard/app/login/page.js): only ADMIN/SUPER_ADMIN. Redirects to /users.

## 3. DASHBOARD ARCHITECTURE — SINGLE SHARED PAGE
One dashboard route: government-frontend/app/government/page.tsx (~2144 lines). Every government role renders this identical page.
Differentiation inside: MENU_BY_ROLE, DEFAULT_PAGE_BY_ROLE, WELCOME_BY_ROLE, CAN_CHANGE_STATUS, scope. Metrics (stats) are hardcoded identically: Total Reports, Open, Overdue, Resolved.

## 4. ROLE COMPARISON MATRIX
| Role | Dashboard Exists | Unique Dashboard | Unique Sidebar | Unique Metrics | Functional Actions | Backend Scoped |
| GOVERNOR | YES | NO | YES | NO | View all, change status | PARTIAL |
| CECM | YES | NO | YES | NO | View dept, change status | PARTIAL |
| CHIEF_OFFICER | YES | NO | YES | NO | View dept, change status | PARTIAL |
| TECHNICAL_HEAD | YES | NO | YES | NO | View dept, change status | PARTIAL |
| TECHNICAL_SUPERVISOR | YES | NO | YES | NO | Inspections, work updates, change status | PARTIAL |
| FIELD_OFFICER | YES | NO | YES | NO | Inspections, work updates, resolutions, change status | PARTIAL |
| WARD_ADMIN | YES | NO | YES | NO | Follow-ups only | PARTIAL |
| SUBCOUNTY_ADMIN | YES | NO | YES | NO | Follow-ups only | PARTIAL |
| DISASTER_MANAGER | YES | NO | YES | NO | View dept, change status | PARTIAL |
| ENFORCEMENT_OFFICER | YES | NO | YES | NO | View dept, change status | PARTIAL |
| OFFICER | YES | NO | YES | NO | Change status | PARTIAL |
| DEPARTMENTAL_ADMIN | YES | NO | YES | NO | View dept, change status | PARTIAL |
| ADMIN | YES | NO | NO | NO | User mgmt via /users | YES |
| SUPER_ADMIN | YES | NO | NO | NO | User mgmt via /users | YES |

*Backend dashboard endpoints authorized by role group but escalations endpoint (getDashboardEscalations) is NOT jurisdiction-scoped. Metrics identical for all roles.
