import { BadRequestError } from '../middlewares/error.middleware';

export const APPOINTMENT_TIME_ZONE = 'Asia/Ho_Chi_Minh';
export const APPOINTMENT_OPEN_MINUTES = 7 * 60;
export const APPOINTMENT_CLOSE_MINUTES = 21 * 60;
export const APPOINTMENT_DURATION_MINUTES = 45;

export const assertAppointmentInFuture = (date: Date, now = new Date()) => {
  if (date <= now) {
    throw new BadRequestError('Không thể đặt lịch hẹn trong quá khứ');
  }
};

export const getAppointmentLocalMinutes = (date: Date) => {
  const hour = (date.getUTCHours() + 7) % 24;
  return (
    hour * 60 +
    date.getUTCMinutes() +
    date.getUTCSeconds() / 60 +
    date.getUTCMilliseconds() / 60_000
  );
};

export const assertAppointmentDuringBusinessHours = (date: Date) => {
  const startMinutes = getAppointmentLocalMinutes(date);
  if (
    startMinutes < APPOINTMENT_OPEN_MINUTES ||
    startMinutes + APPOINTMENT_DURATION_MINUTES > APPOINTMENT_CLOSE_MINUTES
  ) {
    throw new BadRequestError(
      'Giờ bắt đầu khám phải trong khoảng 07:00–20:15 (giờ Việt Nam) để ca 45 phút kết thúc trước 21:00'
    );
  }
};

export const assertAppointmentCanStart = (scheduledAt: Date, now = new Date()) => {
  if (scheduledAt > now) {
    throw new BadRequestError('Chưa đến giờ hẹn, bác sĩ chưa thể bắt đầu khám');
  }
};
