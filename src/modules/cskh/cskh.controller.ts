import { Request, Response, NextFunction } from 'express';
import { CskhService } from './cskh.service';
import { ApiResponse } from '../../utils/response.util';

export class CskhController {
  static async assignPatient(req: Request, res: Response, next: NextFunction) {
    try {
      const assignment = await CskhService.assignPatient(req.body);
      return ApiResponse.success({
        res,
        statusCode: 201,
        message: 'Phân công nhân viên CSKH thành công',
        data: assignment,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getAssignments(req: Request, res: Response, next: NextFunction) {
    try {
      const filter = {
        patientId: req.query.patientId as string,
        staffId: req.query.staffId as string,
        isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
      };

      const result = await CskhService.getAssignments(filter, req.query as any);
      return ApiResponse.success({
        res,
        message: 'Lấy danh sách phân công CSKH thành công',
        data: result.data,
        meta: result.meta,
      });
    } catch (err) {
      next(err);
    }
  }

  static async createCareLog(req: Request, res: Response, next: NextFunction) {
    try {
      const staffId = req.user?.userId ? String(req.user.userId) : undefined;
      const log = await CskhService.createCareLog(staffId, req.body);
      return ApiResponse.success({
        res,
        statusCode: 201,
        message: 'Ghi nhật ký chăm sóc thành công',
        data: log,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getCareLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const filter = {
        patientId: req.query.patientId as string,
        staffId: req.query.staffId as string,
        interactionType: req.query.interactionType as any,
      };

      const result = await CskhService.getCareLogs(filter, req.query as any);
      return ApiResponse.success({
        res,
        message: 'Lấy danh sách nhật ký chăm sóc thành công',
        data: result.data,
        meta: result.meta,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const staffId = req.user?.userId ? String(req.user.userId) : '';
      const dashboard = await CskhService.getDashboard(staffId);
      return ApiResponse.success({
        res,
        message: 'Lấy dữ liệu dashboard CSKH thành công',
        data: dashboard,
      });
    } catch (err) {
      next(err);
    }
  }
}
