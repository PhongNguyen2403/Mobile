import { prisma } from '../../config/database';
import { NotFoundError } from '../../middlewares/error.middleware';
import { PaginationUtil, PaginationParams } from '../../utils/pagination.util';
import { serializeBigInt } from '../../utils/bigint.util';

export class PatientService {
  static async createPatient(data: any) {
    const patient = await prisma.patients.create({
      data: {
        full_name: data.fullName,
        phone: data.phone || null,
        date_of_birth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        gender: data.gender || null,
        address: data.address || null,
        province: data.province || null,
        health_insurance_no: data.healthInsuranceNo || null,
        emergency_contact_name: data.emergencyContactName || null,
        emergency_contact_phone: data.emergencyContactPhone || null,
        note: data.note || null,
        assigned_cskh_id: data.assignedCskhId || null,
      },
      include: {
        users_patients_assigned_cskh_idTousers: {
          select: { id: true, full_name: true, phone: true, email: true },
        },
      },
    });

    // Nếu có gán CSKH, tự động tạo luôn cskh_assignments
    if (data.assignedCskhId) {
      await prisma.cskh_assignments.create({
        data: {
          patient_id: patient.id,
          cskh_staff_id: data.assignedCskhId,
          is_active: true,
        },
      });
    }

    return serializeBigInt(patient);
  }

  static async getPatients(
    params: PaginationParams & {
      q?: string;
      gender?: 'male' | 'female' | 'other';
      assignedCskhId?: string;
    }
  ) {
    const { page, limit, skip, take } = PaginationUtil.getPagination(params);

    const where: any = {};
    if (params.gender) where.gender = params.gender;
    if (params.assignedCskhId) where.assigned_cskh_id = params.assignedCskhId;
    if (params.q) {
      where.OR = [
        { full_name: { contains: params.q, mode: 'insensitive' } },
        { phone: { contains: params.q, mode: 'insensitive' } },
        { health_insurance_no: { contains: params.q, mode: 'insensitive' } },
      ];
    }

    const [patients, total] = await Promise.all([
      prisma.patients.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: 'desc' },
        include: {
          users_patients_assigned_cskh_idTousers: {
            select: { id: true, full_name: true, phone: true, email: true },
          },
        },
      }),
      prisma.patients.count({ where }),
    ]);

    return PaginationUtil.formatResult(serializeBigInt(patients), total, page, limit);
  }

  static async getPatientById(id: string) {
    const patient = await prisma.patients.findUnique({
      where: { id },
      include: {
        users_patients_assigned_cskh_idTousers: {
          select: { id: true, full_name: true, phone: true, email: true },
        },
        patient_medical_history: {
          orderBy: { recorded_at: 'desc' },
        },
      },
    });

    if (!patient) throw new NotFoundError('Không tìm thấy hồ sơ bệnh nhân');
    return serializeBigInt(patient);
  }

  static async updatePatient(id: string, data: any) {
    const patient = await prisma.patients.findUnique({ where: { id } });
    if (!patient) throw new NotFoundError('Không tìm thấy hồ sơ bệnh nhân');

    const updateData: any = {};
    if (data.fullName !== undefined) updateData.full_name = data.fullName;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.dateOfBirth !== undefined)
      updateData.date_of_birth = data.dateOfBirth ? new Date(data.dateOfBirth) : null;
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.province !== undefined) updateData.province = data.province;
    if (data.healthInsuranceNo !== undefined)
      updateData.health_insurance_no = data.healthInsuranceNo;
    if (data.emergencyContactName !== undefined)
      updateData.emergency_contact_name = data.emergencyContactName;
    if (data.emergencyContactPhone !== undefined)
      updateData.emergency_contact_phone = data.emergencyContactPhone;
    if (data.note !== undefined) updateData.note = data.note;
    if (data.assignedCskhId !== undefined) {
      updateData.assigned_cskh_id = data.assignedCskhId;
    }
    updateData.updated_at = new Date();

    const updated = await prisma.patients.update({
      where: { id },
      data: updateData,
      include: {
        users_patients_assigned_cskh_idTousers: {
          select: { id: true, full_name: true, phone: true },
        },
      },
    });

    return serializeBigInt(updated);
  }

  static async addMedicalHistory(patientId: string, data: { conditionName: string; note?: string }) {
    const patient = await prisma.patients.findUnique({ where: { id: patientId } });
    if (!patient) throw new NotFoundError('Không tìm thấy hồ sơ bệnh nhân');

    const history = await prisma.patient_medical_history.create({
      data: {
        patient_id: patientId,
        condition_name: data.conditionName,
        note: data.note || null,
      },
    });

    return serializeBigInt(history);
  }

  static async getMedicalHistory(patientId: string) {
    const patient = await prisma.patients.findUnique({ where: { id: patientId } });
    if (!patient) throw new NotFoundError('Không tìm thấy hồ sơ bệnh nhân');

    const histories = await prisma.patient_medical_history.findMany({
      where: { patient_id: patientId },
      orderBy: { recorded_at: 'desc' },
    });

    return serializeBigInt(histories);
  }

  /**
   * Tổng hợp hồ sơ sức khỏe bệnh nhân: lịch sử khám, đơn thuốc, lịch tái khám gần nhất, CSKH phụ trách
   */
  static async getPatientSummary(patientId: string) {
    const patient = await prisma.patients.findUnique({
      where: { id: patientId },
      include: {
        users_patients_assigned_cskh_idTousers: {
          select: { id: true, full_name: true, phone: true, email: true },
        },
      },
    });

    if (!patient) throw new NotFoundError('Không tìm thấy hồ sơ bệnh nhân');

    const [recentExaminations, recentPrescriptions, upcomingFollowUps, activeCskhAssignment] =
      await Promise.all([
        prisma.examinations.findMany({
          where: { patient_id: patientId },
          take: 5,
          orderBy: { examined_at: 'desc' },
          include: {
            diseases: true,
            users: { select: { id: true, full_name: true } },
            examination_symptoms: {
              include: { symptoms: true },
            },
          },
        }),
        prisma.prescriptions.findMany({
          where: { patient_id: patientId },
          take: 5,
          orderBy: { created_at: 'desc' },
          include: {
            prescription_items: {
              include: { products: true },
            },
            users: { select: { id: true, full_name: true } },
          },
        }),
        prisma.follow_up_schedules.findMany({
          where: {
            patient_id: patientId,
            status: { in: ['scheduled', 'reminded', 'confirmed'] },
          },
          orderBy: { next_visit_date: 'asc' },
          take: 3,
        }),
        prisma.cskh_assignments.findFirst({
          where: { patient_id: patientId, is_active: true },
          include: {
            users: { select: { id: true, full_name: true, phone: true, email: true } },
          },
        }),
      ]);

    return serializeBigInt({
      patient,
      activeCskh: activeCskhAssignment ? activeCskhAssignment.users : null,
      upcomingFollowUps,
      recentExaminations,
      recentPrescriptions,
    });
  }
}
