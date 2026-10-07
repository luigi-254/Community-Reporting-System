import { v4 as uuidv4 } from 'uuid';
import { getPrismaClient, checkIsPrisma } from './client.js';
import { memoryStore } from './memoryStore.js';

const assignmentRepository = {
  async createAssignment(data) {
    const assignment = {
      id: uuidv4(),
      reportId: data.reportId,
      officerId: data.officerId,
      assignedById: data.assignedById || null,
      reason: data.reason || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    if (checkIsPrisma()) {
      try { return await getPrismaClient().assignment.create({ data: assignment }); }
      catch (error) { console.warn('[DB] Prisma createAssignment failed, falling back to memory:', error.message); }
    }
    memoryStore.assignments.set(assignment.id, assignment);
    return { ...assignment };
  },
  async findAssignments({ reportId, officerId } = {}) {
    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().assignment.findMany({
          where: { ...(reportId && { reportId }), ...(officerId && { officerId }) },
          orderBy: { createdAt: 'desc' },
        });
      } catch (error) { console.warn('[DB] Prisma findAssignments failed, falling back to memory:', error.message); }
    }
    return [...memoryStore.assignments.values()]
      .filter((item) => (!reportId || item.reportId === reportId) && (!officerId || item.officerId === officerId))
      .sort((a, b) => b.createdAt - a.createdAt);
  },
  async findAssignmentById(id) {
    if (checkIsPrisma()) {
      try { return await getPrismaClient().assignment.findUnique({ where: { id } }); }
      catch (error) { console.warn('[DB] Prisma findAssignmentById failed, falling back to memory:', error.message); }
    }
    return memoryStore.assignments.get(id) || null;
  },
};

export default assignmentRepository;
