import { Request, Response } from 'express';
import { UserPinLoginSchema } from '@goldensoft/core-schemas';
import { authService } from './auth.service';

export class AuthController {
  async loginPin(req: Request, res: Response) {
    try {
      const parsed = UserPinLoginSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: 'Invalid input', data: parsed.error.format() });
        return;
      }

      const { userId, pin } = parsed.data;
      const { token, refreshToken, user } = await authService.loginWithPin(userId, pin);

      const days = parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN || '7');
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: days * 24 * 60 * 60 * 1000,
      });
      res.json({ success: true, data: { accessToken: token, user } });
    } catch (error: any) {
      if (error.message === 'Invalid PIN' || error.message === 'Invalid credentials') {
        res.status(401).json({ success: false, error: 'Invalid PIN' });
        return;
      }
      if (error.message?.startsWith('Account locked') || error.message?.startsWith('Too many failed')) {
        res.status(429).json({ success: false, error: error.message });
        return;
      }
      console.error('Login error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  async refresh(req: Request, res: Response) {
    try {
      const refreshTokenStr = req.cookies.refreshToken;
      if (!refreshTokenStr) {
        res.status(401).json({ success: false, error: 'No refresh token provided' });
        return;
      }

      const { token, refreshToken, user } = await authService.refresh(refreshTokenStr);

      const days = parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN || '7');
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: days * 24 * 60 * 60 * 1000,
      });
      res.json({ success: true, data: { accessToken: token, user } });
    } catch (error: any) {
      if (
        error.message === 'Invalid refresh token' ||
        error.message === 'Refresh token expired' ||
        error.message === 'User not found or inactive'
      ) {
        res.status(401).json({ success: false, error: error.message });
        return;
      }
      console.error('Refresh error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  async logout(req: Request, res: Response) {
    try {
      const refreshTokenStr = req.cookies.refreshToken;
      if (refreshTokenStr) {
        await authService.logout(refreshTokenStr);
      }
      res.clearCookie('refreshToken');
      res.json({ success: true });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * GET /auth/users — Returns all active users for the login page employee grid.
   * Public route (no auth required) — the list reveals only id + username.
   */
  async getActiveUsers(req: Request, res: Response) {
    try {
      const activeUsers = authService.getActiveUsers();
      res.json({ success: true, data: activeUsers });
    } catch (error: any) {
      console.error('Get active users error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /auth/waiters — Returns only waiter-role users (kept for existing consumers).
   */
  async getWaiters(req: Request, res: Response) {
    try {
      const { db } = await import('../../db');
      const { users, roles } = await import('../../db/schema');
      const { eq, and } = await import('drizzle-orm');
      const waitersList = db.select({
        id: users.id,
        username: users.username,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(and(eq(users.isActive, true), eq(roles.isWaiter, true)))
      .all();

      res.json({ success: true, data: waitersList });
    } catch (error: any) {
      console.error('Get waiters error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export const authController = new AuthController();
