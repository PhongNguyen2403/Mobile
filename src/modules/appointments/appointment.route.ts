import { Router } from 'express';
import { AppointmentController } from './appointment.controller';
import { authGuard } from '../../middlewares/auth.middleware';
import { roleGuard } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  createAppointmentSchema,
  updateAppointmentStatusSchema,
  assignAppointmentStaffSchema,
  listAppointmentsQuerySchema,
  createRescheduleProposalSchema,
  respondToRescheduleProposalSchema,
} from './appointment.schema';

const router = Router();

router.use(authGuard);

router.post(
  '/',
  roleGuard('patient', 'admin', 'cskh'),
  validate(createAppointmentSchema),
  AppointmentController.createAppointment
);

router.get(
  '/',
  validate(listAppointmentsQuerySchema),
  AppointmentController.getAppointments
);

router.get('/:id', AppointmentController.getAppointmentById);

router.patch(
  '/:id/status',
  roleGuard('admin', 'doctor', 'nurse', 'cskh'),
  validate(updateAppointmentStatusSchema),
  AppointmentController.updateStatus
);

router.patch(
  '/:id/assign',
  roleGuard('admin', 'cskh'),
  validate(assignAppointmentStaffSchema),
  AppointmentController.assignStaff
);

router.post(
  '/:id/reschedule-proposals',
  roleGuard('admin', 'cskh'),
  validate(createRescheduleProposalSchema),
  AppointmentController.createRescheduleProposal
);

router.post(
  '/:id/reschedule-proposals/:proposalId/respond',
  roleGuard('patient'),
  validate(respondToRescheduleProposalSchema),
  AppointmentController.respondToRescheduleProposal
);

export default router;
