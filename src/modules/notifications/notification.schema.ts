import { z } from 'zod';

export const listNotificationsQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    status: z.enum(['pending', 'sent', 'failed', 'read']).optional(),
    type: z.enum(['follow_up_reminder', 'appointment_confirmation', 'cskh_care', 'system', 'medicine_reminder']).optional(),
    isRead: z.enum(['true', 'false']).optional(),
  }),
});
