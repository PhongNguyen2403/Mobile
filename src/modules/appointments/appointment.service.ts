import { prisma } from '../../config/database';
import { NotFoundError, BadRequestError } from '../../middlewares/error.middleware';
import { PaginationUtil, PaginationParams } from '../../utils/pagination.util';
import { serializeBigInt } from '../../utils/bigint.util';

// State Transition cho mô hình phòng khám
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled', 'rescheduled'],
  confirmed: ['checked_in', 'in_progress', 'cancelled', 'no_show', 'rescheduled'],
  checked_in: ['in_progress', 'cancelled', 'no_show'], // Bệnh nhân đã tới phòng khám -> Bác sĩ gọi vào khám
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  no_show: ['rescheduled'],
  rescheduled: ['confirmed', 'cancelled'],
};

export class AppointmentService {
  static async createAppointment(data: {
    patientId: string;
    scheduledAt: string;
    visitAddress?: string;
    clinicRoom?: string;
    reportId?: string;
    type?: 'first_visit' | 'follow_up' | 'emergency';
    assignedStaffId?: string;
    createdBy?: string;
    note?: string;
  }) {
    const patient = await prisma.patients.findUnique({ where: { id: data.patientId } });
    if (!patient) throw new NotFoundError('Không tìm thấy hồ sơ bệnh nhân');

    // 🔴 BẮT BUỘC: Kiểm tra thông tin cá nhân bắt buộc của bệnh nhân tại phòng khám
    const hasValidName =
      !!patient.full_name &&
      patient.full_name.trim().length >= 2 &&
      !patient.full_name.startsWith('Bệnh nhân ');
    const hasValidPhone = !!patient.phone && patient.phone.trim().length >= 9;
    const hasValidDob = !!patient.date_of_birth;
    const hasValidGender = !!patient.gender;

    if (!hasValidName || !hasValidPhone || !hasValidDob || !hasValidGender) {
      throw new BadRequestError(
        'Bệnh nhân chưa hoàn thiện thông tin cá nhân bắt buộc (Họ tên, SĐT, Ngày sinh, Giới tính). Vui lòng cập nhật hồ sơ cá nhân trước khi đăng ký lịch khám.'
      );
    }

    if (data.assignedStaffId) {
      const staff = await prisma.users.findUnique({
        where: { id: data.assignedStaffId },
        include: { roles: true },
      });
      if (!staff) throw new NotFoundError('Không tìm thấy nhân viên được phân công');

      // Chống đặt trùng khung giờ cho bác sĩ (Anti Double-Booking)
      // Mỗi khung khám mặc định chiếm khoảng 30 phút
      const reqTime = new Date(data.scheduledAt);
      const slotStart = new Date(reqTime.getTime() - 29 * 60 * 1000);
      const slotEnd = new Date(reqTime.getTime() + 29 * 60 * 1000);

      const conflict = await (prisma.appointments as any).findFirst({
        where: {
          assigned_staff_id: data.assignedStaffId,
          status: { in: ['pending', 'confirmed', 'checked_in', 'in_progress'] },
          scheduled_at: {
            gte: slotStart,
            lte: slotEnd,
          },
        },
      });

      if (conflict) {
        throw new BadRequestError(
          'Bác sĩ đã có lịch khám trong khung giờ này. Vui lòng chọn khung giờ khác.'
        );
      }
    }

    // Nếu có reportId triệu chứng từ Body Map, kiểm tra tồn tại
    if (data.reportId) {
      const report = await prisma.patient_symptom_reports.findUnique({
        where: { id: data.reportId },
      });
      if (!report) throw new NotFoundError('Không tìm thấy báo cáo triệu chứng Body Map');
    }

    const appointment = await (prisma.appointments as any).create({
      data: {
        patient_id: data.patientId,
        scheduled_at: new Date(data.scheduledAt),
        visit_address: data.visitAddress || 'Phòng khám Đa khoa',
        clinic_room: data.clinicRoom || null,
        report_id: data.reportId || null,
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

    // Tạo notification thông báo lịch hẹn mới cho bệnh nhân
    await prisma.notifications.create({
      data: {
        patient_id: data.patientId,
        type: 'appointment_confirmation',
        title: 'Đặt lịch khám tại phòng khám thành công',
        content: `Lịch hẹn khám tại phòng khám vào lúc ${new Date(data.scheduledAt).toLocaleString(
          'vi-VN'
        )} đã được ghi nhận. Vui lòng có mặt đúng giờ để check-in.`,
        related_table: 'appointments',
        related_id: appointment.id,
        status: 'pending',
      },
    });

    return serializeBigInt(appointment);
  }

  /**
   * Endpoint tra cứu lịch trống an toàn cho phòng khám
   * Chỉ trả về các mốc thời gian đã kín của bác sĩ, KHÔNG làm rò rỉ dữ liệu cá nhân bệnh nhân
   */
  static async getDoctorAvailability(doctorId: string, dateStr: string) {
    const doctor = await prisma.users.findUnique({
      where: { id: doctorId },
      select: { id: true, full_name: true },
    });
    if (!doctor) throw new NotFoundError('Không tìm thấy bác sĩ');

    const startDate = new Date(`${dateStr}T00:00:00.000Z`);
    const endDate = new Date(`${dateStr}T23:59:59.999Z`);

    const booked = await (prisma.appointments as any).findMany({
      where: {
        assigned_staff_id: doctorId,
        status: { in: ['pending', 'confirmed', 'checked_in', 'in_progress'] },
        scheduled_at: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        scheduled_at: true,
      },
      orderBy: { scheduled_at: 'asc' },
    });

    const bookedTimes = booked.map((b: any) => b.scheduled_at.toISOString());

    return {
      doctorId,
      doctorName: doctor.full_name,
      date: dateStr,
      bookedTimes,
    };
  }

  static async getAppointments(
    params: PaginationParams & {
      status?:
        | 'pending'
        | 'confirmed'
        | 'checked_in'
        | 'in_progress'
        | 'completed'
        | 'cancelled'
        | 'no_show'
        | 'rescheduled';
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
   * Cập nhật trạng thái lịch hẹn phòng khám (hỗ trợ checked_in, in_progress, rescheduled, ...)
   */
  static async updateAppointmentStatus(
    id: string,
    newStatus:
      | 'pending'
      | 'confirmed'
      | 'checked_in'
      | 'in_progress'
      | 'completed'
      | 'cancelled'
      | 'no_show'
      | 'rescheduled',
    note?: string,
    clinicRoom?: string
  ) {
    const appointment = await prisma.appointments.findUnique({ where: { id } });
    if (!appointment) throw new NotFoundError('Không tìm thấy lịch hẹn');

    const currentStatus = appointment.status;
    const allowed = VALID_TRANSITIONS[currentStatus] || [];

    if (!allowed.includes(newStatus)) {
      throw new BadRequestError(
        `Không thể chuyển trạng thái từ '${currentStatus}' sang '${newStatus}'. Các trạng thái hợp lệ tiếp theo: [${allowed.join(
          ', '
        )}]`
      );
    }

    const updateData: any = {
      status: newStatus,
      note: note ? `${appointment.note || ''} | ${note}` : appointment.note,
      updated_at: new Date(),
    };

    if (clinicRoom) {
      updateData.clinic_room = clinicRoom;
    }

    const updated = await (prisma.appointments as any).update({
      where: { id },
      data: updateData,
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
   * Phân công bác sĩ và chỉ định phòng khám
   */
  static async assignStaff(id: string, staffId: string, clinicRoom?: string) {
    const appointment = await prisma.appointments.findUnique({ where: { id } });
    if (!appointment) throw new NotFoundError('Không tìm thấy lịch hẹn');

    const staff = await prisma.users.findUnique({
      where: { id: staffId },
      include: { roles: true },
    });
    if (!staff) throw new NotFoundError('Không tìm thấy nhân viên được chỉ định');

    const updateData: any = {
      assigned_staff_id: staffId,
      updated_at: new Date(),
    };

    if (clinicRoom) {
      updateData.clinic_room = clinicRoom;
    }

    const updated = await (prisma.appointments as any).update({
      where: { id },
      data: updateData,
      include: {
        users_appointments_assigned_staff_idTousers: {
          select: { id: true, full_name: true, phone: true, roles: true },
        },
      },
    });

    // Gửi thông báo cho bác sĩ được phân công
    await prisma.notifications.create({
      data: {
        user_id: staffId,
        type: 'system',
        title: 'Phân công ca khám tại phòng khám',
        content: `Bạn được phân công phụ trách ca khám #${id} vào lúc ${appointment.scheduled_at.toLocaleString(
          'vi-VN'
        )}${clinicRoom ? ` tại ${clinicRoom}` : ''}`,
        related_table: 'appointments',
        related_id: id,
        status: 'pending',
      },
    });

    return serializeBigInt(updated);
  }
}
