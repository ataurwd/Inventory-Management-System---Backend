import { Router } from 'express';
import { getUsers, getUser, createUser, updateUser, deleteUser, getMe } from './user.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();

// All user management routes require authentication
router.use(authenticate);

// GET /api/v1/users - List users (accessible to all authenticated roles)
router.get('/', getUsers);

// GET /api/v1/users/me - Get current user profile
router.get('/me', getMe);

// GET /api/v1/users/:id - Get a user (accessible to all authenticated roles)
router.get('/:id', getUser);

// POST /api/v1/users - Add a user (accessible to all authenticated roles)
router.post('/', createUser);

// PUT /api/v1/users/:id - Edit a user (accessible to all authenticated roles)
router.put('/:id', updateUser);

// DELETE /api/v1/users/:id - Delete/deactivate user (strictly admin only)
router.delete('/:id', authorize('admin'), deleteUser);

export default router;
