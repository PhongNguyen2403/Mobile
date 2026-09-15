import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    phone: z.string().min(9, 'Số điện thoại phải từ 9-15 ký tự').max(15),
    fullName: z.string().min(2, 'Họ và tên phải có ít nhất 2 ký tự').max(150),
    dateOfBirth: z.string().datetime().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
    gender: z.enum(['male', 'female', 'other']).optional(),
    address: z.string().optional(),
    province: z.string().optional(),
  }),
});

export const sendOtpSchema = z.object({
  body: z.object({
    phone: z.string().min(9, 'Số điện thoại không hợp lệ').max(15),
  }),
});

export const verifyOtpSchema = z.object({
  body: z.object({
    phone: z.string().min(9, 'Số điện thoại không hợp lệ').max(15),
    otp: z.string().min(4, 'Mã OTP không hợp lệ').max(8),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Email không đúng định dạng'),
    password: z.string().min(6, 'Mật khẩu phải từ 6 ký tự trở lên'),
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Vui lòng cung cấp refreshToken'),
  }),
});
