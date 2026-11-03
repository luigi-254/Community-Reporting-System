import { v4 as uuidv4 } from 'uuid';
import { getPrismaClient, checkIsPrisma } from './client.js';
import { memoryStore } from './memoryStore.js';
import { recordDbFallback, markDbHealthy } from '../services/dbHealthMetrics.js';

/**
 * Apply a jurisdiction scope to an escalation held in the memory store.
 *
 * The Prisma path filters through the `report` relation, but memory-store
 * escalations only carry a `reportId`. Resolve the parent report and compare
 * the same fields so a degraded response never widens a user's visibility.
 * If the parent report cannot be resolved the escalation is excluded.
 */
const matchesEscalationScope = (escalation, scope) => {
  const reportFilter = scope?.report;
  if (!reportFilter) return true;
  const report = memoryStore.reports.get(escalation.reportId);
  if (!report) return false;
  return Object.entries(reportFilter).every(([field, value]) => report[field] === value);
};

const escalationRepository = {
  async createEscalation(data) {
    const escalation = {
      id: uuidv4(),
      reportId: data.reportId,
      reason: data.reason,
      priority: data.priority || 'HIGH',
      status: 'OPEN',
      escalatedById: data.escalatedById || null,
      resolvedById: null,
      resolutionNotes: null,
      resolvedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    if (checkIsPrisma()) {
      try { return await getPrismaClient().escalation.create({ data: escalation }); }
      catch (error) { console.warn('[DB] Prisma createEscalation failed, falling back to memory:', error.message); }
    }
    memoryStore.escalations.set(escalation.id, escalation);
    return { ...escalation };
  },
  /**
   * List open escalations within the caller's jurisdiction.
   *
   * Returns `{ escalations, degraded }`. `degraded` is true when the result
   * could not be served from the live database, so callers can surface a
   * "live data unavailable" state instead of silently presenting memory-store
   * data as if it were live.
   */
  async findEscalatedReports(scope = {}) {
    if (checkIsPrisma()) {
      try {
        const escalations = await getPrismaClient().escalation.findMany({ where: { status: 'OPEN', ...scope }, orderBy: { createdAt: 'desc' } });
        markDbHealthy('findEscalatedReports');
        return { escalations, degraded: false };
      } catch (error) {
        console.error('[DB] Prisma findEscalatedReports failed, serving degraded in-memory data:', error);
        recordDbFallback('findEscalatedReports', error);
      }
    } else {
      recordDbFallback('findEscalatedReports', new Error('Prisma client is not configured'));
    }
    const escalations = [...memoryStore.escalations.values()].filter((item) => item.status === 'OPEN')
      .filter((item) => matchesEscalationScope(item, scope))
      .sort((a, b) => b.createdAt - a.createdAt);
    return { escalations, degraded: true };
  },
  async findEscalationById(id) {
    if (checkIsPrisma()) {
      try { return await getPrismaClient().escalation.findUnique({ where: { id } }); }
      catch (error) { console.warn('[DB] Prisma findEscalationById failed, falling back to memory:', error.message); }
    }
    return memoryStore.escalations.get(id) || null;
  },
  async findEscalationByReportId(reportId) {
    if (checkIsPrisma()) {
      try { return await getPrismaClient().escalation.findFirst({ where: { reportId, status: 'OPEN' } }); }
      catch (error) { console.warn('[DB] Prisma findEscalationByReportId failed, falling back to memory:', error.message); }
    }
    return [...memoryStore.escalations.values()].find((item) => item.reportId === reportId && item.status === 'OPEN') || null;
  },
  async resolveEscalation(id, data) {
    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().escalation.update({
          where: { id },
          data: { status: 'RESOLVED', resolvedById: data.resolvedById, resolutionNotes: data.resolutionNotes || null, resolvedAt: new Date() },
        });
      } catch (error) { console.warn('[DB] Prisma resolveEscalation failed, falling back to memory:', error.message); }
    }
    const existing = memoryStore.escalations.get(id);
    if (!existing) return null;
    const resolved = { ...existing, status: 'RESOLVED', resolvedById: data.resolvedById, resolutionNotes: data.resolutionNotes || null, resolvedAt: new Date(), updatedAt: new Date() };
    memoryStore.escalations.set(id, resolved);
    return { ...resolved };
  },
};

export default escalationRepository;
