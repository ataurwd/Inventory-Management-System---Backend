import { Request, Response, NextFunction } from 'express';
import { LoginSchema, RegisterSchema } from './auth.validation';
import { findByEmail, createUser, updateLastLogin, getUserCount } from '../users/user.service';
import { signAccessToken, getCookieOptions } from './auth.service';
import { ApiError } from '../../utils/api-error.util';
import { success, created } from '../../utils/api-response.util';
import { logger } from '../../utils/logger';

/**
 * POST /api/v1/auth/register
 * First user becomes admin automatically. Subsequent registrations
 * require an admin (enforced by authorize middleware on the route).
 */
export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const data = RegisterSchema.parse(req.body);

    const existing = await findByEmail(data.email);
    if (existing) {
      throw ApiError.conflict('Email already registered', 'EMAIL_EXISTS');
    }

    // First user auto-promoted to admin
    const userCount = await getUserCount();
    const role = userCount === 0 ? 'admin' : data.role;

    const user = await createUser({
      name: data.name,
      email: data.email,
      password: data.password,
      role,
    });

    logger.info(`User registered: ${user.email} (${role})`);

    return created(res, {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/auth/login
 */
export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const data = LoginSchema.parse(req.body);

    const user = await findByEmail(data.email);
    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const isMatch = await user.comparePassword(data.password);
    if (!isMatch) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    // Update last login
    await updateLastLogin(user._id.toString());

    // Sign JWT
    const token = signAccessToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
    });

    // Set HttpOnly cookie
    res.cookie('token', token, getCookieOptions());

    logger.info(`User logged in: ${user.email}`);

    return success(res, {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        lastLogin: new Date(),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/auth/logout
 */
export async function logout(_req: Request, res: Response, next: NextFunction) {
  try {
    const isProd = process.env.NODE_ENV === 'production';
    res.clearCookie('token', {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
    });

    return success(res, { message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/auth/me
 */
export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw ApiError.unauthorized('Not authenticated');
    }

    return success(res, { user: req.user });
  } catch (error) {
    next(error);
  }
}
