import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});

export const sensitiveAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Limit each IP to 15 attempts per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many attempts from this IP, please try again after 15 minutes.',
  },
});

export const guestReportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many reports from this network. Please try again in 15 minutes.',
  },
});

export default {
  authLimiter,
  sensitiveAuthLimiter,
  guestReportLimiter,
};
