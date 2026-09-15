import { Router } from 'express';
import { PatientController } from './patient.controller';
import { authGuard } from '../../middlewares/auth.middleware';
import { roleGuard, patientAccessGuard } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  createPatientSchema,
  updatePatientSchema,
  createMedicalHistorySchema,
  listPatientsQuerySchema,
} from './patient.schema';

const router = Router();

router.use(authGuard);

router.post(
  '/',
  roleGuard('admin', 'doctor', 'nurse', 'cskh'),
  validate(createPatientSchema),
  PatientController.createPatient
);

router.get(
  '/',
  roleGuard('admin', 'doctor', 'nurse', 'cskh'),
  validate(listPatientsQuerySchema),
  PatientController.getPatients
);

router.get(
  '/:id',
  patientAccessGuard('id'),
  PatientController.getPatientById
);

router.patch(
  '/:id',
  patientAccessGuard('id'),
  validate(updatePatientSchema),
  PatientController.updatePatient
);

router.post(
  '/:id/medical-history',
  patientAccessGuard('id'),
  validate(createMedicalHistorySchema),
  PatientController.addMedicalHistory
);

router.get(
  '/:id/medical-history',
  patientAccessGuard('id'),
  PatientController.getMedicalHistory
);

router.get(
  '/:id/summary',
  patientAccessGuard('id'),
  PatientController.getPatientSummary
);

export default router;
