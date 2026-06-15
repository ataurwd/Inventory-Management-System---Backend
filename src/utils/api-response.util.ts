import { Response } from 'express';

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function success<T>(
  res: Response,
  data: T,
  statusCode: number = 200
): Response {
  return res.status(statusCode).json({
    success: true,
    data,
  });
}

export function created<T>(res: Response, data: T): Response {
  return res.status(201).json({
    success: true,
    data,
  });
}

export function noContent(res: Response): Response {
  return res.status(204).send();
}

export function paginated<T>(
  res: Response,
  data: T[],
  meta: PaginationMeta
): Response {
  return res.status(200).json({
    success: true,
    data,
    meta,
  });
}
