import { prisma } from '../../config/database';
import { NotFoundError, BadRequestError } from '../../middlewares/error.middleware';
import { serializeBigInt } from '../../utils/bigint.util';

export class ExaminationService {
  /**
   * Bác sĩ ghi nhận kết quả khám tại nhà
   * - Lưu chẩn đoán, liên kết report_id tự khai (nếu có)
   * - Lưu triệu chứng xác nhận chính thức vào examination_symptoms
   * - Tự động tạo follow_up_schedules nếu có next_visit_date (Business Rule 4)
   * - Cập nhật trạng thái appointment sang completed
   */
  static async createExamination(
    doctorId: string | undefined,
    data: {
      appointmentId: string;
      patientId: string;
      reportId?: string;
      diagnosisId?: number;
      diagnosisNote: string;
      nextVisitDate?: string;
      symptoms?: Array<{ symptomId: number; severity?: 'mild' | 'moderate' | 'severe'; note?: string }>;
    }
  ) {
    const appointment = await prisma.appointments.findUnique({
      where: { id: data.appointmentId },
    });
    if (!appointment) throw new NotFoundError('Không tìm thấy lịch hẹn khám');

    const patient = await prisma.patients.findUnique({
      where: { id: data.patientId },
    });
    if (!patient) throw new NotFoundError('Không tìm thấy hồ sơ bệnh nhân');

    return await prisma.$transaction(async (tx) => {
      // 1. Tạo bản ghi examination
      const exam = await tx.examinations.create({
        data: {
          appointment_id: data.appointmentId,
          patient_id: data.patientId,
          report_id: data.reportId || null,
          doctor_id: doctorId || null,
          diagnosis_id: data.diagnosisId || null,
          diagnosis_note: data.diagnosisNote,
          next_visit_date: data.nextVisitDate ? new Date(data.nextVisitDate) : null,
          examined_at: new Date(),
        },
      });

      // 2. Lưu triệu chứng chính thức do bác sĩ xác nhận (tách biệt với dữ liệu tự khai)
      if (data.symptoms && data.symptoms.length > 0) {
        await tx.examination_symptoms.createMany({
          data: data.symptoms.map((s) => ({
            examination_id: exam.id,
            symptom_id: s.symptomId,
            severity: s.severity || 'mild',
            note: s.note || null,
          })),
        });
      }

      // 3. Tự động tạo lịch tái khám nếu có next_visit_date (Business Rule 4)
      if (data.nextVisitDate) {
        await tx.follow_up_schedules.create({
          data: {
            examination_id: exam.id,
            patient_id: data.patientId,
            next_visit_date: new Date(data.nextVisitDate),
            status: 'scheduled',
            reminder_sent: false,
            note: `Lịch tái khám tự động tạo từ kết quả khám ngày ${new Date().toLocaleDateString('vi-VN')}`,
          },
        });
      }

      // 4. Cập nhật appointment sang completed
      await tx.appointments.update({
        where: { id: data.appointmentId },
        data: {
          status: 'completed',
          updated_at: new Date(),
        },
      });

      // Trả về dữ liệu chi tiết
      const completeExam = await tx.examinations.findUnique({
        where: { id: exam.id },
        include: {
          diseases: true,
          users: { select: { id: true, full_name: true, phone: true } },
          examination_symptoms: { include: { symptoms: true } },
          follow_up_schedules: true,
        },
      });

      return serializeBigInt(completeExam);
    });
  }

  static async getExaminationById(id: string) {
    const exam = await prisma.examinations.findUnique({
      where: { id },
      include: {
        appointments: true,
        patients: true,
        users: { select: { id: true, full_name: true, phone: true, email: true } },
        diseases: true,
        examination_symptoms: { include: { symptoms: true } },
        prescriptions: {
          include: {
            prescription_items: { include: { products: true } },
          },
        },
        follow_up_schedules: true,
      },
    });

    if (!exam) throw new NotFoundError('Không tìm thấy kết quả khám');
    return serializeBigInt(exam);
  }

  /**
   * Bác sĩ tạo đơn thuốc chính thức sau khi khám
   */
  static async createPrescription(
    examinationId: string,
    prescribedBy: string | undefined,
    data: {
      note?: string;
      items: Array<{
        productId: string;
        quantity: number;
        dosage: string;
        usageInstruction?: string;
        durationDays?: number;
      }>;
    }
  ) {
    const exam = await prisma.examinations.findUnique({
      where: { id: examinationId },
    });
    if (!exam) throw new NotFoundError('Không tìm thấy kết quả khám');

    return await prisma.$transaction(async (tx) => {
      const prescription = await tx.prescriptions.create({
        data: {
          examination_id: examinationId,
          patient_id: exam.patient_id,
          prescribed_by: prescribedBy || null,
          note: data.note || null,
        },
      });

      await tx.prescription_items.createMany({
        data: data.items.map((item) => ({
          prescription_id: prescription.id,
          product_id: item.productId,
          quantity: item.quantity,
          dosage: item.dosage,
          usage_instruction: item.usageInstruction || null,
          duration_days: item.durationDays || null,
        })),
      });

      const fullPrescription = await tx.prescriptions.findUnique({
        where: { id: prescription.id },
        include: {
          prescription_items: { include: { products: true } },
          users: { select: { id: true, full_name: true } },
        },
      });

      return serializeBigInt(fullPrescription);
    });
  }

  static async getPatientExaminations(patientId: string) {
    const patient = await prisma.patients.findUnique({ where: { id: patientId } });
    if (!patient) throw new NotFoundError('Không tìm thấy hồ sơ bệnh nhân');

    const exams = await prisma.examinations.findMany({
      where: { patient_id: patientId },
      orderBy: { examined_at: 'desc' },
      include: {
        diseases: true,
        users: { select: { id: true, full_name: true } },
        examination_symptoms: { include: { symptoms: true } },
        prescriptions: {
          include: {
            prescription_items: { include: { products: true } },
          },
        },
      },
    });

    return serializeBigInt(exams);
  }
}
