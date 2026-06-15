export class ApiError extends Error {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR'
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, code = 'BAD_REQUEST'): ApiError {
    return new ApiError(message, 400, code);
  }

  static unauthorized(message = 'Unauthorized'): ApiError {
    return new ApiError(message, 401, 'UNAUTHORIZED');
  }

  static forbidden(message = 'Forbidden'): ApiError {
    return new ApiError(message, 403, 'FORBIDDEN');
  }

  static notFound(message = 'Resource not found'): ApiError {
    return new ApiError(message, 404, 'NOT_FOUND');
  }

  static conflict(message: string, code = 'CONFLICT'): ApiError {
    return new ApiError(message, 409, code);
  }

  static internal(message = 'Internal server error'): ApiError {
    return new ApiError(message, 500, 'INTERNAL_ERROR');
  }
}
