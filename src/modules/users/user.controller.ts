import { Request, Response, NextFunction } from 'express';
import { CreateUserSchema, UpdateUserSchema } from './user.validation';
import {
  getAllUsers,
  findById,
  findByEmail,
  createUser as createUserService,
  updateUser as updateUserService,
  deleteUser as deleteUserService,
} from './user.service';
import { ApiError } from '../../utils/api-error.util';
import { success, created } from '../../utils/api-response.util';
import { logger } from '../../utils/logger';

/**
 * GET /api/v1/users/me
 */
export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw ApiError.unauthorized('Not authenticated');
    }
    return success(res, req.user);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/users
 */
export async function getUsers(_req: Request, res: Response, next: NextFunction) {
  try {
    const users = await getAllUsers();
    return success(res, users);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/users/:id
 */
export async function getUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await findById(req.params.id);
    if (!user) {
      throw ApiError.notFound('User not found');
    }
    return success(res, user);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/users
 */
export async function createUser(req: Request, res: Response, next: NextFunction) {
  try {
    const data = CreateUserSchema.parse(req.body);

    const existing = await findByEmail(data.email);
    if (existing) {
      throw ApiError.conflict('Email already registered', 'EMAIL_EXISTS');
    }

    const user = await createUserService(data);
    logger.info(`User created by admin/manager: ${user.email} (${user.role})`);

    return created(res, user);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/v1/users/:id
 */
export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const data = UpdateUserSchema.parse(req.body);
    const userId = req.params.id;

    // Check if email already registered by another user
    if (data.email) {
      const existing = await findByEmail(data.email);
      if (existing && existing._id.toString() !== userId) {
        throw ApiError.conflict('Email already registered by another user', 'EMAIL_EXISTS');
      }
    }

    // Clean up empty password
    if (data.password === '') {
      delete data.password;
    }

    const user = await updateUserService(userId, data);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    logger.info(`User updated: ${user.email}`);
    return success(res, user);
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/v1/users/:id
 */
export async function deleteUser(req: Request, res: Response, next: NextFunction) {
  try {
    const targetUserId = req.params.id;

    if (!req.user) {
      throw ApiError.unauthorized('Not authenticated');
    }

    // Prevent self-deletion
    if (req.user.id === targetUserId) {
      throw ApiError.badRequest('You cannot delete or deactivate your own account');
    }

    const user = await deleteUserService(targetUserId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    logger.info(`User deactivated: ${user.email}`);
    return success(res, { message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
}
