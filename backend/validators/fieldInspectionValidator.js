import { z } from 'zod';

export const createInspectionSchema = z.object({
  reportId: z.string().trim().min(1, 'Report ID is required'),
  findings: z.string().trim().max(2000).optional(),
  actionTaken: z.string().trim().max(2000).optional(),
  status: z.enum(['PENDING', 'COMPLETED', 'NEEDS_CORRECTION']).default('PENDING'),
  mediaUrls: z.array(z.string()).optional(),
});

export const updateInspectionSchema = z.object({
  findings: z.string().trim().max(2000).optional(),
  actionTaken: z.string().trim().max(2000).optional(),
  status: z.enum(['PENDING', 'COMPLETED', 'NEEDS_CORRECTION']).optional(),
  mediaUrls: z.array(z.string()).optional(),
});

export const inspectionQuerySchema = z.object({
  reportId: z.string().trim().optional(),
  officerId: z.string().trim().optional(),
  status: z.enum(['PENDING', 'COMPLETED', 'NEEDS_CORRECTION']).optional(),
});

export default { createInspectionSchema, updateInspectionSchema, inspectionQuerySchema };
