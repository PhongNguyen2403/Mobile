import { Request, Response, NextFunction } from 'express';
import { JwtUtil } from '../utils/jwt.util';
import { UnauthorizedError } from './error.middleware';

export const authGuard = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Yêu cầu cung cấp Bearer token trong Authorization header');
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = JwtUtil.verifyAccessToken(token);
    req.user = payload;
    return next();
  } catch (err: any) {
    throw new UnauthorizedError(
      err.name === 'TokenExpiredError'
        ? 'Token xác thực đã hết hạn'
        : 'Token xác thực không hợp lệ'
    );
  }
};
