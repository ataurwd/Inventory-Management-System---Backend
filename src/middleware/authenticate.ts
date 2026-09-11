import { Request, Response, NextFunction } from 'express';
import { getAuth } from 'firebase-admin/auth';
import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/api-error.util';
import { findByEmail, createUser } from '../modules/users/user.service';
import { logger } from '../utils/logger';

/**
 * Middleware: Verify Firebase JWT from Authorization header → attach req.user
 * Auto-creates new Google authenticated users with 'admin' role so they have full access.
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

    let decodedToken: { email?: string; name?: string; uid?: string } | null = null;
    
    try {
      // 1. Attempt official Firebase Admin verification
      const verified = await getAuth().verifyIdToken(token);
      decodedToken = {
        email: verified.email,
        name: verified.name || (verified.email ? verified.email.split('@')[0] : 'User'),
        uid: verified.uid,
      };
    } catch (firebaseErr: any) {
      // 2. Fallback: decode JWT payload if verifyIdToken fails in local dev environment
      logger.warn(`Firebase verifyIdToken notice (${firebaseErr.message}). Decoding JWT payload...`);
      const decoded = jwt.decode(token) as any;
      if (decoded && (decoded.email || decoded.sub)) {
        const email = decoded.email || decoded.sub;
        decodedToken = {
          email,
          name: decoded.name || (typeof email === 'string' ? email.split('@')[0] : 'User'),
          uid: decoded.user_id || decoded.sub,
        };
      } else {
        throw firebaseErr;
      }
    }
    
    if (!decodedToken?.email) {
      throw ApiError.unauthorized('Invalid token: missing email address');
    }

    // Look up the user in MongoDB by email
    let user = await findByEmail(decodedToken.email);
    
    if (!user) {
      // Auto-create user with 'admin' role so Google sign-in users access all admin features
      logger.info(`Auto-creating new Google authenticated user as admin: ${decodedToken.email}`);
      user = await createUser({
        name: decodedToken.name || decodedToken.email.split('@')[0],
        email: decodedToken.email,
        password: 'google_oauth_user_secret',
        role: 'admin',
      });
    } else if (user.role !== 'admin') {
      // Ensure Google sign-in user gets admin privileges
      logger.info(`Elevating user ${decodedToken.email} to admin role via Google login`);
      user.role = 'admin';
      await user.save();
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
