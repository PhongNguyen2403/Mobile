import { prisma } from '../../config/database';
import { NotFoundError, BadRequestError } from '../../middlewares/error.middleware';
import { serializeBigInt } from '../../utils/bigint.util';
import {
  assertAppointmentDuringBusinessHours,
  assertAppointmentInFuture,
} from '../../utils/appointment-hours.util';

export class BodyMapService {
  /**
   * Lấy danh sách điểm giải phẫu trên mô hình 2D/3D (lọc theo mặt trước/mặt sau)
   */
  static async getBodyParts(params: { viewSide?: string; region?: string; parentId?: number }) {
    const where: any = {};
    if (params.viewSide) where.view_side = params.viewSide;
    if (params.region) where.region = params.region;
    if (params.parentId) where.parent_id = Number(params.parentId);

    const bodyParts = await prisma.body_parts.findMany({
      where,
      orderBy: [{ region: 'asc' }, { name: 'asc' }],
    });

    return serializeBigInt(bodyParts);
  }

  /**
   * Khởi tạo phiên tự khai báo triệu chứng của bệnh nhân
   */
  static async createSymptomReport(data: { patientId: string; source?: string }) {
    const patient = await prisma.patients.findUnique({ where: { id: data.patientId } });
    if (!patient) throw new NotFoundError('Không tìm thấy hồ sơ bệnh nhân');

    const report = await prisma.patient_symptom_reports.create({
      data: {
        patient_id: data.patientId,
        source: data.source || 'app',
        status: 'submitted',
      },
    });

    return serializeBigInt(report);
  }

  /**
   * Thêm điểm đau và triệu chứng vào phiên khai báo
   */
  static async addReportItem(
    reportId: string,
    data: {
      bodyPartId: number;
      symptomId?: number;
      severity?: 'mild' | 'moderate' | 'severe';
      note?: string;
    }
  ) {
    const report = await prisma.patient_symptom_reports.findUnique({
      where: { id: reportId },
    });
    if (!report) throw new NotFoundError('Không tìm thấy phiên khai báo triệu chứng');

    const bodyPart = await prisma.body_parts.findUnique({
      where: { id: data.bodyPartId },
    });
    if (!bodyPart) throw new NotFoundError('Không tìm thấy vị trí cơ thể');

    if (data.symptomId) {
      const symptom = await prisma.symptoms.findUnique({
        where: { id: data.symptomId },
      });
      if (!symptom) throw new NotFoundError('Không tìm thấy triệu chứng');
    }

    const item = await prisma.patient_symptom_report_items.create({
      data: {
        report_id: reportId,
        body_part_id: data.bodyPartId,
        symptom_id: data.symptomId || null,
        severity: data.severity || 'mild',
        note: data.note || null,
      },
      include: {
        body_parts: true,
        symptoms: true,
      },
    });

    return serializeBigInt(item);
  }

  /**
   * Lấy chi tiết phiên khai báo kèm danh sách sản phẩm gợi ý tham khảo (is_reference_only: true)
   */
  static async getReportDetail(reportId: string) {
    const report = await prisma.patient_symptom_reports.findUnique({
      where: { id: reportId },
      include: {
        patients: {
          select: { id: true, full_name: true, phone: true },
        },
        patient_symptom_report_items: {
          include: {
            body_parts: true,
            symptoms: true,
          },
        },
      },
    });

    if (!report) throw new NotFoundError('Không tìm thấy phiên khai báo');

    // Lấy danh sách symptom IDs đã khai
    const symptomIds = report.patient_symptom_report_items
      .map((item) => item.symptom_id)
      .filter((id): id is number => id !== null);

    // Tìm các gợi ý thuốc/TPCN liên quan
    let recommendations: any[] = [];
    if (symptomIds.length > 0) {
      recommendations = await prisma.symptom_product_recommendations.findMany({
        where: {
          symptom_id: { in: symptomIds },
        },
        include: {
          products: true,
          symptoms: true,
        },
        orderBy: { priority: 'asc' },
      });
    }

    return serializeBigInt({
      report,
      recommendations: {
        is_reference_only: true,
        disclaimer:
          'CẢNH BÁO: Các sản phẩm thuốc/TPCN dưới đây chỉ mang tính chất tham khảo sơ bộ dựa trên triệu chứng tự khai, KHÔNG thay thế chỉ định và đơn thuốc chính thức từ bác sĩ chuyên môn.',
        items: recommendations,
      },
    });
  }

  /**
   * Chuyển phiên tự khai báo triệu chứng thành lịch hẹn khám tại nhà
   */
  static async convertToAppointment(
    reportId: string,
    data: { scheduledAt: string; visitAddress: string; note?: string; createdBy?: string }
  ) {
    const scheduledAt = new Date(data.scheduledAt);
    assertAppointmentInFuture(scheduledAt);
    assertAppointmentDuringBusinessHours(scheduledAt);

    const report = await prisma.patient_symptom_reports.findUnique({
      where: { id: reportId },
    });

    if (!report) throw new NotFoundError('Không tìm thấy phiên khai báo');

    const appointment = await prisma.appointments.create({
      data: {
        patient_id: report.patient_id,
        scheduled_at: scheduledAt,
        visit_address: data.visitAddress,
        status: 'pending',
        type: 'first_visit',
        created_by: data.createdBy || null,
        note: data.note
          ? `Tạo từ phiên tự khai triệu chứng #${reportId}. Ghi chú: ${data.note}`
          : `Tạo từ phiên tự khai triệu chứng #${reportId}`,
      },
      include: {
        patients: {
          select: { id: true, full_name: true, phone: true },
        },
      },
    });

    // Cập nhật trạng thái phiên khai báo
    await prisma.patient_symptom_reports.update({
      where: { id: reportId },
      data: { status: 'converted_to_appointment' },
    });

    return serializeBigInt(appointment);
  }
}
