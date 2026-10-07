import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().trim().min(2, 'Category name must be at least 2 characters').max(100),
  code: z.string().trim().max(50).optional(),
  description: z.string().trim().max(500).optional(),
  icon: z.string().trim().optional(),
  isActive: z.boolean().optional().default(true),
  departmentId: z.string().trim().optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  code: z.string().trim().max(50).optional(),
  description: z.string().trim().max(500).optional(),
  icon: z.string().trim().optional(),
  isActive: z.boolean().optional(),
  departmentId: z.string().trim().optional(),
});

export const createSubcategorySchema = z.object({
  categoryId: z.string().trim().min(1, 'Category ID is required'),
  name: z.string().trim().min(2, 'Subcategory name must be at least 2 characters').max(100),
  code: z.string().trim().max(50).optional(),
  description: z.string().trim().max(500).optional(),
  defaultPriority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM'),
  slaHours: z.union([z.number().min(1), z.string().transform((v) => parseInt(v, 10))]).optional().default(48),
  isActive: z.boolean().optional().default(true),
});

export const updateSubcategorySchema = z.object({
  categoryId: z.string().trim().optional(),
  name: z.string().trim().min(2).max(100).optional(),
  code: z.string().trim().max(50).optional(),
  description: z.string().trim().max(500).optional(),
  defaultPriority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  slaHours: z.union([z.number().min(1), z.string().transform((v) => parseInt(v, 10))]).optional(),
  isActive: z.boolean().optional(),
});

export default {
  createCategorySchema,
  updateCategorySchema,
  createSubcategorySchema,
  updateSubcategorySchema,
};
