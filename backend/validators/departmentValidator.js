import { z } from 'zod';

export const createDepartmentSchema = z.object({
  name: z.string().trim().min(2, 'Department name must be at least 2 characters').max(120),
  code: z.string().trim().min(2, 'Department code is required').max(30),
  description: z.string().trim().max(500).optional(),
  contactEmail: z.string().trim().email().optional(),
  contactPhone: z.string().trim().max(30).optional(),
  isActive: z.boolean().optional().default(true),
});

export const updateDepartmentSchema = createDepartmentSchema.partial();

export const departmentQuerySchema = z.object({
  isActive: z.union([z.boolean(), z.string()]).optional(),
  search: z.string().trim().max(120).optional(),
});

export default { createDepartmentSchema, updateDepartmentSchema, departmentQuerySchema };
