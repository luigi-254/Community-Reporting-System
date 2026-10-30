import { isValidTransition } from './statusWorkflow.js';

const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'GOVERNOR', 'CECM', 'CHIEF_OFFICER']);
const WARD_SCOPED_ROLES = new Set(['OFFICER', 'FIELD_OFFICER', 'TECHNICAL_SUPERVISOR', 'WARD_ADMIN', 'SUBCOUNTY_ADMIN']);
const DEPARTMENT_SCOPED_ROLES = new Set(['CHIEF_OFFICER', 'TECHNICAL_HEAD', 'CECM', 'DISASTER_MANAGER', 'ENFORCEMENT_OFFICER']);
const STATUS_CHANGE_ROLES = new Set(['OFFICER', 'FIELD_OFFICER', 'TECHNICAL_SUPERVISOR', 'TECHNICAL_HEAD', 'CHIEF_OFFICER', 'CECM', 'GOVERNOR', 'ADMIN', 'SUPER_ADMIN', 'DISASTER_MANAGER', 'ENFORCEMENT_OFFICER']);

// Role-based transition permissions:
// - ADMIN/SUPER_ADMIN: any valid transition
// - FIELD_OFFICER/OFFICER: field-level work (assign, inspect, work, submit resolution)
// - TECHNICAL_SUPERVISOR: supervise and approve field work
// - TECHNICAL_HEAD/CHIEF_OFFICER/CECM/GOVERNOR: oversight (escalate, close, reopen)
// - WARD_ADMIN/SUBCOUNTY_ADMIN: monitoring only, no status changes
export function canChangeStatus(user) {
  if (!user) return false;
  return STATUS_CHANGE_ROLES.has(user.role);
}

export function canPerformTransition(user, fromStatus, toStatus) {
  if (!user || !fromStatus || !toStatus) return false;

  // ADMIN/SUPER_ADMIN can perform any valid transition
  if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') return true;

  // WARD_ADMIN and SUBCOUNTY_ADMIN: monitoring only, no status changes
  if (user.role === 'WARD_ADMIN' || user.role === 'SUBCOUNTY_ADMIN') return false;

  // The transition must be valid per the workflow state machine
  if (!isValidTransition(fromStatus, toStatus)) return false;

  // FIELD_OFFICER and OFFICER: field-level work only
  // Cannot close, reopen, or escalate (those are oversight actions)
  if (user.role === 'FIELD_OFFICER' || user.role === 'OFFICER') {
    if (toStatus === 'CLOSED' || toStatus === 'REOPENED' || toStatus === 'ESCALATED') return false;
    return true;
  }

  // TECHNICAL_SUPERVISOR: can supervise and approve, but not close
  if (user.role === 'TECHNICAL_SUPERVISOR') {
    if (toStatus === 'CLOSED') return false;
    return true;
  }

  // TECHNICAL_HEAD, CHIEF_OFFICER, CECM, GOVERNOR: oversight roles
  // Can perform any valid transition (escalate, close, reopen, etc.)
  return true;
}

