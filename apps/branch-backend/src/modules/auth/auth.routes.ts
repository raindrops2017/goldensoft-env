import { Router } from 'express';
import { authController } from './auth.controller';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();

// Public routes
router.get('/users', authController.getActiveUsers);    // Employee grid for login page
router.post('/login', authController.loginPin);          // 2-step: { userId, pin }
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

// Protected routes
router.get('/waiters', requireAuth, authController.getWaiters);

export default router;
