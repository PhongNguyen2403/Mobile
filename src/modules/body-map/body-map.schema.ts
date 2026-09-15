import { z } from 'zod';

export const listBodyPartsQuerySchema = z.object({
  query: z.object({
    viewSide: z.enum(['front', 'back']).optional(),
    region: z.string().optional(),
    parentId: z.string().optional(),
  }),
});

export const createSymptomReportSchema = z.object({
  body: z.object({
    patientId: z.string().uuid('patientId không hợp lệ'),
    source: z.string().default('app'),
  }),
});

export const addSymptomReportItemSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID phiên khai báo không hợp lệ'),
  }),
  body: z.object({
    bodyPartId: z.number().int().positive('bodyPartId không hợp lệ'),
    symptomId: z.number().int().positive('symptomId không hợp lệ').optional(),
    severity: z.enum(['mild', 'moderate', 'severe']).default('mild'),
    note: z.string().optional(),
  }),
});

export const convertToAppointmentSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID phiên khai báo không hợp lệ'),
  }),
  body: z.object({
    scheduledAt: z.string().datetime({ message: 'Thời gian scheduledAt phải đúng chuẩn ISO' }),
    visitAddress: z.string().min(5, 'Địa chỉ khám tại nhà tối thiểu 5 ký tự'),
    note: z.string().optional(),
  }),
});
