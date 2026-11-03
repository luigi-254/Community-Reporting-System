# MTAA FIX — GOVERNMENT PORTAL ROLE & DASHBOARD IMPLEMENTATION AUDIT (Part 2)

## 6. INDIVIDUAL ROLE REPORTS

Structure per role: 1. Login destination 2. Dashboard heading 3. Metrics 4. Sections 5. Sidebar 6. Actions 7. Backend API endpoints 8. Data scope 9. Shared components 10. Incomplete/broken 11. Status.

---

### ROLE: GOVERNOR
1. Login destination: `/government` (Government Portal). Same login page as all government roles.
2. Dashboard heading: "County Oversight — Kisii County" / subtitle: "County-wide service delivery performance, escalated cases, and department accountability." (WELCOME_BY_ROLE.GOVERNOR)
3. Metrics: Total Reports, Open, Overdue, Resolved (hardcoded, identical to all roles).
4. Sections: Overview (scope label "County-wide (Kisii)", level county), Action Required (top 5 reports), Recent Reports (top 5), Reports table, GIS Map, Departments, Statistics.
5. Sidebar: Dashboard, Reports, GIS Map, Departments, Statistics.
6. Actions: Change report status (in CAN_CHANGE_STATUS list). View report details. Export CSV. No field inspections/work updates/resolutions menu items.
7. Backend API endpoints: GET /api/dashboard/overview, /reports, /categories, /departments, /wards, /performance, /escalations; PATCH /api/reports/:id/status; GET /api/reports.
8. Data access scope: County-wide (all of Kisii). scopeDashboardQuery returns unscoped query for GOVERNOR.
9. Shared components: Entire page.tsx shared with all roles. GovernmentMapLoader for GIS.
10. Incomplete/broken: No unique dashboard content despite design spec calling for county-wide KPIs, sub-county comparisons, department performance, resolution trends, major escalations. Metrics identical to a Field Officer.
11. Status: PARTIAL — same shell, role-appropriate heading only; no role-specific metrics/content.

### ROLE: CECM
1. Login destination: `/government`.
2. Dashboard heading: "Portfolio Oversight" / "Department-level reports, SLA compliance, and executive accountability for your portfolio."
3. Metrics: Total, Open, Overdue, Resolved (hardcoded, identical).
4. Sections: Overview (department scope), Action Required, Recent Reports, Reports table, GIS Map, Departments, Statistics.
5. Sidebar: Dashboard, Reports, Departments, Statistics. (No GIS Map, no Inspections/Work Updates/Resolutions/Follow-ups.)
6. Actions: Change report status.
7. Backend API endpoints: same dashboard set; PATCH /api/reports/:id/status.
8. Data access scope: Department-scoped (departmentId = INFRA for seeded account). scopeDashboardQuery filters by departmentId.
9. Shared components: Entire page.tsx shared.
10. Incomplete/broken: No unique dashboard content (portfolio KPIs, departmental oversight, escalations per spec). Identical metrics to all roles.
11. Status: PARTIAL.

