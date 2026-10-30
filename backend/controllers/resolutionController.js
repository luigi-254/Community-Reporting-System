import db from '../config/db.js';
import { recordStatusHistory } from '../services/statusWorkflow.js';
import { canAccessReport, canChangeStatus, canPerformTransition } from '../services/jurisdiction.js';
import { notifyUser } from '../services/notifyService.js';

function isTechnicalOrOversight(user) {
  return user && ['TECHNICAL_HEAD', 'CHIEF_OFFICER', 'CECM', 'GOVERNOR', 'ADMIN', 'SUPER_ADMIN'].includes(user.role);
}

function isFieldOrTechnical(user) {
  return user && ['FIELD_OFFICER', 'TECHNICAL_SUPERVISOR', 'TECHNICAL_HEAD', 'CHIEF_OFFICER', 'CECM', 'GOVERNOR', 'ADMIN', 'SUPER_ADMIN'].includes(user.role);
}

export const createResolutionSubmission = async (req, res, next) => {
  try {
    const { reportId, status, notes, mediaUrls } = req.body;
    const report = await db.findReportById(reportId);
    if (!report) {
      return res.status(404).json({ status: 'error', message: 'Report not found.' });
    }

    // A resolution may be proposed by the assigned field officer or by technical/oversight roles.
    if (!isFieldOrTechnical(req.user)) {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden: Only field or technical roles can submit a resolution.',
      });
    }
    if (!canAccessReport(req.user, report)) {
      return res.status(403).json({ status: 'error', message: 'Forbidden: Report is outside your jurisdiction.' });
    }
    // A resolution submission only makes sense once work is underway/complete.
    if (!['IN_PROGRESS', 'COMPLETED', 'INSPECTION_IN_PROGRESS', 'RESOLUTION_SUBMITTED'].includes(report.status)) {
      return res.status(400).json({
        status: 'error',
        message: `Cannot submit a resolution for a report in '${report.status}' status.`,
      });
    }

    const submission = await db.createResolutionSubmission({
      reportId,
      submittedById: req.user.id,
      status: status || 'PENDING',
      notes,
      mediaUrls,
    });

    // Move the report into resolution-submitted phase.
    if (report.status !== 'RESOLUTION_SUBMITTED') {
      await db.updateReport(reportId, { status: 'RESOLUTION_SUBMITTED' });
      await recordStatusHistory({
        reportId,
        fromStatus: report.status,
        toStatus: 'RESOLUTION_SUBMITTED',
        notes: 'Technical resolution submitted for approval',
        actorId: req.user.id,
      });
    }

    await notifyUser(
      report.assignedOfficerId,
      'Resolution submitted',
      `A technical resolution was submitted for report ${report.id}.`,
      'INFO'
    );

    await db.createAuditLog({
      actorId: req.user.id,
      action: 'RESOLUTION_SUBMITTED',
      entityType: 'RESOLUTION_SUBMISSION',
      entityId: submission.id,
      newValue: { reportId, status: submission.status },
    });

    return res.status(201).json({
      status: 'success',
      message: 'Resolution submitted successfully.',
      data: { submission },
    });
  } catch (error) { next(error); }
};

export const getResolutionSubmissions = async (req, res, next) => {
  try {
    const { reportId, submittedById } = req.validatedQuery || req.query;
    const submissions = await db.findResolutionSubmissions({ reportId, submittedById });

    const scoped = submissions.filter((submission) => {
      const report = submission.report || null;
      if (!report) return false;
      return canAccessReport(req.user, report);
    });

    return res.status(200).json({
      status: 'success',
      total: scoped.length,
      data: { submissions: scoped },
    });
  } catch (error) { next(error); }
};

