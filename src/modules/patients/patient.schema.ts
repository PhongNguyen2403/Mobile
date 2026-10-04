import { z } from 'zod';

export const createPatientSchema = z.object({
  body: z.object({
    fullName: z.string().min(2, 'Họ và tên ít nhất 2 ký tự').max(150),
    phone: z.string().min(9).max(20).optional(),
    dateOfBirth: z.string().optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    address: z.string().optional(),
    province: z.string().optional(),
    healthInsuranceNo: z.string().optional(),
    emergencyContactName: z.string().optional(),
    emergencyContactPhone: z.string().optional(),
    note: z.string().optional(),
    assignedCskhId: z.string().uuid().optional(),
  }),
});

export const updatePatientSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID bệnh nhân không hợp lệ'),
  }),
  body: z.object({
    fullName: z.string().min(2).max(150).optional(),
    phone: z.string().min(9).max(20).optional(),
    dateOfBirth: z.string().optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    address: z.string().optional(),
    province: z.string().optional(),
    healthInsuranceNo: z.string().optional(),
    emergencyContactName: z.string().optional(),
    emergencyContactPhone: z.string().optional(),
    note: z.string().optional(),
    assignedCskhId: z.string().uuid().optional(),
  }),
});

export const updatePatientMeSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).max(150).optional(),
    phone: z.string().min(9).max(20).optional(),
    dateOfBirth: z.string().optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    address: z.string().optional(),
    province: z.string().optional(),
    healthInsuranceNo: z.string().optional(),
    emergencyContactName: z.string().optional(),
    emergencyContactPhone: z.string().optional(),
    note: z.string().optional(),
  }),
});

export const createMedicalHistorySchema = z.object({
  params: z.object({
    id: z.string().uuid('ID bệnh nhân không hợp lệ'),
  }),
  body: z.object({
    conditionName: z.string().min(2, 'Tên bệnh/tiền sử tối thiểu 2 ký tự').max(200),
    note: z.string().optional(),
  }),
});

export const listPatientsQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    q: z.string().optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    assignedCskhId: z.string().optional(),
  }),
});
