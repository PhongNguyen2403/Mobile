import { z } from 'zod';

export const createAppointmentSchema = z.object({
  body: z.object({
    patientId: z.string().uuid('patientId không hợp lệ').optional(),
    scheduledAt: z.string().datetime({ message: 'Thời gian khám phải theo chuẩn ISO' }),
    visitAddress: z.string().min(5, 'Địa chỉ phòng khám tối thiểu 5 ký tự').optional(),
    type: z.enum(['first_visit', 'follow_up', 'emergency']).default('first_visit'),
    note: z.string().optional(),
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
    scheduledAt: z.string().datetime({ message: 'Thời gian khám phải theo chuẩn ISO' }).optional(),
  }),
});

const rescheduleOptionSchema = z.object({
  staffId: z.string().uuid('ID bác sĩ không hợp lệ'),
  scheduledAt: z.string().datetime({ message: 'Thời gian khám phải theo chuẩn ISO' }),
});

export const createRescheduleProposalSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    reason: z.string().min(5, 'Lý do đổi lịch tối thiểu 5 ký tự'),
    options: z.array(rescheduleOptionSchema)
      .min(2, 'Cần ít nhất 2 phương án đổi lịch')
      .max(10, 'Tối đa 10 phương án đổi lịch')
      .superRefine((options, context) => {
        const seenOptions = new Set<string>();
        options.forEach((option, index) => {
          const optionKey = `${option.staffId}:${option.scheduledAt}`;
          if (seenOptions.has(optionKey)) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              path: [index],
              message: 'Không được lặp lại cùng bác sĩ và thời gian',
            });
          }
          seenOptions.add(optionKey);
          if (new Date(option.scheduledAt).getTime() <= Date.now()) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              path: [index, 'scheduledAt'],
              message: 'Thời gian đề xuất phải ở tương lai',
            });
          }
        });
      }),
  }),
});

export const respondToRescheduleProposalSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
    proposalId: z.string().uuid(),
  }),
  body: z.discriminatedUnion('decision', [
    z.object({
      decision: z.literal('accept'),
      optionId: z.string().uuid('Phương án được chọn không hợp lệ'),
    }),
    z.object({ decision: z.literal('reject') }),
  ]),
});

export const listAppointmentsQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    status: z.enum(['pending', 'confirmed', 'reschedule_pending', 'in_progress', 'completed', 'cancelled', 'no_show']).optional(),
    type: z.enum(['first_visit', 'follow_up', 'emergency']).optional(),
    staffId: z.string().optional(),
    patientId: z.string().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày YYYY-MM-DD').optional(),
  }),
});
