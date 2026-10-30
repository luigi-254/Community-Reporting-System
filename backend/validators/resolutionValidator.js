import { z } from 'zod';

export const createResolutionSubmissionSchema = z.object({
  reportId: z.string().trim().min(1, 'Report ID is required'),
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'PARTIAL']).default('PENDING'),
  notes: z.string().trim().max(2000).optional(),
  mediaUrls: z.array(z.string()).optional(),
});

export const updateResolutionSubmissionSchema = z.object({
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'PARTIAL']).optional(),
  notes: z.string().trim().max(2000).optional(),
  mediaUrls: z.array(z.string().url()).optional(),
});

export default { createResolutionSubmissionSchema, updateResolutionSubmissionSchema };
