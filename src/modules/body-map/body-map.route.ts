import { Router } from 'express';
import { BodyMapController } from './body-map.controller';
import { authGuard } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  listBodyPartsQuerySchema,
  createSymptomReportSchema,
  addSymptomReportItemSchema,
  convertToAppointmentSchema,
} from './body-map.schema';

const router = Router();

// Lấy danh sách điểm giải phẫu (công khai hoặc cần auth)
router.get(
  '/body-parts',
  validate(listBodyPartsQuerySchema),
  BodyMapController.getBodyParts
);

router.use(authGuard);

router.post(
  '/symptom-reports',
  validate(createSymptomReportSchema),
  BodyMapController.createSymptomReport
);

router.post(
  '/symptom-reports/:id/items',
  validate(addSymptomReportItemSchema),
  BodyMapController.addReportItem
);

router.get(
  '/symptom-reports/:id',
  BodyMapController.getReportDetail
);

router.post(
  '/symptom-reports/:id/convert-to-appointment',
  validate(convertToAppointmentSchema),
  BodyMapController.convertToAppointment
);

export default router;
