import { Router } from 'express';
import { register, login, logout, getMe } from './auth.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { authRateLimiter } from '../../middleware/rateLimiter';

const router = Router();

// Public / Rate-limited routes
router.post('/register', authRateLimiter, register);
router.post('/login', authRateLimiter, login);

// Authenticated routes
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

export default router;
