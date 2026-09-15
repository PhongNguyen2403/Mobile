import { z } from 'zod';

export const createSymptomSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Tên triệu chứng tối thiểu 2 ký tự').max(150),
    category: z.string().max(100).optional(),
    description: z.string().optional(),
  }),
});

export const updateSymptomSchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object({
    name: z.string().min(2).max(150).optional(),
    category: z.string().max(100).optional(),
    description: z.string().optional(),
  }),
});

export const createDiseaseSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Tên bệnh tối thiểu 2 ký tự').max(200),
    icdCode: z.string().max(20).optional(),
    description: z.string().optional(),
    symptomIds: z.array(z.number().int().positive()).optional(),
  }),
});

export const updateDiseaseSchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object({
    name: z.string().min(2).max(200).optional(),
    icdCode: z.string().max(20).optional(),
    description: z.string().optional(),
    symptomIds: z.array(z.number().int().positive()).optional(),
  }),
});

export const linkDiseaseSymptomSchema = z.object({
  body: z.object({
    diseaseId: z.number().int().positive(),
    symptomId: z.number().int().positive(),
  }),
});
