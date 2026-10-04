import { z } from 'zod';

export const createAppointmentSchema = z.object({
  body: z.object({
    patientId: z.string().uuid('patientId không hợp lệ'),
    scheduledAt: z.string().datetime({ message: 'Thời gian khám phải theo chuẩn ISO' }),
    visitAddress: z.string().min(5, 'Địa chỉ khám tối thiểu 5 ký tự'),
    type: z.enum(['first_visit', 'follow_up', 'emergency']).default('first_visit'),
    assignedStaffId: z.string().uuid().optional(),
    note: z.string().optional(),
  }),
});

export const appointmentIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID lịch hẹn không đúng định dạng UUID'),
  }),
});

export const updateAppointmentStatusSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    status: z.enum(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']),
    note: z.string().optional(),
  }),
});

export const assignAppointmentStaffSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    staffId: z.string().uuid('ID nhân viên (bác sĩ/điều dưỡng) không hợp lệ'),
  }),
});

export const listAppointmentsQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    status: z.enum(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']).optional(),
    type: z.enum(['first_visit', 'follow_up', 'emergency']).optional(),
    staffId: z.string().optional(),
    patientId: z.string().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày YYYY-MM-DD').optional(),
  }),
});
