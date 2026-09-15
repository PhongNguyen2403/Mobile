import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { JwtUtil, TokenPayload } from '../../utils/jwt.util';
import { PasswordUtil } from '../../utils/password.util';
import { BadRequestError, UnauthorizedError, ConflictError } from '../../middlewares/error.middleware';
import { logger } from '../../config/logger';

// In-memory OTP storage with 5 minute expiration
interface OtpEntry {
  code: string;
  expiresAt: number;
}
const otpStore = new Map<string, OtpEntry>();

export class AuthService {
  /**
   * Đăng ký bệnh nhân mới qua số điện thoại
   */
  static async registerPatient(data: {
    phone: string;
    fullName: string;
    dateOfBirth?: string;
    gender?: 'male' | 'female' | 'other';
    address?: string;
    province?: string;
  }) {
    const existingPatient = await prisma.patients.findFirst({
      where: { phone: data.phone },
    });

    if (existingPatient) {
      throw new ConflictError('Số điện thoại này đã được đăng ký trong hệ thống');
    }

    const patient = await prisma.patients.create({
      data: {
        phone: data.phone,
        full_name: data.fullName,
        date_of_birth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        gender: data.gender || null,
        address: data.address || null,
        province: data.province || null,
      },
    });

    return patient;
  }

  /**
   * Gửi mã OTP (hỗ trợ SMS mock môi trường dev)
   */
  static async sendOtp(phone: string) {
    const code = env.OTP.MOCK_ENABLED ? env.OTP.MOCK_CODE : Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 phút

    otpStore.set(phone, { code, expiresAt });
    logger.info(`[OTP] Gửi OTP cho số điện thoại ${phone}: ${code}`);

    return {
      phone,
      expiresInSeconds: 300,
      mockOtp: env.OTP.MOCK_ENABLED ? code : undefined,
    };
  }

  /**
   * Xác thực mã OTP và cấp phát JWT Token cho Bệnh nhân
   */
  static async verifyOtp(phone: string, otp: string) {
    const entry = otpStore.get(phone);

    const isValid =
      (env.OTP.MOCK_ENABLED && otp === env.OTP.MOCK_CODE) ||
      (entry && entry.code === otp && entry.expiresAt > Date.now());

    if (!isValid) {
      throw new BadRequestError('Mã OTP không chính xác hoặc đã hết hạn');
    }

    otpStore.delete(phone);

    // Tìm hồ sơ bệnh nhân theo số điện thoại
    let patient = await prisma.patients.findFirst({
      where: { phone },
    });

    // Nếu bệnh nhân chưa có, tự động tạo hồ sơ cơ bản
    if (!patient) {
      patient = await prisma.patients.create({
        data: {
          phone,
          full_name: `Bệnh nhân ${phone.slice(-4)}`,
        },
      });
    }

    const payload: TokenPayload = {
      patientId: patient.id,
      role: 'patient',
      phone: patient.phone || undefined,
    };

    const tokens = JwtUtil.generateTokens(payload);

    return {
      patient,
      ...tokens,
    };
  }

  /**
   * Đăng nhập cho nhân viên nội bộ (Admin, Bác sĩ, Điều dưỡng, CSKH)
   */
  static async loginStaff(email: string, password: string) {
    const user = await prisma.users.findUnique({
      where: { email },
      include: { roles: true },
    });

    if (!user) {
      throw new UnauthorizedError('Email hoặc mật khẩu không chính xác');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedError(`Tài khoản đang ở trạng thái: ${user.status}`);
    }

    const isMatch = await PasswordUtil.compare(password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedError('Email hoặc mật khẩu không chính xác');
    }

    const roleCode = (user.roles.code.toLowerCase()) as any;

    const payload: TokenPayload = {
      userId: user.id,
      role: roleCode,
      email: user.email || undefined,
      phone: user.phone || undefined,
    };

    const tokens = JwtUtil.generateTokens(payload);

    return {
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.roles,
        avatarUrl: user.avatar_url,
      },
      ...tokens,
    };
  }

  /**
   * Cấp mới Access Token từ Refresh Token
   */
  static async refreshToken(refreshToken: string) {
    try {
      const payload = JwtUtil.verifyRefreshToken(refreshToken);

      const newTokens = JwtUtil.generateTokens({
        userId: payload.userId,
        patientId: payload.patientId,
        role: payload.role,
        email: payload.email,
        phone: payload.phone,
      });

      return newTokens;
    } catch {
      throw new UnauthorizedError('Refresh token không hợp lệ hoặc đã hết hạn');
    }
  }
}
