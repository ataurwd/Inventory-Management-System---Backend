import { Request, Response, NextFunction } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { ApiError } from '../utils/api-error.util';
import { findByEmail } from '../modules/users/user.service';
import { logger } from '../utils/logger';

/**
 * Middleware: Verify Firebase JWT from Authorization header → attach req.user
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    let token = undefined;

    // strictly require token from Authorization header
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw ApiError.unauthorized('No authentication token provided');
    }

    // Verify Firebase token
    const decodedToken = await getAuth().verifyIdToken(token);
    
    if (!decodedToken.email) {
       throw ApiError.unauthorized('Invalid token: missing email');
    }

    // Look up the user in MongoDB by email to get their role
    const user = await findByEmail(decodedToken.email);
    
    if (!user) {
      // In a real migration, you might want to auto-create the user here if they authenticated via Google
      // For now, we reject if they aren't in the database.
      logger.warn(`User authenticated via Firebase but not found in DB: ${decodedToken.email}`);
      throw ApiError.unauthorized("You don't have an account. Please contact the administrator.");
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
    };

    next();
  } catch (error: any) {
    if (error.code === 'auth/id-token-expired') {
      return next(ApiError.unauthorized('Token has expired'));
    }
    if (error.code === 'auth/argument-error' || error.code === 'auth/invalid-id-token') {
      return next(ApiError.unauthorized('Invalid token'));
    }
    next(error);
  }
}
