import { v4 as uuidv4 } from 'uuid';
import { getPrismaClient, checkIsPrisma } from './client.js';
import { memoryStore } from './memoryStore.js';

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
  async findEscalatedReports() {
    if (checkIsPrisma()) {
      try { return await getPrismaClient().escalation.findMany({ where: { status: 'OPEN' }, orderBy: { createdAt: 'desc' } }); }
      catch (error) { console.warn('[DB] Prisma findEscalatedReports failed, falling back to memory:', error.message); }
    }
    return [...memoryStore.escalations.values()].filter((item) => item.status === 'OPEN')
      .sort((a, b) => b.createdAt - a.createdAt);
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
