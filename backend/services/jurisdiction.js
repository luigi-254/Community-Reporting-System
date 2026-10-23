const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'GOVERNOR', 'CECM', 'CHIEF_OFFICER']);
const WARD_SCOPED_ROLES = new Set(['OFFICER', 'FIELD_OFFICER', 'TECHNICAL_SUPERVISOR', 'WARD_ADMIN']);

export function canAccessReport(user, report) {
  if (!user || !report) return false;
  if (ADMIN_ROLES.has(user.role)) return true;
  if (user.role === 'CITIZEN') {
    return report.reporterId === user.id || !report.isAnonymous;
  }
  if (user.ward && report.ward && user.ward !== report.ward) return false;
  if (user.subCounty && report.subCounty && user.subCounty !== report.subCounty) return false;
  return true;
}

export function scopeReportQuery(user, query = {}) {
  if (!user || ADMIN_ROLES.has(user.role)) return query;
  if (WARD_SCOPED_ROLES.has(user.role) && user.ward) {
    return { ...query, ward: user.ward };
  }
  return query;
}
