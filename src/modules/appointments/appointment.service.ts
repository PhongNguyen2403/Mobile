import { prisma } from '../../config/database';
import { Prisma } from '@prisma/client';
import { NotFoundError, BadRequestError, ConflictError, ForbiddenError } from '../../middlewares/error.middleware';
import { PaginationUtil, PaginationParams } from '../../utils/pagination.util';
import { serializeBigInt } from '../../utils/bigint.util';
import {
  canCreateRescheduleProposal,
  getDoctorSlotConflictWindow,
  resolveRescheduleDecision,
  RescheduleDecision,
} from './appointment.rules';

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['in_progress', 'cancelled', 'no_show', 'reschedule_pending'],
  reschedule_pending: ['cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  no_show: [],
};

export class AppointmentService {
  static async createAppointment(data: {
    patientId: string;
    scheduledAt: string;
    visitAddress?: string;
    type?: 'first_visit' | 'follow_up' | 'emergency';
    createdBy?: string;
    note?: string;
  }) {
    const patient = await prisma.patients.findUnique({ where: { id: data.patientId } });
    if (!patient) throw new NotFoundError('Không tìm thấy hồ sơ bệnh nhân');

    const appointment = await prisma.appointments.create({
      data: {
        patient_id: data.patientId,
        scheduled_at: new Date(data.scheduledAt),
        visit_address: data.visitAddress || null,
        type: data.type || 'first_visit',
        assigned_staff_id: null,
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
        content: `Lịch hẹn khám tại phòng khám vào lúc ${new Date(data.scheduledAt).toLocaleString('vi-VN')} đã được ghi nhận.`,
        related_table: 'appointments',
        related_id: appointment.id,
        status: 'pending',
      },
    });

    return serializeBigInt(appointment);
  }

