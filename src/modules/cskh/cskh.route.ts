import { Router } from 'express';
import { CskhController } from './cskh.controller';
import { authGuard } from '../../middlewares/auth.middleware';
import { roleGuard } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  createAssignmentSchema,
  createCareLogSchema,
  listAssignmentsQuerySchema,
  listCareLogsQuerySchema,
} from './cskh.schema';

const router = Router();

router.use(authGuard);

router.post(
  '/assignments',
  roleGuard('admin', 'cskh'),
  validate(createAssignmentSchema),
  CskhController.assignPatient
);

router.get(
  '/assignments',
  roleGuard('admin', 'cskh'),
  validate(listAssignmentsQuerySchema),
  CskhController.getAssignments
);

router.post(
  '/care-logs',
  roleGuard('admin', 'cskh'),
  validate(createCareLogSchema),
  CskhController.createCareLog
);

router.get(
  '/care-logs',
  roleGuard('admin', 'cskh'),
  validate(listCareLogsQuerySchema),
  CskhController.getCareLogs
);

router.get(
  '/dashboard',
  roleGuard('admin', 'cskh'),
  CskhController.getDashboard
);

export default router;
