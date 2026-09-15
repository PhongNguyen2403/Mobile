import { Router } from 'express';
import { UserController } from './user.controller';
import { authGuard } from '../../middlewares/auth.middleware';
import { roleGuard } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  createUserSchema,
  updateUserSchema,
  listUsersQuerySchema,
} from './user.schema';

const router = Router();

// Chỉ Admin hoặc các vai trò quản lý được phép quản lý nhân viên
router.use(authGuard);

router.post(
  '/',
  roleGuard('admin'),
  validate(createUserSchema),
  UserController.createUser
);

router.get(
  '/',
  roleGuard('admin', 'cskh', 'doctor', 'nurse'),
  validate(listUsersQuerySchema),
  UserController.getUsers
);

router.get(
  '/:id',
  roleGuard('admin', 'cskh', 'doctor', 'nurse'),
  UserController.getUserById
);

router.patch(
  '/:id',
  roleGuard('admin'),
  validate(updateUserSchema),
  UserController.updateUser
);

export default router;
