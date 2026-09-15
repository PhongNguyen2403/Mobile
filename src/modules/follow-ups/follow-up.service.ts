import { prisma } from '../../config/database';
import { NotFoundError } from '../../middlewares/error.middleware';
import { PaginationUtil, PaginationParams } from '../../utils/pagination.util';
import { serializeBigInt } from '../../utils/bigint.util';

export class FollowUpService {
  static async createFollowUp(data: {
    patientId: string;
    examinationId?: string;
    nextVisitDate: string;
    status?: 'scheduled' | 'reminded' | 'confirmed' | 'completed' | 'missed' | 'cancelled';
    note?: string;
  }) {
    const patient = await prisma.patients.findUnique({ where: { id: data.patientId } });
    if (!patient) throw new NotFoundError('Không tìm thấy bệnh nhân');

    const schedule = await prisma.follow_up_schedules.create({
      data: {
        patient_id: data.patientId,
        examination_id: data.examinationId || null,
        next_visit_date: new Date(data.nextVisitDate),
        status: data.status || 'scheduled',
        note: data.note || null,
      },
      include: {
        patients: { select: { id: true, full_name: true, phone: true } },
      },
    });

    return serializeBigInt(schedule);
  }

  static async getFollowUps(
    params: PaginationParams & {
      status?: 'scheduled' | 'reminded' | 'confirmed' | 'completed' | 'missed' | 'cancelled';
      patientId?: string;
      from?: string;
      to?: string;
    }
  ) {
    const { page, limit, skip, take } = PaginationUtil.getPagination(params);

    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.patientId) where.patient_id = params.patientId;
    if (params.from || params.to) {
      where.next_visit_date = {};
      if (params.from) where.next_visit_date.gte = new Date(`${params.from}T00:00:00.000Z`);
      if (params.to) where.next_visit_date.lte = new Date(`${params.to}T23:59:59.999Z`);
    }

    const [schedules, total] = await Promise.all([
      prisma.follow_up_schedules.findMany({
        where,
        skip,
        take,
        orderBy: { next_visit_date: 'asc' },
        include: {
          patients: {
            select: {
              id: true,
              full_name: true,
              phone: true,
              address: true,
              users_patients_assigned_cskh_idTousers: {
                select: { id: true, full_name: true, phone: true },
              },
            },
          },
        },
      }),
      prisma.follow_up_schedules.count({ where }),
    ]);

    return PaginationUtil.formatResult(serializeBigInt(schedules), total, page, limit);
  }

  static async updateFollowUpStatus(
    id: string,
    status: 'scheduled' | 'reminded' | 'confirmed' | 'completed' | 'missed' | 'cancelled',
    note?: string
  ) {
    const schedule = await prisma.follow_up_schedules.findUnique({ where: { id } });
    if (!schedule) throw new NotFoundError('Không tìm thấy lịch tái khám');

    const updated = await prisma.follow_up_schedules.update({
      where: { id },
      data: {
        status,
        note: note !== undefined ? note : schedule.note,
        updated_at: new Date(),
      },
      include: {
        patients: { select: { id: true, full_name: true, phone: true } },
      },
    });

    return serializeBigInt(updated);
  }
}
