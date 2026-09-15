import { Request, Response, NextFunction } from 'express';
import { FollowUpService } from './follow-up.service';
import { ApiResponse } from '../../utils/response.util';

export class FollowUpController {
  static async createFollowUp(req: Request, res: Response, next: NextFunction) {
    try {
      const schedule = await FollowUpService.createFollowUp(req.body);
      return ApiResponse.success({
        res,
        statusCode: 201,
        message: 'Tạo lịch tái khám thành công',
        data: schedule,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getFollowUps(req: Request, res: Response, next: NextFunction) {
    try {
      const query = { ...req.query } as any;
      if (req.user?.role === 'patient' && req.user.patientId) {
        query.patientId = String(req.user.patientId);
      }

      const result = await FollowUpService.getFollowUps(query);
      return ApiResponse.success({
        res,
        message: 'Lấy danh sách lịch tái khám thành công',
        data: result.data,
        meta: result.meta,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await FollowUpService.updateFollowUpStatus(
        req.params.id,
        req.body.status,
        req.body.note
      );
      return ApiResponse.success({
        res,
        message: 'Cập nhật trạng thái lịch tái khám thành công',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }
}
