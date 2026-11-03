# MTAA FIX — GOVERNMENT PORTAL ROLE & DASHBOARD IMPLEMENTATION AUDIT (Part 3)

## 3. FRONTEND IMPLEMENTATION AUDIT

### 3.1 Component sharing between roles
- Single shared page: `government-frontend/app/government/page.tsx` (~2144 lines) used by ALL 13 government roles.
- Workspaces defined inline in page.tsx (not separate files): InspectionsWorkspace (line 1208), WorkUpdatesWorkspace (1446), ResolutionsWorkspace (1665), FollowUpsWorkspace (1928).
- Shared UI components imported from `government-frontend/components/index.ts`: BrandLogo, StatusBadge, StatCard, EmptyState, LoadingState, ErrorState, FormField, GovernmentProfilePill.
- Map: GovernmentMapLoader, GovernmentMap (also duplicated in admin-dashboard/components/).

### 3.2 Role-specific components
None as separate components. Role-specific behavior is achieved entirely through conditional rendering inside the single page.tsx:
- `MENU_BY_ROLE` controls sidebar items per role.
- `DEFAULT_PAGE_BY_ROLE` controls default tab.
- `WELCOME_BY_ROLE` controls heading/subtitle.
- `CAN_CHANGE_STATUS` controls status dropdown editability.
- `scope` controls overview label/level.

### 3.3 Same dashboard with conditional headings
YES. All 13 government roles use the identical page.tsx with conditional headings via WELCOME_BY_ROLE and scope-based overview text. No role-specific dashboard pages exist.

### 3.4 Dynamic sidebar navigation
YES, dynamically generated. `menuItems` useMemo (lines 453-466) maps MENU_BY_ROLE[user?.role] to icon + name. Icon map supports: Dashboard, Reports, Users, Statistics, "Audit Logs", Settings — but only Dashboard/Reports/Statistics/Departments/GIS Map/Inspections/Work Updates/Resolutions/Follow-ups are actually assigned to roles. "Users", "Audit Logs", "Settings" icons exist in map but are never assigned to any government role's menu.

### 3.5 Dashboard metrics change by role
NO. Metrics (`stats`, lines 498-513) are identical for every role: Total Reports, Open, Overdue, Resolved. Computed client-side from the backend-scoped report list. No role-specific metrics (e.g., assigned-to-me count for field officers, overdue-by-ward for ward admins) despite `getDashboardOverview` backend computing `assignedToMe` for field roles (this backend-computed field is never consumed by the frontend).

### 3.6 Unused or incomplete dashboard components
- InspectionsWorkspace, WorkUpdatesWorkspace, ResolutionsWorkspace, FollowUpsWorkspace are defined but only reachable if the role's MENU_BY_ROLE includes the corresponding item. TECHNICAL_HEAD and CHIEF_OFFICER lack Resolutions in their menu even though ResolutionsWorkspace's isSupervisor list includes them.
- `ResolutionsWorkspace` approve/reject UI exists but is unreachable for TECHNICAL_HEAD (not in menu).
- GovernmentMapLoader/GovernmentMap used for GIS Map tab.

### Admin-dashboard frontend
- `admin-dashboard/app/page.js` — main dashboard, shared for ADMIN/SUPER_ADMIN, no role differentiation.
- `/users` page — officer management (POST /api/officers). Backend `userController.js` and `userroutes.js` are EMPTY files; officer routes map to `officerController.js` instead, so this works but not via the "user" controller.
- `/reports`, `/statistics`, `/audit-logs`, `/settings` pages — all fetch backend without role differentiation. Settings saves to localStorage only.
- Admin `/reports` and `/statistics` and dashboard page fetch `/api/reports` **without sending an Authorization header** (relies on cookies only) — unlike government frontend which sends Bearer token.

## 4. BACKEND AND PERMISSIONS AUDIT

### 4.1 Backend role authorization
Route authorization is centralized via `authorizeRoles(...allowedRoles)` middleware applied per-route. Role groups defined in `backend/services/jurisdiction.js`:
- ADMIN_ROLES = {ADMIN, SUPER_ADMIN, GOVERNOR, CECM, CHIEF_OFFICER}
- WARD_SCOPED_ROLES = {OFFICER, FIELD_OFFICER, TECHNICAL_SUPERVISOR, WARD_ADMIN, SUBCOUNTY_ADMIN}
- DEPARTMENT_SCOPED_ROLES = {CHIEF_OFFICER, TECHNICAL_HEAD, CECM, DISASTER_MANAGER, ENFORCEMENT_OFFICER}
- STATUS_CHANGE_ROLES = {OFFICER, FIELD_OFFICER, TECHNICAL_SUPERVISOR, TECHNICAL_HEAD, CHIEF_OFFICER, CECM, GOVERNOR, ADMIN, SUPER_ADMIN, DISASTER_MANAGER, ENFORCEMENT_OFFICER}

### 4.2 API endpoints accessible per government role

