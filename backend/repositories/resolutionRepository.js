import { v4 as uuidv4 } from 'uuid';
import { getPrismaClient, checkIsPrisma } from './client.js';
import { memoryStore } from './memoryStore.js';

const resolutionRepository = {
  async createResolutionSubmission(data) {
    const submission = {
      id: uuidv4(),
      reportId: data.reportId,
      submittedById: data.submittedById,
      status: data.status || 'PENDING',
      notes: data.notes || null,
      mediaUrls: Array.isArray(data.mediaUrls) ? data.mediaUrls : [],
      resolvedAt: data.resolvedAt || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().resolutionSubmission.create({ data: submission });
      } catch (error) {
        console.warn('[DB] Prisma createResolutionSubmission failed, falling back to memory:', error.message);
      }
    }
    memoryStore.resolutionSubmissions.set(submission.id, submission);
    return { ...submission };
  },
  async findResolutionSubmissions({ reportId, submittedById } = {}) {
    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().resolutionSubmission.findMany({
          where: {
            ...(reportId && { reportId }),
            ...(submittedById && { submittedById }),
          },
          orderBy: { createdAt: 'desc' },
        });
      } catch (error) {
        console.warn('[DB] Prisma findResolutionSubmissions failed, falling back to memory:', error.message);
      }
    }
    return [...memoryStore.resolutionSubmissions.values()]
      .filter((item) => (!reportId || item.reportId === reportId)
        && (!submittedById || item.submittedById === submittedById))
      .sort((a, b) => b.createdAt - a.createdAt);
  },
  async findResolutionSubmissionById(id) {
    if (checkIsPrisma()) {
      try { return await getPrismaClient().resolutionSubmission.findUnique({ where: { id } }); }
      catch (error) { console.warn('[DB] Prisma findResolutionSubmissionById failed, falling back to memory:', error.message); }
    }
    return memoryStore.resolutionSubmissions.get(id) || null;
  },
  async updateResolutionSubmission(id, updateData) {
    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().resolutionSubmission.update({
          where: { id },
          data: { ...updateData, updatedAt: new Date() },
        });
      } catch (error) {
        console.warn('[DB] Prisma updateResolutionSubmission failed, falling back to memory:', error.message);
      }
    }
    const existing = memoryStore.resolutionSubmissions.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updateData, updatedAt: new Date() };
    memoryStore.resolutionSubmissions.set(id, updated);
    return { ...updated };
  },
};

export default resolutionRepository;