export function canAccessReport(user, report) {
  if (!user || !report) return false;
  if (ADMIN_ROLES.has(user.role)) return true;
  if (user.role === 'CITIZEN') {
    return report.reporterId === user.id || !report.isAnonymous;
  }
  // Field Officer: only their personally assigned reports.
  if (user.role === 'FIELD_OFFICER') {
    return report.assignedOfficerId === user.id;
  }
  // Technical Supervisor: reports in their ward AND department.
  if (user.role === 'TECHNICAL_SUPERVISOR') {
    if (user.wardId && report.wardId && user.wardId !== report.wardId) return false;
    if (user.departmentId && report.departmentId && user.departmentId !== report.departmentId) return false;
    return true;
  }
  // Ward-scoped roles: must match ward (denormalized string primary, FK
  // confirmation secondary) and sub-county. The string comparison works across
  // the memoryStore / database boundary where wardId FKs may differ.
  if (WARD_SCOPED_ROLES.has(user.role)) {
    // FK mismatch when both sides have FKs
    if (user.wardId && report.wardId && user.wardId !== report.wardId) return false;
    // Denormalized ward name match
    if (user.ward && report.ward && user.ward !== report.ward) return false;
    // If the user is ward-bound but the report has no ward info at all,
    // membership cannot be confirmed.
    if (user.wardId && !report.ward && !report.wardId) return false;
    if (user.ward && !report.ward && !report.wardId) return false;
    // Sub-county confirmation
    if (user.subCountyId && report.subCountyId && user.subCountyId !== report.subCountyId) return false;
    if (user.subCounty && report.subCounty && user.subCounty !== report.subCounty) return false;
    return true;
  }
  // Department-scoped roles: must match department
  if (DEPARTMENT_SCOPED_ROLES.has(user.role)) {
    if (user.departmentId && report.departmentId && user.departmentId !== report.departmentId) return false;
    return true;
  }
  return false;
}

export function scopeReportQuery(user, query = {}) {
  if (!user || ADMIN_ROLES.has(user.role)) return query;
  // Field Officer: only personally assigned reports.
  if (user.role === 'FIELD_OFFICER' && user.id) {
    return { ...query, assignedOfficerId: user.id };
  }
  // Technical Supervisor: their ward AND department.
  if (user.role === 'TECHNICAL_SUPERVISOR') {
    if (user.wardId && user.departmentId) {
      return { ...query, wardId: user.wardId, departmentId: user.departmentId };
    }
    if (user.wardId) return { ...query, wardId: user.wardId };
    if (user.departmentId) return { ...query, departmentId: user.departmentId };
  }
  // Ward-scoped roles: scope via denormalized ward string first (works across
  // memoryStore / database boundary), then wardId FK.
  if (WARD_SCOPED_ROLES.has(user.role)) {
    if (user.ward) return { ...query, ward: user.ward };
    if (user.wardId) return { ...query, wardId: user.wardId };
  }
  if (DEPARTMENT_SCOPED_ROLES.has(user.role) && user.departmentId) {
    return { ...query, departmentId: user.departmentId };
  }
  return query;
}

/**
 * Scope a dashboard query to the caller's jurisdiction.
 *
 * Dashboard scoping is stricter than the general report-list scoping for
 * executive/oversight roles:
 *   - GOVERNOR / ADMIN / SUPER_ADMIN : no scope (county-wide / system-wide)
 *   - CECM / CHIEF_OFFICER / TECHNICAL_HEAD : assigned department only
 *   - WARD-scoped roles : assigned ward only
 *
 * This keeps the existing `scopeReportQuery` (used by the public report list)
 * unchanged while giving dashboards role-appropriate data.
 */
export function scopeDashboardQuery(user, query = {}) {
  if (!user) return query;
  // County-wide / system-wide oversight: see everything.
  if (
    user.role === 'GOVERNOR' ||
    user.role === 'ADMIN' ||
    user.role === 'SUPER_ADMIN'
  ) {
    return query;
  }
  // Department-scoped oversight roles see only their department's reports.
  // Covers CECM, Chief Officer, Technical Head, Disaster Manager, Enforcement Officer.
  if (DEPARTMENT_SCOPED_ROLES.has(user.role) && user.departmentId) {
    return { ...query, departmentId: user.departmentId };
  }
  // Sub-County Administrator: see all reports within their sub-county.
  if (user.role === 'SUBCOUNTY_ADMIN' && user.subCountyId) {
    return { ...query, subCountyId: user.subCountyId };
  }
  // Ward-scoped operational roles see only their ward's reports.
  if (WARD_SCOPED_ROLES.has(user.role) && user.wardId) {
    return { ...query, wardId: user.wardId };
  }
  return query;
}

export { ADMIN_ROLES, WARD_SCOPED_ROLES, DEPARTMENT_SCOPED_ROLES, STATUS_CHANGE_ROLES };
