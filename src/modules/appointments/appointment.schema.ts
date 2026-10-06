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

export const requestAppointmentChangeSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID lịch hẹn không đúng định dạng UUID'),
  }),
  body: z.discriminatedUnion('action', [
    z.object({
      action: z.literal('reschedule'),
      requestedScheduledAt: z.string().datetime({
        message: 'Thời gian khám mới phải theo chuẩn ISO',
      }),
      reason: z.string().trim().max(500, 'Lý do tối đa 500 ký tự').optional(),
    }),
    z.object({
      action: z.literal('cancel'),
      reason: z.string().trim().max(500, 'Lý do tối đa 500 ký tự').optional(),
    }),
  ]),
});

export const requestDoctorAppointmentChangeSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID lịch hẹn không đúng định dạng UUID'),
  }),
  body: z.object({
    action: z.enum(['reschedule', 'cancel']),
    reason: z.string().trim().min(1, 'Vui lòng nhập lý do').max(500, 'Lý do tối đa 500 ký tự'),
  }),
});

export const requestDoctorDayOffSchema = z.object({
  body: z.object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày nghỉ phải theo định dạng YYYY-MM-DD')
      .refine((value) => {
        const [year, month, day] = value.split('-').map(Number);
        return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) === value;
      }, 'Ngày nghỉ không hợp lệ'),
    reason: z.string().trim().min(1, 'Vui lòng nhập lý do').max(500, 'Lý do tối đa 500 ký tự'),
  }),
});

export const listAppointmentChangeRequestsSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    status: z.enum(['pending', 'awaiting_patient', 'approved', 'rejected']).optional(),
    appointmentId: z.string().uuid('ID lịch hẹn không hợp lệ').optional(),
  }),
});

export const reviewAppointmentChangeRequestSchema = z.object({
  params: z.object({
    requestId: z.string().uuid('ID yêu cầu không hợp lệ'),
  }),
  body: z.object({
    decision: z.enum(['approved', 'rejected']),
    reviewNote: z.string().trim().max(500, 'Ghi chú xử lý tối đa 500 ký tự').optional(),
    assignedStaffId: z.string().uuid('ID bác sĩ mới không hợp lệ').optional(),
  }),
});

export const notifyChangeRequestPatientSchema = z.object({
  params: z.object({
    requestId: z.string().uuid('ID yêu cầu không hợp lệ'),
  }),
});

export const submitChangeRequestPatientChoiceSchema = z.object({
  params: z.object({
    requestId: z.string().uuid('ID yêu cầu không hợp lệ'),
  }),
  body: z.discriminatedUnion('choice', [
    z.object({
      choice: z.literal('reschedule'),
      requestedScheduledAt: z.string().datetime({
        message: 'Thời gian khám mới phải theo chuẩn ISO',
      }),
    }),
    z.object({
      choice: z.literal('change_doctor'),
    }),
  ]),
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
