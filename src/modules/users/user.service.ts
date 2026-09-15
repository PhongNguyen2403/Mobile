import { prisma } from '../../config/database';
import { PasswordUtil } from '../../utils/password.util';
import { NotFoundError, ConflictError } from '../../middlewares/error.middleware';
import { PaginationUtil, PaginationParams } from '../../utils/pagination.util';

export class UserService {
  static async createUser(data: {
    roleId: number;
    fullName: string;
    email?: string;
    phone?: string;
    password: string;
    avatarUrl?: string;
    status?: 'active' | 'inactive' | 'locked';
  }) {
    if (data.email) {
      const existingEmail = await prisma.users.findUnique({
        where: { email: data.email },
      });
      if (existingEmail) throw new ConflictError('Email này đã được sử dụng');
    }

    if (data.phone) {
      const existingPhone = await prisma.users.findUnique({
        where: { phone: data.phone },
      });
      if (existingPhone) throw new ConflictError('Số điện thoại này đã được sử dụng');
    }

    const hashedPassword = await PasswordUtil.hash(data.password);

    const user = await prisma.users.create({
      data: {
        role_id: data.roleId,
        full_name: data.fullName,
        email: data.email || null,
        phone: data.phone || null,
        password_hash: hashedPassword,
        avatar_url: data.avatarUrl || null,
        status: data.status || 'active',
      },
      include: {
        roles: true,
      },
    });

    const { password_hash, ...safeUser } = user;
    return safeUser;
  }

  static async getUsers(
    params: PaginationParams & {
      roleId?: number;
      roleCode?: string;
      status?: 'active' | 'inactive' | 'locked';
      q?: string;
    }
  ) {
    const { page, limit, skip, take } = PaginationUtil.getPagination(params);

    const where: any = {};
    if (params.roleId) where.role_id = Number(params.roleId);
    if (params.status) where.status = params.status;
    if (params.roleCode) {
      where.roles = { code: params.roleCode };
    }
    if (params.q) {
      where.OR = [
        { full_name: { contains: params.q, mode: 'insensitive' } },
        { email: { contains: params.q, mode: 'insensitive' } },
        { phone: { contains: params.q, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.users.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: 'desc' },
        include: { roles: true },
      }),
      prisma.users.count({ where }),
    ]);

    const safeUsers = users.map(({ password_hash, ...u }) => u);
    return PaginationUtil.formatResult(safeUsers, total, page, limit);
  }

  static async getUserById(id: string) {
    const user = await prisma.users.findUnique({
      where: { id },
      include: { roles: true },
    });

    if (!user) throw new NotFoundError('Không tìm thấy người dùng');

    const { password_hash, ...safeUser } = user;
    return safeUser;
  }

  static async updateUser(
    id: string,
    data: {
      roleId?: number;
      fullName?: string;
      phone?: string;
      password?: string;
      avatarUrl?: string;
      status?: 'active' | 'inactive' | 'locked';
    }
  ) {
    const user = await prisma.users.findUnique({ where: { id } });
    if (!user) throw new NotFoundError('Không tìm thấy người dùng');

    const updateData: any = {};
    if (data.roleId) updateData.role_id = data.roleId;
    if (data.fullName) updateData.full_name = data.fullName;
    if (data.phone) updateData.phone = data.phone;
    if (data.avatarUrl) updateData.avatar_url = data.avatarUrl;
    if (data.status) updateData.status = data.status;
    if (data.password) {
      updateData.password_hash = await PasswordUtil.hash(data.password);
    }
    updateData.updated_at = new Date();

    const updatedUser = await prisma.users.update({
      where: { id },
      data: updateData,
      include: { roles: true },
    });

    const { password_hash, ...safeUser } = updatedUser;
    return safeUser;
  }
}
