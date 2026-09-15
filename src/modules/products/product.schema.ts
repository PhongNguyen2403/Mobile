import { z } from 'zod';

export const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Tên sản phẩm tối thiểu 2 ký tự').max(200),
    type: z.enum(['medicine', 'supplement']),
    manufacturer: z.string().max(150).optional(),
    unit: z.string().max(50).optional(),
    dosageForm: z.string().max(100).optional(),
    price: z.number().nonnegative().optional(),
    stockQuantity: z.number().int().nonnegative().optional(),
    usageInstruction: z.string().optional(),
    contraindication: z.string().optional(),
    status: z.enum(['active', 'discontinued', 'out_of_stock']).default('active'),
  }),
});

export const updateProductSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    name: z.string().min(2).max(200).optional(),
    type: z.enum(['medicine', 'supplement']).optional(),
    manufacturer: z.string().max(150).optional(),
    unit: z.string().max(50).optional(),
    dosageForm: z.string().max(100).optional(),
    price: z.number().nonnegative().optional(),
    stockQuantity: z.number().int().nonnegative().optional(),
    usageInstruction: z.string().optional(),
    contraindication: z.string().optional(),
    status: z.enum(['active', 'discontinued', 'out_of_stock']).optional(),
  }),
});

export const listProductsQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    type: z.enum(['medicine', 'supplement']).optional(),
    status: z.enum(['active', 'discontinued', 'out_of_stock']).optional(),
    q: z.string().optional(),
  }),
});

export const symptomProductRecommendationSchema = z.object({
  body: z.object({
    symptomId: z.number().int().positive(),
    productId: z.string().uuid(),
    recommendedDosage: z.string().max(200).optional(),
    priority: z.number().int().min(1).default(1),
    note: z.string().optional(),
  }),
});

export const diseaseProductRecommendationSchema = z.object({
  body: z.object({
    diseaseId: z.number().int().positive(),
    productId: z.string().uuid(),
    recommendedDosage: z.string().max(200).optional(),
    priority: z.number().int().min(1).default(1),
    note: z.string().optional(),
  }),
});
