# 06 — Implementation Plan

**Project:** Mtaa Fix  
**Status:** Completion blueprint for existing project  
**Last Updated:** 2026-10-22  

---

## 1. Implementation Strategy

**Principle:** Fix critical issues first, then complete missing features, preserving existing working code.

**Order:** Security → Data Foundation → Core Workflows → Dashboards → Polish

---

## 2. Phase 0: Recovery & Setup (CRITICAL - Do First)
**Goal:** Get the real project code

| Task | Priority | Files | Acceptance Criteria |
|------|----------|-------|-------------------|
| 0.1 Follow recovery plan to get remote main | P0 | Git operations | All 23 commits from remote main present |
| 0.2 Merge admin-government branch | P0 | admin-dashboard/* | Preserve all improvements, resolve conflicts |
| 0.3 Fix Tailwind CSS in admin dashboard | P0 | admin-dashboard/next.config.mjs | Dashboard renders with styles |
| 0.4 Verify build of all apps | P0 | All apps | All build without errors |

---

## 3. Phase 1: Critical Security Fixes (P0)
**Goal:** Fix security vulnerabilities

| Task | Priority | Files | Acceptance Criteria |
|------|----------|-------|-------------------|
| 1.1 Fix JWT secret fallbacks | P0 | backend/utils/jwt.js | Require env vars, fail fast if missing |
| 1.2 Secure report read endpoints | P0 | backend/routes/reportroutes.js, reportController.js | Require auth, sanitize responses based on permissions |
| 1.3 Secure file uploads | P0 | backend/index.js, uploadMiddlewares.js | Remove public static, add auth, validate file types/magic bytes |
| 1.4 Remove dev secret leakage | P0 | backend/controllers/authController.js | Don't return codes in production |
| 1.5 Fix DB fallback behavior | P0 | backend/repositories/client.js | Make explicit, log loudly, fail in production |
| 1.6 Add rate limiting to all endpoints | P0 | All route files | Protect against abuse |

---

## 4. Phase 2: Database Foundation (P0)
**Goal:** Set up proper database structure

| Task | Priority | Files | Acceptance Criteria |
|------|----------|-------|-------------------|
| 2.1 Add Prisma CLI and setup | P0 | backend/package.json, prisma/ | Can run prisma commands |
| 2.2 Create migrations | P0 | prisma/migrations/ | Migration files created |
| 2.3 Expand Role enum | P0 | prisma/schema.prisma | All 14 roles defined |
| 2.4 Add missing models | P0 | prisma/schema.prisma | ReportStatusHistory, Inspection, etc. |
| 2.5 Fix relationships and add FKs | P0 | prisma/schema.prisma | Proper referential integrity |
| 2.6 Seed Kisii County data | P0 | prisma/seed.js | 9 sub-counties, 45 wards |
| 2.7 Seed categories and subcategories | P0 | prisma/seed.js | All 7 categories with all sub-issues |
| 2.8 Seed departments | P0 | prisma/seed.js | All departments |
| 2.9 Run migrations and seeds | P0 | - | Database populated correctly |

---

## 5. Phase 3: Core Backend Features (P1)
**Goal:** Complete missing backend functionality

| Task | Priority | Files | Acceptance Criteria |
|------|----------|-------|-------------------|
| 3.1 Implement routing engine logic | P1 | routing services | Auto-route reports on creation |
| 3.2 Add status transition validation | P1 | reportController.js, validators | Enforce valid transitions |
| 3.3 Implement status history tracking | P1 | reportController.js, new service | All transitions logged |
| 3.4 Add audit logging | P1 | All controllers | Sensitive actions logged |
| 3.5 Implement escalation logic with SLA | P1 | escalationController.js, services | Proper escalation workflow |
| 3.6 Add notification triggers | P1 | Various controllers | Notifications created on events |
| 3.7 Implement duplicate detection | P1 | report service | Detect potential duplicates |
| 3.8 Add jurisdictional scoping | P1 | All queries/middlewares | Enforce role-based scoping |

---

## 6. Phase 4: Frontend - API Integration & Auth (P1)
**Goal:** Wire frontends to backend

| Task | Priority | Files | Acceptance Criteria |
|------|----------|-------|-------------------|
| 4.1 Create API client/service layer | P1 | All frontends/lib/ | Centralized API calls |
| 4.2 Add auth context and middleware | P1 | All frontends | Authentication working |
| 4.3 Create login/register pages | P1 | citizen-frontend, government-frontend | Auth flows work |
| 4.4 Wire admin dashboard to APIs | P1 | admin-dashboard/app/* | Replace all mock data |
| 4.5 Add route protection | P1 | All frontends/middleware.js | Role-based access control |
| 4.6 Handle auth tokens | P1 | All frontends | Proper token storage/refresh |

---

## 7. Phase 5: Citizen Frontend Implementation (P1)
**Goal:** Complete citizen interface

| Task | Priority | Files | Acceptance Criteria |
|------|----------|-------|-------------------|
| 7.1 Build citizen dashboard | P1 | citizen-frontend/app/citizen/ | Shows user's reports |
| 7.2 Build report wizard (7 steps) | P1 | citizen-frontend/app/citizen/report/ | All steps functional |
| 7.3 Add map integration (Leaflet) | P1 | Components with maps | Location selection works |
| 7.4 Add file upload | P1 | Report wizard | Evidence upload works |
| 7.5 Build report tracking page | P1 | citizen-frontend/app/citizen/reports/ | Status timeline visible |
| 7.6 Build resolution verification | P1 | citizen-frontend/app/citizen/reports/[id]/ | Can verify/reject |
| 7.7 Add notifications | P1 | Citizen dashboard | In-app notifications |

---

## 8. Phase 6: Government Frontends Implementation (P1)
**Goal:** Build all role dashboards

| Task | Priority | Files | Acceptance Criteria |
|------|----------|-------|-------------------|
| 8.1 Create role-based routing | P1 | government-frontend | Redirects by role |
| 8.2 Build Ward Admin dashboard | P1 | government-frontend/app/ward-admin/ | Functional |
| 8.3 Build Sub-County Admin dashboard | P1 | government-frontend/app/subcounty-admin/ | Functional |
| 8.4 Build Field Officer dashboard | P1 | government-frontend/app/field/ | Functional |
| 8.5 Build Supervisor dashboard | P1 | government-frontend/app/supervisor/ | Functional |
| 8.6 Build Technical Head dashboard | P1 | government-frontend/app/technical-head/ | Functional |
| 8.7 Build Chief Officer dashboard | P1 | government-frontend/app/chief-officer/ | Functional |
| 8.8 Build CECM dashboard | P1 | government-frontend/app/cecm/ | Functional |
| 8.9 Build Governor dashboard | P1 | government-frontend/app/governor/ | Functional |
| 8.10 Build Disaster/Enforcement dashboards | P1 | government-frontend/app/disaster/, enforcement/ | Functional |
| 8.11 Build Platform Admin dashboard | P1 | government-frontend/app/platform-admin/ | Functional |

---

## 9. Phase 7: Testing & Verification (P1)
**Goal:** Ensure everything works

| Task | Priority | Files | Acceptance Criteria |
|------|----------|-------|-------------------|
| 9.1 Run existing backend tests | P1 | backend/tests/ | All pass |
| 9.2 Test security fixes | P1 | - | No unauthenticated PII, uploads secured |
| 9.3 Test critical workflows | P1 | - | Report submission to verification works |
| 9.4 Test role permissions | P1 | - | Proper scoping enforced |
| 9.5 Test builds | P1 | All apps | All build successfully |
| 9.6 Fix any issues found | P1 | As needed | All tests pass |

---

## 10. Phase 8: Documentation & Cleanup (P2)
**Goal:** Finalize

| Task | Priority | Files | Acceptance Criteria |
|------|----------|-------|-------------------|
| 10.1 Update README files | P2 | README.md files | Accurate documentation |
| 10.2 Document environment setup | P2 | .env.example, docs/ | Clear setup instructions |
| 10.3 Document API endpoints | P2 | docs/ | API documentation |
| 10.4 Create deployment guide | P2 | docs/ | Deployment instructions |
| 10.5 Remove debug code | P2 | All files | Clean codebase |

---

## 11. Critical Dependencies

```
Phase 0 (Recovery) → Phase 1 (Security) → Phase 2 (Database)
                                            ↓
                                        Phase 3 (Backend)
                                            ↓
                                        Phase 4 (Auth/API)
                                            ↓
                                    ┌───┴───┐
                                  Phase 5  Phase 6
                                  (Citizen)(Government)
                                    └───┬───┘
                                        ↓
                                      Phase 7 (Testing)
                                        ↓
                                      Phase 8 (Docs)
```

---

## 12. Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing backend | High | Test after each change, keep backward compatibility |
| Data loss during migration | High | Backup, test migrations, use transactions |
| Security issues missed | High | Thorough security review, test all fixes |
| Timeline overrun | Medium | Focus on P0/P1 first, document what's left |
| Merge conflicts | Medium | Follow recovery plan carefully |

---

## 13. Definition of Done

- [ ] All P0 security issues fixed
- [ ] All 14 roles implemented with dashboards
- [ ] Complete citizen reporting workflow functional
- [ ] Both responsibility chains working
- [ ] Kisii geographic data (9 sub-counties, 45 wards) seeded
- [ ] All 7 categories with all sub-issues seeded
- [ ] All apps build successfully
- [ ] Existing backend tests pass
- [ ] Critical security tests pass
- [ ] Documentation updated
- [ ] No unauthenticated PII exposure
- [ ] File uploads secured
- [ ] All changes committed (with approval)
