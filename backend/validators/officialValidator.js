import { z } from 'zod';

export const officialSchema = z.object({
  name: z.string().trim().min(2).max(120),
  officialType: z.enum(['GOVERNOR', 'CECM', 'CHIEF_OFFICER', 'TECHNICAL_HEAD', 'MP', 'MCA', 'OTHER']).default('OTHER'),
  positionId: z.string().trim().optional(),
  userId: z.string().trim().optional(),
  county: z.string().trim().optional(),
  subCounty: z.string().trim().optional(),
  ward: z.string().trim().optional(),
  departmentId: z.string().trim().optional(),
  isActive: z.boolean().optional().default(true),
});

export const officialQuerySchema = z.object({
  officialType: z.string().optional(),
  county: z.string().optional(),
  subCounty: z.string().optional(),
  ward: z.string().optional(),
  departmentId: z.string().optional(),
  isActive: z.union([z.boolean(), z.string()]).optional(),
});
