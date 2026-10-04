import { Request, Response, NextFunction } from 'express';
import { AppointmentService } from './appointment.service';
import { ApiResponse } from '../../utils/response.util';

export class AppointmentController {
  static async createAppointment(req: Request, res: Response, next: NextFunction) {
    try {
      const createdBy = req.user?.userId ? String(req.user.userId) : undefined;
      // Nếu bệnh nhân tự đặt lịch, lấy patientId từ token nếu không truyền
      let patientId = req.body.patientId;
      if (req.user?.role === 'patient' && req.user.patientId) {
        patientId = String(req.user.patientId);
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

  /**
   * Endpoint công khai/an toàn kiểm tra lịch trống của bác sĩ
   */
  static async getDoctorAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      const doctorId = String(req.query.doctorId);
      const date = String(req.query.date);

      const availability = await AppointmentService.getDoctorAvailability(doctorId, date);
      return ApiResponse.success({
        res,
        message: 'Lấy thông tin khung giờ trống của bác sĩ thành công',
        data: availability,
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
        req.body.note,
        req.body.clinicRoom
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
        req.body.clinicRoom
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
}
