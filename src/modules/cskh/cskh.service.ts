import { prisma } from '../../config/database';
import { NotFoundError, BadRequestError } from '../../middlewares/error.middleware';
import { serializeBigInt } from '../../utils/bigint.util';
import { PaginationUtil, PaginationParams } from '../../utils/pagination.util';

export class CskhService {
  /**
   * Phân công CSKH phụ trách bệnh nhân
   * Business Rule 1: Một bệnh nhân CHỈ có 1 CSKH đang active tại một thời điểm
   * -> Tự động đóng assignment cũ và mở assignment mới trong transaction
   */
  static async assignPatient(data: { patientId: string; cskhStaffId: string }) {
    const patient = await prisma.patients.findUnique({ where: { id: data.patientId } });
    if (!patient) throw new NotFoundError('Không tìm thấy bệnh nhân');

    const staff = await prisma.users.findUnique({
      where: { id: data.cskhStaffId },
      include: { roles: true },
    });
    if (!staff) throw new NotFoundError('Không tìm thấy nhân viên CSKH');

    return await prisma.$transaction(async (tx) => {
      // 1. Đóng toàn bộ assignment đang active trước đó của bệnh nhân này
      await tx.cskh_assignments.updateMany({
        where: {
          patient_id: data.patientId,
          is_active: true,
        },
        data: {
          is_active: false,
          unassigned_at: new Date(),
        },
      });

      // 2. Tạo assignment mới với is_active = true
      const newAssignment = await tx.cskh_assignments.create({
        data: {
          patient_id: data.patientId,
          cskh_staff_id: data.cskhStaffId,
          is_active: true,
          assigned_at: new Date(),
        },
        include: {
          patients: { select: { id: true, full_name: true, phone: true } },
          users: { select: { id: true, full_name: true, phone: true, email: true } },
        },
      });

      // 3. Cập nhật assigned_cskh_id trong bảng patients
      await tx.patients.update({
        where: { id: data.patientId },
        data: {
          assigned_cskh_id: data.cskhStaffId,
          updated_at: new Date(),
        },
      });

      return serializeBigInt(newAssignment);
    });
  }

  static async getAssignments(
    filter: { patientId?: string; staffId?: string; isActive?: boolean },
    params: PaginationParams
  ) {
    const { page, limit, skip, take } = PaginationUtil.getPagination(params);

    const where: any = {};
    if (filter.patientId) where.patient_id = filter.patientId;
    if (filter.staffId) where.cskh_staff_id = filter.staffId;
    if (filter.isActive !== undefined) where.is_active = filter.isActive;

    const [assignments, total] = await Promise.all([
      prisma.cskh_assignments.findMany({
        where,
        skip,
        take,
        orderBy: { assigned_at: 'desc' },
        include: {
          patients: { select: { id: true, full_name: true, phone: true, address: true } },
          users: { select: { id: true, full_name: true, phone: true } },
        },
      }),
      prisma.cskh_assignments.count({ where }),
    ]);

    return PaginationUtil.formatResult(serializeBigInt(assignments), total, page, limit);
  }

  static async createCareLog(
    staffId: string | undefined,
    data: {
      patientId: string;
      interactionType: 'call' | 'message' | 'zalo' | 'email' | 'home_visit' | 'other';
      content: string;
      nextAction?: string;
      nextActionDate?: string;
    }
  ) {
    const patient = await prisma.patients.findUnique({ where: { id: data.patientId } });
    if (!patient) throw new NotFoundError('Không tìm thấy bệnh nhân');

    const log = await prisma.cskh_care_logs.create({
      data: {
        patient_id: data.patientId,
        cskh_staff_id: staffId || null,
        interaction_type: data.interactionType,
        content: data.content,
        next_action: data.nextAction || null,
        next_action_date: data.nextActionDate ? new Date(data.nextActionDate) : null,
      },
      include: {
        patients: { select: { id: true, full_name: true, phone: true } },
        users: { select: { id: true, full_name: true } },
      },
    });

    return serializeBigInt(log);
  }

  static async getCareLogs(
    filter: { patientId?: string; staffId?: string; interactionType?: any },
    params: PaginationParams
  ) {
    const { page, limit, skip, take } = PaginationUtil.getPagination(params);

    const where: any = {};
    if (filter.patientId) where.patient_id = filter.patientId;
    if (filter.staffId) where.cskh_staff_id = filter.staffId;
    if (filter.interactionType) where.interaction_type = filter.interactionType;

    const [logs, total] = await Promise.all([
      prisma.cskh_care_logs.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: 'desc' },
        include: {
          patients: { select: { id: true, full_name: true, phone: true } },
          users: { select: { id: true, full_name: true } },
        },
      }),
      prisma.cskh_care_logs.count({ where }),
    ]);

    return PaginationUtil.formatResult(serializeBigInt(logs), total, page, limit);
  }

  /**
   * Dashboard CSKH: tổng quan khách phụ trách, lịch tái khám sắp tới, thông báo chưa đọc
   */
  static async getDashboard(staffId: string) {
    const now = new Date();
    const next7Days = new Date();
    next7Days.setDate(next7Days.getDate() + 7);

    // 1. Khách hàng đang phụ trách
    const assignedPatientsCount = await prisma.patients.count({
      where: { assigned_cskh_id: staffId },
    });

    // 2. Lịch tái khám sắp tới của bệnh nhân do mình phụ trách
    const upcomingFollowUps = await prisma.follow_up_schedules.findMany({
      where: {
        next_visit_date: { gte: now, lte: next7Days },
        status: { in: ['scheduled', 'reminded', 'confirmed'] },
        patients: { assigned_cskh_id: staffId },
      },
      take: 10,
      orderBy: { next_visit_date: 'asc' },
      include: {
        patients: { select: { id: true, full_name: true, phone: true, address: true } },
      },
    });

    // 3. Thông báo chưa đọc của CSKH
    const unreadNotificationsCount = await prisma.notifications.count({
      where: {
        user_id: staffId,
        is_read: false,
      },
    });

    // 4. Lịch sử chăm sóc gần nhất
    const recentCareLogs = await prisma.cskh_care_logs.findMany({
      where: { cskh_staff_id: staffId },
      take: 5,
      orderBy: { created_at: 'desc' },
      include: {
        patients: { select: { id: true, full_name: true } },
      },
    });

    return serializeBigInt({
      stats: {
        assignedPatients: assignedPatientsCount,
        upcomingFollowUpsCount: upcomingFollowUps.length,
        unreadNotificationsCount,
      },
      upcomingFollowUps,
      recentCareLogs,
    });
  }
}
