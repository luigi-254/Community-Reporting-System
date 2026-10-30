const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'GOVERNOR', 'CECM', 'CHIEF_OFFICER']);
const WARD_SCOPED_ROLES = new Set(['OFFICER', 'FIELD_OFFICER', 'TECHNICAL_SUPERVISOR', 'WARD_ADMIN', 'SUBCOUNTY_ADMIN']);
const DEPARTMENT_SCOPED_ROLES = new Set(['CHIEF_OFFICER', 'TECHNICAL_HEAD', 'CECM']);
const STATUS_CHANGE_ROLES = new Set(['OFFICER', 'FIELD_OFFICER', 'TECHNICAL_SUPERVISOR', 'ADMIN', 'SUPER_ADMIN']);

export function canChangeStatus(user) {
  if (!user) return false;
  return STATUS_CHANGE_ROLES.has(user.role);
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
