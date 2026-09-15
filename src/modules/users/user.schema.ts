import { z } from 'zod';

export const createUserSchema = z.object({
  body: z.object({
    roleId: z.number().int().positive('roleId phải là số nguyên dương'),
    fullName: z.string().min(2, 'Họ và tên tối thiểu 2 ký tự').max(150),
    email: z.string().email('Email không đúng định dạng').optional(),
    phone: z.string().min(9, 'Số điện thoại không hợp lệ').max(20).optional(),
    password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
    avatarUrl: z.string().url().optional(),
    status: z.enum(['active', 'inactive', 'locked']).default('active'),
  }),
});

export const updateUserSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID người dùng không hợp lệ'),
  }),
  body: z.object({
    roleId: z.number().int().positive().optional(),
    fullName: z.string().min(2).max(150).optional(),
    phone: z.string().min(9).max(20).optional(),
    password: z.string().min(6).optional(),
    avatarUrl: z.string().url().optional(),
    status: z.enum(['active', 'inactive', 'locked']).optional(),
  }),
});

export const listUsersQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    roleId: z.string().optional(),
    roleCode: z.string().optional(),
    status: z.enum(['active', 'inactive', 'locked']).optional(),
    q: z.string().optional(),
  }),
});
