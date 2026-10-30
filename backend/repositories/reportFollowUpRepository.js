import { v4 as uuidv4 } from 'uuid';
import { getPrismaClient, checkIsPrisma } from './client.js';
import { memoryStore } from './memoryStore.js';

const reportFollowUpRepository = {
  async createFollowUp(data) {
    const followUp = {
      id: uuidv4(),
      reportId: data.reportId,
      createdById: data.createdById,
      type: data.type || 'NOTE',
      note: data.note,
      createdAt: new Date(),
    };
    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().reportFollowUp.create({ data: followUp });
      } catch (error) {
        console.warn('[DB] Prisma createFollowUp failed, falling back to memory:', error.message);
      }
    }
    memoryStore.reportFollowUps.set(followUp.id, followUp);
    return { ...followUp };
  },
  async findFollowUps({ reportId, createdById, type } = {}) {
    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().reportFollowUp.findMany({
          where: {
            ...(reportId && { reportId }),
            ...(createdById && { createdById }),
            ...(type && { type }),
          },
          orderBy: { createdAt: 'desc' },
        });
      } catch (error) {
        console.warn('[DB] Prisma findFollowUps failed, falling back to memory:', error.message);
      }
    }
    return [...memoryStore.reportFollowUps.values()]
      .filter((item) => (!reportId || item.reportId === reportId)
        && (!createdById || item.createdById === createdById)
        && (!type || item.type === type))
      .sort((a, b) => b.createdAt - a.createdAt);
  },
  async findFollowUpById(id) {
    if (checkIsPrisma()) {
      try { return await getPrismaClient().reportFollowUp.findUnique({ where: { id } }); }
      catch (error) { console.warn('[DB] Prisma findFollowUpById failed, falling back to memory:', error.message); }
    }
    return memoryStore.reportFollowUps.get(id) || null;
  },
};

export default reportFollowUpRepository;
