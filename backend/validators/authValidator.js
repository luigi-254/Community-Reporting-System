import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters long').max(100),
  email: z.string().trim().email('Invalid email address'),
  phone: z
    .string()
    .trim()
    .regex(/^[+0-9\s-]{7,20}$/, 'Invalid phone number format')
    .optional()
    .or(z.literal('')),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters long')
    .max(100),
  role: z.enum(['CITIZEN', 'OFFICER', 'ADMIN', 'SUPER_ADMIN']).optional().default('CITIZEN'),
  county: z.string().trim().max(100).optional(),
  subCounty: z.string().trim().max(100).optional(),
  ward: z.string().trim().max(100).optional(),
  address: z.string().trim().max(255).optional(),
});

export const loginSchema = z
  .object({
    email: z.string().trim().email().optional(),
    phone: z.string().trim().optional(),
    identifier: z.string().trim().optional(),
    password: z.string().min(1, 'Password is required'),
  })
  .refine((data) => data.email || data.phone || data.identifier, {
    message: 'Must provide email, phone, or identifier',
    path: ['identifier'],
  });

export const verifySchema = z
  .object({
    code: z.string().trim().optional(),
    token: z.string().trim().optional(),
    email: z.string().trim().email().optional(),
    phone: z.string().trim().optional(),
    identifier: z.string().trim().optional(),
    type: z.enum(['EMAIL', 'PHONE']).optional().default('EMAIL'),
  })
  .refine((data) => data.code || data.token, {
    message: 'Must provide either verification code or token',
    path: ['code'],
  });

export const refreshTokenSchema = z.object({
  refreshToken: z.string().trim().optional(),
});

export const forgotPasswordSchema = z
  .object({
    email: z.string().trim().email().optional(),
    phone: z.string().trim().optional(),
    identifier: z.string().trim().optional(),
  })
  .refine((data) => data.email || data.phone || data.identifier, {
    message: 'Must provide email, phone, or identifier to reset password',
    path: ['identifier'],
  });

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, 'Reset token or code is required'),
  newPassword: z
    .string()
    .min(6, 'New password must be at least 6 characters long')
    .max(100),
  confirmPassword: z.string().optional(),
});

export default {
  registerSchema,
  loginSchema,
  verifySchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};
