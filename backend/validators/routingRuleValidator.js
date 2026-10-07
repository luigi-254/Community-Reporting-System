import { z } from 'zod';

const fields = {
  name: z.string().trim().min(2).max(120),
  category: z.string().trim().optional(),
  subCategory: z.string().trim().optional(),
  county: z.string().trim().optional(),
  departmentId: z.string().trim().optional(),
  officerId: z.string().trim().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  isActive: z.boolean().optional().default(true),
};
export const createRoutingRuleSchema = z.object(fields);
export const updateRoutingRuleSchema = z.object(fields).partial();
export const routingRuleQuerySchema = z.object({ isActive: z.union([z.boolean(), z.string()]).optional() });
export default { createRoutingRuleSchema, updateRoutingRuleSchema, routingRuleQuerySchema };
