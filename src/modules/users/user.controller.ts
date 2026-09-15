import { Request, Response, NextFunction } from 'express';
import { UserService } from './user.service';
import { ApiResponse } from '../../utils/response.util';

export class UserController {
  static async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await UserService.createUser(req.body);
      return ApiResponse.success({
        res,
        statusCode: 201,
        message: 'Tạo tài khoản nhân viên thành công',
        data: user,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await UserService.getUsers(req.query as any);
      return ApiResponse.success({
        res,
        message: 'Lấy danh sách người dùng thành công',
        data: result.data,
        meta: result.meta,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await UserService.getUserById(req.params.id);
      return ApiResponse.success({
        res,
        message: 'Lấy thông tin người dùng thành công',
        data: user,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await UserService.updateUser(req.params.id, req.body);
      return ApiResponse.success({
        res,
        message: 'Cập nhật thông tin người dùng thành công',
        data: user,
      });
    } catch (err) {
      next(err);
    }
  }
}
