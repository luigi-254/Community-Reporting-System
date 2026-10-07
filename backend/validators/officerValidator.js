import { z } from 'zod';

const phoneSchema = z
  .string()
  .trim()
  .regex(/^[+0-9\s-]{7,20}$/, 'Invalid phone number format')
  .optional()
  .or(z.literal(''));

export const createOfficerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  phone: phoneSchema,
  password: z.string().min(6).max(100),
  county: z.string().trim().max(100).optional(),
  subCounty: z.string().trim().max(100).optional(),
  ward: z.string().trim().max(100).optional(),
  address: z.string().trim().max(255).optional(),
  departmentId: z.string().trim().optional(),
  isActive: z.boolean().optional().default(true),
});

export const updateOfficerSchema = createOfficerSchema.omit({ password: true, email: true }).partial();

export const officerQuerySchema = z.object({
  isActive: z.union([z.boolean(), z.string()]).optional(),
  departmentId: z.string().trim().optional(),
  search: z.string().trim().max(100).optional(),
});

export default { createOfficerSchema, updateOfficerSchema, officerQuerySchema };
