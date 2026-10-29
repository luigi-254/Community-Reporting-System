# 01 — Product Requirements Document (PRD)

**Project:** Mtaa Fix  
**Purpose:** Civic issue reporting and accountability platform for Kisii County, Kenya  
**Status:** Completion blueprint for existing project  
**Last Updated:** 2026-10-22  

---

## 1. Product Goals

1. **Connect citizens and county government** - Enable residents to report infrastructure/service issues and track them to resolution.
2. **Ensure accountability** - Create traceable workflows with clear responsibility chains.
3. **Enable local follow-up** - Allow Ward and Sub-County Administrators to monitor issues in their areas.
4. **Provide transparency** - Make issue status and resolution publicly visible where appropriate.
5. **Enable effective routing** - Automatically route issues to correct departments based on category and location.
6. **Ensure verification** - Require citizen verification of resolutions before closure.
7. **Preserve existing work** - Complete and extend the existing partially-built system rather than replacing it.

---

## 2. Users and Roles

### 2.1 Current State (from Repository Audit)
The backend has only 4 roles: `CITIZEN | OFFICER | ADMIN | SUPER_ADMIN`. The admin dashboard is UI-only with mock data. Citizen and government frontends are untouched scaffolds.

### 2.2 Required Roles (14 total)
| Role | Status | Scope | Dashboard Required |
|------|--------|-------|-------------------|
| **Anonymous Visitor** | PARTIAL (can read reports unauthenticated - security issue) | Public information only | Public site |
| **Registered Citizen** | PARTIAL (backend exists, no UI) | Own reports only | Citizen dashboard |
| **Ward Administrator** | MISSING | Assigned ward only | Ward admin dashboard |
| **Sub-County Administrator** | MISSING | Assigned sub-county wards | Sub-county admin dashboard |
| **Field Officer / Field Team** | PARTIAL (maps to OFFICER) | Assigned cases only | Field officer dashboard |
| **Technical Supervisor** | MISSING | Department/team scope | Supervisor dashboard |
| **Technical Head / Engineer** | MISSING | Departmental technical oversight | Technical head dashboard |
| **Chief Officer** | MISSING | Departmental oversight | Chief officer dashboard |
| **County Executive Committee Member (CECM)** | MISSING | Departmental executive oversight | CECM dashboard |
| **Governor / County Executive Oversight** | MISSING | County-wide oversight | Governor dashboard |
| **Public Participation & Disaster Management** | MISSING | Emergency/hazard cases | Disaster management dashboard |
| **County Enforcement** | MISSING | Enforcement-related cases | Enforcement dashboard |
| **Departmental Administrator** | PARTIAL (ADMIN role) | Departmental scope | Needs scoping |
| **Platform Super Administrator** | IMPLEMENTED (SUPER_ADMIN) | System-wide | Platform admin dashboard |

---

## 3. Scope

### 3.1 In Scope
- Complete all 14 role dashboards with proper scoping
- Implement full citizen reporting wizard with all 7 categories and sub-issues
- Add Kisii County geographic data (9 sub-counties, 45 wards)
- Implement dual responsibility chains (technical resolution + geographic follow-up)
- Add proper routing engine
- Implement citizen verification workflow
- Fix critical security issues (unauthenticated PII exposure, public uploads, hardcoded JWT secrets)
- Wire frontends to backend APIs
- Add proper status lifecycle with transitions
- Implement notifications
- Add analytics dashboards

### 3.2 Out of Scope
- Replacing the entire system architecture
- Redesigning existing admin dashboard UI beyond necessary fixes
- Creating mobile apps
- Integrating external SMS/push providers (document as config needed)
- Building from scratch

---

## 4. Functional Requirements

### 4.1 Issue Categories and Taxonomy (MUST HAVE - ALL 7)
All 7 categories with all predefined sub-issues must be implemented as specified in the master prompt.

| Category | Sub-issues Count | Primary Department |
|----------|------------------|-------------------|
| Roads, Traffic & Mobility | 20 | Infrastructure, Roads & Public Works |
| Water & Sewerage | 19 | Water, Environment, Natural Resources, Energy & Climate Change |
| Drainage & Flood Control | 17 | Infrastructure/Public Works or Disaster Management (branched) |
| Solid Waste & Environment | 19 | Water, Environment, Natural Resources, Energy & Climate Change |
| Street Lighting & Power | 13 | Infrastructure/Public Works or refer to utility |
| Public Facilities, Markets & Parks | 23 | Varies by facility (Trade, Youth/Sports, Public Works, etc.) |
| Public Safety & Hazards | 19 | Disaster Management or Enforcement (branched) |

### 4.2 Citizen Reporting Workflow
- Multi-step wizard (Category → Sub-issue → Description → Location → Evidence → Review/Submit)
- GPS location capture with fallback to manual selection
- Kisii County geographic hierarchy (County → Sub-county → Ward)
- Photo/video upload with validation
- "Other" option with required description
- Generate unique report reference
- Prevent duplicate submissions
- Proper validation at each step

