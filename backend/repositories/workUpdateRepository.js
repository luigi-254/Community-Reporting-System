import { v4 as uuidv4 } from 'uuid';
import { getPrismaClient, checkIsPrisma } from './client.js';
import { memoryStore } from './memoryStore.js';

const workUpdateRepository = {
  async createWorkUpdate(data) {
    const workUpdate = {
      id: uuidv4(),
      reportId: data.reportId,
      officerId: data.officerId,
      note: data.note,
      status: data.status || 'IN_PROGRESS',
      createdAt: new Date(),
    };
    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().workUpdate.create({ data: workUpdate });
      } catch (error) {
        console.warn('[DB] Prisma createWorkUpdate failed, falling back to memory:', error.message);
      }
    }
    memoryStore.workUpdates.set(workUpdate.id, workUpdate);
    return { ...workUpdate };
  },
  async findWorkUpdates({ reportId, officerId } = {}) {
    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().workUpdate.findMany({
          where: {
            ...(reportId && { reportId }),
            ...(officerId && { officerId }),
          },
          orderBy: { createdAt: 'desc' },
        });
      } catch (error) {
        console.warn('[DB] Prisma findWorkUpdates failed, falling back to memory:', error.message);
      }
    }
    return [...memoryStore.workUpdates.values()]
      .filter((item) => (!reportId || item.reportId === reportId)
        && (!officerId || item.officerId === officerId))
      .sort((a, b) => b.createdAt - a.createdAt);
  },
  async findWorkUpdateById(id) {
    if (checkIsPrisma()) {
      try { return await getPrismaClient().workUpdate.findUnique({ where: { id } }); }
      catch (error) { console.warn('[DB] Prisma findWorkUpdateById failed, falling back to memory:', error.message); }
    }
    return memoryStore.workUpdates.get(id) || null;
  },
  async updateWorkUpdate(id, updateData) {
    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().workUpdate.update({
          where: { id },
          data: { ...updateData, updatedAt: new Date() },
        });
      } catch (error) {
        console.warn('[DB] Prisma updateWorkUpdate failed, falling back to memory:', error.message);
      }
    }
    const existing = memoryStore.workUpdates.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updateData, updatedAt: new Date() };
    memoryStore.workUpdates.set(id, updated);
    return { ...updated };
  },
};

export default workUpdateRepository;
