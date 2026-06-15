import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../modules/auth/auth.service';
import { ApiError } from '../utils/api-error.util';

/**
 * Middleware: Verify JWT from HttpOnly cookie → attach req.user
 */
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.token;

    if (!token) {
      throw ApiError.unauthorized('No authentication token provided');
    }

    const decoded = verifyAccessToken(token);

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name,
    };

    next();
  } catch (error: any) {
    if (error?.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('Token has expired'));
    }
    if (error?.name === 'JsonWebTokenError') {
      return next(ApiError.unauthorized('Invalid token'));
    }
    next(error);
  }
}
