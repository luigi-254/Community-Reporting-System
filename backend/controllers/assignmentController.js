import db from '../config/db.js';

export const assignReport = async (req, res, next) => {
  try {
    const { reportId, officerId, reason } = req.body;
    const report = await db.findReportById(reportId);
    const officer = await db.findOfficerById(officerId);
    if (!report) return res.status(404).json({ status: 'error', message: 'Report not found.' });
    if (!officer) return res.status(404).json({ status: 'error', message: 'Officer not found.' });
    const updatedReport = await db.updateReport(reportId, { assignedOfficerId: officerId });
    const assignment = await db.createAssignment({ reportId, officerId, assignedById: req.user.id, reason });
    return res.status(201).json({ status: 'success', message: 'Report assigned successfully.', data: { assignment, report: updatedReport } });
  } catch (error) { next(error); }
};
export const reassignReport = async (req, res, next) => {
  try {
    const { officerId, reason } = req.body;
    const report = await db.findReportById(req.params.reportId);
    const officer = await db.findOfficerById(officerId);
    if (!report) return res.status(404).json({ status: 'error', message: 'Report not found.' });
    if (!officer) return res.status(404).json({ status: 'error', message: 'Officer not found.' });
    const updatedReport = await db.updateReport(req.params.reportId, { assignedOfficerId: officerId });
    const assignment = await db.createAssignment({ reportId: req.params.reportId, officerId, assignedById: req.user.id, reason });
    return res.status(200).json({ status: 'success', message: 'Report reassigned successfully.', data: { assignment, report: updatedReport } });
  } catch (error) { next(error); }
};
export const getAssignments = async (req, res, next) => {
  try {
    const assignments = await db.findAssignments(req.validatedQuery || req.query);
    return res.status(200).json({ status: 'success', total: assignments.length, data: { assignments } });
  } catch (error) { next(error); }
};
export const getAssignmentHistory = async (req, res, next) => {
  try {
    const assignments = await db.findAssignments({ reportId: req.params.reportId });
    return res.status(200).json({ status: 'success', total: assignments.length, data: { assignments } });
  } catch (error) { next(error); }
};
export default { assignReport, reassignReport, getAssignments, getAssignmentHistory };