import { Request, Response, NextFunction } from 'express';
import { PatientService } from './patient.service';
import { ApiResponse } from '../../utils/response.util';

export class PatientController {
  static async createPatient(req: Request, res: Response, next: NextFunction) {
    try {
      const patient = await PatientService.createPatient(req.body);
      return ApiResponse.success({
        res,
        statusCode: 201,
        message: 'Tạo hồ sơ bệnh nhân thành công',
        data: patient,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getPatients(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await PatientService.getPatients(req.query as any);
      return ApiResponse.success({
        res,
        message: 'Lấy danh sách bệnh nhân thành công',
        data: result.data,
        meta: result.meta,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getPatientById(req: Request, res: Response, next: NextFunction) {
    try {
      const patient = await PatientService.getPatientById(req.params.id);
      return ApiResponse.success({
        res,
        message: 'Lấy thông tin bệnh nhân thành công',
        data: patient,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updatePatient(req: Request, res: Response, next: NextFunction) {
    try {
      const patient = await PatientService.updatePatient(req.params.id, req.body);
      return ApiResponse.success({
        res,
        message: 'Cập nhật thông tin bệnh nhân thành công',
        data: patient,
      });
    } catch (err) {
      next(err);
    }
  }

  static async addMedicalHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const history = await PatientService.addMedicalHistory(req.params.id, req.body);
      return ApiResponse.success({
        res,
        statusCode: 201,
        message: 'Ghi nhận tiền sử bệnh thành công',
        data: history,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getMedicalHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const histories = await PatientService.getMedicalHistory(req.params.id);
      return ApiResponse.success({
        res,
        message: 'Lấy danh sách tiền sử bệnh thành công',
        data: histories,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getPatientSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await PatientService.getPatientSummary(req.params.id);
      return ApiResponse.success({
        res,
        message: 'Lấy tổng quan hồ sơ bệnh nhân thành công',
        data: summary,
      });
    } catch (err) {
      next(err);
    }
  }
}
