import { Request, Response, NextFunction } from 'express';
import { CatalogService } from './catalog.service';
import { ApiResponse } from '../../utils/response.util';

export class CatalogController {
  // SYMPTOMS
  static async createSymptom(req: Request, res: Response, next: NextFunction) {
    try {
      const symptom = await CatalogService.createSymptom(req.body);
      return ApiResponse.success({
        res,
        statusCode: 201,
        message: 'Tạo triệu chứng thành công',
        data: symptom,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getSymptoms(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await CatalogService.getSymptoms(req.query as any);
      return ApiResponse.success({
        res,
        message: 'Lấy danh sách triệu chứng thành công',
        data: result.data,
        meta: result.meta,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getSymptomById(req: Request, res: Response, next: NextFunction) {
    try {
      const symptom = await CatalogService.getSymptomById(Number(req.params.id));
      return ApiResponse.success({
        res,
        message: 'Lấy thông tin triệu chứng thành công',
        data: symptom,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateSymptom(req: Request, res: Response, next: NextFunction) {
    try {
      const symptom = await CatalogService.updateSymptom(Number(req.params.id), req.body);
      return ApiResponse.success({
        res,
        message: 'Cập nhật triệu chứng thành công',
        data: symptom,
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteSymptom(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await CatalogService.deleteSymptom(Number(req.params.id));
      return ApiResponse.success({ res, message: result.message });
    } catch (err) {
      next(err);
    }
  }

  static async getSymptomRecommendations(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await CatalogService.getSymptomRecommendations(Number(req.params.id));
      return ApiResponse.success({
        res,
        message: 'Lấy danh sách sản phẩm gợi ý theo triệu chứng thành công',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  // DISEASES
  static async createDisease(req: Request, res: Response, next: NextFunction) {
    try {
      const disease = await CatalogService.createDisease(req.body);
      return ApiResponse.success({
        res,
        statusCode: 201,
        message: 'Tạo bệnh lý thành công',
        data: disease,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getDiseases(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await CatalogService.getDiseases(req.query as any);
      return ApiResponse.success({
        res,
        message: 'Lấy danh sách bệnh lý thành công',
        data: result.data,
        meta: result.meta,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getDiseaseById(req: Request, res: Response, next: NextFunction) {
    try {
      const disease = await CatalogService.getDiseaseById(Number(req.params.id));
      return ApiResponse.success({
        res,
        message: 'Lấy thông tin bệnh lý thành công',
        data: disease,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateDisease(req: Request, res: Response, next: NextFunction) {
    try {
      const disease = await CatalogService.updateDisease(Number(req.params.id), req.body);
      return ApiResponse.success({
        res,
        message: 'Cập nhật bệnh lý thành công',
        data: disease,
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteDisease(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await CatalogService.deleteDisease(Number(req.params.id));
      return ApiResponse.success({ res, message: result.message });
    } catch (err) {
      next(err);
    }
  }

  static async getDiseaseRecommendations(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await CatalogService.getDiseaseRecommendations(Number(req.params.id));
      return ApiResponse.success({
        res,
        message: 'Lấy danh sách sản phẩm gợi ý theo bệnh lý thành công',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  // LINK / UNLINK
  static async linkDiseaseSymptom(req: Request, res: Response, next: NextFunction) {
    try {
      const linked = await CatalogService.linkDiseaseSymptom(
        req.body.diseaseId,
        req.body.symptomId
      );
      return ApiResponse.success({
        res,
        message: 'Liên kết triệu chứng với bệnh lý thành công',
        data: linked,
      });
    } catch (err) {
      next(err);
    }
  }

  static async unlinkDiseaseSymptom(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await CatalogService.unlinkDiseaseSymptom(
        Number(req.params.diseaseId),
        Number(req.params.symptomId)
      );
      return ApiResponse.success({ res, message: result.message });
    } catch (err) {
      next(err);
    }
  }
}
