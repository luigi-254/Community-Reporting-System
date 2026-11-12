import { checkIsPrisma, getPrismaClient } from '../repositories/client.js';

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

export async function applyRoutingRules(report, prisma = null) {
  const client = prisma || (checkIsPrisma() ? getPrismaClient() : null);
  if (!client) return report;

  const rules = (await client.routingRule.findMany({ where: { isActive: true } })) || [];
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

  const updated = await client.report.update({
    where: { id: report.id },
    data: updates,
  });

  if (rule.officerId) {
    await client.assignment.create({
      data: {
        reportId: report.id,
        officerId: rule.officerId,
        reason: `Auto-routed by rule "${rule.name}"`,
      },
    });
  }

  return updated;
}
