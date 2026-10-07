import { z } from 'zod';

export const auditLogQuerySchema = z.object({
  entityType: z.string().trim().optional(),
  entityId: z.string().trim().optional(),
  actorId: z.string().trim().optional(),
});

export default { auditLogQuerySchema };
