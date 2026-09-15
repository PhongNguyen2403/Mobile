import { Request, Response, NextFunction } from 'express';
import { BodyMapService } from './body-map.service';
import { ApiResponse } from '../../utils/response.util';

export class BodyMapController {
  static async getBodyParts(req: Request, res: Response, next: NextFunction) {
    try {
      const parts = await BodyMapService.getBodyParts(req.query as any);
      return ApiResponse.success({
        res,
        message: 'Lấy danh sách điểm giải phẫu thành công',
        data: parts,
      });
    } catch (err) {
      next(err);
    }
  }

  static async createSymptomReport(req: Request, res: Response, next: NextFunction) {
    try {
      const report = await BodyMapService.createSymptomReport(req.body);
      return ApiResponse.success({
        res,
        statusCode: 201,
        message: 'Khởi tạo phiên tự khai báo triệu chứng thành công',
        data: report,
      });
    } catch (err) {
      next(err);
    }
  }

  static async addReportItem(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await BodyMapService.addReportItem(req.params.id, req.body);
      return ApiResponse.success({
        res,
        statusCode: 201,
        message: 'Thêm điểm đau và triệu chứng thành công',
        data: item,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getReportDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const detail = await BodyMapService.getReportDetail(req.params.id);
      return ApiResponse.success({
        res,
        message: 'Lấy chi tiết phiên khai báo thành công',
        data: detail,
      });
    } catch (err) {
      next(err);
    }
  }

  static async convertToAppointment(req: Request, res: Response, next: NextFunction) {
    try {
      const createdBy = req.user?.userId ? String(req.user.userId) : undefined;
      const appointment = await BodyMapService.convertToAppointment(req.params.id, {
        ...req.body,
        createdBy,
      });
      return ApiResponse.success({
        res,
        statusCode: 201,
        message: 'Chuyển phiên khai báo thành lịch hẹn thành công',
        data: appointment,
      });
    } catch (err) {
      next(err);
    }
  }
}
