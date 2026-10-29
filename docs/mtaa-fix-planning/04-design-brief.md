# 04 — Design Brief

**Project:** Mtaa Fix  
**Status:** Completion blueprint for existing project  
**Last Updated:** 2026-10-22  

---

## 1. Design Philosophy

**Preserve and complete, don't redesign.** The existing admin dashboard has a working design that must be preserved. New interfaces should follow similar patterns and visual language.

---

## 2. Existing Design Audit

### 2.1 Admin Dashboard (To Preserve)
Based on code inspection:
- **Framework**: Next.js with Tailwind CSS v4
- **Layout**: Sidebar navigation + main content area
- **Header**: "Community Reporting Admin Dashboard" title
- **Sidebar**: Dashboard, Reports, Statistics, Users, Settings
- **Cards**: Metric cards with icons and numbers
- **Tables**: Data tables for reports and users
- **Colors**: Appears to use standard Tailwind palette (needs verification after fixing build)
- **Typography**: System fonts (Geist Sans referenced in layout but may not be loading)
- **Spacing**: Consistent padding/margins

### 2.2 Issues to Fix
- **CSS not loading**: Tailwind build broken, needs turbopack rule in next.config.mjs
- **Mock data**: Replace with real API calls
- **No authentication UI**: Need login flow

---

## 3. Design System

### 3.1 Color Palette (To Be Verified)
**Action Required:** Inspect actual rendered styles after fixing CSS build. Do not guess.

From Tailwind defaults likely used:
- Primary/Brand colors (to be determined)
- Success, Warning, Error, Info states
- Neutral grays
- Background colors

### 3.2 Typography
- **Font Family**: Geist Sans (referenced) or system fallback
- **Scale**: Follow Tailwind defaults
- **Weights**: 400, 500, 600, 700

### 3.3 Spacing
- Use Tailwind spacing scale (4px base)
- Consistent padding: p-4, p-6
- Gaps: gap-2, gap-4, gap-6

### 3.4 Components to Preserve/Extend
| Component | Status | Notes |
|-----------|--------|-------|
| Sidebar Navigation | Preserve structure | Extend for role-based menus |
| Metric Cards | Preserve style | Wire to real data |
| Data Tables | Preserve style | Make responsive, add actions |
| Buttons | Preserve style | Ensure accessibility |
| Forms | Need enhancement | Add proper validation states |
| Badges/Status | Preserve style | Extend for all statuses |

---

## 4. Design Requirements by Role

### 4.1 Citizen Interface
- **Clean, approachable**: Easy for all citizens to use
- **Mobile-first**: Critical for field use
- **Simple wizard**: Step-by-step reporting
- **Clear status tracking**: Visual timeline
- **Map integration**: Intuitive location selection

### 4.2 Government Interfaces
- **Information-dense**: Show relevant data efficiently
- **Role-appropriate**: Only show relevant information
- **Map-centric**: For operational roles
- **Data tables**: For case management
- **Filters**: Essential for large datasets
- **Quick actions**: Efficient workflows

### 4.3 Admin Interface
- **Preserve existing aesthetic**: Match current admin dashboard
- **Data-focused**: Tables, metrics, forms
- **Consistent navigation**: Extend sidebar pattern

---

## 5. Responsive Design
- **Mobile (< 640px)**: Stack layouts, collapsible sidebar
- **Tablet (640-1024px)**: Adapted layouts
- **Desktop (> 1024px)**: Full layouts as designed

---

## 6. Accessibility
- Semantic HTML
- ARIA labels where needed
- Keyboard navigation
- Sufficient color contrast (verify)
- Alt text for images
- Focus indicators
- Screen reader support

---

## 7. Preservation Register

| Element | Classification | Action |
|---------|---------------|--------|
| Admin dashboard sidebar structure | Preserve as implemented | Extend with role-based items |
| Metric card design | Preserve as implemented | Wire to real data |
| Table layouts | Preserve as implemented | Make functional |
| Color scheme | Await verification | Check after CSS fix |
| Typography | Await verification | Check after CSS fix |
| Spacing patterns | Preserve as implemented | Follow existing patterns |
| Button styles | Preserve as implemented | Extend for variants |
| Form elements | Complete without redesign | Add validation states |

---

## 8. Design Tokens (To Be Established)
After CSS build is fixed, document actual values:
- Colors (primary, secondary, success, warning, danger, info, neutral)
- Spacing scale
- Border radius
- Shadows
- Font sizes/weights
- Breakpoints

---

## 9. Visual Acceptance Criteria
- [ ] Admin dashboard renders with proper styling after fix
- [ ] All new pages follow established patterns
- [ ] Mobile responsive on all interfaces
- [ ] Consistent navigation across roles
- [ ] Status colors are clear and accessible
- [ ] Forms are usable and validate properly
- [ ] Maps integrate cleanly
- [ ] No design regressions in existing pages
