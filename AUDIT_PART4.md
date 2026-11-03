# MTAA FIX — GOVERNMENT PORTAL ROLE & DASHBOARD IMPLEMENTATION AUDIT (Part 4)

## 9. FILE PATHS SUPPORTING FINDINGS

### Backend — roles & authorization
- `backend/prisma/schema.prisma:13-29` — Role enum (14 roles: CITIZEN + 13 government)
- `backend/prisma/schema.prisma:117-171` — User model (role, countyId, subCountyId, wardId, departmentId)
- `backend/prisma/dev-seed.js:46-182` — Seeded test accounts (source of truth for existing roles)
- `backend/services/jurisdiction.js` — ADMIN_ROLES, WARD_SCOPED_ROLES, DEPARTMENT_SCOPED_ROLES, STATUS_CHANGE_ROLES; canAccessReport, scopeReportQuery, scopeDashboardQuery, canPerformTransition
- `backend/middlewares/roleMiddlewares.js` — authorizeRoles middleware
- `backend/middlewares/authMiddleware.js` — authenticate/protect

### Backend — routes & authorization per endpoint
- `backend/routes/dashboardroutes.js:12-13` — dashboard routes authorized for dashboardRoles (all 13 gov roles)
- `backend/routes/reportroutes.js:97-103` — PATCH /:id/status authorized via STATUS_CHANGE_ROLES
- `backend/routes/fieldInspectionRoutes.js:16-17` — inspections write: FIELD_OFFICER only
- `backend/routes/workUpdateRoutes.js:14-15` — work updates write: FIELD_OFFICER only
- `backend/routes/resolutionRoutes.js:14-18` — resolutions write/approve roles
- `backend/routes/reportFollowUpRoutes.js:12-13` — follow-ups write includes WARD_ADMIN/SUBCOUNTY_ADMIN
- `backend/routes/officerroutes.js:20` — officer CRUD: ADMIN/SUPER_ADMIN only
- `backend/routes/auditlogroutes.js:9` — audit logs: ADMIN/SUPER_ADMIN only
- `backend/routes/escalationroutes.js:10-11` — escalation read/write roles

### Backend — controllers
- `backend/controllers/dashboardController.js:14-18` — getScopedReports applies scopeDashboardQuery
- `backend/controllers/dashboardController.js:183-192` — getDashboardEscalations NOT jurisdiction-scoped (gap)
- `backend/controllers/authController.js` — login/register (registration forces CITIZEN role)
- `backend/controllers/reportController.js:228,262,473,775` — canAccessReport / scopeReportQuery usage
- `backend/controllers/userController.js` — EMPTY (0 lines)
- `backend/routes/userroutes.js` — EMPTY (0 lines)

### Frontend — government portal
- `government-frontend/app/page.js` — redirects to /government
- `government-frontend/app/government/page.tsx` — SINGLE shared dashboard for all 13 gov roles (~2144 lines)
  - MENU_BY_ROLE:306-321, DEFAULT_PAGE_BY_ROLE:325-340, WELCOME_BY_ROLE:342-399, CAN_CHANGE_STATUS:401-413, scope:432-451, stats:498-513
  - InspectionsWorkspace:1208, WorkUpdatesWorkspace:1446, ResolutionsWorkspace:1665, FollowUpsWorkspace:1928
- `government-frontend/app/login/page.tsx` — government login with role allow-list (lines 63-83), redirect to /government
- `government-frontend/lib/auth-context.js` — AuthProvider
- `government-frontend/lib/api.js` — apiFetch with crs_government_access_token
- `government-frontend/proxy.js` — protects /government routes
- `government-frontend/components/` — BrandLogo, StatusBadge, StatCard, EmptyState, LoadingState, ErrorState, FormField, GovernmentProfilePill, GovernmentMapLoader, GovernmentMap, GovernmentAuthNav

### Frontend — admin dashboard (separate app)
- `admin-dashboard/app/page.js` — admin dashboard, shared ADMIN/SUPER_ADMIN
- `admin-dashboard/app/login/page.js` — admin login, ADMIN/SUPER_ADMIN only, redirect to /users
- `admin-dashboard/app/users/page.js` — officer management, POST /api/officers
- `admin-dashboard/app/reports/page.js` — reports, fetch omits Authorization header
- `admin-dashboard/app/statistics/page.js` — statistics
- `admin-dashboard/app/audit-logs/page.js` — audit logs
- `admin-dashboard/app/settings/page.js` — settings (localStorage only)
- `admin-dashboard/components/` — BrandLogo, AdminProfilePill, GovernmentMapLoader, GovernmentMap

### Documentation (intended vs implemented)
- `docs/mtaa-fix-planning/01-prd.md` — PRD, 14 roles, dashboard requirements
- `docs/mtaa-fix-planning/07-role-permission-matrix.md` — role matrix, documents gaps (dashboard APIs not scoped, generic dashboard)

---

## FINAL CONSOLIDATED DELIVERABLE

### MTAA FIX — GOVERNMENT PORTAL ROLE & DASHBOARD IMPLEMENTATION AUDIT

#### All existing roles (13 government roles)
GOVERNOR, CECM, CHIEF_OFFICER, TECHNICAL_HEAD, TECHNICAL_SUPERVISOR, SUBCOUNTY_ADMIN, WARD_ADMIN, FIELD_OFFICER, DISASTER_MANAGER, ENFORCEMENT_OFFICER, OFFICER, DEPARTMENTAL_ADMIN, ADMIN, SUPER_ADMIN (plus CITIZEN, out of scope). OFFICER, DEPARTMENTAL_ADMIN, ADMIN have no seeded test accounts.

#### Dashboard architecture
One shared page (`government-frontend/app/government/page.tsx`) for all 13 government roles. Role differentiation limited to: heading (WELCOME_BY_ROLE), sidebar items (MENU_BY_ROLE), default tab (DEFAULT_PAGE_BY_ROLE), status-edit permission (CAN_CHANGE_STATUS), overview scope label (scope). Metrics hardcoded identically (Total/Open/Overdue/Resolved).

#### Role comparison matrix (summary)
All 13 gov roles: Dashboard Exists=YES, Unique Dashboard=NO, Unique Sidebar=YES (menu only), Unique Metrics=NO, Functional Actions=PARTIAL (limited by role), Backend Scoped=PARTIAL. ADMIN/SUPER_ADMIN use separate admin-dashboard app with Unique Dashboard=NO but distinct sidebar including Users/Audit Logs/Settings.

#### Key problems
1. All 13 government roles share an identical dashboard shell — no role-specific content.
2. WARD_ADMIN and SUBCOUNTY_ADMIN have identical sidebars despite different geographic scope.
3. Backend functionality exists but is unreachable via frontend navigation (e.g., Resolutions approve/reject for TECHNICAL_HEAD).
4. Hardcoded, identical metrics for every role.
5. Evidence upload hardcoded to empty array; no file upload in inspection/work update/resolution forms.
6. getDashboardEscalations not jurisdiction-scoped on backend.
7. Admin dashboard /reports fetch omits Authorization header.
8. userController.js / userroutes.js empty; officer management routed through officerController.
9. ADMIN and SUPER_ADMIN functionally identical.
10. OFFICER, DEPARTMENTAL_ADMIN, ADMIN lack seeded test accounts.

Status: All government dashboard implementations are PARTIAL. No role has a fully unique, fully scoped, fully functional dashboard per the design specification.
