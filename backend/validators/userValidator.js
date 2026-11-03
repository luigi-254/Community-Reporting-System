import { z } from 'zod';

const phoneSchema = z
  .string()
  .trim()
  .regex(/^[+0-9\s-]{7,20}$/, 'Invalid phone number format')
  .optional()
  .or(z.literal(''));

const roleSchema = z.enum([
  'CITIZEN', 'OFFICER', 'FIELD_OFFICER', 'TECHNICAL_SUPERVISOR', 'TECHNICAL_HEAD',
  'CHIEF_OFFICER', 'CECM', 'GOVERNOR', 'WARD_ADMIN', 'SUBCOUNTY_ADMIN',
  'DISASTER_MANAGER', 'ENFORCEMENT_OFFICER', 'DEPARTMENTAL_ADMIN', 'ADMIN', 'SUPER_ADMIN',
]);

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  phone: phoneSchema,
  password: z.string().min(6).max(100),
  role: roleSchema.default('OFFICER'),
  county: z.string().trim().max(100).optional(),
  subCounty: z.string().trim().max(100).optional(),
  ward: z.string().trim().max(100).optional(),
  departmentId: z.string().trim().optional(),
  isActive: z.boolean().optional().default(true),
});

export const updateUserSchema = createUserSchema
  .omit({ password: true, email: true, role: true })
  .partial();

export const userQuerySchema = z.object({
  role: roleSchema.optional(),
  isActive: z.union([z.boolean(), z.string()]).optional(),
  departmentId: z.string().trim().optional(),
  search: z.string().trim().max(100).optional(),
});

export default { createUserSchema, updateUserSchema, userQuerySchema };
