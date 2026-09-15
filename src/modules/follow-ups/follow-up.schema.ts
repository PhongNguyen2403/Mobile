import { z } from 'zod';

export const createFollowUpSchema = z.object({
  body: z.object({
    patientId: z.string().uuid('patientId không hợp lệ'),
    examinationId: z.string().uuid().optional(),
    nextVisitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'nextVisitDate định dạng YYYY-MM-DD'),
    status: z.enum(['scheduled', 'reminded', 'confirmed', 'completed', 'missed', 'cancelled']).default('scheduled'),
    note: z.string().optional(),
  }),
});

export const updateFollowUpStatusSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    status: z.enum(['scheduled', 'reminded', 'confirmed', 'completed', 'missed', 'cancelled']),
    note: z.string().optional(),
  }),
});

export const listFollowUpsQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    status: z.enum(['scheduled', 'reminded', 'confirmed', 'completed', 'missed', 'cancelled']).optional(),
    patientId: z.string().optional(),
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }),
});
