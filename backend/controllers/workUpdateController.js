import db from '../config/db.js';
import { recordStatusHistory } from '../services/statusWorkflow.js';
import { canAccessReport } from '../services/jurisdiction.js';
import { notifyUser } from '../services/notifyService.js';

function isFieldOfficer(user) {
  return user && user.role === 'FIELD_OFFICER';
}

function isSupervisory(user) {
  return user && ['TECHNICAL_SUPERVISOR', 'TECHNICAL_HEAD', 'CHIEF_OFFICER', 'CECM', 'GOVERNOR', 'ADMIN', 'SUPER_ADMIN'].includes(user.role);
}

export const createWorkUpdate = async (req, res, next) => {
  try {
    const { reportId, note, status } = req.body;
    const report = await db.findReportById(reportId);
    if (!report) {
      return res.status(404).json({ status: 'error', message: 'Report not found.' });
    }

    // Only the assigned field officer may record work updates for a report.
    if (!isFieldOfficer(req.user) || report.assignedOfficerId !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden: Only the assigned field officer can record work updates for this report.',
      });
    }
    if (!canAccessReport(req.user, report)) {
      return res.status(403).json({ status: 'error', message: 'Forbidden: Report is outside your jurisdiction.' });
    }

    const workUpdate = await db.createWorkUpdate({ reportId, officerId: req.user.id, note, status });

    await notifyUser(
      report.assignedOfficerId,
      'Work update recorded',
      `A work update was recorded for report ${report.id}.`,
      'INFO'
    );

    await db.createAuditLog({
      actorId: req.user.id,
      action: 'WORK_UPDATE_CREATED',
      entityType: 'WORK_UPDATE',
      entityId: workUpdate.id,
      newValue: { reportId, status: workUpdate.status },
    });

    return res.status(201).json({
      status: 'success',
      message: 'Work update recorded successfully.',
      data: { workUpdate },
    });
  } catch (error) { next(error); }
};

export const getWorkUpdates = async (req, res, next) => {
  try {
    const { reportId, officerId } = req.validatedQuery || req.query;
    const updates = await db.findWorkUpdates({ reportId, officerId });

    const scoped = updates.filter((update) => {
      const report = update.report || null;
      if (!report) return false;
      return canAccessReport(req.user, report);
    });

    return res.status(200).json({
      status: 'success',
      total: scoped.length,
      data: { workUpdates: scoped },
    });
  } catch (error) { next(error); }
};

export const getWorkUpdate = async (req, res, next) => {
  try {
    const workUpdate = await db.findWorkUpdateById(req.params.id);
    if (!workUpdate) {
      return res.status(404).json({ status: 'error', message: 'Work update not found.' });
    }
    const report = await db.findReportById(workUpdate.reportId);
    if (!report || !canAccessReport(req.user, report)) {
      return res.status(403).json({ status: 'error', message: 'Forbidden: Work update is outside your jurisdiction.' });
    }
    if (isFieldOfficer(req.user) && workUpdate.officerId !== req.user.id && !isSupervisory(req.user)) {
      return res.status(403).json({ status: 'error', message: 'Forbidden: You may only view your own work updates.' });
    }
    return res.status(200).json({ status: 'success', data: { workUpdate } });
  } catch (error) { next(error); }
};

export const updateWorkUpdate = async (req, res, next) => {
  try {
    const workUpdate = await db.findWorkUpdateById(req.params.id);
    if (!workUpdate) {
      return res.status(404).json({ status: 'error', message: 'Work update not found.' });
    }
    const report = await db.findReportById(workUpdate.reportId);
    if (!report || !canAccessReport(req.user, report)) {
      return res.status(403).json({ status: 'error', message: 'Forbidden: Work update is outside your jurisdiction.' });
    }

    const isOwner = workUpdate.officerId === req.user.id;
    if (isFieldOfficer(req.user) && !isOwner && !isSupervisory(req.user)) {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden: Only the recording officer or a supervisor may update this work update.',
      });
    }

    const updated = await db.updateWorkUpdate(req.params.id, req.body);

    await db.createAuditLog({
      actorId: req.user.id,
      action: 'WORK_UPDATE_UPDATED',
      entityType: 'WORK_UPDATE',
      entityId: req.params.id,
      previousValue: { status: workUpdate.status },
      newValue: { status: updated.status },
    });

    return res.status(200).json({
      status: 'success',
      message: 'Work update updated successfully.',
      data: { workUpdate: updated },
    });
  } catch (error) { next(error); }
};

export default { createWorkUpdate, getWorkUpdates, getWorkUpdate, updateWorkUpdate };
