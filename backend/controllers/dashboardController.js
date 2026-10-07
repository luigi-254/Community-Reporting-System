import db from '../config/db.js';

const countBy = (items, key) => items.reduce((result, item) => {
  const value = item[key] || 'UNKNOWN';
  result[value] = (result[value] || 0) + 1;
  return result;
}, {});
const getReports = () => db.findReports({ page: 1, limit: 100 });

export const getDashboardOverview = async (req, res, next) => {
  try {
    const reports = await getReports();
    const officers = await db.findOfficers();
    const escalations = await db.findEscalatedReports();
    return res.status(200).json({ status: 'success', data: {
      totalReports: reports.total,
      openReports: reports.reports.filter((r) => !['RESOLVED', 'REJECTED'].includes(r.status)).length,
      resolvedReports: reports.reports.filter((r) => r.status === 'RESOLVED').length,
      activeOfficers: officers.filter((o) => o.isActive).length,
      openEscalations: escalations.length,
    }});
  } catch (error) { next(error); }
};
export const getDashboardReports = async (req, res, next) => { try { const reports = await getReports(); return res.status(200).json({ status: 'success', data: { reports, byStatus: countBy(reports.reports, 'status'), byPriority: countBy(reports.reports, 'priority') } }); } catch (error) { next(error); } };
export const getDashboardCategories = async (req, res, next) => { try { const reports = await getReports(); return res.status(200).json({ status: 'success', data: { categories: countBy(reports.reports, 'category') } }); } catch (error) { next(error); } };
export const getDashboardDepartments = async (req, res, next) => { try { const departments = await db.findDepartments(); const reports = await getReports(); const counts = countBy(reports.reports, 'departmentId'); return res.status(200).json({ status: 'success', data: { departments: departments.map((d) => ({ ...d, reportCount: counts[d.id] || 0 })) } }); } catch (error) { next(error); } };
export const getDashboardWards = async (req, res, next) => { try { const reports = await getReports(); return res.status(200).json({ status: 'success', data: { wards: countBy(reports.reports, 'ward') } }); } catch (error) { next(error); } };
export const getDashboardPerformance = async (req, res, next) => { try { const reports = await getReports(); const completed = reports.reports.filter((r) => ['RESOLVED', 'REJECTED'].includes(r.status)); const averageResolutionHours = completed.length ? completed.reduce((total, r) => total + (new Date(r.updatedAt) - new Date(r.createdAt)) / 3600000, 0) / completed.length : 0; return res.status(200).json({ status: 'success', data: { completedReports: completed.length, averageResolutionHours: Number(averageResolutionHours.toFixed(2)) } }); } catch (error) { next(error); } };
export const getDashboardEscalations = async (req, res, next) => { try { const escalations = await db.findEscalatedReports(); return res.status(200).json({ status: 'success', total: escalations.length, data: { escalations } }); } catch (error) { next(error); } };
export default { getDashboardOverview, getDashboardReports, getDashboardCategories, getDashboardDepartments, getDashboardWards, getDashboardPerformance, getDashboardEscalations };