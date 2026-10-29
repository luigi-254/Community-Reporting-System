# 05 — Database Schema Specification

**Project:** Mtaa Fix  
**Status:** Completion blueprint for existing project  
**Last Updated:** 2026-10-22  

---

## 1. Current State

### 1.1 Existing Schema (Prisma)
Location: `backend/prisma/schema.prisma` (322 lines)  
16 models exist. **No migration files.** No prisma CLI dependency.  
Critical issues: missing FKs, missing models, incomplete role model.

### 1.2 Data Issues
- Only 47 counties seeded, only Nairobi has sub-counties/wards
- Kisii County has 0 sub-counties, 0 wards
- No categories/subcategories seeded
- No departments seeded
- No officials/MCA/MP data
- Many relationships use plain strings instead of FKs

---

## 2. Required Schema Changes

### 2.1 Expand Role Enum
Current: `CITIZEN | OFFICER | ADMIN | SUPER_ADMIN`  
Required: Add `WARD_ADMIN | SUBCOUNTY_ADMIN | TECHNICAL_SUPERVISOR | TECHNICAL_HEAD | CHIEF_OFFICER | CECM | GOVERNOR | DISASTER_MANAGER | ENFORCEMENT_OFFICER | DEPARTMENTAL_ADMIN | FIELD_OFFICER` (or map appropriately)

### 2.2 Enhance User Model
Add fields for jurisdictional scoping:
- `wardId`, `subCountyId`, `countyId` (proper FKs)
- `roleScope` or use junction tables
- Better department relationship

### 2.3 Geographic Models
Enhance existing County/SubCounty/Ward:
- Add proper codes, slugs
- Add indexes
- Seed Kisii data (9 sub-counties, 45 wards)
- Consider adding Village model later if needed

### 2.4 Report Model Enhancements
- Add proper FKs to geographic models (not just strings)
- Add `reportStatusHistory` relation
- Add `inspections`, `progressUpdates` relations
- Ensure all required fields present

### 2.5 Missing Models Needed
| Model | Purpose | Priority |
|-------|---------|----------|
| `ReportStatusHistory` | Track all status transitions with actor/timestamp | P0 |
| `Inspection` | Field officer inspections | P1 |
| `ProgressUpdate` | Progress notes and updates | P1 |
| `ReportVerification` | Citizen verification records | P1 |
| `Official` | County officials, MCAs, MPs | P1 |
| `OrganizationalAssignment` | Link officials to positions/wards | P1 |
| `SlaPolicy` | SLA configuration | P2 |
| `SystemSetting` | Configurable settings | P2 |

---

## 3. Migration Strategy

### 3.1 Approach
1. **Add Prisma CLI** as devDependency
2. **Create initial migration** from current schema
3. **Add migrations incrementally** for changes
4. **Create seed scripts** for all required data
5. **Never modify existing data destructively**

### 3.2 Migration Plan
1. Setup Prisma properly (add CLI, generate client)
2. Create baseline migration
3. Expand Role enum
4. Add missing models
5. Enhance existing models with proper FKs
6. Add indexes
7. Create data migration seeds
8. Test migrations

---

## 4. Seed Data Requirements

### 4.1 Geographic Data (Kisii County)
9 Sub-counties/Constituencies:
1. Bonchari (4 wards)
2. South Mugirango (6 wards)
3. Bomachoge Borabu (4 wards)
4. Bobasi (8 wards)
5. Nyaribari Masaba (5 wards)
6. Bomachoge Chache (3 wards)
7. Nyaribari Chache (6 wards)
8. Kitutu Chache North (4 wards)
9. Kitutu Chache South (5 wards)
Total: 45 wards

### 4.2 Categories and Subcategories
All 7 categories with all sub-issues as specified in master prompt.

### 4.3 Departments
- Infrastructure, Roads & Public Works
- Water, Environment, Natural Resources, Energy & Climate Change
- Public Service, County Administration & Participatory Development
- Trade, Tourism, Industry & Marketing
- Youth, Sports, Culture, Arts & Social Services
- Health (if needed)
- Others as required

### 4.4 Leadership Data
County officials as specified in master prompt (for reference/configuration).

---

## 5. Data Integrity Rules

- Foreign key constraints where appropriate
- Unique constraints on natural keys
- Check constraints for valid enums
- Cascade rules carefully considered
- Soft deletes where needed
- Audit fields (createdAt, updatedAt, createdBy, updatedBy)
- Prevent deletion of referenced data

---

## 6. Indexing Strategy
Add indexes on:
- Foreign keys
- Frequently queried fields (status, category, ward, department)
- Search fields
- Date ranges
- Composite indexes for common queries

---

## 7. Implementation Notes

- **Don't break existing data**: All changes must be backward compatible
- **Use migrations**: Never use `prisma db push` in production
- **Test migrations**: Test on copy of data
- **Document changes**: Update schema documentation
- **Fix silent fallback**: Make database requirement explicit or handle gracefully
- **Add proper types**: Ensure Prisma types are generated
