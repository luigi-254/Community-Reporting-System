import db from '../config/db.js';

const DEFAULT_SLA_HOURS = 48;
const TERMINAL = new Set(['RESOLVED', 'CLOSED', 'REJECTED', 'DUPLICATE', 'CANCELLED']);

async function slaHoursFor(report) {
  if (!report.subcategoryId) return DEFAULT_SLA_HOURS;
  try {
    const subcategory = await db.findSubcategoryById(report.subcategoryId);
    if (subcategory?.slaHours) return subcategory.slaHours;
  } catch (err) {
    console.warn('[SLA] Subcategory lookup failed:', err.message);
  }
  return DEFAULT_SLA_HOURS;
}

export async function findOverdueReports() {
  const { reports = [] } = await db.findReports({ page: 1, limit: 1000 });
  const now = Date.now();
  const overdue = [];

  for (const report of reports) {
    if (TERMINAL.has(report.status)) continue;
    const slaHours = await slaHoursFor(report);
    const dueAt = new Date(report.createdAt).getTime() + slaHours * 3600 * 1000;
    if (now <= dueAt) continue;
    overdue.push({
      report,
      slaHours,
      dueAt: new Date(dueAt).toISOString(),
      hoursOverdue: Math.round((now - dueAt) / 3600000),
    });
  }

  return overdue;
}
