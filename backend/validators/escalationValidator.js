import { z } from 'zod';

export const manuallyEscalateSchema = z.object({
  reportId: z.string().trim().min(1),
  reason: z.string().trim().min(5).max(500),
  priority: z.enum(['HIGH', 'URGENT']).optional().default('HIGH'),
});

export const resolveEscalationSchema = z.object({
  resolutionNotes: z.string().trim().min(2).max(500),
});

export default { manuallyEscalateSchema, resolveEscalationSchema };
