import { prisma } from '../../config/database';
import { NotFoundError } from '../../middlewares/error.middleware';
import { PaginationUtil, PaginationParams } from '../../utils/pagination.util';
import { serializeBigInt } from '../../utils/bigint.util';

export class ProductService {
  // PRODUCTS CRUD
  static async createProduct(data: any) {
    const product = await prisma.products.create({
      data: {
        name: data.name,
        type: data.type,
        manufacturer: data.manufacturer || null,
        unit: data.unit || null,
        dosage_form: data.dosageForm || null,
        price: data.price !== undefined ? data.price : 0,
        stock_quantity: data.stockQuantity !== undefined ? data.stockQuantity : 0,
        usage_instruction: data.usageInstruction || null,
        contraindication: data.contraindication || null,
        status: data.status || 'active',
      },
    });

    return serializeBigInt(product);
  }

  static async getProducts(
    params: PaginationParams & {
      type?: 'medicine' | 'supplement';
      status?: 'active' | 'discontinued' | 'out_of_stock';
      q?: string;
    }
  ) {
    const { page, limit, skip, take } = PaginationUtil.getPagination(params);

    const where: any = {};
    if (params.type) where.type = params.type;
    if (params.status) where.status = params.status;
    if (params.q) {
      where.OR = [
        { name: { contains: params.q, mode: 'insensitive' } },
        { manufacturer: { contains: params.q, mode: 'insensitive' } },
        { usage_instruction: { contains: params.q, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.products.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      prisma.products.count({ where }),
    ]);

    return PaginationUtil.formatResult(serializeBigInt(products), total, page, limit);
  }

  static async getProductById(id: string) {
    const product = await prisma.products.findUnique({
      where: { id },
      include: {
        symptom_product_recommendations: {
          include: { symptoms: true },
        },
        disease_product_recommendations: {
          include: { diseases: true },
        },
      },
    });

    if (!product) throw new NotFoundError('Không tìm thấy sản phẩm thuốc/TPCN');
    return serializeBigInt(product);
  }

  static async updateProduct(id: string, data: any) {
    const existing = await prisma.products.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Không tìm thấy sản phẩm thuốc/TPCN');

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.manufacturer !== undefined) updateData.manufacturer = data.manufacturer;
    if (data.unit !== undefined) updateData.unit = data.unit;
    if (data.dosageForm !== undefined) updateData.dosage_form = data.dosageForm;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.stockQuantity !== undefined) updateData.stock_quantity = data.stockQuantity;
    if (data.usageInstruction !== undefined) updateData.usage_instruction = data.usageInstruction;
    if (data.contraindication !== undefined) updateData.contraindication = data.contraindication;
    if (data.status !== undefined) updateData.status = data.status;
    updateData.updated_at = new Date();

    const updated = await prisma.products.update({
      where: { id },
      data: updateData,
    });

    return serializeBigInt(updated);
  }

  static async deleteProduct(id: string) {
    const existing = await prisma.products.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Không tìm thấy sản phẩm');

    // Soft delete: chuyển trạng thái sang discontinued
    const updated = await prisma.products.update({
      where: { id },
      data: { status: 'discontinued', updated_at: new Date() },
    });

    return {
      success: true,
      message: 'Đã chuyển trạng thái sản phẩm sang ngừng kinh doanh (discontinued)',
      data: serializeBigInt(updated),
    };
  }

  // RECOMMENDATIONS MANAGEMENT
  static async upsertSymptomRecommendation(data: {
    symptomId: number;
    productId: string;
    recommendedDosage?: string;
    priority?: number;
    note?: string;
  }) {
    const recommendation = await prisma.symptom_product_recommendations.upsert({
      where: {
        symptom_id_product_id: {
          symptom_id: data.symptomId,
          product_id: data.productId,
        },
      },
      create: {
        symptom_id: data.symptomId,
        product_id: data.productId,
        recommended_dosage: data.recommendedDosage || null,
        priority: data.priority || 1,
        note: data.note || null,
      },
      update: {
        recommended_dosage: data.recommendedDosage || null,
        priority: data.priority || 1,
        note: data.note || null,
      },
      include: {
        products: true,
        symptoms: true,
      },
    });

    return serializeBigInt({
      is_reference_only: true,
      ...recommendation,
    });
  }

  static async deleteSymptomRecommendation(symptomId: number, productId: string) {
    await prisma.symptom_product_recommendations.delete({
      where: {
        symptom_id_product_id: {
          symptom_id: symptomId,
          product_id: productId,
        },
      },
    });

    return { success: true, message: 'Đã xóa gợi ý sản phẩm cho triệu chứng' };
  }

  static async upsertDiseaseRecommendation(data: {
    diseaseId: number;
    productId: string;
    recommendedDosage?: string;
    priority?: number;
    note?: string;
  }) {
    const recommendation = await prisma.disease_product_recommendations.upsert({
      where: {
        disease_id_product_id: {
          disease_id: data.diseaseId,
          product_id: data.productId,
        },
      },
      create: {
        disease_id: data.diseaseId,
        product_id: data.productId,
        recommended_dosage: data.recommendedDosage || null,
        priority: data.priority || 1,
        note: data.note || null,
      },
      update: {
        recommended_dosage: data.recommendedDosage || null,
        priority: data.priority || 1,
        note: data.note || null,
      },
      include: {
        products: true,
        diseases: true,
      },
    });

    return serializeBigInt({
      is_reference_only: true,
      ...recommendation,
    });
  }

  static async deleteDiseaseRecommendation(diseaseId: number, productId: string) {
    await prisma.disease_product_recommendations.delete({
      where: {
        disease_id_product_id: {
          disease_id: diseaseId,
          product_id: productId,
        },
      },
    });

    return { success: true, message: 'Đã xóa gợi ý sản phẩm cho bệnh lý' };
  }
}
