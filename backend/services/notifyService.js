import db from '../config/db.js';

export async function notifyUser(userId, title, message, type = 'INFO') {
  if (!userId) return null;
  try {
    return await db.createNotification({ userId, title, message, type });
  } catch (err) {
    console.warn('[Notify] Notification failed:', err.message);
    return null;
  }
}

export async function notifyReportStatus(report, status, notes) {
  if (!report) return;
  const title = `Report ${report.referenceCode || report.id}: ${status.replaceAll('_', ' ')}`;
  const message = notes
    ? `Status changed to ${status.replaceAll('_', ' ')}. ${notes}`
    : `Status changed to ${status.replaceAll('_', ' ')}.`;

  const targets = new Set([report.reporterId, report.assignedOfficerId].filter(Boolean));
  await Promise.allSettled(
    [...targets].map((userId) => notifyUser(userId, title, message, 'STATUS'))
  );
}
