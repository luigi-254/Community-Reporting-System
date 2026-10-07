import db from '../config/db.js';

export const getEscalatedReports = async (req, res, next) => {
  try {
    const escalations = await db.findEscalatedReports();
    return res.status(200).json({ status: 'success', total: escalations.length, data: { escalations } });
  } catch (error) { next(error); }
};

export const getEscalation = async (req, res, next) => {
  try {
    const escalation = await db.findEscalationById(req.params.id);
    if (!escalation) return res.status(404).json({ status: 'error', message: 'Escalation not found.' });
    return res.status(200).json({ status: 'success', data: { escalation } });
  } catch (error) { next(error); }
};

export const manuallyEscalate = async (req, res, next) => {
  try {
    const { reportId, reason, priority } = req.body;
    const report = await db.findReportById(reportId);
    if (!report) return res.status(404).json({ status: 'error', message: 'Report not found.' });
    const existing = await db.findEscalationByReportId(reportId);
    if (existing) return res.status(409).json({ status: 'error', message: 'Report is already escalated.' });
    const escalation = await db.createEscalation({ reportId, reason, priority, escalatedById: req.user.id });
    await db.updateReport(reportId, { status: 'ESCALATED' });
    await db.createAuditLog({
      actorId: req.user.id,
      action: 'MANUALLY_ESCALATE',
      entityType: 'REPORT',
      entityId: reportId,
      previousValue: { status: report.status },
      newValue: { status: 'ESCALATED', escalationId: escalation.id },
    });
    return res.status(201).json({ status: 'success', message: 'Report escalated successfully.', data: { escalation } });
  } catch (error) { next(error); }
};

export const resolveEscalation = async (req, res, next) => {
  try {
    const existing = await db.findEscalationById(req.params.id);
    if (!existing) return res.status(404).json({ status: 'error', message: 'Escalation not found.' });
    const escalation = await db.resolveEscalation(req.params.id, { ...req.body, resolvedById: req.user.id });
    await db.updateReport(existing.reportId, { status: 'UNDER_REVIEW' });
    await db.createAuditLog({
      actorId: req.user.id,
      action: 'RESOLVE_ESCALATION',
      entityType: 'ESCALATION',
      entityId: req.params.id,
      previousValue: { status: existing.status },
      newValue: { status: escalation.status, resolutionNotes: escalation.resolutionNotes },
    });
    return res.status(200).json({ status: 'success', message: 'Escalation resolved successfully.', data: { escalation } });
  } catch (error) { next(error); }
};

export default { getEscalatedReports, getEscalation, manuallyEscalate, resolveEscalation };