### ROLE: CHIEF_OFFICER
1. Login destination: `/government`.
2. Dashboard heading: "Department Management" / "Department report queues, officer assignments, overdue cases, and operational oversight."
3. Metrics: identical hardcoded set.
4. Sections: Overview (department scope), Action Required, Recent Reports, Reports table, GIS Map, Departments, Statistics.
5. Sidebar: Dashboard, Reports, Departments, Statistics.
6. Actions: Change report status.
7. Backend API endpoints: dashboard set; PATCH /api/reports/:id/status; escalation read/write roles.
8. Data access scope: Department-scoped.
9. Shared components: Entire page.tsx shared.
10. Incomplete/broken: No department workload/assignment/SLA-specific content despite spec. No officer management UI (that's in admin-dashboard /users, not reachable from this sidebar).
11. Status: PARTIAL.

### ROLE: TECHNICAL_HEAD
1. Login destination: `/government` (defaults to Dashboard page).
2. Dashboard heading: "Technical Operations" / "Technical assignments, quality assurance, resolution progress, and departmental technical oversight."
3. Metrics: identical hardcoded set.
4. Sections: Overview (department scope), Action Required, Recent Reports, Reports table, GIS Map, Departments, Statistics. (No Inspections/Work Updates/Resolutions in sidebar — those menu items are absent even though this role is in ResolutionsWorkspace's isSupervisor list.)
5. Sidebar: Dashboard, Reports, Departments.
6. Actions: Change report status. Review resolutions (only if navigating to Resolutions page — but Resolutions is NOT in TECHNICAL_HEAD's menu, so the approve/reject UI is unreachable for this role from the sidebar).
7. Backend API endpoints: dashboard set; PATCH /api/reports/:id/status; GET/PATCH /api/resolutions/:id/approve|reject (resolutionApproveRoles includes TECHNICAL_HEAD).
8. Data access scope: Department-scoped.
9. Shared components: Entire page.tsx shared.
10. Incomplete/broken: Resolutions approve/reject UI exists in code but TECHNICAL_HEAD has no sidebar route to reach it (MENU_BY_ROLE.TECHNICAL_HEAD = ["Dashboard","Reports","Departments"]). No technical work queue content per spec.
11. Status: PARTIAL (functionality exists but inaccessible via navigation).

### ROLE: TECHNICAL_SUPERVISOR
1. Login destination: `/government` (defaults to Inspections page per DEFAULT_PAGE_BY_ROLE).
2. Dashboard heading: "Field Team Supervision" / "Supervise field officers, review inspections, approve work updates, and manage technical assignments."
3. Metrics: identical hardcoded set.
4. Sections: Overview (ward scope), Action Required, Recent Reports, Reports table, GIS Map, Departments, Inspections, Work Updates. (No Resolutions, Statistics, Follow-ups in menu.)
5. Sidebar: Dashboard, Reports, Inspections, Work Updates.
6. Actions: Record inspections (isFieldOfficer false, but workspace shows inspections table for non-field officers). Work updates table. Change report status. Resolutions: isSupervisor true (TECHNICAL_SUPERVISOR in list) but Resolutions page NOT in menu — unreachable.
7. Backend API endpoints: dashboard set; GET/POST /api/inspections; GET/POST /api/work-updates; PATCH /api/reports/:id/status.
8. Data access scope: Ward + department scoped (scopeDashboardQuery filters by wardId for WARD_SCOPED_ROLES which includes TECHNICAL_SUPERVISOR).
9. Shared components: InspectionsWorkspace, WorkUpdatesWorkspace defined inline in page.tsx.
10. Incomplete/broken: Resolutions review UI unreachable (not in menu). No team assignments/workload content per spec.
11. Status: PARTIAL.

### ROLE: FIELD_OFFICER
1. Login destination: `/government` (defaults to Inspections page).
2. Dashboard heading: "Field Operations" / "Your assigned cases, inspections, evidence capture, work updates, and resolution submissions."
3. Metrics: identical hardcoded set.
4. Sections: Overview (ward scope), Action Required, Recent Reports, Reports table, GIS Map, Departments, Inspections (create form), Work Updates (create form), Resolutions (submit form).
5. Sidebar: Dashboard, Reports, Inspections, Work Updates, Resolutions.
6. Actions: Record inspection (only for assigned reports), Add work update (only for assigned reports), Submit resolution (only for resolved assigned reports), Change report status.
7. Backend API endpoints: dashboard set; POST /api/inspections; POST /api/work-updates; POST /api/resolutions; PATCH /api/reports/:id/status.
8. Data access scope: Personally assigned reports only (scopeDashboardQuery filters by wardId; FIELD_OFFICER is in WARD_SCOPED_ROLES). InspectionsWorkspace filters fieldOfficerReports by assignedOfficerId === user.id.
9. Shared components: Entire page.tsx shared.
10. Incomplete/broken: Evidence upload form field exists (mediaUrls) but hardcoded to empty array — no actual file upload in the inspection/work update/resolution forms.
11. Status: PARTIAL.

### ROLE: WARD_ADMIN
1. Login destination: `/government`.
2. Dashboard heading: "Ward Administration" / "Reports and follow-ups within your ward jurisdiction, local service delivery monitoring, and escalations."
3. Metrics: identical hardcoded set.
4. Sections: Overview (ward scope), Action Required, Recent Reports, Reports table, GIS Map, Departments, Follow-ups.
5. Sidebar: Dashboard, Reports, Follow-ups.
6. Actions: Add follow-up (isGeoRole true), view follow-ups. No status change (NOT in CAN_CHANGE_STATUS).
7. Backend API endpoints: dashboard set; GET/POST /api/follow-ups.
8. Data access scope: Ward-scoped (scopeDashboardQuery filters by wardId). FollowUpsWorkspace shows all jurisdictional reports (reports array, unfiltered by ward in the frontend — relies on backend scoping).
9. Shared components: Entire page.tsx shared; FollowUpsWorkspace inline.
10. Incomplete/broken: No unique ward-specific metrics. Follow-ups UI present but no ward comparison or hotspot content per spec.
11. Status: PARTIAL.

### ROLE: SUBCOUNTY_ADMIN
1. Login destination: `/government`.
2. Dashboard heading: "Sub-County Administration" / "Reports and escalations across wards in your sub-county, local follow-up, and administrative oversight."
3. Metrics: identical hardcoded set.
4. Sections: Overview (subcounty scope), Action Required, Recent Reports, Reports table, GIS Map, Departments, Follow-ups.
5. Sidebar: Dashboard, Reports, Follow-ups. (Same as WARD_ADMIN.)
6. Actions: Add follow-up. No status change.
7. Backend API endpoints: dashboard set; GET/POST /api/follow-ups.
8. Data access scope: Sub-county-scoped (scopeDashboardQuery filters by subCountyId).
9. Shared components: Entire page.tsx shared; sidebar identical to WARD_ADMIN.
10. Incomplete/broken: Sidebar identical to WARD_ADMIN — no sub-county-specific items (ward comparisons). No unique metrics.
11. Status: PARTIAL.

### ROLE: DISASTER_MANAGER
1. Login destination: `/government`.
2. Dashboard heading: "Disaster Management" / "Hazard reports, emergency incidents, disaster response coordination, and escalation oversight."
3. Metrics: identical hardcoded set.
4. Sections: Overview (department scope), Action Required, Recent Reports, Reports table, GIS Map, Departments, Statistics.
5. Sidebar: Dashboard, Reports, Departments. (Same as CECM/CHIEF_OFFICER/TECHNICAL_HEAD.)
6. Actions: Change report status.
7. Backend API endpoints: dashboard set; PATCH /api/reports/:id/status.
8. Data access scope: Department-scoped (DISASTER dept).
9. Shared components: Entire page.tsx shared.
10. Incomplete/broken: No disaster/emergency-specific content per spec. Identical to CECM shell.
11. Status: PARTIAL.

### ROLE: ENFORCEMENT_OFFICER
1. Login destination: `/government`.
2. Dashboard heading: "Enforcement Operations" / "Enforcement cases, compliance violations, and enforcement actions within your department."
3. Metrics: identical hardcoded set.
4. Sections: Overview (department scope), Action Required, Recent Reports, Reports table, GIS Map, Departments, Statistics.
5. Sidebar: Dashboard, Reports, Departments.
6. Actions: Change report status.
7. Backend API endpoints: dashboard set; PATCH /api/reports/:id/status.
8. Data access scope: Department-scoped (ENFORCEMENT dept).
9. Shared components: Entire page.tsx shared.
10. Incomplete/broken: No enforcement-specific content per spec.
11. Status: PARTIAL.

### ROLE: OFFICER
1. Login destination: `/government`.
2. Dashboard heading: "Government Officer" / "Assigned reports and operational tasks within your jurisdiction."
3. Metrics: identical hardcoded set.
4. Sections: Overview (ward scope), Action Required, Recent Reports, Reports table, GIS Map. (No Departments, Statistics, Inspections, Work Updates, Resolutions, Follow-ups in menu.)
5. Sidebar: Dashboard, Reports. (Minimal.)
6. Actions: Change report status.
7. Backend API endpoints: dashboard set; PATCH /api/reports/:id/status.
8. Data access scope: Ward-scoped (WARD_SCOPED_ROLES).
9. Shared components: Entire page.tsx shared.
10. Incomplete/broken: No inspections/work updates/resolutions despite being an operational role.
11. Status: PARTIAL.

### ROLE: DEPARTMENTAL_ADMIN
1. Login destination: `/government`.
2. Dashboard heading: "Department Administration" / "Department records, officer management, categories, and administrative oversight."
3. Metrics: identical hardcoded set.
4. Sections: Overview (department scope), Action Required, Recent Reports, Reports table, GIS Map, Departments, Statistics.
5. Sidebar: Dashboard, Reports, Departments, Statistics.
6. Actions: Change report status. No user management UI reachable from this sidebar (the /users page lives in admin-dashboard, a separate app).
7. Backend API endpoints: dashboard set; PATCH /api/reports/:id/status.
8. Data access scope: Department-scoped.
9. Shared components: Entire page.tsx shared.
10. Incomplete/broken: No officer/category management UI reachable from government frontend. Identical to CECM/CHIEF_OFFICER shell.
11. Status: PARTIAL.

### ROLE: ADMIN (Platform Admin Dashboard — separate app)
1. Login destination: `/users` (admin-dashboard, port 3001). Login page restricts to ADMIN/SUPER_ADMIN.
2. Dashboard heading: ActivePage variable (e.g., "Dashboard", "Reports", "Users", etc.). No role-specific heading.
3. Metrics: Total Reports, Pending, In Progress, Resolved (admin-dashboard/app/page.js statCards).
4. Sections: stat cards, resolution progress, reports by category, recent reports table, system health.
5. Sidebar: Dashboard, Reports, Users, Statistics, Audit Logs, Settings.
6. Actions: Create officer account (/users page, POST /api/officers), view reports (/reports), view statistics, view audit logs, settings (localStorage only, no backend), system health check.
7. Backend API endpoints: GET /api/reports (no auth header sent!), GET /api/officers (auth required, ADMIN/SUPER_ADMIN only), GET /api/audit-logs, GET /health. Notably /api/reports call in admin page.js sends NO Authorization header (lines 211-221) — relies on cookies only.
8. Data access scope: System-wide. No scoping applied by admin frontend.
9. Shared components: BrandLogo, AdminProfilePill, GovernmentMapLoader, GovernmentMap (in admin-dashboard/components).
10. Incomplete/broken: /users page creates officers but backend userController.js and userroutes.js are EMPTY (0 lines) — the /api/officers route exists in officerroutes.js and maps to officerController.js, so this works via officer controller, not user controller. Settings page saves to localStorage only. Audit logs page calls /api/audit-logs (ADMIN/SUPER_ADMIN only route exists).
11. Status: PARTIAL — UI present, some backend gaps (empty userController.js).

### ROLE: SUPER_ADMIN
Same as ADMIN for the admin-dashboard. Backend routes authorize ADMIN + SUPER_ADMIN together everywhere. No functional distinction between ADMIN and SUPER_ADMIN in implementation despite design spec distinguishing them (SUPER_ADMIN = system-wide/user mgmt; ADMIN = departmental).
