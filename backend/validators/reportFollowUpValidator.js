import { z } from 'zod';

export const createFollowUpSchema = z.object({
  reportId: z.string().trim().min(1, 'Report ID is required'),
  type: z.enum(['NOTE', 'FLAG_INACTIVITY', 'FLAG_ROUTING', 'FLAG_DEADLINE', 'ESCALATION_REQUEST']).default('NOTE'),
  note: z.string().trim().min(1, 'Note is required').max(2000),
});

export default { createFollowUpSchema };
