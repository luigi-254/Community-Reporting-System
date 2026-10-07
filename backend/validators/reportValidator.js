import { z } from 'zod';

export const createReportSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(150),
  description: z.string().trim().min(10, 'Description must be at least 10 characters'),
  category: z.string().trim().min(2, 'Category is required'),
  subCategory: z.string().trim().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM'),
  location: z.string().trim().optional(),
  county: z.string().trim().optional(),
  subCounty: z.string().trim().optional(),
  ward: z.string().trim().optional(),
  latitude: z.union([z.number(), z.string().transform((v) => parseFloat(v))]).optional(),
  longitude: z.union([z.number(), z.string().transform((v) => parseFloat(v))]).optional(),
  isAnonymous: z
    .union([
      z.boolean(),
      z.string().transform((v) => v === 'true' || v === '1'),
    ])
    .optional()
    .default(false),
  mediaUrls: z.array(z.string().url()).optional(),
});

export const updateReportSchema = z.object({
  title: z.string().trim().min(3).max(150).optional(),
  description: z.string().trim().min(10).optional(),
  category: z.string().trim().min(2).optional(),
  subCategory: z.string().trim().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  location: z.string().trim().optional(),
  county: z.string().trim().optional(),
  subCounty: z.string().trim().optional(),
  ward: z.string().trim().optional(),
  latitude: z.union([z.number(), z.string().transform((v) => parseFloat(v))]).optional(),
  longitude: z.union([z.number(), z.string().transform((v) => parseFloat(v))]).optional(),
  isAnonymous: z
    .union([
      z.boolean(),
      z.string().transform((v) => v === 'true' || v === '1'),
    ])
    .optional(),
  mediaUrls: z.array(z.string().url()).optional(),
});

export const changeStatusSchema = z.object({
  status: z.enum(['SUBMITTED', 'UNDER_REVIEW', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'ESCALATED']),
  notes: z.string().trim().optional(),
  resolutionNotes: z.string().trim().optional(),
  assignedOfficerId: z.string().trim().optional(),
  departmentId: z.string().trim().optional(),
  resolutionMediaUrls: z.array(z.string()).optional(),
});

export const acceptResolutionSchema = z.object({
  feedback: z.string().trim().optional(),
  rating: z.union([z.number().min(1).max(5), z.string().transform((v) => parseInt(v, 10))]).optional(),
});

export const rejectResolutionSchema = z.object({
  reason: z.string().trim().min(5, 'Rejection reason must be at least 5 characters explaining why resolution was not satisfactory'),
});

export const filterReportsQuerySchema = z.object({
  status: z.string().optional(),
  priority: z.string().optional(),
  category: z.string().optional(),
  subCategory: z.string().optional(),
  ward: z.string().optional(),
  county: z.string().optional(),
  subCounty: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.union([z.number(), z.string()]).optional(),
  limit: z.union([z.number(), z.string()]).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.string().optional(),
});

export const searchReportsQuerySchema = z.object({
  q: z.string().trim().min(1, 'Search query cannot be empty'),
  page: z.union([z.number(), z.string()]).optional(),
  limit: z.union([z.number(), z.string()]).optional(),
});

export default {
  createReportSchema,
  updateReportSchema,
  changeStatusSchema,
  acceptResolutionSchema,
  rejectResolutionSchema,
  filterReportsQuerySchema,
  searchReportsQuerySchema,
};
