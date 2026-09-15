import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { ApiResponse } from '../../utils/response.util';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const patient = await AuthService.registerPatient(req.body);
      return ApiResponse.success({
        res,
        statusCode: 201,
        message: 'Đăng ký hồ sơ bệnh nhân thành công',
        data: patient,
      });
    } catch (err) {
      next(err);
    }
  }

  static async sendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.sendOtp(req.body.phone);
      return ApiResponse.success({
        res,
        message: 'Mã OTP đã được gửi thành công',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.verifyOtp(req.body.phone, req.body.otp);
      return ApiResponse.success({
        res,
        message: 'Xác thực OTP và đăng nhập thành công',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.loginStaff(req.body.email, req.body.password);
      return ApiResponse.success({
        res,
        message: 'Đăng nhập nhân viên thành công',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const tokens = await AuthService.refreshToken(req.body.refreshToken);
      return ApiResponse.success({
        res,
        message: 'Làm mới token thành công',
        data: tokens,
      });
    } catch (err) {
      next(err);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      // Hỗ trợ stateless logout hoặc thu hồi session
      return ApiResponse.success({
        res,
        message: 'Đăng xuất thành công',
      });
    } catch (err) {
      next(err);
    }
  }
}
