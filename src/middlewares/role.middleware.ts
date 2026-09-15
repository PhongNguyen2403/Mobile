import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from './error.middleware';

export type RoleType = 'admin' | 'doctor' | 'nurse' | 'cskh' | 'patient';

export const roleGuard = (...allowedRoles: RoleType[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError('Người dùng chưa được xác thực');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError(
        `Vai trò '${req.user.role}' không có quyền truy cập chức năng này`
      );
    }

    return next();
  };
};

/**
 * Middleware đảm bảo Patient chỉ xem được dữ liệu của chính mình
 * Trừ khi người gọi là Admin, Bác sĩ, Điều dưỡng hoặc CSKH
 */
export const patientAccessGuard = (patientIdParamKey = 'patientId') => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError('Người dùng chưa được xác thực');
    }

    // Nhân viên nội bộ có quyền xem
    const internalRoles: RoleType[] = ['admin', 'doctor', 'nurse', 'cskh'];
    if (internalRoles.includes(req.user.role)) {
      return next();
    }

    // Nếu là bệnh nhân, kiểm tra ID truyền vào có khớp với ID trong token không
    const requestedPatientId =
      req.params[patientIdParamKey] ||
      req.params.id ||
      req.query[patientIdParamKey] ||
      req.body[patientIdParamKey];

    if (
      req.user.role === 'patient' &&
      String(req.user.patientId) !== String(requestedPatientId)
    ) {
      throw new ForbiddenError('Bệnh nhân chỉ có quyền truy cập dữ liệu của chính mình');
    }

    return next();
  };
};
