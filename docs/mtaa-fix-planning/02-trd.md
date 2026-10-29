# 02 — Technical Requirements Document (TRD)

**Project:** Mtaa Fix  
**Status:** Completion blueprint for existing project  
**Last Updated:** 2026-10-22  

---

## 1. Current Technical State

### 1.1 Architecture (As-Is)
- **Monorepo**: 4 independent npm apps, no workspace tooling
- **Backend**: Node.js + Express 5 + Prisma 7 + PostgreSQL (with in-memory fallback)
- **Frontend Apps**: Next.js 16.4.0 + React 19.3.0 + Tailwind CSS v4 (all JS, no TypeScript)
- **Auth**: Custom JWT (access + refresh tokens) with bcrypt
- **Storage**: Local disk uploads via multer
- **Email**: Resend (optional)

### 1.2 Critical Technical Issues
1. **Database fallback**: Silent fallback to in-memory store when DB unavailable - masks failures
2. **No Prisma migrations**: Schema exists but no migration files
3. **Prisma client not generated**: No prisma CLI dependency, no postinstall script
4. **Frontend-backend disconnect**: All frontends have zero API calls
5. **Security vulnerabilities**: Public PII exposure, unprotected uploads, hardcoded secrets

---

## 2. Target Architecture

### 2.1 Tech Stack (Preserve Existing)
| Component | Technology | Notes |
|-----------|------------|-------|
| Frontend Framework | Next.js 16 (App Router) | Keep for all three frontends |
| UI Library | React 19 | Keep |
| Styling | Tailwind CSS v4 | Keep, fix admin dashboard build |
| Language | JavaScript (JS) | Keep as-is (no TS migration) |
| Backend | Express 5 | Keep |
| ORM | Prisma 7 | Keep, add migrations |
| Database | PostgreSQL | Keep, configure properly |
| Authentication | JWT (custom) | Keep, fix security issues |
| File Storage | Local disk (dev) / Configurable | Keep structure, secure it |
| Validation | Zod | Keep |
| Maps | Leaflet + OpenStreetMap | Add (not present currently) |

### 2.2 Architectural Principles
- **Preserve working code**: Extend existing backend API rather than rewrite
- **Layered architecture**: routes → controllers → repositories → data layer (keep)
- **Separation of concerns**: Business logic separate from presentation
- **Security first**: Fix all P0 vulnerabilities
- **Role-based access control**: Enforce on server and DB level
- **Audit everything**: Log sensitive operations
- **API-first**: All frontends consume backend API

---

## 3. Backend Requirements

### 3.1 API Structure (Existing - Enhance)
Keep existing route structure, fix security issues:
- Add authentication to report read endpoints
- Secure file serving
- Add proper authorization checks
- Implement missing endpoints as needed

### 3.2 Authentication & Authorization
- Fix JWT secret handling (require env vars, remove fallbacks)
- Expand role model from 4 to 14 roles
- Implement role-based middleware for all roles
- Add jurisdictional scoping (by county/sub-county/ward/department)
- Implement proper session management
- Add rate limiting to all sensitive endpoints

### 3.3 Database
- Add Prisma migrations
- Add missing models (ReportStatusHistory, Inspection, ProgressUpdate, etc.)
- Add proper foreign keys where missing
- Expand Role enum
- Add geographic data models properly
- Add audit logging to all sensitive operations
- Fix silent fallback behavior (make configurable, fail fast in production)

### 3.4 File Uploads
- Make uploads private (not served via public static)
- Add file type validation (magic bytes)
- Restrict file extensions
- Implement signed URLs or authenticated access
- Add virus scanning consideration (document)
- Limit file sizes

### 3.5 Validation
- Enhance validators for all new fields
- Add geographic validation (check ward belongs to sub-county)
- Add category/subcategory validation
- Prevent invalid status transitions

---

## 4. Frontend Requirements

### 4.1 Admin Dashboard (Existing - Fix & Extend)
- Fix Tailwind CSS build (add turbopack rule)
- Wire to backend APIs (replace all mock data)
- Add role-based views
- Implement real authentication
- Add missing features (CSV export already in branch)
- Fix accessibility issues

### 4.2 Citizen Frontend (Scaffold → Full Implementation)
- Build complete reporting wizard
- Create citizen dashboard
- Implement report tracking
- Add resolution verification
- Add authentication pages
- Integrate maps (Leaflet)
- Connect to backend APIs

