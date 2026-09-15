import dotenv from 'dotenv';

dotenv.config();

export const env = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT: {
    ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'default_jwt_access_secret_for_dev_32chars',
    REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'default_jwt_refresh_secret_for_dev_32chars',
    ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  OTP: {
    MOCK_ENABLED: process.env.OTP_MOCK_ENABLED !== 'false',
    MOCK_CODE: process.env.OTP_MOCK_CODE || '123456',
  },
  CRON: {
    FOLLOW_UP_SCHEDULE: process.env.CRON_FOLLOW_UP_SCHEDULE || '0 7 * * *',
    FOLLOW_UP_REMINDER_DAYS_AHEAD: parseInt(process.env.FOLLOW_UP_REMINDER_DAYS_AHEAD || '3', 10),
  },
};
