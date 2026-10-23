import db from '../config/db.js';

const normalize = (value) =>
  (value || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

const tokenSet = (value) =>
  new Set(normalize(value).split(' ').filter((token) => token.length > 2));

const similarity = (a, b) => {
  const left = tokenSet(a);
  const right = tokenSet(b);
  if (!left.size || !right.size) return 0;
  let shared = 0;
  for (const token of left) if (right.has(token)) shared += 1;
  return shared / Math.min(left.size, right.size);
};

export async function findPossibleDuplicates({ title, category, ward, excludeId }) {
  const query = { page: 1, limit: 50 };
  if (category) query.category = category;
  if (ward) query.ward = ward;

  const { reports = [] } = await db.findReports(query);

  return reports
    .filter((report) => report.id !== excludeId)
    .filter((report) => !['CLOSED', 'CANCELLED', 'DUPLICATE'].includes(report.status))
    .map((report) => ({ report, score: similarity(title, report.title) }))
    .filter(({ score }) => score >= 0.6)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ report, score }) => ({
      id: report.id,
      referenceCode: report.referenceCode,
      title: report.title,
      status: report.status,
      similarity: Number(score.toFixed(2)),
    }));
}
