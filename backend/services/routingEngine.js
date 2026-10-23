import db from '../config/db.js';

const specificity = (rule) =>
  [rule.category, rule.subCategory, rule.county, rule.priority, rule.departmentId, rule.officerId]
    .filter(Boolean).length;

const matches = (rule, report) => {
  if (rule.category && rule.category !== report.category) return false;
  if (rule.subCategory && rule.subCategory !== report.subCategory) return false;
  if (rule.county && rule.county !== report.county) return false;
  if (rule.priority && rule.priority !== report.priority) return false;
  return true;
};

export async function applyRoutingRules(report) {
  const rules = (await db.findRoutingRules({ isActive: true })) || [];
  const candidates = rules.filter((rule) => matches(rule, report));
  if (!candidates.length) return report;

  candidates.sort((a, b) => specificity(b) - specificity(a));
  const rule = candidates[0];

  const updates = {};
  if (rule.departmentId) updates.departmentId = rule.departmentId;
  if (rule.officerId) {
    updates.assignedOfficerId = rule.officerId;
    updates.status = 'ASSIGNED';
  }

  const updated = await db.updateReport(report.id, updates);

  if (rule.officerId) {
    await db.createAssignment({
      reportId: report.id,
      officerId: rule.officerId,
      reason: `Auto-routed by rule "${rule.name}"`,
    });
  }

  return updated;
}