### 4.3 Government Frontend (Scaffold → Full Implementation)
- Create role-specific dashboards for all government roles
- Implement case management interfaces
- Add assignment workflows
- Add escalation interfaces
- Add analytics
- Integrate maps for operational view

### 4.4 Shared Requirements
- Create shared components library
- Add API client/service layer
- Implement auth context
- Add route protection middleware
- Handle loading/error/empty states
- Responsive design
- Accessibility compliance

---

## 5. Security Requirements

### 5.1 Critical Fixes (P0)
| Issue | Fix | Priority |
|-------|-----|----------|
| Unauthenticated report PII exposure | Add authentication to report read endpoints, sanitize responses | P0 |
| Public file serving | Remove public static for uploads, serve through authenticated endpoint | P0 |
| Hardcoded JWT secrets | Remove fallbacks, require env vars, fail fast if missing | P0 |
| Dev mode secret leakage | Never return secrets/codes in production responses | P0 |
| Silent DB fallback | Make configurable, log loudly, fail in production | P0 |

### 5.2 Security Enhancements
- Implement proper RBAC with jurisdictional scoping
- Add CSRF protection where needed
- Implement rate limiting on all endpoints
- Add input sanitization
- Secure headers (helmet already present)
- Add audit logging
- Implement file upload security
- Add API key management for system operations

---

## 6. Data Requirements

### 6.1 Kisii County Geographic Data
Must seed:
- 9 Sub-counties/Constituencies with correct names
- 45 Wards with correct parent relationships
- Proper slugs and codes

### 6.2 Issue Taxonomy
Seed all 7 categories with all sub-issues as specified:
- Roads, Traffic & Mobility (20 items)
- Water & Sewerage (19 items)
- Drainage & Flood Control (17 items)
- Solid Waste & Environment (19 items)
- Street Lighting & Power (13 items)
- Public Facilities, Markets & Parks (23 items)
- Public Safety & Hazards (19 items)

### 6.3 Organizational Data
- Departments (Infrastructure, Water/Environment, Trade, Youth/Sports, Public Service/Admin, etc.)
- County leadership structure (Governor, CECMs, Chief Officers)
- Routing rules
- SLA policies

---

## 7. Integration Requirements

### 7.1 Internal Integrations
- Frontend ↔ Backend API
- Backend ↔ Database (Prisma)
- File storage
- Email notifications

### 7.2 External Integrations (Configurable)
- Resend for emails (already integrated, optional)
- Maps (Leaflet/OpenStreetMap - no API key needed)
- Future: SMS provider (document interface)

---

## 8. Testing Requirements

### 8.1 Backend Tests (Existing)
8 test files using plain Node scripts. Must continue to pass. Add tests for:
- Security fixes
- New roles and permissions
- Routing engine
- Status transitions
- Geographic validation

### 8.2 Frontend Tests
Currently none. Add basic tests for critical flows.

### 8.3 Integration Tests
Test end-to-end workflows for key scenarios.

---

## 9. Deployment Requirements

### 9.1 Environment Variables
Document all required env vars in `.env.example`:
- Database (DATABASE_URL)
- JWT secrets (JWT_SECRET, JWT_REFRESH_SECRET)
- Resend API key (optional)
- File upload settings
- CORS origins
- App URL

### 9.2 Build Requirements
- All three frontends must build successfully
- Backend must start successfully
- Database migrations must run
- Seed data must load

### 9.3 Infrastructure
- PostgreSQL database
- Node.js runtime
- File storage directory
- Environment configuration

---

## 10. Technical Constraints

1. **Preserve existing stack** - Don't change frameworks
2. **JavaScript only** - No TypeScript migration
3. **Keep monorepo structure** - Don't convert to workspaces
4. **Preserve Git history** - Follow recovery plan
5. **No breaking changes to working backend API** where possible
6. **Maintain backward compatibility** where feasible
7. **Fix security issues without rewriting everything**

---

## 11. Success Metrics

- All 14 roles can access their appropriate dashboards
- Citizens can complete full reporting workflow
- Reports route correctly to departments
- Both responsibility chains function
- All security vulnerabilities fixed
- All 7 categories with all sub-issues available
- Kisii geographic data complete (9 sub-counties, 45 wards)
- All apps build without errors
- Critical tests pass
- No unauthenticated PII exposure
