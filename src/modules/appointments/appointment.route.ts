import { Router } from 'express';
import { AppointmentController } from './appointment.controller';
import { authGuard } from '../../middlewares/auth.middleware';
import { roleGuard } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  createAppointmentSchema,
  appointmentIdParamSchema,
  requestAppointmentChangeSchema,
  requestDoctorAppointmentChangeSchema,
  listAppointmentChangeRequestsSchema,
  reviewAppointmentChangeRequestSchema,
  notifyChangeRequestPatientSchema,
  submitChangeRequestPatientChoiceSchema,
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

router.get(
  '/change-requests',
  roleGuard('cskh', 'admin', 'patient'),
  validate(listAppointmentChangeRequestsSchema),
  AppointmentController.getChangeRequests
);

router.patch(
  '/change-requests/:requestId/review',
  roleGuard('cskh', 'admin'),
  validate(reviewAppointmentChangeRequestSchema),
  AppointmentController.reviewChangeRequest
);

router.post(
  '/change-requests/:requestId/notify-patient',
  roleGuard('cskh', 'admin'),
  validate(notifyChangeRequestPatientSchema),
  AppointmentController.notifyChangeRequestPatient
);

router.patch(
  '/change-requests/:requestId/patient-choice',
  roleGuard('patient'),
  validate(submitChangeRequestPatientChoiceSchema),
  AppointmentController.submitChangeRequestPatientChoice
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

router.post(
  '/:id/change-request',
  roleGuard('patient'),
  validate(requestAppointmentChangeSchema),
  AppointmentController.requestChange
);

router.post(
  '/:id/doctor-change-request',
  roleGuard('doctor'),
  validate(requestDoctorAppointmentChangeSchema),
  AppointmentController.requestDoctorChange
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
