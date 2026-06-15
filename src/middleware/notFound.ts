import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/api-error.util';

export function notFound(_req: Request, _res: Response, next: NextFunction) {
  next(ApiError.notFound('Route not found'));
}
