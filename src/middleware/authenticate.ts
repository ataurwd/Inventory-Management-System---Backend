import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../modules/auth/auth.service';
import { ApiError } from '../utils/api-error.util';

/**
 * Middleware: Verify JWT from HttpOnly cookie → attach req.user
 */
// update code 
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    let token = undefined;

    // 1. Try to get token from Authorization header first
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // 2. Fallback to cookie if no header is present
    if (!token && req.cookies?.token) {
      token = req.cookies.token;
    }

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
