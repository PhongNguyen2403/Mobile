import { Router } from 'express';
import { ExaminationController } from './examination.controller';
import { authGuard } from '../../middlewares/auth.middleware';
import { roleGuard, patientAccessGuard } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  createExaminationSchema,
  createPrescriptionSchema,
} from './examination.schema';

const router = Router();

router.use(authGuard);

router.post(
  '/',
  roleGuard('admin', 'doctor'),
  validate(createExaminationSchema),
  ExaminationController.createExamination
);

router.get(
  '/doctor/my-patients',
  roleGuard('admin', 'doctor'),
  ExaminationController.getDoctorPatients
);

router.get('/:id', ExaminationController.getExaminationById);

router.post(
  '/:id/prescriptions',
  roleGuard('admin', 'doctor'),
  validate(createPrescriptionSchema),
  ExaminationController.createPrescription
);

router.get(
  '/patient/:id',
  patientAccessGuard('id'),
  ExaminationController.getPatientExaminations
);

export default router;
