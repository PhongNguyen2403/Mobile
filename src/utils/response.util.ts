import { Response } from 'express';

export interface ApiResponseOptions<T = any> {
  res: Response;
  statusCode?: number;
  message: string;
  data?: T;
  meta?: any;
}

export interface ApiErrorOptions {
  res: Response;
  statusCode?: number;
  message: string;
  errors?: any;
}

export class ApiResponse {
  static success<T = any>({
    res,
    statusCode = 200,
    message,
    data,
    meta,
  }: ApiResponseOptions<T>) {
    return res.status(statusCode).json({
      success: true,
      message,
      ...(data !== undefined && { data }),
      ...(meta !== undefined && { meta }),
    });
  }

  static error({
    res,
    statusCode = 500,
    message,
    errors,
  }: ApiErrorOptions) {
    return res.status(statusCode).json({
      success: false,
      message,
      ...(errors !== undefined && { errors }),
    });
  }
}
