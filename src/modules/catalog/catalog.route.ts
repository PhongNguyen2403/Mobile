import { Router } from 'express';
import { CatalogController } from './catalog.controller';
import { authGuard } from '../../middlewares/auth.middleware';
import { roleGuard } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  createSymptomSchema,
  updateSymptomSchema,
  createDiseaseSchema,
  updateDiseaseSchema,
  linkDiseaseSymptomSchema,
} from './catalog.schema';

const router = Router();

router.use(authGuard);

// Symptoms
router.get('/symptoms', CatalogController.getSymptoms);
router.get('/symptoms/:id', CatalogController.getSymptomById);
router.get('/symptoms/:id/recommendations', CatalogController.getSymptomRecommendations);
router.post(
  '/symptoms',
  roleGuard('admin'),
  validate(createSymptomSchema),
  CatalogController.createSymptom
);
router.patch(
  '/symptoms/:id',
  roleGuard('admin'),
  validate(updateSymptomSchema),
  CatalogController.updateSymptom
);
router.delete('/symptoms/:id', roleGuard('admin'), CatalogController.deleteSymptom);

// Diseases
router.get('/diseases', CatalogController.getDiseases);
router.get('/diseases/:id', CatalogController.getDiseaseById);
router.get('/diseases/:id/recommendations', CatalogController.getDiseaseRecommendations);
router.post(
  '/diseases',
  roleGuard('admin'),
  validate(createDiseaseSchema),
  CatalogController.createDisease
);
router.patch(
  '/diseases/:id',
  roleGuard('admin'),
  validate(updateDiseaseSchema),
  CatalogController.updateDisease
);
router.delete('/diseases/:id', roleGuard('admin'), CatalogController.deleteDisease);

// Disease - Symptoms link
router.post(
  '/disease-symptoms',
  roleGuard('admin'),
  validate(linkDiseaseSymptomSchema),
  CatalogController.linkDiseaseSymptom
);
router.delete(
  '/disease-symptoms/:diseaseId/:symptomId',
  roleGuard('admin'),
  CatalogController.unlinkDiseaseSymptom
);

export default router;
