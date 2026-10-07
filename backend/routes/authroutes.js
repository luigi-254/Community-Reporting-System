import express from 'express';

import {
  register,
  login,
  logout,
  verify,
  refreshToken,
  forgotPassword,
  resetPassword,
  getCurrentUser,
} from '../controllers/authController.js';

import { authenticate } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validateMiddlewares.js';
import {
  authLimiter,
  sensitiveAuthLimiter,
} from '../middlewares/ratelimitMiddlewares.js';

import {
  registerSchema,
  loginSchema,
  verifySchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/authValidator.js';

const router = express.Router();

const postWithFallback = (path, ...handlers) => {
  router.post(path, ...handlers);
  router.post(`/api/auth${path}`, ...handlers);
};

const getWithFallback = (path, ...handlers) => {
  router.get(path, ...handlers);
  router.get(`/api/auth${path}`, ...handlers);
};

postWithFallback('/register', authLimiter, validate(registerSchema), register);
postWithFallback('/login', sensitiveAuthLimiter, validate(loginSchema), login);
postWithFallback('/logout', logout);
postWithFallback('/verify', authLimiter, validate(verifySchema), verify);
postWithFallback('/refresh', validate(refreshTokenSchema), refreshToken);
postWithFallback(
  '/forgot-password',
  sensitiveAuthLimiter,
  validate(forgotPasswordSchema),
  forgotPassword
);

postWithFallback(
  '/reset-password',
  sensitiveAuthLimiter,
  validate(resetPasswordSchema),
  resetPassword
);

getWithFallback('/me', authenticate, getCurrentUser);

export default router;
