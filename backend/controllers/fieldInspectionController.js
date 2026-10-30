import db from '../config/db.js';
import { recordStatusHistory } from '../services/statusWorkflow.js';
import { canAccessReport, canChangeStatus, scopeReportQuery } from '../services/jurisdiction.js';
import { notifyUser } from '../services/notifyService.js';

function isFieldOfficer(user) {
  return user && user.role === 'FIELD_OFFICER';
}

function isSupervisory(user) {
  return user && ['TECHNICAL_SUPERVISOR', 'TECHNICAL_HEAD', 'CHIEF_OFFICER', 'CECM', 'GOVERNOR', 'ADMIN', 'SUPER_ADMIN'].includes(user.role);
}

export const createInspection = async (req, res, next) => {
  try {
    const { reportId, findings, actionTaken, status, mediaUrls } = req.body;
    const report = await db.findReportById(reportId);
    if (!report) {
      return res.status(404).json({ status: 'error', message: 'Report not found.' });
    }

    // Only the assigned field officer may record an inspection for a report.
    if (!isFieldOfficer(req.user) || report.assignedOfficerId !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden: Only the assigned field officer can record an inspection for this report.',
      });
    }
    if (!canAccessReport(req.user, report)) {
      return res.status(403).json({ status: 'error', message: 'Forbidden: Report is outside your jurisdiction.' });
    }

    const inspection = await db.createInspection({
      reportId,
      officerId: req.user.id,
      findings,
      actionTaken,
      status,
      mediaUrls,
    });

    // Advance the report into inspection phase when it was assigned/acknowledged.
    if (['SUBMITTED', 'ASSIGNED', 'ACKNOWLEDGED', 'IN_PROGRESS'].includes(report.status)) {
      await db.updateReport(reportId, { status: 'INSPECTION_IN_PROGRESS' });
      await recordStatusHistory({
        reportId,
        fromStatus: report.status,
        toStatus: 'INSPECTION_IN_PROGRESS',
        notes: 'Field inspection started',
        actorId: req.user.id,
      });
    }

    await notifyUser(
      report.assignedOfficerId,
      'Inspection recorded',
      `An inspection was recorded for report ${report.id}.`,
      'INFO'
    );

    await db.createAuditLog({
      actorId: req.user.id,
      action: 'INSPECTION_CREATED',
      entityType: 'FIELD_INSPECTION',
      entityId: inspection.id,
      newValue: { reportId, status: inspection.status },
    });

    return res.status(201).json({
      status: 'success',
      message: 'Inspection recorded successfully.',
      data: { inspection },
    });
  } catch (error) { next(error); }
};

export const getInspections = async (req, res, next) => {
  try {
    const { reportId, officerId, status } = req.validatedQuery || req.query;
    const inspections = await db.findInspections({ reportId, officerId, status });

    // Jurisdiction filter: only return inspections for reports the caller may see.
    const scoped = inspections.filter((inspection) => {
      const report = inspection.report || null;
      if (!report) return false;
      return canAccessReport(req.user, report);
    });

    return res.status(200).json({
      status: 'success',
      total: scoped.length,
      data: { inspections: scoped },
    });
  } catch (error) { next(error); }
};

export const getInspection = async (req, res, next) => {
  try {
    const inspection = await db.findInspectionById(req.params.id);
    if (!inspection) {
      return res.status(404).json({ status: 'error', message: 'Inspection not found.' });
    }
    const report = await db.findReportById(inspection.reportId);
    if (!report || !canAccessReport(req.user, report)) {
      return res.status(403).json({ status: 'error', message: 'Forbidden: Inspection is outside your jurisdiction.' });
    }
    // Field officers may only view their own inspections unless supervisory.
    if (isFieldOfficer(req.user) && inspection.officerId !== req.user.id && !isSupervisory(req.user)) {
      return res.status(403).json({ status: 'error', message: 'Forbidden: You may only view your own inspections.' });
    }
    return res.status(200).json({ status: 'success', data: { inspection } });
  } catch (error) { next(error); }
};

export const updateInspection = async (req, res, next) => {
  try {
    const inspection = await db.findInspectionById(req.params.id);
    if (!inspection) {
      return res.status(404).json({ status: 'error', message: 'Inspection not found.' });
    }
    const report = await db.findReportById(inspection.reportId);
    if (!report || !canAccessReport(req.user, report)) {
      return res.status(403).json({ status: 'error', message: 'Forbidden: Inspection is outside your jurisdiction.' });
    }

    const isOwner = inspection.officerId === req.user.id;
    if (isFieldOfficer(req.user) && !isOwner && !isSupervisory(req.user)) {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden: Only the recording officer or a supervisor may update this inspection.',
      });
    }

    const updated = await db.updateInspection(req.params.id, req.body);

    // If the inspection is completed, move the report forward.
    if (req.body.status === 'COMPLETED' && report.status === 'INSPECTION_IN_PROGRESS') {
      await db.updateReport(inspection.reportId, { status: 'IN_PROGRESS' });
      await recordStatusHistory({
        reportId: inspection.reportId,
        fromStatus: 'INSPECTION_IN_PROGRESS',
        toStatus: 'IN_PROGRESS',
        notes: 'Inspection completed, work in progress',
        actorId: req.user.id,
      });
      await notifyUser(
        report.assignedOfficerId,
        'Inspection completed',
        `Inspection for report ${inspection.reportId} marked complete.`,
        'INFO'
      );
    }

    await db.createAuditLog({
      actorId: req.user.id,
      action: 'INSPECTION_UPDATED',
      entityType: 'FIELD_INSPECTION',
      entityId: req.params.id,
      previousValue: { status: inspection.status },
      newValue: { status: updated.status },
    });

    return res.status(200).json({
      status: 'success',
      message: 'Inspection updated successfully.',
      data: { inspection: updated },
    });
  } catch (error) { next(error); }
};

export default { createInspection, getInspections, getInspection, updateInspection };
