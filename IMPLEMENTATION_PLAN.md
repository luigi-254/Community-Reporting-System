# MTAA Fix — Government Dashboard & Routing Audit: Implementation Plan

## Summary of Findings

All 14 government roles exist in the database, frontend config, and login permissions. The redirect logic works (Governor → /government/governor, etc.). However:

1. **DEPARTMENTAL_ADMIN cannot access dashboard APIs** — missing from backend jurisdiction role sets → 403 on all `/api/dashboard/*` endpoints. Also gets unscoped data if access were granted.
2. **No Next.js middleware active** — `proxy.js` exists but Next.js 16 requires it as the sole proxy file (not alongside middleware.ts).
3. **Shared/generic dashboard** — `RoleDashboardClient.tsx` serves all 14 roles from one component; sidebar items showed the same content regardless of selection.
4. **Dead code** — `GovernmentDashboardClient.tsx` (1,164 lines) was unused.

## Changes Implemented

### Phase 1: Critical Bug Fixes (DONE)

| # | Fix | File | Status |
|---|-----|------|--------|
| 1 | Add DEPARTMENTAL_ADMIN to DEPARTMENT_SCOPED_ROLES | backend/services/jurisdiction.js | ✅ Done |
| 2 | DEPARTMENTAL_ADMIN monitoring-only in canPerformTransition | backend/services/jurisdiction.js | ✅ Done |
| 3 | Use proxy.js as Next.js middleware (removed middleware.ts) | government-frontend/proxy.js | ✅ Done |
| 4 | Delete dead code | government-frontend/app/government/GovernmentDashboardClient.tsx | ✅ Deleted |

### Phase 2: Dashboard Navigation Improvements (DONE)

| # | Fix | File | Status |
|---|-----|------|--------|
| 5 | Add section-specific data loading (Inspections, Work Updates, Follow-ups, Resolutions, Escalations) | government-frontend/app/government/[role]/RoleDashboardClient.tsx | ✅ Done |
| 6 | Add distinct content sections per sidebar category | government-frontend/app/government/[role]/RoleDashboardClient.tsx | ✅ Done |

### Phase 3: Verification

| # | Test | Method | Status |
|---|------|--------|--------|
| 7 | Login + redirect for all 14 roles | Playwright browser tests | Pending |
| 8 | DEPARTMENTAL_ADMIN dashboard access | API test + browser test | Pending |
| 9 | Unauthenticated access blocked | Route guard test | Pending |
| 10 | Account switching (no state leak) | Logout → login as different role | Pending |
| 11 | Production build + TypeScript check | `next build`, `tsc --noEmit` | ✅ Pass |

## Acceptance Criteria

- Every government role logs in and reaches its correct dashboard
- DEPARTMENTAL_ADMIN can access dashboard data (department-scoped)
- No role receives another role's dashboard
- Sidebar items show distinct, real content per category
- Server-side route protection active via proxy.js
- Production builds pass