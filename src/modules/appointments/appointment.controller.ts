import { Request, Response, NextFunction } from 'express';
import { AppointmentService } from './appointment.service';
import { ApiResponse } from '../../utils/response.util';
import { BadRequestError, ForbiddenError } from '../../middlewares/error.middleware';

export class AppointmentController {
  static async createAppointment(req: Request, res: Response, next: NextFunction) {
    try {
      const createdBy = req.user?.userId ? String(req.user.userId) : undefined;
      const patientId = req.user?.role === 'patient'
        ? req.user.patientId
        : req.body.patientId;
      if (!patientId) {
        throw new BadRequestError('Không xác định được hồ sơ bệnh nhân');
      }

      const appointment = await AppointmentService.createAppointment({
        ...req.body,
        patientId,
        createdBy,
      });

      return ApiResponse.success({
        res,
        statusCode: 201,
        message: 'Đặt lịch khám tại phòng khám thành công',
        data: appointment,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getAppointments(req: Request, res: Response, next: NextFunction) {
    try {
      const query = { ...req.query } as any;

      // Nếu là bệnh nhân, chỉ cho phép xem lịch của chính mình
      if (req.user?.role === 'patient' && req.user.patientId) {
        query.patientId = String(req.user.patientId);
      }
      // Nếu là bác sĩ/điều dưỡng, có thể lọc lịch của chính mình
      if (req.user?.role === 'doctor' || req.user?.role === 'nurse') {
        if (!query.staffId && !query.patientId) {
          query.staffId = String(req.user.userId);
        }
      }

      const result = await AppointmentService.getAppointments(query);
      return ApiResponse.success({
        res,
        message: 'Lấy danh sách lịch hẹn thành công',
        data: result.data,
        meta: result.meta,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getAppointmentById(req: Request, res: Response, next: NextFunction) {
    try {
      const appointment = await AppointmentService.getAppointmentById(req.params.id);
      if (
        req.user?.role === 'patient' &&
        String(appointment.patient_id) !== String(req.user.patientId)
      ) {
        throw new ForbiddenError('Bệnh nhân chỉ có quyền xem lịch hẹn của chính mình');
      }
      return ApiResponse.success({
        res,
        message: 'Lấy thông tin lịch hẹn thành công',
        data: appointment,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await AppointmentService.updateAppointmentStatus(
        req.params.id,
        req.body.status,
        req.body.note
      );
      return ApiResponse.success({
        res,
        message: 'Cập nhật trạng thái lịch hẹn thành công',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  static async assignStaff(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await AppointmentService.assignStaff(
        req.params.id,
        req.body.staffId,
        req.body.scheduledAt
      );
      return ApiResponse.success({
        res,
        message: 'Phân công nhân viên phụ trách lịch hẹn thành công',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  static async createRescheduleProposal(req: Request, res: Response, next: NextFunction) {
    try {
      const proposedBy = req.user?.userId ? String(req.user.userId) : undefined;
      if (!proposedBy) throw new BadRequestError('Không xác định được nhân viên CSKH');

      const proposal = await AppointmentService.createRescheduleProposal(
        req.params.id,
        proposedBy,
        req.body.reason,
        req.body.options
      );
      return ApiResponse.success({
        res,
        statusCode: 201,
        message: 'Đã gửi đề xuất đổi lịch cho bệnh nhân',
        data: proposal,
      });
    } catch (err) {
      next(err);
    }
  }

  static async respondToRescheduleProposal(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = req.user?.patientId ? String(req.user.patientId) : undefined;
      if (!patientId) throw new ForbiddenError('Tài khoản không liên kết với hồ sơ bệnh nhân');

      const result = await AppointmentService.respondToRescheduleProposal(
        req.params.id,
        req.params.proposalId,
        patientId,
        req.body.decision,
        req.body.optionId
      );
      return ApiResponse.success({
        res,
        message: req.body.decision === 'accept'
          ? 'Đã xác nhận phương án đổi lịch'
          : 'Đã từ chối các phương án đổi lịch; CSKH sẽ xử lý tiếp',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}
