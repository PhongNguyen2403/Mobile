import app from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './config/database';
import { initFollowUpCronJob } from './modules/notifications/notification.cron';

const server = app.listen(env.PORT, async () => {
  try {
    // Kiểm tra kết nối cơ sở dữ liệu
    await prisma.$connect();
    logger.info('Kết nối cơ sở dữ liệu PostgreSQL (Hospital_Mobile) thành công.');

    // Kích hoạt tác vụ định kỳ Cron Job
    initFollowUpCronJob();

    logger.info(`Server đang chạy tại: http://localhost:${env.PORT}`);
    logger.info(`Swagger API Documentation có sẵn tại: http://localhost:${env.PORT}/docs`);
  } catch (err: any) {
    logger.error(`Không thể kết nối cơ sở dữ liệu: ${err.message}`);
  }
});

// Graceful Shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`Nhận tín hiệu ${signal}. Đang đóng server nhẹ nhàng...`);
  server.close(async () => {
    logger.info('HTTP server đã đóng.');
    await prisma.$disconnect();
    logger.info('Đã ngắt kết nối database Prisma.');
    process.exit(0);
  });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
