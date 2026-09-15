import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../config/logger';
import { ApiResponse } from '../utils/response.util';
import { env } from '../config/env';

export class AppError extends Error {
  public statusCode: number;
  public errors?: any;

  constructor(message: string, statusCode = 500, errors?: any) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Không tìm thấy tài nguyên yêu cầu') {
    super(message, 404);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Dữ liệu yêu cầu không hợp lệ', errors?: any) {
    super(message, 400, errors);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Chưa xác thực hoặc token không hợp lệ') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Bạn không có quyền thực hiện hành động này') {
    super(message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Xung đột dữ liệu') {
    super(message, 409);
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error(`[${req.method}] ${req.originalUrl} - Error: ${err.message}`, {
    stack: err.stack,
    errors: err.errors,
  });

  // Zod Validation Error
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return ApiResponse.error({
      res,
      statusCode: 400,
      message: 'Dữ liệu đầu vào không hợp lệ',
      errors: formattedErrors,
    });
  }

  // Known AppError
  if (err instanceof AppError) {
    return ApiResponse.error({
      res,
      statusCode: err.statusCode,
      message: err.message,
      errors: err.errors,
    });
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    return ApiResponse.error({
      res,
      statusCode: 401,
      message: 'Token xác thực không hợp lệ',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return ApiResponse.error({
      res,
      statusCode: 401,
      message: 'Token xác thực đã hết hạn',
    });
  }

  // Default Internal Server Error
  const message =
    env.NODE_ENV === 'production'
      ? 'Đã xảy ra lỗi nội bộ hệ thống'
      : err.message || 'Lỗi hệ thống';

  return ApiResponse.error({
    res,
    statusCode: 500,
    message,
    errors: env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};
