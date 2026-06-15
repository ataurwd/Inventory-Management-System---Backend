import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/api-error.util';

/**
 * Middleware factory: Restrict route to specific roles
 * Usage: authorize('admin', 'manager')
 */
export function authorize(...allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Not authenticated'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Role '${req.user.role}' is not authorized to access this resource`
        )
      );
    }

    next();
  };
}
