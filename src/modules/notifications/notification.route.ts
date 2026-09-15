import { Router } from 'express';
import { NotificationController } from './notification.controller';
import { authGuard } from '../../middlewares/auth.middleware';
import { roleGuard } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { listNotificationsQuerySchema } from './notification.schema';

const router = Router();

router.use(authGuard);

router.get(
  '/',
  validate(listNotificationsQuerySchema),
  NotificationController.getNotifications
);

router.patch(
  '/:id/read',
  NotificationController.markAsRead
);

// Endpoint kích hoạt thủ công cho Admin hoặc CSKH để test / trigger cron ngay lập tức
router.post(
  '/trigger-reminder-scan',
  roleGuard('admin', 'cskh'),
  NotificationController.triggerCron
);

export default router;
