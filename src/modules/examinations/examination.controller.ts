import { Request, Response, NextFunction } from 'express';
import { ExaminationService } from './examination.service';
import { ApiResponse } from '../../utils/response.util';

export class ExaminationController {
  static async createExamination(req: Request, res: Response, next: NextFunction) {
    try {
      const doctorId = req.user?.userId ? String(req.user.userId) : undefined;
      const exam = await ExaminationService.createExamination(doctorId, req.body);
      return ApiResponse.success({
        res,
        statusCode: 201,
        message: 'Ghi nhận kết quả khám bệnh tại nhà thành công',
        data: exam,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getExaminationById(req: Request, res: Response, next: NextFunction) {
    try {
      const exam = await ExaminationService.getExaminationById(req.params.id);
      return ApiResponse.success({
        res,
        message: 'Lấy chi tiết kết quả khám thành công',
        data: exam,
      });
    } catch (err) {
      next(err);
    }
  }

  static async createPrescription(req: Request, res: Response, next: NextFunction) {
    try {
      const prescribedBy = req.user?.userId ? String(req.user.userId) : undefined;
      const prescription = await ExaminationService.createPrescription(
        req.params.id,
        prescribedBy,
        req.body
      );
      return ApiResponse.success({
        res,
        statusCode: 201,
        message: 'Kê đơn thuốc thành công',
        data: prescription,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getPatientExaminations(req: Request, res: Response, next: NextFunction) {
    try {
      const exams = await ExaminationService.getPatientExaminations(req.params.id);
      return ApiResponse.success({
        res,
        message: 'Lấy lịch sử khám bệnh thành công',
        data: exams,
      });
    } catch (err) {
      next(err);
    }
  }
}
