import { Request, Response, NextFunction } from 'express';
import { NotificationService } from './notification.service';
import { ApiResponse } from '../../utils/response.util';

export class NotificationController {
  static async getNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const filter: { userId?: string; patientId?: string } = {};

      if (req.user?.role === 'patient' && req.user.patientId) {
        filter.patientId = String(req.user.patientId);
      } else if (req.user?.userId) {
        // Nhân viên nội bộ
        if (req.query.user_id) {
          filter.userId = String(req.query.user_id);
        } else if (req.query.patient_id) {
          filter.patientId = String(req.query.patient_id);
        } else {
          filter.userId = String(req.user.userId);
        }
      }

      const params = {
        page: req.query.page as string,
        limit: req.query.limit as string,
        status: req.query.status as any,
        type: req.query.type as any,
        isRead: req.query.isRead ? req.query.isRead === 'true' : undefined,
      };

      const result = await NotificationService.getNotifications(filter, params);
      return ApiResponse.success({
        res,
        message: 'Lấy danh sách thông báo thành công',
        data: result.data,
        meta: result.meta,
      });
    } catch (err) {
      next(err);
    }
  }

  static async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await NotificationService.markAsRead(req.params.id);
      return ApiResponse.success({
        res,
        message: 'Đã đánh dấu thông báo là đã đọc',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  static async triggerCron(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await NotificationService.processUpcomingFollowUpReminders();
      return ApiResponse.success({
        res,
        message: 'Kích hoạt quét nhắc nhở lịch tái khám thành công',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}
