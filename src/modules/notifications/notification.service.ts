import { prisma } from '../../config/database';
import { NotFoundError } from '../../middlewares/error.middleware';
import { PaginationUtil, PaginationParams } from '../../utils/pagination.util';
import { serializeBigInt } from '../../utils/bigint.util';
import { logger } from '../../config/logger';

export class NotificationService {
  static async getNotifications(
    filter: { userId?: string; patientId?: string },
    params: PaginationParams & {
      status?: 'pending' | 'sent' | 'failed' | 'read';
      type?: 'follow_up_reminder' | 'appointment_confirmation' | 'cskh_care' | 'system' | 'medicine_reminder';
      isRead?: boolean;
    }
  ) {
    const { page, limit, skip, take } = PaginationUtil.getPagination(params);

    const where: any = {};
    if (filter.userId) where.user_id = filter.userId;
    if (filter.patientId) where.patient_id = filter.patientId;
    if (params.status) where.status = params.status;
    if (params.type) where.type = params.type;
    if (params.isRead !== undefined) where.is_read = params.isRead;

    const [notifications, total] = await Promise.all([
      prisma.notifications.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: 'desc' },
      }),
      prisma.notifications.count({ where }),
    ]);

    return PaginationUtil.formatResult(serializeBigInt(notifications), total, page, limit);
  }

  static async markAsRead(id: string) {
    const notification = await prisma.notifications.findUnique({ where: { id } });
    if (!notification) throw new NotFoundError('Không tìm thấy thông báo');

    const updated = await prisma.notifications.update({
      where: { id },
      data: { is_read: true, status: 'read' },
    });

    return serializeBigInt(updated);
  }

  /**
   * Quét lịch tái khám sắp đến hạn (trong vòng X ngày tới)
   * Tạo thông báo cho bệnh nhân và nhân viên CSKH phụ trách
   */
  static async processUpcomingFollowUpReminders(daysAhead = 3) {
    const now = new Date();
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysAhead);

    logger.info(`[CRON] Bắt đầu quét lịch tái khám từ ${now.toISOString()} đến ${targetDate.toISOString()}`);

    // Tìm các lịch tái khám scheduled chưa gửi reminder
    const upcomingSchedules = await prisma.follow_up_schedules.findMany({
      where: {
        reminder_sent: false,
        status: { in: ['scheduled', 'confirmed'] },
        next_visit_date: {
          gte: now,
          lte: targetDate,
        },
      },
      include: {
        patients: {
          include: {
            cskh_assignments: {
              where: { is_active: true },
              include: { users: true },
            },
          },
        },
      },
    });

    logger.info(`[CRON] Tìm thấy ${upcomingSchedules.length} lịch tái khám cần gửi thông báo nhắc nhở`);

    let sentCount = 0;

    for (const schedule of upcomingSchedules) {
      const visitDateStr = new Date(schedule.next_visit_date).toLocaleDateString('vi-VN');
      const patientName = schedule.patients.full_name;

      // 1. Tạo thông báo cho Bệnh nhân
      await prisma.notifications.create({
        data: {
          patient_id: schedule.patient_id,
          type: 'follow_up_reminder',
          title: 'Nhắc lịch tái khám sắp tới',
          content: `Xin chào ${patientName}, bạn có lịch hẹn tái khám tại nhà vào ngày ${visitDateStr}. Vui lòng chuẩn bị để bác sĩ đến khám nhé.`,
          related_table: 'follow_up_schedules',
          related_id: schedule.id,
          status: 'sent',
          sent_at: new Date(),
        },
      });

      // 2. Tạo thông báo cho CSKH phụ trách (nếu có)
      const activeAssignment = schedule.patients.cskh_assignments[0];
      if (activeAssignment && activeAssignment.cskh_staff_id) {
        await prisma.notifications.create({
          data: {
            user_id: activeAssignment.cskh_staff_id,
            type: 'follow_up_reminder',
            title: 'Lịch tái khám của khách hàng phụ trách',
            content: `Khách hàng ${patientName} (${schedule.patients.phone || 'Không có SĐT'}) có lịch tái khám vào ngày ${visitDateStr}. Vui lòng liên hệ nhắc nhở và chăm sóc.`,
            related_table: 'follow_up_schedules',
            related_id: schedule.id,
            status: 'sent',
            sent_at: new Date(),
          },
        });
      }

      // 3. Cập nhật reminder_sent = true và status = reminded
      await prisma.follow_up_schedules.update({
        where: { id: schedule.id },
        data: {
          reminder_sent: true,
          status: 'reminded',
          updated_at: new Date(),
        },
      });

      sentCount++;
    }

    logger.info(`[CRON] Đã xử lý và gửi thông báo nhắc lịch thành công cho ${sentCount} lịch tái khám`);
    return { processed: sentCount };
  }
}
