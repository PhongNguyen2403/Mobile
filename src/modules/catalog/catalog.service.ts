import { prisma } from '../../config/database';
import { NotFoundError, ConflictError } from '../../middlewares/error.middleware';
import { PaginationUtil, PaginationParams } from '../../utils/pagination.util';
import { serializeBigInt } from '../../utils/bigint.util';

export class CatalogService {
  // SYMPTOMS CRUD
  static async createSymptom(data: { name: string; category?: string; description?: string }) {
    const existing = await prisma.symptoms.findUnique({ where: { name: data.name } });
    if (existing) throw new ConflictError('Tên triệu chứng đã tồn tại');

    const symptom = await prisma.symptoms.create({
      data: {
        name: data.name,
        category: data.category || null,
        description: data.description || null,
      },
    });
    return serializeBigInt(symptom);
  }

  static async getSymptoms(params: PaginationParams & { q?: string; category?: string }) {
    const { page, limit, skip, take } = PaginationUtil.getPagination(params);
    const where: any = {};
    if (params.category) where.category = params.category;
    if (params.q) {
      where.OR = [
        { name: { contains: params.q, mode: 'insensitive' } },
        { description: { contains: params.q, mode: 'insensitive' } },
      ];
    }

    const [symptoms, total] = await Promise.all([
      prisma.symptoms.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      prisma.symptoms.count({ where }),
    ]);

    return PaginationUtil.formatResult(serializeBigInt(symptoms), total, page, limit);
  }

  static async getSymptomById(id: number) {
    const symptom = await prisma.symptoms.findUnique({
      where: { id },
      include: {
        disease_symptoms: {
          include: { diseases: true },
        },
      },
    });
    if (!symptom) throw new NotFoundError('Không tìm thấy triệu chứng');
    return serializeBigInt(symptom);
  }

  static async updateSymptom(id: number, data: { name?: string; category?: string; description?: string }) {
    const existing = await prisma.symptoms.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Không tìm thấy triệu chứng');

    const updated = await prisma.symptoms.update({
      where: { id },
      data,
    });
    return serializeBigInt(updated);
  }

  static async deleteSymptom(id: number) {
    const existing = await prisma.symptoms.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Không tìm thấy triệu chứng');

    await prisma.symptoms.delete({ where: { id } });
    return { success: true, message: 'Đã xóa triệu chứng' };
  }

  static async getSymptomRecommendations(symptomId: number) {
    const symptom = await prisma.symptoms.findUnique({ where: { id: symptomId } });
    if (!symptom) throw new NotFoundError('Không tìm thấy triệu chứng');

    const recommendations = await prisma.symptom_product_recommendations.findMany({
      where: { symptom_id: symptomId },
      include: { products: true },
      orderBy: { priority: 'asc' },
    });

    return serializeBigInt({
      symptom,
      is_reference_only: true,
      disclaimer: 'CẢNH BÁO: Gợi ý thuốc/TPCN mang tính tham khảo sơ bộ, không thay thế đơn thuốc chính thức.',
      recommendations,
    });
  }

  // DISEASES CRUD
  static async createDisease(data: {
    name: string;
    icdCode?: string;
    description?: string;
    symptomIds?: number[];
  }) {
    const disease = await prisma.diseases.create({
      data: {
        name: data.name,
        icd_code: data.icdCode || null,
        description: data.description || null,
      },
    });

    if (data.symptomIds && data.symptomIds.length > 0) {
      await prisma.disease_symptoms.createMany({
        data: data.symptomIds.map((symptomId) => ({
          disease_id: disease.id,
          symptom_id: symptomId,
        })),
        skipDuplicates: true,
      });
    }

    return serializeBigInt(disease);
  }

  static async getDiseases(params: PaginationParams & { q?: string; icdCode?: string }) {
    const { page, limit, skip, take } = PaginationUtil.getPagination(params);
    const where: any = {};
    if (params.icdCode) where.icd_code = params.icdCode;
    if (params.q) {
      where.OR = [
        { name: { contains: params.q, mode: 'insensitive' } },
        { description: { contains: params.q, mode: 'insensitive' } },
      ];
    }

    const [diseases, total] = await Promise.all([
      prisma.diseases.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
        include: {
          disease_symptoms: {
            include: { symptoms: true },
          },
        },
      }),
      prisma.diseases.count({ where }),
    ]);

    return PaginationUtil.formatResult(serializeBigInt(diseases), total, page, limit);
  }

  static async getDiseaseById(id: number) {
    const disease = await prisma.diseases.findUnique({
      where: { id },
      include: {
        disease_symptoms: {
          include: { symptoms: true },
        },
      },
    });
    if (!disease) throw new NotFoundError('Không tìm thấy bệnh lý');
    return serializeBigInt(disease);
  }

  static async updateDisease(
    id: number,
    data: { name?: string; icdCode?: string; description?: string; symptomIds?: number[] }
  ) {
    const existing = await prisma.diseases.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Không tìm thấy bệnh lý');

    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.icdCode !== undefined) updateData.icd_code = data.icdCode;
    if (data.description !== undefined) updateData.description = data.description;

    const updated = await prisma.diseases.update({
      where: { id },
      data: updateData,
    });

    if (data.symptomIds) {
      await prisma.disease_symptoms.deleteMany({ where: { disease_id: id } });
      if (data.symptomIds.length > 0) {
        await prisma.disease_symptoms.createMany({
          data: data.symptomIds.map((symptomId) => ({
            disease_id: id,
            symptom_id: symptomId,
          })),
        });
      }
    }

    return serializeBigInt(updated);
  }

  static async deleteDisease(id: number) {
    const existing = await prisma.diseases.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Không tìm thấy bệnh lý');

    await prisma.diseases.delete({ where: { id } });
    return { success: true, message: 'Đã xóa bệnh lý' };
  }

  static async getDiseaseRecommendations(diseaseId: number) {
    const disease = await prisma.diseases.findUnique({ where: { id: diseaseId } });
    if (!disease) throw new NotFoundError('Không tìm thấy bệnh lý');

    const recommendations = await prisma.disease_product_recommendations.findMany({
      where: { disease_id: diseaseId },
      include: { products: true },
      orderBy: { priority: 'asc' },
    });

    return serializeBigInt({
      disease,
      is_reference_only: true,
      disclaimer: 'CẢNH BÁO: Gợi ý thuốc/TPCN mang tính tham khảo sơ bộ, không thay thế đơn thuốc chính thức.',
      recommendations,
    });
  }

  // DISEASE-SYMPTOMS LINK
  static async linkDiseaseSymptom(diseaseId: number, symptomId: number) {
    const linked = await prisma.disease_symptoms.upsert({
      where: {
        disease_id_symptom_id: {
          disease_id: diseaseId,
          symptom_id: symptomId,
        },
      },
      create: { disease_id: diseaseId, symptom_id: symptomId },
      update: {},
    });
    return serializeBigInt(linked);
  }

  static async unlinkDiseaseSymptom(diseaseId: number, symptomId: number) {
    await prisma.disease_symptoms.delete({
      where: {
        disease_id_symptom_id: {
          disease_id: diseaseId,
          symptom_id: symptomId,
        },
      },
    });
    return { success: true, message: 'Đã gỡ liên kết triệu chứng khỏi bệnh' };
  }
}