### 4.3 Report Lifecycle
States: Draft, Submitted, Under Review, Needs More Information, Verified, Assigned, Acknowledged, Inspection in Progress, In Progress, Awaiting External Agency, Resolution Submitted, Awaiting Citizen Verification, Resolved, Closed, Reopened, Rejected, Duplicate, Cancelled

Must enforce valid transitions with permissions and audit trail.

### 4.4 Dual Responsibility Chains
**Technical Resolution Chain:** Citizen → Department → CECM → Chief Officer → Technical Head → Supervisor → Field Officer → Resolution → Verification  
**Geographic Follow-up Chain:** Location → Sub-County Admin → Ward Admin → Monitor → Follow up with Supervisor → Escalate if overdue

Both chains must be linked to the same report with separate tracking.

### 4.5 Citizen Verification
- Citizen can confirm resolution, reject with reason, report partial resolution
- Rejection returns to appropriate workflow
- Reopening preserves history
- Distinction between technical completion, citizen verification, final closure

### 4.6 Routing Engine
- Configurable rules based on category, sub-issue, location, hazard severity
- Auto-route to correct department
- Exception queue for ambiguous cases
- Audit all routing decisions

---

## 5. Non-Functional Requirements

### 5.1 Security (CRITICAL)
- Fix unauthenticated PII exposure on report endpoints
- Secure file uploads (private storage, validation, no public static serving of sensitive uploads)
- Fix hardcoded JWT secrets (require env vars)
- Implement proper authorization on all endpoints
- Add RLS considerations where appropriate
- Rate limiting on all sensitive endpoints
- Remove dev-mode secret leakage from responses
- Audit logging for sensitive actions

### 5.2 Performance
- Efficient database queries with proper indexing
- Pagination on all list endpoints
- Map clustering for large datasets
- Responsive UI for mobile devices

### 5.3 Reliability
- Graceful error handling
- Proper transaction boundaries
- No silent fallback masking database errors (or make it explicit and configurable)
- Handle network failures gracefully

### 5.4 Usability
- Preserve existing admin dashboard visual identity
- Responsive design
- Accessible forms (WCAG principles)
- Clear error messages
- Loading states
- Empty states

---

## 6. Feature Priorities

### P0 - Critical (Security & Core Data)
1. Fix unauthenticated PII exposure
2. Secure file uploads
3. Fix hardcoded JWT secrets
4. Add Kisii County geographic data (9 sub-counties, 45 wards)
5. Implement proper role model (expand from 4 to 14 roles)
6. Add category/subcategory data
7. Fix database fallback to not silently mask errors in production

### P1 - High (Core Workflows)
8. Complete citizen reporting wizard UI
9. Wire frontends to backend APIs
10. Implement dual responsibility chains
11. Add proper routing engine
12. Implement status lifecycle with validation
13. Add citizen verification workflow
14. Create role-specific dashboards

### P2 - Medium (Enhancement)
15. Add notifications system
16. Implement analytics dashboards
17. Add duplicate detection
18. Add escalation workflows
19. Improve admin dashboard with real data

### P3 - Low (Polish)
20. Add exports
21. Enhanced reporting
22. Performance optimizations

---

## 7. Acceptance Criteria

1. **Authentication**: All users can sign in securely; roles properly enforced
2. **Citizen Reporting**: Can submit report through full wizard with all categories
3. **Routing**: Reports route to correct departments based on rules
4. **Workflows**: Both technical and geographic chains function correctly
5. **Verification**: Citizens can verify/reject resolutions
6. **Dashboards**: All 14 roles have appropriate scoped dashboards
7. **Security**: No unauthenticated PII exposure; uploads secured
8. **Geography**: All 9 Kisii sub-counties and 45 wards present
9. **Taxonomy**: All 7 categories with all sub-issues present
10. **Data Integrity**: Proper FKs where critical, audit trails maintained
11. **Tests**: Critical paths have tests; existing tests still pass
12. **Build**: All apps build successfully

---

## 8. Implementation Status Summary

| Area | Current | Target | Notes |
|------|---------|--------|-------|
| Backend API | ~70% implemented | 100% | Solid foundation, needs security fixes and missing features |
| Admin Dashboard | UI mock only (no API) | Functional | Has good UI structure, needs API wiring |
| Citizen Frontend | Scaffold only | Functional | Needs full implementation |
| Government Frontend | Scaffold only | Functional | Needs full implementation |
| Database Schema | Partial (missing many FKs, models) | Complete | Needs Kisii data, role expansion, missing models |
| Security | Major issues | Secure | Critical fixes needed |
| Workflows | Backend partial, no UI | Complete | Major work needed |
| Geography/Taxonomy | Missing | Complete | Must add all Kisii data and categories |
