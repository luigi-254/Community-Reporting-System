# MTAA Fix — Frontend Repair Plan & Status

## ✅ CRITICAL — FIXED

### 1. Citizen ReportForm.js — missing `router` import
**File:** `citizen-frontend/app/dashboard/components/ReportForm.js`
**Fix:** Added `import { useRouter } from "next/navigation"` and `const router = useRouter();` inside the component.
**Root Cause:** Line 474-475 called `router.replace()` but `router` was never imported/initialized, causing a `ReferenceError` when a citizen's token was missing during report submission.

## ✅ HIGH — FIXED

### 2. Government api.js — 401 not clearing httpOnly session cookie
**File:** `government-frontend/lib/api.js`
**Fix:** Added `void clearSessionCookie()` after `clearStoredToken()` in the 401 handler so the server-side proxy guard also stops considering the tab authenticated.

### 3. Admin dashboard — duplicate government dashboard removed
**File:** `admin-dashboard/app/government/page.tsx`
**Fix:** Replaced the full government dashboard duplicate with a redirect to `/` (admin dashboard home). Government officers use the separate Government Frontend (port 302).

## ⚠️ HIGH — NOTED (dead code, not causing active bugs)

### 4. GovernmentDashboardClient.tsx — dead code
**File:** `government-frontend/app/government/GovernmentDashboardClient.tsx`
**Status:** Not imported by any route. The active path is `page.tsx → GovernmentDashboardRedirect → role route → RoleDashboardClient`. Left in place to avoid removing potentially referenced code.

## ✅ MEDIUM — FIXED

### 5. Government globals.css — font-family mismatch
**File:** `government-frontend/app/globals.css`
**Fix:** Changed `font-family: Arial, Helvetica, sans-serif` to `font-family: var(--font-sans), system-ui, -apple-system, sans-serif` to match citizen frontend's Geist font.

### 7. Citizen api.js — 401 refresh fallback parsing already-failed response
**File:** `citizen-frontend/lib/api.js`
**Fix:** After failed token refresh on 401, throw "Unauthorized" directly instead of falling through to `res.json()` on the already-failed response.

### 8. Admin page.js — `window.location.href` → `router.replace`
**File:** `admin-dashboard/app/page.js`
**Fix:** Replaced two `window.location.href` redirects with `router.replace()` for client-side navigation (avoids full page reload).

## ⚠️ MEDIUM — NOTED (code quality, not functional bugs)

### 6. Admin globals.css — `@layer base` global Tailwind utility overrides
**File:** `admin-dashboard/app/globals.css`
**Status:** Globally overrides Tailwind utility classes (`.bg-white`, `.text-gray-600`, etc.). Code quality concern, not a functional bug. Changing risks visual regressions since admin components rely on these overrides.

### 9. Admin proxy.js — overly broad matcher
**File:** `admin-dashboard/app/proxy.js`
**Status:** Matches all routes except static assets. Appropriate for a fully-protected admin dashboard where all routes except `/login` require authentication. Not a functional bug.

## ✅ BUILD & TEST RESULTS

| Application | Build | TypeScript | Tests |
|---|---|---|---|
| citizen-frontend | ✅ Compiled | ✅ Passed | No test files exist |
| government-frontend | ✅ Compiled | ✅ Passed | ✅ All 8 role-based dashboard tests passed |
| admin-dashboard | ✅ Compiled | ✅ Passed | No test files exist |

## Remaining known issues (non-blocking)
- Admin `globals.css` `@layer base` global overrides (visual/code quality only)
- `GovernmentDashboardClient.tsx` dead code (not referenced by any route)
- Citizen `DashboardLayout.js` returns null instead of redirecting when role mismatch detected (edge case: non-citizen with citizen token sees blank page instead of redirect)
