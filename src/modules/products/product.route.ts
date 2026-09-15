import { Router } from 'express';
import { ProductController } from './product.controller';
import { authGuard } from '../../middlewares/auth.middleware';
import { roleGuard } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  createProductSchema,
  updateProductSchema,
  listProductsQuerySchema,
  symptomProductRecommendationSchema,
  diseaseProductRecommendationSchema,
} from './product.schema';

const router = Router();

router.use(authGuard);

// Tra cứu danh sách & chi tiết sản phẩm (cho tất cả role đã login)
router.get('/', validate(listProductsQuerySchema), ProductController.getProducts);
router.get('/:id', ProductController.getProductById);

// Quản lý sản phẩm (Admin)
router.post(
  '/',
  roleGuard('admin'),
  validate(createProductSchema),
  ProductController.createProduct
);
router.patch(
  '/:id',
  roleGuard('admin'),
  validate(updateProductSchema),
  ProductController.updateProduct
);
router.delete('/:id', roleGuard('admin'), ProductController.deleteProduct);

// Gợi ý theo triệu chứng (Admin)
router.post(
  '/recommendations/symptom',
  roleGuard('admin'),
  validate(symptomProductRecommendationSchema),
  ProductController.upsertSymptomRecommendation
);
router.delete(
  '/recommendations/symptom/:symptomId/:productId',
  roleGuard('admin'),
  ProductController.deleteSymptomRecommendation
);

// Gợi ý theo bệnh lý (Admin)
router.post(
  '/recommendations/disease',
  roleGuard('admin'),
  validate(diseaseProductRecommendationSchema),
  ProductController.upsertDiseaseRecommendation
);
router.delete(
  '/recommendations/disease/:diseaseId/:productId',
  roleGuard('admin'),
  ProductController.deleteDiseaseRecommendation
);

export default router;
