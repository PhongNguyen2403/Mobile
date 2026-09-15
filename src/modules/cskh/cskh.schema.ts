import { z } from 'zod';

export const createAssignmentSchema = z.object({
  body: z.object({
    patientId: z.string().uuid('patientId không hợp lệ'),
    cskhStaffId: z.string().uuid('cskhStaffId không hợp lệ'),
  }),
});

export const createCareLogSchema = z.object({
  body: z.object({
    patientId: z.string().uuid('patientId không hợp lệ'),
    interactionType: z.enum(['call', 'message', 'zalo', 'email', 'home_visit', 'other']),
    content: z.string().min(2, 'Nội dung chăm sóc tối thiểu 2 ký tự'),
    nextAction: z.string().optional(),
    nextActionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày YYYY-MM-DD').optional(),
  }),
});

export const listAssignmentsQuerySchema = z.object({
  query: z.object({
    patientId: z.string().optional(),
    staffId: z.string().optional(),
    isActive: z.enum(['true', 'false']).optional(),
  }),
});

export const listCareLogsQuerySchema = z.object({
  query: z.object({
    patientId: z.string().optional(),
    staffId: z.string().optional(),
    interactionType: z.enum(['call', 'message', 'zalo', 'email', 'home_visit', 'other']).optional(),
  }),
});
