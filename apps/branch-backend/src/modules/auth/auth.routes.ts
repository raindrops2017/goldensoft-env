import { Router } from 'express';
import { authController } from './auth.controller';

const router = Router();

router.post('/login', authController.loginPin);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

export default router;
