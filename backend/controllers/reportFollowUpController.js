import db from '../config/db.js';
import { canAccessReport, scopeReportQuery } from '../services/jurisdiction.js';
import { notifyUser } from '../services/notifyService.js';

function isWardOrSubCountyAdmin(user) {
  return user && ['WARD_ADMIN', 'SUBCOUNTY_ADMIN'].includes(user.role);
}

export const createFollowUp = async (req, res, next) => {
  try {
    const { reportId, type, note } = req.body;
    const report = await db.findReportById(reportId);
    if (!report) {
      return res.status(404).json({ status: 'error', message: 'Report not found.' });
    }
    if (!canAccessReport(req.user, report)) {
      return res.status(403).json({ status: 'error', message: 'Forbidden: Report is outside your jurisdiction.' });
    }

    const followUp = await db.createFollowUp({ reportId, createdById: req.user.id, type, note });

    // Notify the assigned officer and reporter that a follow-up was recorded.
    const targets = new Set([report.assignedOfficerId, report.reporterId].filter(Boolean));
    await Promise.allSettled(
      [...targets].map((userId) =>
        notifyUser(userId, 'Administrative follow-up', `A follow-up was recorded for report ${report.id}.`, 'INFO')
      )
    );

    await db.createAuditLog({
      actorId: req.user.id,
      action: 'FOLLOW_UP_CREATED',
      entityType: 'REPORT_FOLLOW_UP',
      entityId: followUp.id,
      newValue: { reportId, type, note },
    });

    return res.status(201).json({
      status: 'success',
      message: 'Follow-up recorded successfully.',
      data: { followUp },
    });
  } catch (error) { next(error); }
};

export const getFollowUps = async (req, res, next) => {
  try {
    const { reportId, createdById, type } = req.validatedQuery || req.query;
    const followUps = await db.findFollowUps({ reportId, createdById, type });

    const scoped = followUps.filter((followUp) => {
      const report = followUp.report || null;
      if (!report) return false;
      return canAccessReport(req.user, report);
    });

    return res.status(200).json({
      status: 'success',
      total: scoped.length,
      data: { followUps: scoped },
    });
  } catch (error) { next(error); }
};

export default { createFollowUp, getFollowUps };
