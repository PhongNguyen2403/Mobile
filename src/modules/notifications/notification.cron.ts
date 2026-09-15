import cron from 'node-cron';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { NotificationService } from './notification.service';

export const initFollowUpCronJob = () => {
  // Mặc định chạy lúc 07:00 sáng hằng ngày: "0 7 * * *"
  const schedule = env.CRON.FOLLOW_UP_SCHEDULE;

  cron.schedule(schedule, async () => {
    logger.info(`[CRON] Đang chạy cron job quét lịch tái khám định kỳ theo lịch '${schedule}'...`);
    try {
      const result = await NotificationService.processUpcomingFollowUpReminders(
        env.CRON.FOLLOW_UP_REMINDER_DAYS_AHEAD
      );
      logger.info(`[CRON] Hoàn tất quét lịch tái khám: Đã gửi thông báo cho ${result.processed} lịch hẹn.`);
    } catch (err: any) {
      logger.error(`[CRON] Lỗi khi thực hiện cron job quét lịch tái khám: ${err.message}`, {
        stack: err.stack,
      });
    }
  });

  logger.info(`[CRON] Đã khởi tạo Cron Job nhắc lịch tái khám với chu kỳ: ${schedule}`);
};
