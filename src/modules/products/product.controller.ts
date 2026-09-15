import { Request, Response, NextFunction } from 'express';
import { ProductService } from './product.service';
import { ApiResponse } from '../../utils/response.util';

export class ProductController {
  static async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await ProductService.createProduct(req.body);
      return ApiResponse.success({
        res,
        statusCode: 201,
        message: 'Tạo sản phẩm thuốc/TPCN thành công',
        data: product,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ProductService.getProducts(req.query as any);
      return ApiResponse.success({
        res,
        message: 'Lấy danh sách sản phẩm thành công',
        data: result.data,
        meta: result.meta,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getProductById(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await ProductService.getProductById(req.params.id);
      return ApiResponse.success({
        res,
        message: 'Lấy thông tin sản phẩm thành công',
        data: product,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await ProductService.updateProduct(req.params.id, req.body);
      return ApiResponse.success({
        res,
        message: 'Cập nhật sản phẩm thành công',
        data: product,
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ProductService.deleteProduct(req.params.id);
      return ApiResponse.success({
        res,
        message: result.message,
        data: result.data,
      });
    } catch (err) {
      next(err);
    }
  }

  static async upsertSymptomRecommendation(req: Request, res: Response, next: NextFunction) {
    try {
      const rec = await ProductService.upsertSymptomRecommendation(req.body);
      return ApiResponse.success({
        res,
        message: 'Cập nhật gợi ý sản phẩm theo triệu chứng thành công',
        data: rec,
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteSymptomRecommendation(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ProductService.deleteSymptomRecommendation(
        Number(req.params.symptomId),
        req.params.productId
      );
      return ApiResponse.success({ res, message: result.message });
    } catch (err) {
      next(err);
    }
  }

  static async upsertDiseaseRecommendation(req: Request, res: Response, next: NextFunction) {
    try {
      const rec = await ProductService.upsertDiseaseRecommendation(req.body);
      return ApiResponse.success({
        res,
        message: 'Cập nhật gợi ý sản phẩm theo bệnh lý thành công',
        data: rec,
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteDiseaseRecommendation(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ProductService.deleteDiseaseRecommendation(
        Number(req.params.diseaseId),
        req.params.productId
      );
      return ApiResponse.success({ res, message: result.message });
    } catch (err) {
      next(err);
    }
  }
}
