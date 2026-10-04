import { Router } from 'express';
import { AppointmentController } from './appointment.controller';
import { authGuard } from '../../middlewares/auth.middleware';
import { roleGuard } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  createAppointmentSchema,
  appointmentIdParamSchema,
  updateAppointmentStatusSchema,
  assignAppointmentStaffSchema,
  getDoctorAvailabilitySchema,
  listAppointmentsQuerySchema,
} from './appointment.schema';

const router = Router();

router.use(authGuard);

router.post(
  '/',
  validate(createAppointmentSchema),
  AppointmentController.createAppointment
);

router.get(
  '/',
  validate(listAppointmentsQuerySchema),
  AppointmentController.getAppointments
);

// Route tra cứu lịch trống an toàn của bác sĩ (đặt TRƯỚC /:id)
router.get(
  '/doctor-availability',
  validate(getDoctorAvailabilitySchema),
  AppointmentController.getDoctorAvailability
);

router.get(
  '/:id',
  validate(appointmentIdParamSchema),
  AppointmentController.getAppointmentById
);

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

export default router;
