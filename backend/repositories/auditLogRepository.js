import { v4 as uuidv4 } from 'uuid';
import { getPrismaClient, checkIsPrisma } from './client.js';
import { memoryStore } from './memoryStore.js';

const auditLogRepository = {
  async createAuditLog(data) {
    const log = {
      id: uuidv4(),
      actorId: data.actorId || null,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      previousValue: data.previousValue ?? null,
      newValue: data.newValue ?? null,
      createdAt: new Date(),
    };
    if (checkIsPrisma()) {
      try { return await getPrismaClient().auditLog.create({ data: log }); }
      catch (error) { console.warn('[DB] Prisma createAuditLog failed, falling back to memory:', error.message); }
    }
    memoryStore.auditLogs.set(log.id, log);
    return { ...log };
  },
  async findAuditLogs({ entityType, entityId, actorId } = {}) {
    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().auditLog.findMany({
          where: { ...(entityType && { entityType }), ...(entityId && { entityId }), ...(actorId && { actorId }) },
          orderBy: { createdAt: 'desc' },
        });
      } catch (error) { console.warn('[DB] Prisma findAuditLogs failed, falling back to memory:', error.message); }
    }
    return [...memoryStore.auditLogs.values()]
      .filter((log) => (!entityType || log.entityType === entityType) && (!entityId || log.entityId === entityId) && (!actorId || log.actorId === actorId))
      .sort((a, b) => b.createdAt - a.createdAt);
  },
  async findAuditLogById(id) {
    if (checkIsPrisma()) {
      try { return await getPrismaClient().auditLog.findUnique({ where: { id } }); }
      catch (error) { console.warn('[DB] Prisma findAuditLogById failed, falling back to memory:', error.message); }
    }
    return memoryStore.auditLogs.get(id) || null;
  },
};

export default auditLogRepository;
