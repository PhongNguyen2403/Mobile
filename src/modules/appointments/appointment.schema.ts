import { z } from 'zod';

export const createAppointmentSchema = z.object({
  body: z.object({
    patientId: z.string().uuid('patientId không hợp lệ'),
    scheduledAt: z.string().datetime({ message: 'Thời gian khám phải theo chuẩn ISO' }),
    visitAddress: z.string().min(5, 'Địa chỉ tối thiểu 5 ký tự').optional(),
    clinicRoom: z.string().optional(),
    reportId: z.string().uuid('ID báo cáo triệu chứng không hợp lệ').optional(),
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
    status: z.enum([
      'pending',
      'confirmed',
      'checked_in',
      'in_progress',
      'completed',
      'cancelled',
      'no_show',
      'rescheduled',
    ]),
    note: z.string().optional(),
    clinicRoom: z.string().optional(),
  }),
});

export const assignAppointmentStaffSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    staffId: z.string().uuid('ID nhân viên (bác sĩ/điều dưỡng) không hợp lệ'),
    clinicRoom: z.string().optional(),
  }),
});

export const getDoctorAvailabilitySchema = z.object({
  query: z.object({
    doctorId: z.string().uuid('ID bác sĩ không hợp lệ'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày YYYY-MM-DD'),
  }),
});

export const listAppointmentsQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    status: z
      .enum([
        'pending',
        'confirmed',
        'checked_in',
        'in_progress',
        'completed',
        'cancelled',
        'no_show',
        'rescheduled',
      ])
      .optional(),
    type: z.enum(['first_visit', 'follow_up', 'emergency']).optional(),
    staffId: z.string().optional(),
    patientId: z.string().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày YYYY-MM-DD').optional(),
  }),
});
