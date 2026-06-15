import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for auth routes: 5 requests per minute per IP
 */
export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests. Please try again in a minute.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
