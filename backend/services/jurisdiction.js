import { isValidTransition } from './statusWorkflow.js';

const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'GOVERNOR', 'CECM', 'CHIEF_OFFICER']);
const WARD_SCOPED_ROLES = new Set(['OFFICER', 'FIELD_OFFICER', 'TECHNICAL_SUPERVISOR', 'WARD_ADMIN', 'SUBCOUNTY_ADMIN']);
const DEPARTMENT_SCOPED_ROLES = new Set(['CHIEF_OFFICER', 'TECHNICAL_HEAD', 'CECM']);
const STATUS_CHANGE_ROLES = new Set(['OFFICER', 'FIELD_OFFICER', 'TECHNICAL_SUPERVISOR', 'ADMIN', 'SUPER_ADMIN']);

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
  // Ward-scoped roles: must match ward and sub-county
  if (WARD_SCOPED_ROLES.has(user.role)) {
    if (user.ward && report.ward && user.ward !== report.ward) return false;
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
  if (WARD_SCOPED_ROLES.has(user.role) && user.ward) {
    return { ...query, ward: user.ward };
  }
  if (DEPARTMENT_SCOPED_ROLES.has(user.role) && user.departmentId) {
    return { ...query, departmentId: user.departmentId };
  }
  return query;
}

export { ADMIN_ROLES, WARD_SCOPED_ROLES, DEPARTMENT_SCOPED_ROLES, STATUS_CHANGE_ROLES };
