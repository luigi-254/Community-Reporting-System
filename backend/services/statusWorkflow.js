import { v4 as uuidv4 } from 'uuid';
import { memoryStore } from '../repositories/memoryStore.js';
import { getPrismaClient, checkIsPrisma } from '../repositories/client.js';

const VALID_TRANSITIONS = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'REJECTED', 'DUPLICATE', 'ESCALATED', 'CANCELLED'],
  UNDER_REVIEW: ['VERIFIED', 'NEEDS_MORE_INFO', 'ASSIGNED', 'REJECTED', 'DUPLICATE', 'ESCALATED', 'CANCELLED'],
  NEEDS_MORE_INFO: ['SUBMITTED', 'UNDER_REVIEW', 'REJECTED', 'ESCALATED', 'CANCELLED'],
  VERIFIED: ['ASSIGNED', 'ACKNOWLEDGED', 'REJECTED', 'DUPLICATE', 'ESCALATED', 'CANCELLED'],
  ASSIGNED: ['ACKNOWLEDGED', 'INSPECTION_IN_PROGRESS', 'IN_PROGRESS', 'AWAITING_EXTERNAL_AGENCY', 'ESCALATED', 'CANCELLED'],
  ACKNOWLEDGED: ['INSPECTION_IN_PROGRESS', 'IN_PROGRESS', 'AWAITING_EXTERNAL_AGENCY', 'ESCALATED', 'CANCELLED'],
  INSPECTION_IN_PROGRESS: ['IN_PROGRESS', 'AWAITING_EXTERNAL_AGENCY', 'RESOLUTION_SUBMITTED', 'ESCALATED', 'CANCELLED'],
  IN_PROGRESS: ['INSPECTION_IN_PROGRESS', 'AWAITING_EXTERNAL_AGENCY', 'RESOLUTION_SUBMITTED', 'RESOLVED', 'ESCALATED', 'CANCELLED'],
  AWAITING_EXTERNAL_AGENCY: ['IN_PROGRESS', 'RESOLUTION_SUBMITTED', 'RESOLVED', 'ESCALATED', 'CANCELLED'],
  RESOLUTION_SUBMITTED: ['AWAITING_CITIZEN_VERIFICATION', 'RESOLVED', 'REOPENED', 'CANCELLED'],
  AWAITING_CITIZEN_VERIFICATION: ['RESOLVED', 'REOPENED', 'ESCALATED', 'CANCELLED'],
  RESOLVED: ['CLOSED', 'REOPENED'],
  REOPENED: ['UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'ESCALATED', 'CANCELLED'],
  ESCALATED: ['UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'AWAITING_EXTERNAL_AGENCY', 'CANCELLED'],
  CLOSED: ['REOPENED'],
  REJECTED: [],
  DUPLICATE: [],
  CANCELLED: [],
};

export function isValidTransition(from, to) {
  if (!from || from === to) return true;
  return (VALID_TRANSITIONS[from] ?? []).includes(to);
}

export function allowedTransitions(from) {
  return VALID_TRANSITIONS[from] ?? [];
}

export async function recordStatusHistory({ reportId, fromStatus, toStatus, notes, actorId }) {
  const data = {
    reportId,
    fromStatus: fromStatus ?? null,
    toStatus,
    notes: notes ?? null,
    actorId: actorId ?? null,
  };
  if (checkIsPrisma()) {
    try {
      return await getPrismaClient().reportStatusHistory.create({ data });
    } catch (err) {
      console.warn('[DB] Prisma status history write failed, using memory fallback:', err.message);
    }
  }
  const record = { id: uuidv4(), ...data, createdAt: new Date() };
  memoryStore.statusHistories.set(record.id, record);
  return record;
}

export async function getStatusHistory(reportId) {
  if (checkIsPrisma()) {
    try {
      return await getPrismaClient().reportStatusHistory.findMany({
        where: { reportId },
        orderBy: { createdAt: 'asc' },
        include: { actor: { select: { id: true, name: true, role: true } } },
      });
    } catch (err) {
      console.warn('[DB] Prisma status history read failed, using memory fallback:', err.message);
    }
  }
  return [...memoryStore.statusHistories.values()]
    .filter((h) => h.reportId === reportId)
    .sort((a, b) => a.createdAt - b.createdAt);
}
