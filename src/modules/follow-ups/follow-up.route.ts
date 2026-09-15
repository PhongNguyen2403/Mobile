import { Router } from 'express';
import { FollowUpController } from './follow-up.controller';
import { authGuard } from '../../middlewares/auth.middleware';
import { roleGuard } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  createFollowUpSchema,
  updateFollowUpStatusSchema,
  listFollowUpsQuerySchema,
} from './follow-up.schema';

const router = Router();

router.use(authGuard);

router.post(
  '/',
  roleGuard('admin', 'doctor', 'cskh'),
  validate(createFollowUpSchema),
  FollowUpController.createFollowUp
);

router.get(
  '/',
  validate(listFollowUpsQuerySchema),
  FollowUpController.getFollowUps
);

router.patch(
  '/:id/status',
  roleGuard('admin', 'cskh', 'doctor'),
  validate(updateFollowUpStatusSchema),
  FollowUpController.updateStatus
);

export default router;
