import { z } from 'zod';

export const createWorkUpdateSchema = z.object({
  reportId: z.string().trim().min(1, 'Report ID is required'),
  note: z.string().trim().min(1, 'Note is required').max(2000),
  status: z.enum(['IN_PROGRESS', 'COMPLETED', 'NEEDS_CORRECTION']).default('IN_PROGRESS'),
});

export const updateWorkUpdateSchema = z.object({
  note: z.string().trim().max(2000).optional(),
  status: z.enum(['IN_PROGRESS', 'COMPLETED', 'NEEDS_CORRECTION']).optional(),
});

export const workUpdateQuerySchema = z.object({
  reportId: z.string().trim().optional(),
  officerId: z.string().trim().optional(),
});

export default { createWorkUpdateSchema, updateWorkUpdateSchema, workUpdateQuerySchema };