| Endpoint | Auth | Roles |
|----------|------|-------|
| GET /api/dashboard/* | authenticate + authorizeRoles(dashboardRoles) | ADMIN_ROLES + WARD_SCOPED_ROLES + DEPARTMENT_SCOPED_ROLES (all 13 gov roles) |
| GET/POST /api/reports | authenticate | all authenticated |
| PATCH /api/reports/:id/status | authenticate + authorizeRoles(STATUS_CHANGE_ROLES) | all gov roles except WARD_ADMIN, SUBCOUNTY_ADMIN |
| GET/POST /api/inspections | authenticate | write: FIELD_OFFICER; read: all gov roles |
| GET/POST /api/work-updates | authenticate | write: FIELD_OFFICER; read: all gov roles |
| POST /api/resolutions | authenticate | write: FIELD_OFFICER + supervision roles |
| PATCH /api/resolutions/:id/approve|reject | authenticate | TECHNICAL_HEAD, CHIEF_OFFICER, CECM, GOVERNOR, ADMIN, SUPER_ADMIN |
| GET/POST /api/follow-ups | authenticate | write: STATUS_CHANGE_ROLES + WARD_ADMIN + SUBCOUNTY_ADMIN; read: all gov roles |
| GET /api/officers | authenticate + ADMIN/SUPER_ADMIN | ADMIN, SUPER_ADMIN only |
| GET /api/audit-logs | authenticate + ADMIN/SUPER_ADMIN | ADMIN, SUPER_ADMIN only |
| GET /api/escalations | authenticate | escalationReadRoles (all gov roles) |

### 4.3 Department-level restrictions
DEPARTMENT_SCOPED_ROLES (CHIEF_OFFICER, TECHNICAL_HEAD, CECM, DISASTER_MANAGER, ENFORCEMENT_OFFICER) — `scopeDashboardQuery` filters by departmentId. `canAccessReport` / `scopeReportQuery` enforce departmentId match for report-level access.

### 4.4 Ward-level restrictions
WARD_SCOPED_ROLES (OFFICER, FIELD_OFFICER, TECHNICAL_SUPERVISOR, WARD_ADMIN, SUBCOUNTY_ADMIN) — scope by wardId (and ward string name as fallback). FIELD_OFFICER further restricted to assignedOfficerId === user.id.

### 4.5 Sub-county restrictions
SUBCOUNTY_ADMIN — scopeDashboardQuery filters by subCountyId. canAccessReport checks subCounty match.

### 4.6 County-wide access
GOVERNOR, ADMIN, SUPER_ADMIN — no scope (county-wide/system-wide).

### 4.7 Assignment restrictions
Assignment write (POST /api/assignments, PUT reassign) — STATUS_CHANGE_ROLES. Read — all gov roles. No ward/department scoping on the assignment endpoints themselves (relies on report-level canAccessReport).

### 4.8 Frontend vs backend discrepancies
- Frontend CAN_CHANGE_STATUS list matches backend STATUS_CHANGE_ROLES exactly (both exclude WARD_ADMIN, SUBCOUNTY_ADMIN). ✓ Consistent.
- Frontend ResolutionsWorkspace isSupervisor list = {TECHNICAL_SUPERVISOR, TECHNICAL_HEAD, CHIEF_OFFICER}; backend resolutionApproveRoles = {TECHNICAL_HEAD, CHIEF_OFFICER, CECM, GOVERNOR, ADMIN, SUPER_ADMIN}. Mismatch: TECHNICAL_SUPERVISOR can see the approve/reject UI in ResolutionsWorkspace IF it reached that page, but backend does NOT authorize TECHNICAL_SUPERVISOR for approve/reject. However TECHNICAL_SUPERVISOR has no route to Resolutions page anyway.
- Admin dashboard `/reports` fetch sends NO Authorization header (cookies only). Backend `getReports` requires authenticate middleware — would fail without cookie. Inconsistent with government frontend which sends Bearer token explicitly.
- `userController.js` and `userroutes.js` are EMPTY (0 lines), yet admin-dashboard `/users` page calls `/api/officers` which is handled by `officerController.js`. Functionally works but architecturally mislabeled.
- Backend `getDashboardEscalations` calls `db.findEscalatedReports()` with NO jurisdiction scoping — escalations visible to all dashboard roles regardless of scope. Contradicts `scopeDashboardQuery` pattern used by other dashboard endpoints.

## 5. PROBLEMS IDENTIFIED

1. **All 13 government roles receive an identical dashboard shell.** Only heading, sidebar items, and default tab differ. Metrics are hardcoded identically.
2. **Roles share inappropriate navigation.** WARD_ADMIN and SUBCOUNTY_ADMIN have identical sidebars (Dashboard, Reports, Follow-ups) despite different geographic scope (ward vs sub-county).
3. **Missing role-specific functionality.** No governor county-wide KPIs, no CECM portfolio oversight, no chief officer workload/SLA, no technical head work queue, no disaster/emergency views, no enforcement views.
4. **Inaccessible backend functionality.** Resolutions approve/reject exists in backend for TECHNICAL_HEAD/CHIEF_OFFICER/CECM/GOVERNOR but the government-frontend sidebar does not route to Resolutions for TECHNICAL_HEAD/CHIEF_OFFICER.
5. **Hardcoded metrics.** Total/Open/Overdue/Resolved identical for every role; no role-specific KPIs.
6. **Missing backend integrations.** Evidence upload (mediaUrls) hardcoded to empty array in inspection/work update/resolution forms. Settings page (admin) saves to localStorage only.
7. **Incomplete dashboard sections.** Departments section shows department counts from unfiltered report list. Statistics section is generic.
8. **Backend/frontend discrepancy.** getDashboardEscalations unscoped; admin /reports fetch omits Authorization header; userController.js empty.
9. **ADMIN and SUPER_ADMIN functionally identical** in implementation despite design spec distinguishing them.
10. **OFFICER and DEPARTMENTAL_ADMIN and ADMIN have no seeded test accounts** — cannot be verified through dev-seed login flow.
