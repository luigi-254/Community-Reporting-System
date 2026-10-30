# 07 — Role-Permission Matrix & Dashboard Specification

**Project:** MTAA Fix — Kisii County Community Reporting & Accountability System  
**Status:** Design — approved for implementation  
**Principle:** ONE shared Government Dashboard application with role-based content. No separate dashboard applications per government position.

---

## 1. Three Application Experiences (Preserved)

| Experience | Audience | Location |
|------------|----------|----------|
| Citizen Dashboard | Citizens | `citizen-frontend/` |
| Government Dashboard (ONE shared app) | All 13 government roles | `government-frontend/` |
| Platform Admin Dashboard | Platform Super Admin | `admin-dashboard/` |

---

## 2. Role-Permission Matrix

All scope is enforced **server-side** via authenticated backend identity (`req.user`), not frontend role checks alone. Jurisdiction helpers already exist in `backend/services/jurisdiction.js`: `canAccessReport`, `scopeReportQuery`, `canChangeStatus`, `canPerformTransition`.

| # | Role | Dashboard Information | Geographical / Dept Scope | Permitted Actions | Restricted Actions | Workflow Responsibility |
|---|------|----------------------|---------------------------|-------------------|-------------------|------------------------|
| 1 | **GOVERNOR** | County-wide performance; sub-county comparisons; department performance; resolution trends; major escalations; executive oversight; critical escalations; recent county-wide activity | All of Kisii County (countyId = Kisii) | View county-wide reports; monitor department performance; review escalated matters; request progress reports; record executive directives (where authorised) | Cannot personally assign routine fieldwork; cannot change technical resolution outcomes; cannot access records outside Kisii | County performance oversight; executive escalation |
| 2 | **CECM** | Portfolio-level performance; departmental oversight; outstanding matters; escalation monitoring; departmental trends; workload | Assigned department(s) only | Review departmental performance; monitor Chief Officers; review escalated issues; request departmental updates; record portfolio-level directives | Cannot see other departments' operational records if portfolio restricted; cannot do fieldwork | Portfolio oversight; escalation monitoring |
| 3 | **CHIEF_OFFICER** | Departmental workload; report assignments; technical heads; outstanding cases; SLA compliance; departmental performance | Assigned department (departmentId) | Assign/reassign reports where authorised; monitor technical heads; approve departmental actions; escalate unresolved issues; monitor departmental SLAs | Cannot access reports outside own department | Department management; SLA compliance |
| 4 | **TECHNICAL_HEAD** | Technical work queue; inspections; supervisors; field teams; work progress; evidence; resolution submissions | Authorised technical department/team | Review technical assignments; allocate work to supervisors/teams; review inspection findings; monitor technical progress; review submitted resolutions; return incomplete work for correction | Cannot do fieldwork personally; cannot access other departments' technical work | Technical coordination; resolution approval |
| 5 | **TECHNICAL_SUPERVISOR** | Team assignments; field officer workload; inspections; delayed work; evidence reviews; technical progress; SLA deadlines | Assigned team and supervised officers | Assign work to field officers; review inspections; monitor field progress; request additional evidence; verify completed work; submit/recommend technical resolutions (per permissions) | Cannot close reports (`CLOSED`); cannot access other teams | Team supervision; inspection review |
| 6 | **SUBCOUNTY_ADMIN** | Assigned sub-county performance; ward comparisons; Ward Administrators; administrative follow-ups; escalations; local problem hotspots | Assigned sub-county (subCountyId) | Monitor Ward Administrators; follow up on unresolved complaints; request updates from ward officials; escalate administrative issues; monitor ward-level performance | Cannot access other sub-counties; cannot change technical resolution outcomes | Administrative follow-up chain (sub-county level) |
| 7 | **WARD_ADMIN** | Assigned ward complaints; citizen concerns; follow-ups; local unresolved issues; technical progress monitoring; ward complaint register | Assigned ward (wardId) | Review new complaints; monitor technical resolution progress; follow up with relevant departments; record administrative follow-up notes; escalate unresolved matters to Sub-County Administrator | Cannot access other wards; cannot change technical resolution outcomes without relevant permission | Administrative follow-up chain (ward level) |
| 8 | **FIELD_OFFICER** | Personally assigned cases; work queue; case location and map; complaint details; citizen-provided evidence; inspection checklist; work update history; resolution submission | Assigned cases only (assignedOfficerId = user.id) | Accept/acknowledge assignments; view case locations; record inspection findings; upload photographs and evidence; submit work updates; report obstacles; submit work for supervisor review | Cannot access unassigned reports; cannot change technical resolution outcomes; cannot access other officers' cases | Field inspection and execution |
| 9 | **CITIZEN** | My submitted reports; report submission; report status and progress; resolution updates; requests for additional information; notifications; report history; profile and account settings | Own reports only (reporterId = user.id) | Submit reports; track status; verify/reject proposed resolution with feedback; view notifications; manage profile | Cannot access other citizens' reports; cannot perform government actions | Report submission; citizen verification |
| 10 | **SUPER_ADMIN** | Total registered users; citizen accounts; government accounts; user activity; account status; role and permission management; county configuration; departments and geographical configuration; system health; audit logs; authentication and security events | System-wide | User & role management; organisational mapping; SLA policy configuration; system monitoring; audit logs | Cannot perform county operational work (that is the Governor's role) | Platform administration |
| 11 | **ADMIN** | Departmental configuration; users within department; department reports | Assigned department | Departmental user management; department configuration | Cannot perform county-wide oversight | Departmental administration |
| 12 | **OFFICER** | Assigned reports; work queue | Assigned cases/department | Status changes on assigned reports; inspections; work updates | Cannot access reports outside scope | General operational support |
| 13 | **DISASTER_MANAGER** | Hazard and emergency cases; disaster-related reports | County-wide for Disaster Management department | Manage disaster/emergency cases; escalate | Cannot access non-disaster operational records | Disaster management |
| 14 | **ENFORCEMENT_OFFICER** | Enforcement-related cases | County-wide for Enforcement department | Manage enforcement cases | Cannot access non-enforcement records | County enforcement |

### Permission enforcement notes (already partially implemented)
- `canAccessReport(user, report)` — GOVERNOR/CECM/CHIEF_OFFICER (ADMIN_ROLES) = true; CITIZEN = own or non-anonymous; WARD_SCOPED = ward+subCounty match; DEPARTMENT_SCOPED = departmentId match.
- `scopeReportQuery(user, query)` — ADMIN_ROLES = no scope; WARD_SCOPED = ward filter; DEPARTMENT_SCOPED = departmentId filter.
- `canPerformTransition(user, from, to)` — WARD_ADMIN/SUBCOUNTY_ADMIN = monitoring only (no status changes); FIELD_OFFICER/OFFICER = field-level (cannot CLOSE/REOPEN/ESCALATE); TECHNICAL_SUPERVISOR = cannot CLOSE; TECHNICAL_HEAD/CHIEF_OFFICER/CECM/GOVERNOR/ADMIN/SUPER_ADMIN = any valid transition.
- **Gap:** Dashboard API endpoints (`/api/dashboard/*`) do NOT apply `scopeReportQuery` or `canAccessReport` — they count ALL reports. This must be fixed.

---

## 3. Implementation Status — Already Implemented vs Missing

### Already implemented (backend)
| Area | Status | Evidence |
|------|--------|----------|
| Role enum (14 roles) | ✅ | `schema.prisma:13-29` — all 14 roles defined |
| Full status workflow | ✅ | `schema.prisma:36-56` ReportStatus; `services/statusWorkflow.js` VALID_TRANSITIONS |
| Status history tracking | ✅ | `ReportStatusHistory` model + `recordStatusHistory`/`getStatusHistory` |
| Jurisdiction helpers | ✅ | `services/jurisdiction.js` — canAccessReport, scopeReportQuery, canChangeStatus, canPerformTransition |
| Status change enforcement | ✅ | `reportController.js:changeStatus` — enforces canChangeStatus, canAccessReport, isValidTransition, canPerformTransition |
| Technical resolution chain models | ✅ | FieldInspection, WorkUpdate, ResolutionSubmission, CitizenVerification models |
| Administrative follow-up model | ✅ | ReportFollowUp model (FollowUpType: NOTE, FLAG_INACTIVITY, FLAG_ROUTING, FLAG_DEADLINE, ESCALATION_REQUEST) |
| Escalation model + API | ✅ | Escalation model + `/api/escalations` |
| Audit log model | ✅ | AuditLog model (written by escalation controller only) |
| Kisii County geography | ✅ | `seed.js` — 9 sub-counties, 45 wards |
| 7 categories + subcategories | ✅ | `seed.js` — all 7 categories, ~128 subcategories |
| Departments | ✅ | `seed.js` — 8 departments |
| Routing rules + SLA policies | ✅ | `seed.js` — routing rules, SLA policies |
| Dev test accounts (all roles) | ✅ | `dev-seed.js` — 15 test accounts, idempotent, production guard |
| Citizen dashboard (functional) | ✅ | `citizen-frontend/app/dashboard/page.js` — reports, verification, profile |
| Government dashboard (generic) | ✅ | `government-frontend/app/government/page.tsx` — same data for all roles |
| Platform admin dashboard | ✅ | `admin-dashboard/app/` — reports, statistics, users, settings, government |

### Genuinely missing (the work ahead)
| Gap | Detail |
|-----|--------|
| Dashboard APIs not jurisdiction-scoped | `/api/dashboard/*` counts ALL reports, ignores `req.user` jurisdiction |
| Government Dashboard not role-specific | Same generic stats/report list for every role; only menu items differ |
| No role-specific dashboard content per the specification | Each role should see its own stats, charts, tables, actions |
| Administrative follow-up UI | No UI for Ward/Sub-County Admin follow-ups |
| Technical resolution UI for supervisors/field officers | No inspection, work update, resolution submission UI |
| Citizen dashboard improvements | Needs pending tasks, overdue work, role-appropriate widgets |
| Platform admin improvements | Needs system health, audit logs, role management UI |

---

## 4. Implementation Plan (Incremental, Government Dashboard First)

### Phase A: Backend — Jurisdiction-scoped dashboard APIs
1. **A1** Modify `dashboardController.js` to apply `scopeReportQuery` / `canAccessReport` per `req.user` so each role sees only its jurisdiction's data.
2. **A2** Add role-specific dashboard summary endpoints (per-role stats: overdue, pending assignments, escalations, SLA compliance).
3. **A3** Add audit logging for status changes (currently only escalations write AuditLog).

### Phase B: Government Dashboard — Role-specific content (ONE shared app)
4. **B1** Restructure `government-frontend/app/government/page.tsx` to render role-specific dashboard sections based on `req.user` role (fetched via `/api/auth/me`).
5. **B2** Implement Governor view: county-wide KPIs, sub-county comparison, department performance, resolution trends, major escalations.
6. **B3** Implement CECM view: portfolio KPIs, departmental oversight, escalations.
7. **B4** Implement Chief Officer view: department workload, assignments, SLA compliance.
8. **B5** Implement Technical Head view: technical work queue, inspections, resolution submissions.
9. **B6** Implement Technical Supervisor view: team assignments, field officer workload, inspections.
10. **B7** Implement Sub-County Admin view: sub-county performance, ward comparisons, follow-ups.
11. **B8** Implement Ward Admin view: ward complaints, citizen concerns, follow-up queue.
12. **B9** Implement Field Officer view: personally assigned cases, work queue, evidence upload, resolution submission.
13. **B10** Add search, filters, loading/empty/error states to all views.
14. **B11** Replace emojis/unicode icons with Lucide React; preserve MTAA Fix colours/typography.

### Phase C: Citizen & Platform Admin (after Government Dashboard)
15. **C1** Improve Citizen Dashboard: pending tasks, overdue work, notifications, resolution verification polish.
16. **C2** Improve Platform Admin Dashboard: system health, audit logs, role/permission management UI.
17. **C3** CSS-based visualisations (no new charting library unless genuinely necessary).

### Phase D: Verification
18. **D1** Test each role's dashboard with dev test accounts (all use `TestPassword123!`).
19. **D2** Verify jurisdiction enforcement: a Ward Admin cannot see another ward's reports; a Field Officer cannot access unassigned reports.
20. **D3** Verify workflows: technical chain (Technical Head → Supervisor → Field Officer → Inspection → Supervisor review → Resolution → Citizen verification) and administrative chain (Ward Admin → Sub-County Admin → escalation) are independently tracked.

---

**Next step:** Begin Phase A (backend dashboard jurisdiction scoping). I will start by modifying `dashboardController.js` to apply per-role scoping, then add role-specific summary data.

Would you like me to proceed with implementation now, starting with Phase A?