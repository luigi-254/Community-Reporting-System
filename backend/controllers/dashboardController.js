import db from '../config/db.js';
import { scopeDashboardQuery } from '../services/jurisdiction.js';

const countBy = (items, key) => items.reduce((result, item) => {
  const value = item[key] || 'UNKNOWN';
  result[value] = (result[value] || 0) + 1;
  return result;
}, {});

/**
 * Fetch the full report list (page 1, limit 100) scoped to the caller's
 * jurisdiction. Returns `{ reports, total }` shaped for dashboard consumption.
 */
const getScopedReports = async (user) => {
  const query = scopeDashboardQuery(user, { page: 1, limit: 100 });
  const reports = await db.findReports(query);
  return reports;
};

const isOpen = (status) => !['RESOLVED', 'REJECTED', 'CLOSED', 'CANCELLED'].includes(status);
const isOverdue = (report) => {
  // A report is treated as overdue when it has been open for more than 7 days
  // and has not reached a terminal state.
  if (!isOpen(report.status)) return false;
  const ageDays = (Date.now() - new Date(report.createdAt).getTime()) / 86400000;
  return ageDays > 7;
};

/**
 * Build a scope descriptor describing what the authenticated user may see.
 */
function scopeDescriptor(user) {
  if (!user) return { label: 'Unauthenticated', level: 'none' };
  if (user.role === 'GOVERNOR') {
    return { label: 'County-wide (Kisii)', level: 'county' };
  }
  if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
    return { label: 'System-wide', level: 'system' };
  }
  if (
    user.role === 'CECM' ||
    user.role === 'CHIEF_OFFICER' ||
    user.role === 'TECHNICAL_HEAD' ||
    user.role === 'DISASTER_MANAGER' ||
    user.role === 'ENFORCEMENT_OFFICER'
  ) {
    return { label: `Department: ${user.departmentId || 'unassigned'}`, level: 'department' };
  }
  if (user.role === 'SUBCOUNTY_ADMIN') {
    return { label: `Sub-County: ${user.subCountyId || 'unassigned'}`, level: 'subcounty' };
  }
  return { label: `Ward: ${user.wardId || 'unassigned'}`, level: 'ward' };
}

export const getDashboardOverview = async (req, res, next) => {
  try {
    const user = req.user;
    const reports = await getScopedReports(user);
    const officers = await db.findOfficers();
    const escalations = await db.findEscalatedReports();

    const scopedReports = reports.reports;
    const openReports = scopedReports.filter((r) => isOpen(r.status));
    const resolvedReports = scopedReports.filter((r) => r.status === 'RESOLVED');
    const overdueReports = scopedReports.filter(isOverdue);

    const data = {
      scope: scopeDescriptor(user),
      totalReports: reports.total,
      openReports: openReports.length,
      resolvedReports: resolvedReports.length,
      overdueReports: overdueReports.length,
      resolutionRate: reports.total
        ? Number(((resolvedReports.length / reports.total) * 100).toFixed(2))
        : 0,
      activeOfficers: officers.filter((o) => o.isActive).length,
      openEscalations: escalations.length,
    };

    // Role-specific additions.
    if (user.role === 'GOVERNOR' || user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      data.countyWide = true;
    }
    if (
      user.role === 'CECM' ||
      user.role === 'CHIEF_OFFICER' ||
      user.role === 'TECHNICAL_HEAD'
    ) {
      data.departmentId = user.departmentId || null;
    }
    if (
      user.role === 'TECHNICAL_SUPERVISOR' ||
      user.role === 'FIELD_OFFICER' ||
      user.role === 'OFFICER'
    ) {
      data.assignedToMe = scopedReports.filter(
        (r) => r.assignedOfficerId === user.id
      ).length;
    }
    if (user.role === 'WARD_ADMIN' || user.role === 'SUBCOUNTY_ADMIN') {
      data.wardId = user.wardId || null;
      data.subCountyId = user.subCountyId || null;
    }

    return res.status(200).json({ status: 'success', data });
  } catch (error) { next(error); }
};

export const getDashboardReports = async (req, res, next) => {
  try {
    const reports = await getScopedReports(req.user);
    return res.status(200).json({
      status: 'success',
      data: {
        reports: reports.reports,
        total: reports.total,
        byStatus: countBy(reports.reports, 'status'),
        byPriority: countBy(reports.reports, 'priority'),
      },
    });
  } catch (error) { next(error); }
};

export const getDashboardCategories = async (req, res, next) => {
  try {
    const reports = await getScopedReports(req.user);
    return res.status(200).json({
      status: 'success',
      data: { categories: countBy(reports.reports, 'category') },
    });
  } catch (error) { next(error); }
};

export const getDashboardDepartments = async (req, res, next) => {
  try {
    const departments = await db.findDepartments();
    const reports = await getScopedReports(req.user);
    const counts = countBy(reports.reports, 'departmentId');
    return res.status(200).json({
      status: 'success',
      data: {
        departments: departments.map((d) => ({
          ...d,
          reportCount: counts[d.id] || 0,
        })),
      },
    });
  } catch (error) { next(error); }
};

export const getDashboardWards = async (req, res, next) => {
  try {
    const reports = await getScopedReports(req.user);
    return res.status(200).json({
      status: 'success',
      data: { wards: countBy(reports.reports, 'ward') },
    });
  } catch (error) { next(error); }
};

export const getDashboardPerformance = async (req, res, next) => {
  try {
    const reports = await getScopedReports(req.user);
    const completed = reports.reports.filter((r) => ['RESOLVED', 'REJECTED'].includes(r.status));
    const averageResolutionHours = completed.length
      ? completed.reduce(
          (total, r) =>
            total + (new Date(r.updatedAt) - new Date(r.createdAt)) / 3600000,
          0,
        ) / completed.length
      : 0;
    return res.status(200).json({
      status: 'success',
      data: {
        completedReports: completed.length,
        averageResolutionHours: Number(averageResolutionHours.toFixed(2)),
        overdueReports: reports.reports.filter(isOverdue).length,
      },
    });
  } catch (error) { next(error); }
};

export const getDashboardEscalations = async (req, res, next) => {
  try {
    const escalations = await db.findEscalatedReports();
    return res.status(200).json({
      status: 'success',
      total: escalations.length,
      data: { escalations },
    });
  } catch (error) { next(error); }
};

export default {
  getDashboardOverview,
  getDashboardReports,
  getDashboardCategories,
  getDashboardDepartments,
  getDashboardWards,
  getDashboardPerformance,
  getDashboardEscalations,
};
