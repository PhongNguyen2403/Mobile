import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validate } from '../../middlewares/validate.middleware';
import {
  registerSchema,
  sendOtpSchema,
  verifyOtpSchema,
  loginSchema,
  refreshTokenSchema,
} from './auth.schema';
import { authGuard } from '../../middlewares/auth.middleware';

const router = Router();

router.post('/register', validate(registerSchema), AuthController.register);
router.post('/otp/send', validate(sendOtpSchema), AuthController.sendOtp);
router.post('/otp/verify', validate(verifyOtpSchema), AuthController.verifyOtp);
router.post('/login', validate(loginSchema), AuthController.login);
router.post('/refresh-token', validate(refreshTokenSchema), AuthController.refreshToken);
router.post('/logout', authGuard, AuthController.logout);

export default router;
