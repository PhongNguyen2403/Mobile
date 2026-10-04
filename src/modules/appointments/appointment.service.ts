import { prisma } from '../../config/database';
import { Prisma } from '@prisma/client';
import {
  AppError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../middlewares/error.middleware';
import { PaginationUtil, PaginationParams } from '../../utils/pagination.util';
import { serializeBigInt } from '../../utils/bigint.util';
import {
  APPOINTMENT_CLOSE_MINUTES,
  APPOINTMENT_DURATION_MINUTES,
  APPOINTMENT_OPEN_MINUTES,
  APPOINTMENT_TIME_ZONE,
  assertAppointmentCanStart,
  assertAppointmentDuringBusinessHours,
  assertAppointmentInFuture,
} from '../../utils/appointment-hours.util';

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
    const scheduledAt = new Date(data.scheduledAt);
    assertAppointmentInFuture(scheduledAt);
    assertAppointmentDuringBusinessHours(scheduledAt);

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
      const slotStart = new Date(scheduledAt.getTime() - 29 * 60 * 1000);
      const slotEnd = new Date(scheduledAt.getTime() + 29 * 60 * 1000);

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
        scheduled_at: scheduledAt,
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

    const startDate = new Date(`${dateStr}T00:00:00.000+07:00`);
    const endDate = new Date(`${dateStr}T23:59:59.999+07:00`);

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
    const bookedDates: Date[] = booked.map(
      (booking: { scheduled_at: Date }) => booking.scheduled_at
    );
    const availableTimes: string[] = [];
    for (
      let minute = APPOINTMENT_OPEN_MINUTES;
      minute + APPOINTMENT_DURATION_MINUTES <= APPOINTMENT_CLOSE_MINUTES;
      minute += APPOINTMENT_DURATION_MINUTES
    ) {
      const localTime = `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(
        minute % 60
      ).padStart(2, '0')}:00+07:00`;
      const slotDate = new Date(`${dateStr}T${localTime}`);
      const slotEnd = new Date(slotDate.getTime() + APPOINTMENT_DURATION_MINUTES * 60 * 1000);
      if (
        slotDate > new Date() &&
        !bookedDates.some(
          (bookedDate) =>
            bookedDate < slotEnd &&
            new Date(bookedDate.getTime() + APPOINTMENT_DURATION_MINUTES * 60 * 1000) > slotDate
        )
      ) {
        availableTimes.push(slotDate.toISOString());
      }
    }

    return {
      doctorId,
      doctorName: doctor.full_name,
      date: dateStr,
      businessHours: {
        start: '07:00',
        end: '21:00',
        timeZone: APPOINTMENT_TIME_ZONE,
        slotDurationMinutes: APPOINTMENT_DURATION_MINUTES,
      },
      bookedTimes,
      availableTimes,
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

  static async requestAppointmentChange(
    id: string,
    patientId: string,
    data:
      | { action: 'reschedule'; requestedScheduledAt: string; reason?: string }
      | { action: 'cancel'; reason?: string }
  ) {
    const appointment = await prisma.appointments.findFirst({
      where: { id, patient_id: patientId },
      include: {
        patients: {
          select: {
            assigned_cskh_id: true,
            cskh_assignments: {
              where: { is_active: true },
              select: { cskh_staff_id: true },
            },
          },
        },
      },
    });

    if (!appointment) throw new NotFoundError('Không tìm thấy lịch hẹn của bệnh nhân');
    if (!['pending', 'confirmed'].includes(appointment.status)) {
      throw new BadRequestError(
        'Chỉ có thể yêu cầu thay đổi lịch hẹn đang chờ xác nhận hoặc đã xác nhận'
      );
    }
    if (appointment.scheduled_at <= new Date()) {
      throw new BadRequestError('Không thể thay đổi lịch hẹn đã đến hoặc đã qua');
    }

    let requestedScheduledAt: Date | null = null;
    if (data.action === 'reschedule') {
      requestedScheduledAt = new Date(data.requestedScheduledAt);
      assertAppointmentDuringBusinessHours(requestedScheduledAt);
      if (requestedScheduledAt <= new Date()) {
        throw new BadRequestError('Thời gian khám mới phải ở trong tương lai');
      }
      if (requestedScheduledAt.getTime() === appointment.scheduled_at.getTime()) {
        throw new BadRequestError('Thời gian khám mới phải khác thời gian hiện tại');
      }
    }

    const existingRequest = await prisma.appointment_change_requests.findFirst({
      where: { appointment_id: id, status: { in: ['pending', 'awaiting_patient'] } },
      select: { id: true },
    });
    if (existingRequest) {
      throw new ConflictError('Lịch hẹn đang có yêu cầu thay đổi chờ xử lý');
    }

    const requestedAction = data.action === 'reschedule' ? 'đổi lịch' : 'hủy lịch';
    const requestDetails = [
      `Bệnh nhân gửi yêu cầu ${requestedAction} cho lịch hẹn #${appointment.id}.`,
      `Thời gian hiện tại: ${appointment.scheduled_at.toISOString()}.`,
      requestedScheduledAt
        ? `Thời gian mong muốn: ${requestedScheduledAt.toISOString()}.`
        : undefined,
      data.reason ? `Lý do: ${data.reason}.` : undefined,
    ]
      .filter(Boolean)
      .join(' ');

    const recipientIds = new Set<string>();
    if (appointment.patients.assigned_cskh_id) {
      recipientIds.add(appointment.patients.assigned_cskh_id);
    }
    for (const assignment of appointment.patients.cskh_assignments) {
      recipientIds.add(assignment.cskh_staff_id);
    }

    let recipients = recipientIds.size
      ? await prisma.users.findMany({
          where: {
            id: { in: [...recipientIds] },
            status: 'active',
            roles: { is: { code: 'cskh' } },
          },
          select: { id: true },
        })
      : [];
    if (recipients.length === 0) {
      recipients = await prisma.users.findMany({
        where: {
          status: 'active',
          roles: { is: { code: 'cskh' } },
        },
        select: { id: true },
      });
    }
    if (recipients.length === 0) {
      throw new AppError('Hiện không có nhân viên khả dụng để tiếp nhận yêu cầu', 503);
    }

    const createdRequest = await prisma.$transaction(async (transaction) => {
      const request = await transaction.appointment_change_requests.create({
        data: {
          appointment_id: id,
          patient_id: patientId,
          action: data.action,
          requested_scheduled_at: requestedScheduledAt,
          reason: data.reason || null,
          initiated_by_role: 'patient',
        },
      });

      await Promise.all([
        ...recipients.map(({ id: userId }) =>
          transaction.notifications.create({
            data: {
              user_id: userId,
              type: 'system',
              title: `Yêu cầu ${requestedAction} khám #${appointment.id}`,
              content: requestDetails,
              related_table: 'appointments',
              related_id: appointment.id,
              status: 'pending',
            },
          })
        ),
        transaction.notifications.create({
          data: {
            patient_id: patientId,
            type: 'appointment_confirmation',
            title: `Đã tiếp nhận yêu cầu ${requestedAction}`,
            content: `Yêu cầu ${requestedAction} cho lịch hẹn #${appointment.id} đã được gửi đến nhân viên CSKH.`,
            related_table: 'appointments',
            related_id: appointment.id,
            status: 'pending',
          },
        }),
      ]);

      return request;
    });

    return serializeBigInt(createdRequest);
  }

  static async requestDoctorAppointmentChange(
    id: string,
    doctorId: string,
    data: { action: 'reschedule' | 'cancel'; reason: string }
  ) {
    const appointment = await prisma.appointments.findUnique({
      where: { id },
      include: {
        patients: {
          select: {
            assigned_cskh_id: true,
            cskh_assignments: {
              where: { is_active: true },
              select: { cskh_staff_id: true },
            },
          },
        },
      },
    });
    if (!appointment) throw new NotFoundError('Không tìm thấy lịch hẹn');
    if (appointment.assigned_staff_id !== doctorId) {
      throw new ForbiddenError('Bác sĩ chỉ được yêu cầu thay đổi lịch mình đang phụ trách');
    }
    if (!['pending', 'confirmed'].includes(appointment.status)) {
      throw new BadRequestError('Chỉ có thể yêu cầu thay đổi lịch chưa bắt đầu khám');
    }
    if (appointment.scheduled_at <= new Date()) {
      throw new BadRequestError('Không thể yêu cầu thay đổi lịch đã đến hoặc đã qua');
    }

    const existingRequest = await prisma.appointment_change_requests.findFirst({
      where: { appointment_id: id, status: { in: ['pending', 'awaiting_patient'] } },
      select: { id: true },
    });
    if (existingRequest) {
      throw new ConflictError('Lịch hẹn đang có yêu cầu thay đổi chờ xử lý');
    }

    const recipientIds = new Set<string>();
    if (appointment.patients.assigned_cskh_id) {
      recipientIds.add(appointment.patients.assigned_cskh_id);
    }
    for (const assignment of appointment.patients.cskh_assignments) {
      recipientIds.add(assignment.cskh_staff_id);
    }
    let recipients = recipientIds.size
      ? await prisma.users.findMany({
          where: {
            id: { in: [...recipientIds] },
            status: 'active',
            roles: { is: { code: 'cskh' } },
          },
          select: { id: true },
        })
      : [];
    if (!recipients.length) {
      recipients = await prisma.users.findMany({
        where: { status: 'active', roles: { is: { code: 'cskh' } } },
        select: { id: true },
      });
    }
    if (!recipients.length) {
      throw new AppError('Hiện không có nhân viên CSKH khả dụng để tiếp nhận yêu cầu', 503);
    }

    const actionText = data.action === 'cancel' ? 'hủy' : 'đổi';
    const request = await prisma.$transaction(async (transaction) => {
      const created = await transaction.appointment_change_requests.create({
        data: {
          appointment_id: id,
          patient_id: appointment.patient_id,
          action: data.action,
          reason: data.reason,
          initiated_by_role: 'doctor',
          initiated_by_user_id: doctorId,
          status: 'pending',
        },
      });
      await Promise.all(
        recipients.map(({ id: userId }) =>
          transaction.notifications.create({
            data: {
              user_id: userId,
              type: 'system',
              title: `Bác sĩ yêu cầu ${actionText} lịch khám #${id}`,
              content: `Bác sĩ phụ trách đề nghị ${actionText} lịch khám #${id}. Lý do: ${data.reason}. Vui lòng liên hệ bệnh nhân để chọn đổi ngày hoặc đổi bác sĩ.`,
              related_table: 'appointments',
              related_id: id,
              status: 'pending',
            },
          })
        )
      );
      return created;
    });
    return serializeBigInt(request);
  }

  static async getAppointmentChangeRequests(params: {
    page?: string;
    limit?: string;
    status?: 'pending' | 'awaiting_patient' | 'approved' | 'rejected';
    appointmentId?: string;
  }, patientId?: string) {
    const { page, limit, skip, take } = PaginationUtil.getPagination(params);
    const where = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.appointmentId ? { appointment_id: params.appointmentId } : {}),
      ...(patientId ? { patient_id: patientId } : {}),
    };

    const [requests, total] = await Promise.all([
      prisma.appointment_change_requests.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: 'desc' },
        include: {
          appointments: {
            select: {
              id: true,
              scheduled_at: true,
              status: true,
              type: true,
              visit_address: true,
              clinic_room: true,
              patients: { select: { id: true, full_name: true, phone: true } },
              users_appointments_assigned_staff_idTousers: {
                select: { id: true, full_name: true },
              },
            },
          },
          patients: { select: { id: true, full_name: true, phone: true } },
          initiated_by_user: { select: { id: true, full_name: true } },
          users: { select: { id: true, full_name: true } },
        },
      }),
      prisma.appointment_change_requests.count({ where }),
    ]);

    return PaginationUtil.formatResult(serializeBigInt(requests), total, page, limit);
  }

  static async notifyPatientOfDoctorChangeRequest(requestId: string) {
    return prisma.$transaction(async (transaction) => {
      const request = await transaction.appointment_change_requests.findUnique({
        where: { id: requestId },
        select: {
          id: true,
          appointment_id: true,
          patient_id: true,
          action: true,
          status: true,
          initiated_by_role: true,
        },
      });
      if (!request) throw new NotFoundError('Không tìm thấy yêu cầu thay đổi lịch hẹn');
      if (request.initiated_by_role !== 'doctor' || request.status !== 'pending') {
        throw new ConflictError('Yêu cầu này không ở trạng thái chờ CSKH thông báo bệnh nhân');
      }

      const updated = await transaction.appointment_change_requests.updateMany({
        where: { id: requestId, status: 'pending', initiated_by_role: 'doctor' },
        data: { status: 'awaiting_patient', updated_at: new Date() },
      });
      if (updated.count !== 1) {
        throw new ConflictError('Yêu cầu vừa được xử lý, vui lòng tải lại');
      }

      await transaction.notifications.create({
        data: {
          patient_id: request.patient_id,
          type: 'appointment_confirmation',
          title: 'Bác sĩ đề nghị thay đổi lịch khám',
          content: `Bác sĩ phụ trách đề nghị ${request.action === 'cancel' ? 'hủy' : 'đổi'} lịch khám #${request.appointment_id}. Vui lòng chọn đổi ngày khám hoặc đổi sang bác sĩ khác trong ứng dụng.`,
          related_table: 'appointments',
          related_id: request.appointment_id,
          status: 'pending',
        },
      });

      return transaction.appointment_change_requests.findUniqueOrThrow({
        where: { id: requestId },
      });
    }).then(serializeBigInt);
  }

  static async submitPatientChangeRequestChoice(
    requestId: string,
    patientId: string,
    data:
      | { choice: 'reschedule'; requestedScheduledAt: string }
      | { choice: 'change_doctor' }
  ) {
    const requestedScheduledAt =
      data.choice === 'reschedule' ? new Date(data.requestedScheduledAt) : null;
    if (requestedScheduledAt) {
      assertAppointmentDuringBusinessHours(requestedScheduledAt);
      if (requestedScheduledAt <= new Date()) {
        throw new BadRequestError('Thời gian khám mới phải ở trong tương lai');
      }
    }

    const request = await prisma.appointment_change_requests.findFirst({
      where: {
        id: requestId,
        patient_id: patientId,
        initiated_by_role: 'doctor',
        status: 'awaiting_patient',
      },
      select: { id: true, appointment_id: true },
    });
    if (!request) {
      throw new NotFoundError('Không tìm thấy yêu cầu đang chờ lựa chọn của bệnh nhân');
    }

    const cskhUsers = await prisma.users.findMany({
      where: {
        status: 'active',
        roles: { is: { code: 'cskh' } },
        OR: [
          { patients_patients_assigned_cskh_idTousers: { some: { id: patientId } } },
          {
            cskh_assignments: {
              some: { patient_id: patientId, is_active: true },
            },
          },
        ],
      },
      select: { id: true },
    });
    const recipients =
      cskhUsers.length > 0
        ? cskhUsers
        : await prisma.users.findMany({
            where: { status: 'active', roles: { is: { code: 'cskh' } } },
            select: { id: true },
          });
    if (!recipients.length) {
      throw new AppError('Hiện không có nhân viên CSKH khả dụng để xử lý lựa chọn', 503);
    }

    return serializeBigInt(
      await prisma.$transaction(async (transaction) => {
        const updated = await transaction.appointment_change_requests.updateMany({
          where: { id: requestId, patient_id: patientId, status: 'awaiting_patient' },
          data: {
            patient_choice: data.choice,
            requested_scheduled_at: requestedScheduledAt,
            status: 'pending',
            updated_at: new Date(),
          },
        });
        if (updated.count !== 1) {
          throw new ConflictError('Yêu cầu vừa được cập nhật, vui lòng tải lại');
        }

        await Promise.all(
          recipients.map(({ id: userId }) =>
            transaction.notifications.create({
              data: {
                user_id: userId,
                type: 'system',
                title: 'Bệnh nhân đã chọn phương án thay đổi lịch',
                content:
                  data.choice === 'reschedule'
                    ? `Bệnh nhân chọn đổi lịch khám #${request.appointment_id} sang ${requestedScheduledAt?.toLocaleString('vi-VN')}. Vui lòng xem xét và xử lý.`
                    : `Bệnh nhân chọn đổi sang bác sĩ khác cho lịch khám #${request.appointment_id}. Vui lòng phân công bác sĩ thay thế.`,
                related_table: 'appointments',
                related_id: request.appointment_id,
                status: 'pending',
              },
            })
          )
        );

        return transaction.appointment_change_requests.findUniqueOrThrow({
          where: { id: requestId },
        });
      })
    );
  }

  static async reviewAppointmentChangeRequest(
    requestId: string,
    reviewerId: string,
    decision: 'approved' | 'rejected',
    reviewNote?: string,
    assignedStaffId?: string
  ) {
    const reviewedAt = new Date();
    const reviewedRequest = await prisma.$transaction(async (transaction) => {
      const request = await transaction.appointment_change_requests.findUnique({
        where: { id: requestId },
        include: {
          appointments: {
            select: {
              id: true,
              status: true,
              scheduled_at: true,
              assigned_staff_id: true,
            },
          },
        },
      });

      if (!request) throw new NotFoundError('Không tìm thấy yêu cầu thay đổi lịch hẹn');
      if (request.status !== 'pending') {
        throw new ConflictError('Yêu cầu này đã được xử lý');
      }

      let replacementDoctor: { id: string; full_name: string } | null = null;
      if (decision === 'approved') {
        const appointment = request.appointments;
        if (!['pending', 'confirmed'].includes(appointment.status)) {
          throw new BadRequestError('Lịch hẹn không còn ở trạng thái có thể thay đổi');
        }
        if (appointment.scheduled_at <= reviewedAt) {
          throw new BadRequestError('Không thể duyệt yêu cầu cho lịch đã đến hoặc đã qua');
        }

        if (request.initiated_by_role === 'doctor') {
          if (!request.patient_choice) {
            throw new BadRequestError('Bệnh nhân chưa chọn phương án xử lý yêu cầu');
          }

          if (request.patient_choice === 'reschedule') {
            const requestedScheduledAt = request.requested_scheduled_at;
            if (!requestedScheduledAt || requestedScheduledAt <= reviewedAt) {
              throw new BadRequestError('Thời gian mới không hợp lệ hoặc đã qua');
            }
            assertAppointmentDuringBusinessHours(requestedScheduledAt);

            await this.ensureDoctorSlotAvailable(
              transaction,
              appointment.id,
              appointment.assigned_staff_id,
              requestedScheduledAt
            );
            const updated = await transaction.appointments.updateMany({
              where: { id: appointment.id, status: appointment.status },
              data: { scheduled_at: requestedScheduledAt, updated_at: reviewedAt },
            });
            if (updated.count !== 1) {
              throw new ConflictError('Lịch hẹn vừa được cập nhật, vui lòng tải lại và thử lại');
            }
          } else {
            if (!assignedStaffId) {
              throw new BadRequestError('Vui lòng chọn bác sĩ mới để hoàn tất yêu cầu');
            }
            if (assignedStaffId === appointment.assigned_staff_id) {
              throw new BadRequestError('Bác sĩ thay thế phải khác bác sĩ hiện tại');
            }
            replacementDoctor = await transaction.users.findFirst({
              where: {
                id: assignedStaffId,
                status: 'active',
                roles: { is: { code: 'doctor' } },
              },
              select: { id: true, full_name: true },
            });
            if (!replacementDoctor) {
              throw new BadRequestError('Không tìm thấy bác sĩ thay thế đang hoạt động');
            }

            await this.ensureDoctorSlotAvailable(
              transaction,
              appointment.id,
              assignedStaffId,
              appointment.scheduled_at
            );
            const updated = await transaction.appointments.updateMany({
              where: { id: appointment.id, status: appointment.status },
              data: { assigned_staff_id: assignedStaffId, updated_at: reviewedAt },
            });
            if (updated.count !== 1) {
              throw new ConflictError('Lịch hẹn vừa được cập nhật, vui lòng tải lại và thử lại');
            }
          }
        } else if (request.action === 'cancel') {
          const appointmentUpdate = await transaction.appointments.updateMany({
            where: { id: appointment.id, status: appointment.status },
            data: { status: 'cancelled', updated_at: reviewedAt },
          });
          if (appointmentUpdate.count !== 1) {
            throw new ConflictError('Lịch hẹn vừa được cập nhật, vui lòng tải lại và thử lại');
          }
        } else {
          const requestedScheduledAt = request.requested_scheduled_at;
          if (!requestedScheduledAt || requestedScheduledAt <= reviewedAt) {
            throw new BadRequestError('Thời gian mới không hợp lệ hoặc đã qua');
          }
          assertAppointmentDuringBusinessHours(requestedScheduledAt);

          await this.ensureDoctorSlotAvailable(
            transaction,
            appointment.id,
            appointment.assigned_staff_id,
            requestedScheduledAt
          );

          const appointmentUpdate = await transaction.appointments.updateMany({
            where: { id: appointment.id, status: appointment.status },
            data: { scheduled_at: requestedScheduledAt, updated_at: reviewedAt },
          });
          if (appointmentUpdate.count !== 1) {
            throw new ConflictError('Lịch hẹn vừa được cập nhật, vui lòng tải lại và thử lại');
          }
        }
      }

      const requestUpdate = await transaction.appointment_change_requests.updateMany({
        where: { id: requestId, status: 'pending' },
        data: {
          status: decision,
          reviewed_by: reviewerId,
          reviewed_at: reviewedAt,
          review_note: reviewNote || null,
          updated_at: reviewedAt,
        },
      });
      if (requestUpdate.count !== 1) {
        throw new ConflictError('Yêu cầu vừa được xử lý bởi nhân viên khác');
      }

      await transaction.notifications.create({
        data: {
          patient_id: request.patient_id,
          type: 'appointment_confirmation',
          title: decision === 'approved'
            ? 'Yêu cầu thay đổi lịch hẹn đã được duyệt'
            : 'Yêu cầu thay đổi lịch hẹn đã bị từ chối',
          content: decision === 'approved'
            ? request.initiated_by_role === 'doctor'
              ? request.patient_choice === 'reschedule'
                ? `Lịch hẹn #${request.appointment_id} đã được đổi sang ${request.requested_scheduled_at?.toLocaleString('vi-VN')}.`
                : 'CSKH đã phân công bác sĩ khác cho lịch hẹn.'
              : request.action === 'cancel'
              ? `Yêu cầu hủy lịch hẹn #${request.appointment_id} đã được duyệt.`
              : `Yêu cầu đổi lịch hẹn #${request.appointment_id} đã được duyệt sang ${request.requested_scheduled_at?.toLocaleString('vi-VN')}.`
            : `Yêu cầu thay đổi lịch hẹn #${request.appointment_id} đã bị từ chối.${reviewNote ? ` Lý do: ${reviewNote}` : ''}`,
          related_table: 'appointments',
          related_id: request.appointment_id,
          status: 'pending',
        },
      });

      if (decision === 'approved' && replacementDoctor) {
        await transaction.notifications.create({
          data: {
            user_id: replacementDoctor.id,
            type: 'system',
            title: `Bạn được phân công lịch khám #${request.appointment_id}`,
            content: `Bạn được CSKH phân công thay bác sĩ phụ trách lịch khám vào lúc ${request.appointments.scheduled_at.toLocaleString('vi-VN')}.`,
            related_table: 'appointments',
            related_id: request.appointment_id,
            status: 'pending',
          },
        });
      }

      return transaction.appointment_change_requests.findUniqueOrThrow({
        where: { id: requestId },
        include: {
          appointments: {
            select: {
              id: true,
              scheduled_at: true,
              status: true,
              type: true,
              visit_address: true,
              clinic_room: true,
              patients: { select: { id: true, full_name: true, phone: true } },
              users_appointments_assigned_staff_idTousers: {
                select: { id: true, full_name: true },
              },
            },
          },
          patients: { select: { id: true, full_name: true, phone: true } },
          users: { select: { id: true, full_name: true } },
        },
      });
    });

    return serializeBigInt(reviewedRequest);
  }

  private static async ensureDoctorSlotAvailable(
    transaction: Prisma.TransactionClient,
    appointmentId: string,
    doctorId: string | null,
    scheduledAt: Date
  ) {
    if (!doctorId) return;

    const slotStart = new Date(scheduledAt.getTime() - 29 * 60 * 1000);
    const slotEnd = new Date(scheduledAt.getTime() + 29 * 60 * 1000);
    const conflict = await transaction.appointments.findFirst({
      where: {
        id: { not: appointmentId },
        assigned_staff_id: doctorId,
        status: { in: ['pending', 'confirmed', 'checked_in', 'in_progress'] },
        scheduled_at: { gte: slotStart, lte: slotEnd },
      },
      select: { id: true },
    });
    if (conflict) {
      throw new ConflictError('Bác sĩ đã có lịch trong khung giờ được yêu cầu');
    }
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

    if (newStatus === 'in_progress') {
      assertAppointmentCanStart(appointment.scheduled_at);
    }

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
