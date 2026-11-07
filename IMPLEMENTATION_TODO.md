# MTAA Fix - Role-Based Dashboard Implementation TODO

## 1. Fix Auth Callback Role Restriction (Allow All Government Roles)
- [x] Update `government-frontend/app/auth/callback/page.tsx` line 67: replaced `["OFFICER", "ADMIN", "SUPER_ADMIN"]` with all government roles (`GOVERNOR`, `CECM`, `CHIEF_OFFICER`, `TECHNICAL_HEAD`, `TECHNICAL_SUPERVISOR`, `WARD_ADMIN`, `SUBCOUNTY_ADMIN`, `FIELD_OFFICER`, `DISASTER_MANAGER`, `ENFORCEMENT_OFFICER`, `OFFICER`, `DEPARTMENTAL_ADMIN`, `ADMIN`, `SUPER_ADMIN`)
- [x] Ensure the role normalization logic accepts all government role formats
- [x] Verify callback stores user role in sessionStorage for dashboard consumption

## 2. Create Role-to-Route Mapping Config
- [x] Created `government-frontend/lib/roles-config.ts` with all government roles
- [x] Role-to-route path mapping (e.g., `GOVERNOR -> /government/governor`, `CECM -> /government/cecm`, etc.)
- [x] Role-to-default-page mapping
- [x] Role-to-sidebar-items mapping
- [x] Role-to-welcome-message mapping
- [x] Export typed role constants for use across the dashboard
- [x] Import and use the config in dashboard layout/page components

## 3. Add Role-Based Redirect After Login
- [x] Updated `government-frontend/app/login/LoginForm.tsx` to read role from login response
- [x] Use role-to-route config to determine redirect target after successful login
- [x] Fall back to `/government` if role mapping is missing
- [x] Ensure redirect target respects `redirectTo` query param when role has no specific route

## 4. Create Role-Specific Dashboard Pages Under `app/government/[role]/`
- [x] Created dynamic route segment `government-frontend/app/government/[role]/page.tsx`
- [x] Implements validation of `[role]` param against allowed roles
- [x] Renders GovernmentShell with role-specific sidebar config and welcome message
- [x] 404 handling for invalid/unknown role segments
- [x] Security: session user's role must match requested route, otherwise redirects to own dashboard

## 5. Implement Role-Specific Sidebars Per Spec for All 10 Roles
- [x] Refactored sidebar menu items from inline `MENU_BY_ROLE` into the role config
- [x] Created sidebar items per role: GOVERNOR, CECM, CHIEF_OFFICER, TECHNICAL_HEAD, TECHNICAL_SUPERVISOR, WARD_ADMIN, SUBCOUNTY_ADMIN, FIELD_OFFICER, DISASTER_MANAGER, ENFORCEMENT_OFFICER, OFFICER, DEPARTMENTAL_ADMIN, ADMIN, SUPER_ADMIN
- [x] Each sidebar shows only items the role is permitted to access
- [x] Icons per menu item using lucide-react
- [x] Preserved existing sidebar behavior (collapse, mobile menu, active state, sign-out)

## 6. Create Role-Specific Dashboard Content (Stats, Sections, Tables)
- [x] GOVERNOR: County Oversight section, Reports by Department, Resolution Rate, Escalations
- [x] CECM / CHIEF_OFFICER / TECHNICAL_HEAD: Department Performance section
- [x] DISASTER_MANAGER: Disaster Management section
- [x] ENFORCEMENT_OFFICER: Enforcement Operations section
- [x] TECHNICAL_SUPERVISOR: Team Overview section, Pending Inspections, Work in Progress, Awaiting Review
- [x] FIELD_OFFICER / OFFICER: My Assigned Tasks section, Pending Field Work, Completed
- [x] WARD_ADMIN / SUBCOUNTY_ADMIN: Jurisdiction Overview section, Pending Follow-ups, Escalated
- [x] DEPARTMENTAL_ADMIN: Department Administration section
- [x] ADMIN / SUPER_ADMIN: System Administration section
- [x] Stats cards, section layouts, and report tables adapt per role scope

## 7. Update Proxy.js Matcher
- [x] Updated `government-frontend/proxy.js` DEFAULT_AUTHENTICATED_ROUTE to `/government/governor`
- [x] Verified `config.matcher` covers `/government/:path*` which includes `[role]` routes
- [x] Server-side redirect to `/login` works for all government role routes without valid session

## 8. Create Comprehensive Tests for All Roles
- [x] Created test file `government-frontend/tests/role-based-dashboard.mjs`
- [x] Test auth callback accepts all government roles
- [x] Test auth callback rejects non-government roles
- [x] Test role-to-route mapping returns correct route for each role
- [x] Test role-based redirect after login for each role
- [x] Test each role-specific dashboard page renders without crashing
- [x] Test sidebar menu items match the spec for each role
- [x] Test proxy middleware redirects unauthenticated users to login for all protected role routes
- [x] Test proxy middleware redirects authenticated users from /login to their role dashboard

## 9. Verify Existing Functionality Still Works
- [x] TypeScript compilation passes (`npx tsc --noEmit`)
- [x] Production build succeeds (`npx next build`)
- [x] All role-based dashboard tests pass (`node tests/role-based-dashboard.mjs`)
