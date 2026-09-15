import { prisma } from '../../config/database';
import { NotFoundError, BadRequestError } from '../../middlewares/error.middleware';
import { PaginationUtil, PaginationParams } from '../../utils/pagination.util';
import { serializeBigInt } from '../../utils/bigint.util';

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['in_progress', 'cancelled', 'no_show'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  no_show: [],
};

export class AppointmentService {
  static async createAppointment(data: {
    patientId: string;
    scheduledAt: string;
    visitAddress: string;
    type?: 'first_visit' | 'follow_up' | 'emergency';
    assignedStaffId?: string;
    createdBy?: string;
    note?: string;
  }) {
    const patient = await prisma.patients.findUnique({ where: { id: data.patientId } });
    if (!patient) throw new NotFoundError('Không tìm thấy hồ sơ bệnh nhân');

    if (data.assignedStaffId) {
      const staff = await prisma.users.findUnique({ where: { id: data.assignedStaffId } });
      if (!staff) throw new NotFoundError('Không tìm thấy nhân viên được phân công');
    }

    const appointment = await prisma.appointments.create({
      data: {
        patient_id: data.patientId,
        scheduled_at: new Date(data.scheduledAt),
        visit_address: data.visitAddress,
        type: data.type || 'first_visit',
        assigned_staff_id: data.assignedStaffId || null,
        created_by: data.createdBy || null,
        note: data.note || null,
        status: 'pending',
      },
      include: {
        patients: { select: { id: true, full_name: true, phone: true } },
        users_appointments_assigned_staff_idTousers: {
          select: { id: true, full_name: true, phone: true },
        },
      },
    });

    // Tạo notification thông báo lịch hẹn mới cho bệnh nhân (nếu có)
    await prisma.notifications.create({
      data: {
        patient_id: data.patientId,
        type: 'appointment_confirmation',
        title: 'Đặt lịch khám thành công',
        content: `Lịch hẹn khám tại nhà vào lúc ${new Date(data.scheduledAt).toLocaleString('vi-VN')} đã được ghi nhận.`,
        related_table: 'appointments',
        related_id: appointment.id,
        status: 'pending',
      },
    });

    return serializeBigInt(appointment);
  }

  static async getAppointments(
    params: PaginationParams & {
      status?: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
      type?: 'first_visit' | 'follow_up' | 'emergency';
      staffId?: string;
      patientId?: string;
      date?: string;
    }
  ) {
    const { page, limit, skip, take } = PaginationUtil.getPagination(params);

    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.type) where.type = params.type;
    if (params.staffId) where.assigned_staff_id = params.staffId;
    if (params.patientId) where.patient_id = params.patientId;

    if (params.date) {
      const startDate = new Date(`${params.date}T00:00:00.000Z`);
      const endDate = new Date(`${params.date}T23:59:59.999Z`);
      where.scheduled_at = {
        gte: startDate,
        lte: endDate,
      };
    }

    const [appointments, total] = await Promise.all([
      prisma.appointments.findMany({
        where,
        skip,
        take,
        orderBy: { scheduled_at: 'asc' },
        include: {
          patients: { select: { id: true, full_name: true, phone: true, address: true } },
          users_appointments_assigned_staff_idTousers: {
            select: { id: true, full_name: true, phone: true, role_id: true },
          },
        },
      }),
      prisma.appointments.count({ where }),
    ]);

    return PaginationUtil.formatResult(serializeBigInt(appointments), total, page, limit);
  }

  static async getAppointmentById(id: string) {
    const appointment = await prisma.appointments.findUnique({
      where: { id },
      include: {
        patients: true,
        users_appointments_assigned_staff_idTousers: {
          select: { id: true, full_name: true, phone: true, email: true },
        },
        examinations: {
          include: {
            diseases: true,
            prescriptions: {
              include: {
                prescription_items: { include: { products: true } },
              },
            },
          },
        },
      },
    });

    if (!appointment) throw new NotFoundError('Không tìm thấy lịch hẹn khám');
    return serializeBigInt(appointment);
  }

  /**
   * Cập nhật trạng thái lịch hẹn tuân thủ nghiêm ngặt State Machine
   */
  static async updateAppointmentStatus(
    id: string,
    newStatus: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show',
    note?: string
  ) {
    const appointment = await prisma.appointments.findUnique({ where: { id } });
    if (!appointment) throw new NotFoundError('Không tìm thấy lịch hẹn');

    const currentStatus = appointment.status;
    const allowed = VALID_TRANSITIONS[currentStatus] || [];

    if (!allowed.includes(newStatus)) {
      throw new BadRequestError(
        `Không thể chuyển trạng thái từ '${currentStatus}' sang '${newStatus}'. Các trạng thái hợp lệ tiếp theo: [${allowed.join(', ')}]`
      );
    }

    const updated = await prisma.appointments.update({
      where: { id },
      data: {
        status: newStatus,
        note: note ? `${appointment.note || ''} | ${note}` : appointment.note,
        updated_at: new Date(),
      },
      include: {
        patients: { select: { id: true, full_name: true, phone: true } },
        users_appointments_assigned_staff_idTousers: {
          select: { id: true, full_name: true },
        },
      },
    });

    return serializeBigInt(updated);
  }

  /**
   * Phân công bác sĩ hoặc điều dưỡng đến khám tại nhà
   */
  static async assignStaff(id: string, staffId: string) {
    const appointment = await prisma.appointments.findUnique({ where: { id } });
    if (!appointment) throw new NotFoundError('Không tìm thấy lịch hẹn');

    const staff = await prisma.users.findUnique({
      where: { id: staffId },
      include: { roles: true },
    });
    if (!staff) throw new NotFoundError('Không tìm thấy nhân viên được chỉ định');

    const updated = await prisma.appointments.update({
      where: { id },
      data: {
        assigned_staff_id: staffId,
        updated_at: new Date(),
      },
      include: {
        users_appointments_assigned_staff_idTousers: {
          select: { id: true, full_name: true, phone: true, roles: true },
        },
      },
    });

    // Gửi thông báo cho nhân viên được phân công
    await prisma.notifications.create({
      data: {
        user_id: staffId,
        type: 'system',
        title: 'Phân công lịch khám mới',
        content: `Bạn được phân công phụ trách lịch khám tại nhà #${id} vào lúc ${appointment.scheduled_at.toLocaleString('vi-VN')}`,
        related_table: 'appointments',
        related_id: id,
        status: 'pending',
      },
    });

    return serializeBigInt(updated);
  }
}
