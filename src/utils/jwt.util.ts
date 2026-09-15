import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface TokenPayload {
  userId?: string | number;
  patientId?: string | number;
  role: 'admin' | 'doctor' | 'nurse' | 'cskh' | 'patient';
  email?: string;
  phone?: string;
}

export class JwtUtil {
  static generateTokens(payload: TokenPayload) {
    const accessToken = jwt.sign(payload, env.JWT.ACCESS_SECRET, {
      expiresIn: env.JWT.ACCESS_EXPIRES_IN as any,
    });

    const refreshToken = jwt.sign(payload, env.JWT.REFRESH_SECRET, {
      expiresIn: env.JWT.REFRESH_EXPIRES_IN as any,
    });

    return { accessToken, refreshToken };
  }

  static verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, env.JWT.ACCESS_SECRET) as TokenPayload;
  }

  static verifyRefreshToken(token: string): TokenPayload {
    return jwt.verify(token, env.JWT.REFRESH_SECRET) as TokenPayload;
  }
}
