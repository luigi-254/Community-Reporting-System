import { z } from 'zod';

export const assignReportSchema = z.object({
  reportId: z.string().trim().min(1),
  officerId: z.string().trim().min(1),
  reason: z.string().trim().max(500).optional(),
});

export const assignmentQuerySchema = z.object({
  reportId: z.string().trim().optional(),
  officerId: z.string().trim().optional(),
});

export default { assignReportSchema, assignmentQuerySchema };
