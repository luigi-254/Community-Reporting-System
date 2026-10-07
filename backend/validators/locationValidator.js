import { z } from 'zod';

export const locationSearchQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
});

export default { locationSearchQuerySchema };