export const approveResolution = async (req, res, next) => {
  try {
    const submission = await db.findResolutionSubmissionById(req.params.id);
    if (!submission) {
      return res.status(404).json({ status: 'error', message: 'Resolution submission not found.' });
    }
    const report = await db.findReportById(submission.reportId);
    if (!report || !canAccessReport(req.user, report)) {
      return res.status(403).json({ status: 'error', message: 'Forbidden: Resolution is outside your jurisdiction.' });
    }
    if (!isTechnicalOrOversight(req.user)) {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden: Only technical heads or county-level officers may approve a resolution.',
      });
    }
    if (submission.status !== 'PENDING') {
      return res.status(400).json({
        status: 'error',
        message: `Resolution is already '${submission.status}'.`,
      });
    }

    const updated = await db.updateResolutionSubmission(req.params.id, { status: 'ACCEPTED' });

    if (report.status !== 'RESOLVED') {
      if (!canChangeStatus(req.user) || !canPerformTransition(req.user, report.status, 'RESOLVED')) {
        return res.status(403).json({
          status: 'error',
          message: `Forbidden: Role '${req.user.role}' cannot resolve this report.`,
        });
      }
      await db.updateReport(submission.reportId, {
        status: 'RESOLVED',
        resolutionStatus: 'PENDING',
        resolvedAt: new Date(),
      });
      await recordStatusHistory({
        reportId: submission.reportId,
        fromStatus: report.status,
        toStatus: 'RESOLVED',
        notes: 'Technical resolution approved, awaiting citizen verification',
        actorId: req.user.id,
      });
    }

    await notifyUser(
      report.reporterId,
      'Resolution ready for your verification',
      `A proposed resolution for report ${report.id} is ready for you to verify.`,
      'INFO'
    );

    await db.createAuditLog({
      actorId: req.user.id,
      action: 'RESOLUTION_APPROVED',
      entityType: 'RESOLUTION_SUBMISSION',
      entityId: req.params.id,
      newValue: { status: 'ACCEPTED', reportStatus: 'RESOLVED' },
    });

    return res.status(200).json({
      status: 'success',
      message: 'Resolution approved and submitted for citizen verification.',
      data: { submission: updated },
    });
  } catch (error) { next(error); }
};

export const rejectResolution = async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide a reason for returning the resolution for correction.',
      });
    }

    const submission = await db.findResolutionSubmissionById(req.params.id);
    if (!submission) {
      return res.status(404).json({ status: 'error', message: 'Resolution submission not found.' });
    }
    const report = await db.findReportById(submission.reportId);
    if (!report || !canAccessReport(req.user, report)) {
      return res.status(403).json({ status: 'error', message: 'Forbidden: Resolution is outside your jurisdiction.' });
    }
    if (!isTechnicalOrOversight(req.user)) {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden: Only technical heads or county-level officers may reject a resolution.',
      });
    }
    if (submission.status !== 'PENDING') {
      return res.status(400).json({
        status: 'error',
        message: `Resolution is already '${submission.status}'.`,
      });
    }

    const updated = await db.updateResolutionSubmission(req.params.id, {
      status: 'REJECTED',
      notes: reason,
    });

    // Return the report to in-progress for correction (not closed).
    await db.updateReport(submission.reportId, {
      status: 'IN_PROGRESS',
      resolutionStatus: null,
    });
    await recordStatusHistory({
      reportId: submission.reportId,
      fromStatus: report.status,
      toStatus: 'IN_PROGRESS',
      notes: `Resolution returned for correction: ${reason}`,
      actorId: req.user.id,
    });

    await notifyUser(
      report.assignedOfficerId,
      'Resolution returned for correction',
      `The proposed resolution for report ${report.id} was returned: ${reason}`,
      'INFO'
    );

    await db.createAuditLog({
      actorId: req.user.id,
      action: 'RESOLUTION_REJECTED',
      entityType: 'RESOLUTION_SUBMISSION',
      entityId: req.params.id,
      previousValue: { status: 'PENDING' },
      newValue: { status: 'REJECTED', reason },
    });

    return res.status(200).json({
      status: 'success',
      message: 'Resolution returned for correction.',
      data: { submission: updated },
    });
  } catch (error) { next(error); }
};

export default {
  createResolutionSubmission,
  getResolutionSubmissions,
  approveResolution,
  rejectResolution,
};