  static async getAppointments(
    params: PaginationParams & {
      status?: 'pending' | 'confirmed' | 'reschedule_pending' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
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
        reschedule_proposals: {
          orderBy: { created_at: 'desc' },
          include: {
            options: {
              include: {
                staff: { select: { id: true, full_name: true, phone: true } },
              },
              orderBy: { scheduled_at: 'asc' },
            },
            proposed_by_user: { select: { id: true, full_name: true } },
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
    if (newStatus === 'confirmed' && !appointment.assigned_staff_id) {
      throw new BadRequestError('Cần phân công bác sĩ trước khi xác nhận lịch khám');
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (newStatus === 'cancelled') {
        await tx.appointment_reschedule_proposals.updateMany({
          where: { appointment_id: id, status: 'pending_patient' },
          data: { status: 'cancelled', responded_at: new Date() },
        });
      }

      return tx.appointments.update({
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
    });

    return serializeBigInt(updated);
  }

  /**
  * Phân công bác sĩ phụ trách lịch khám tại phòng khám
   */
  static async assignStaff(id: string, staffId: string, requestedScheduledAt?: string) {
    const appointment = await prisma.appointments.findUnique({ where: { id } });
    if (!appointment) throw new NotFoundError('Không tìm thấy lịch hẹn');
    if (appointment.status !== 'pending') {
      throw new BadRequestError(
        'Chỉ phân công trực tiếp cho lịch mới đang chờ; lịch đã xác nhận cần gửi đề xuất đổi lịch cho bệnh nhân'
      );
    }

    const staff = await prisma.users.findUnique({
      where: { id: staffId },
      include: { roles: true },
    });
    if (!staff) throw new NotFoundError('Không tìm thấy nhân viên được chỉ định');
    if (staff.roles.code !== 'doctor') {
      throw new BadRequestError('Chỉ có thể phân công lịch hẹn cho bác sĩ');
    }

    const scheduledAt = requestedScheduledAt
      ? new Date(requestedScheduledAt)
      : appointment.scheduled_at;
    let updated;
    try {
      updated = await prisma.$transaction(async (tx) => {
        const conflictingAppointment = await tx.appointments.findFirst({
          where: {
            assigned_staff_id: staffId,
            status: { in: ['pending', 'confirmed', 'in_progress'] },
            scheduled_at: {
              gt: getDoctorSlotConflictWindow(scheduledAt).after,
              lt: getDoctorSlotConflictWindow(scheduledAt).before,
            },
            id: { not: id },
          },
          select: { id: true },
        });
        if (conflictingAppointment) {
          throw new ConflictError('Lịch của cùng bác sĩ phải cách nhau ít nhất 30 phút');
        }

        const appointmentUpdate = await tx.appointments.update({
          where: { id },
          data: {
            assigned_staff_id: staffId,
            scheduled_at: scheduledAt,
            status: 'confirmed',
            updated_at: new Date(),
          },
          include: {
            users_appointments_assigned_staff_idTousers: {
              select: { id: true, full_name: true, phone: true, roles: true },
            },
          },
        });

        await tx.notifications.create({
          data: {
            user_id: staffId,
            type: 'system',
            title: 'Phân công lịch khám mới',
            content: `Bạn được phân công phụ trách lịch khám tại phòng khám #${id} vào lúc ${scheduledAt.toLocaleString('vi-VN')}`,
            related_table: 'appointments',
            related_id: id,
            status: 'pending',
          },
        });

        await tx.notifications.create({
          data: {
            patient_id: appointment.patient_id,
            type: 'appointment_confirmation',
            title: 'Lịch khám đã được xác nhận',
            content: `Lịch khám tại phòng khám của bạn đã được xác nhận vào lúc ${scheduledAt.toLocaleString('vi-VN')}.`,
            related_table: 'appointments',
            related_id: id,
            status: 'pending',
          },
        });

        return appointmentUpdate;
      }, { isolationLevel: 'Serializable' });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2034') {
        throw new ConflictError('Lịch vừa được cập nhật đồng thời. Vui lòng kiểm tra và thử lại.');
      }
      throw error;
    }

    return serializeBigInt(updated);
  }

  private static async assertDoctorSlotAvailable(
    tx: Prisma.TransactionClient,
    appointmentId: string,
    staffId: string,
    scheduledAt: Date
  ) {
    const conflictingAppointment = await tx.appointments.findFirst({
      where: {
        assigned_staff_id: staffId,
        status: { in: ['pending', 'confirmed', 'in_progress'] },
        scheduled_at: {
          gt: getDoctorSlotConflictWindow(scheduledAt).after,
          lt: getDoctorSlotConflictWindow(scheduledAt).before,
        },
        id: { not: appointmentId },
      },
      select: { id: true },
    });
    if (conflictingAppointment) {
      throw new ConflictError('Lịch của cùng bác sĩ phải cách nhau ít nhất 30 phút');
    }
  }

  static async createRescheduleProposal(
    appointmentId: string,
    proposedBy: string,
    reason: string,
    options: Array<{ staffId: string; scheduledAt: string }>
  ) {
    const appointment = await prisma.appointments.findUnique({ where: { id: appointmentId } });
    if (!appointment) throw new NotFoundError('Không tìm thấy lịch hẹn');
    if (!canCreateRescheduleProposal(appointment.status)) {
      throw new BadRequestError('Chỉ có thể đề xuất đổi lịch đã được xác nhận');
    }

    const staffIds = [...new Set(options.map((option) => option.staffId))];
    const doctors = await prisma.users.findMany({
      where: { id: { in: staffIds }, status: 'active', roles: { code: 'doctor' } },
      select: { id: true },
    });
    if (doctors.length !== staffIds.length) {
      throw new BadRequestError('Tất cả phương án phải gán cho bác sĩ đang hoạt động');
    }

    let proposal;
    try {
      proposal = await prisma.$transaction(async (tx) => {
        const existingProposal = await tx.appointment_reschedule_proposals.findFirst({
          where: { appointment_id: appointmentId, status: 'pending_patient' },
          select: { id: true },
        });
        if (existingProposal) {
          throw new ConflictError('Lịch hẹn đang có một đề xuất chờ bệnh nhân phản hồi');
        }

        for (const option of options) {
          await this.assertDoctorSlotAvailable(
            tx,
            appointmentId,
            option.staffId,
            new Date(option.scheduledAt)
          );
        }

        const createdProposal = await tx.appointment_reschedule_proposals.create({
          data: {
            appointment_id: appointmentId,
            proposed_by: proposedBy,
            original_staff_id: appointment.assigned_staff_id,
            original_scheduled_at: appointment.scheduled_at,
            reason,
            options: {
              create: options.map((option) => ({
                staff_id: option.staffId,
                scheduled_at: new Date(option.scheduledAt),
              })),
            },
          },
          include: {
            options: {
              include: { staff: { select: { id: true, full_name: true, phone: true } } },
              orderBy: { scheduled_at: 'asc' },
            },
          },
        });

        await tx.appointments.update({
          where: { id: appointmentId },
          data: { status: 'reschedule_pending', updated_at: new Date() },
        });

        const optionText = createdProposal.options
          .map((option) => `${option.staff.full_name} - ${option.scheduled_at.toLocaleString('vi-VN')}`)
          .join('\n');
        await tx.notifications.create({
          data: {
            patient_id: appointment.patient_id,
            type: 'appointment_confirmation',
            title: 'Lịch khám cần thay đổi',
            content: `${reason}\nVui lòng chọn một phương án:\n${optionText}`,
            related_table: 'appointment_reschedule_proposals',
            related_id: createdProposal.id,
            status: 'pending',
          },
        });

        return createdProposal;
      }, { isolationLevel: 'Serializable' });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2034') {
        throw new ConflictError('Lịch vừa được cập nhật đồng thời. Vui lòng tải lại và thử lại.');
      }
      throw error;
    }

    return serializeBigInt(proposal);
  }

  static async respondToRescheduleProposal(
    appointmentId: string,
    proposalId: string,
    patientId: string,
    decision: RescheduleDecision,
    optionId?: string
  ) {
    let result;
    try {
      result = await prisma.$transaction(async (tx) => {
        const proposal = await tx.appointment_reschedule_proposals.findFirst({
          where: { id: proposalId, appointment_id: appointmentId },
          include: {
            appointments: true,
            options: true,
          },
        });
        if (!proposal) throw new NotFoundError('Không tìm thấy đề xuất đổi lịch');
        if (proposal.appointments.patient_id !== patientId) {
          throw new ForbiddenError('Bạn không có quyền phản hồi đề xuất này');
        }
        if (proposal.status !== 'pending_patient' || proposal.appointments.status !== 'reschedule_pending') {
          throw new ConflictError('Đề xuất đổi lịch không còn chờ phản hồi');
        }

        if (decision === 'reject') {
          const resolution = resolveRescheduleDecision(decision);
          const rejectedProposal = await tx.appointment_reschedule_proposals.update({
            where: { id: proposalId },
            data: { status: resolution.proposalStatus, responded_at: new Date() },
            include: { options: true },
          });
          await tx.notifications.create({
            data: {
              user_id: proposal.proposed_by,
              type: 'system',
              title: 'Bệnh nhân từ chối phương án đổi lịch',
              content: `Bệnh nhân đã từ chối các phương án đổi lịch cho lịch hẹn #${appointmentId}. Vui lòng liên hệ và đề xuất lại.`,
              related_table: 'appointment_reschedule_proposals',
              related_id: proposalId,
              status: 'pending',
            },
          });
          return { decision, proposal: rejectedProposal, appointment: proposal.appointments };
        }

        const selectedOption = proposal.options.find((option) => option.id === optionId);
        if (!selectedOption) {
          throw new BadRequestError('Phải chọn một phương án thuộc đề xuất này');
        }
        await this.assertDoctorSlotAvailable(
          tx,
          appointmentId,
          selectedOption.staff_id,
          selectedOption.scheduled_at
        );
        const resolution = resolveRescheduleDecision(decision);

        const updatedAppointment = await tx.appointments.update({
          where: { id: appointmentId },
          data: {
            assigned_staff_id: selectedOption.staff_id,
            scheduled_at: selectedOption.scheduled_at,
            status: resolution.appointmentStatus,
            updated_at: new Date(),
          },
          include: {
            users_appointments_assigned_staff_idTousers: {
              select: { id: true, full_name: true, phone: true },
            },
          },
        });
        await tx.appointment_reschedule_options.update({
          where: { id: selectedOption.id },
          data: { selected_at: new Date() },
        });
        const acceptedProposal = await tx.appointment_reschedule_proposals.update({
          where: { id: proposalId },
          data: { status: resolution.proposalStatus, responded_at: new Date() },
          include: { options: true },
        });
        await tx.notifications.create({
          data: {
            user_id: selectedOption.staff_id,
            type: 'system',
            title: 'Lịch khám được bệnh nhân xác nhận',
            content: `Bạn được phân công lịch khám #${appointmentId} vào lúc ${selectedOption.scheduled_at.toLocaleString('vi-VN')}.`,
            related_table: 'appointments',
            related_id: appointmentId,
            status: 'pending',
          },
        });
        await tx.notifications.create({
          data: {
            patient_id: patientId,
            type: 'appointment_confirmation',
            title: 'Đổi lịch khám thành công',
            content: `Lịch khám đã được cập nhật vào lúc ${selectedOption.scheduled_at.toLocaleString('vi-VN')}.`,
            related_table: 'appointments',
            related_id: appointmentId,
            status: 'pending',
          },
        });
        return { decision, proposal: acceptedProposal, appointment: updatedAppointment };
      }, { isolationLevel: 'Serializable' });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2034') {
        throw new ConflictError('Lịch vừa được cập nhật đồng thời. Vui lòng tải lại và thử lại.');
      }
      throw error;
    }

    return serializeBigInt(result);
  }
}
