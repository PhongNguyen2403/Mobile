import { z } from 'zod';

export const createExaminationSchema = z.object({
  body: z.object({
    appointmentId: z.string().uuid('appointmentId không hợp lệ'),
    patientId: z.string().uuid('patientId không hợp lệ'),
    reportId: z.string().uuid('reportId không hợp lệ').optional(),
    diagnosisId: z.number().int().positive().optional(),
    diagnosisNote: z.string().min(2, 'Ghi chú chẩn đoán tối thiểu 2 ký tự'),
    nextVisitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'nextVisitDate định dạng YYYY-MM-DD').optional(),
    symptoms: z
      .array(
        z.object({
          symptomId: z.number().int().positive(),
          severity: z.enum(['mild', 'moderate', 'severe']).default('mild'),
          note: z.string().optional(),
        })
      )
      .optional(),
  }),
});

export const createPrescriptionSchema = z.object({
  params: z.object({ id: z.string().uuid('ID phiếu khám không hợp lệ') }),
  body: z.object({
    note: z.string().optional(),
    items: z
      .array(
        z.object({
          productId: z.string().uuid('productId không hợp lệ'),
          quantity: z.number().int().positive('Số lượng phải lớn hơn 0'),
          dosage: z.string().min(1, 'Liều dùng không được để trống'),
          usageInstruction: z.string().optional(),
          durationDays: z.number().int().positive().optional(),
        })
      )
      .min(1, 'Đơn thuốc phải có ít nhất 1 sản phẩm'),
  }),
});
