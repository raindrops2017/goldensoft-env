import { Request, Response } from 'express';
import { PinLoginSchema } from '@goldensoft/core-schemas';
import { authService } from './auth.service';

export class AuthController {
  async loginPin(req: Request, res: Response) {
    try {
      const parsed = PinLoginSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: 'Invalid input', data: parsed.error.format() });
        return;
      }

      const { pin } = parsed.data;
      const { token, refreshToken, user } = await authService.loginWithPin(pin);

      const days = parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN || '7');
      res.cookie('refreshToken', refreshToken, { 
        httpOnly: true, 
        sameSite: 'lax',
        maxAge: days * 24 * 60 * 60 * 1000
      });
      res.json({ success: true, data: { accessToken: token, user } });
    } catch (error: any) {
      if (error.message === 'Invalid PIN') {
        res.status(401).json({ success: false, error: 'Invalid PIN' });
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
        maxAge: days * 24 * 60 * 60 * 1000
      });
      res.json({ success: true, data: { accessToken: token, user } });
    } catch (error: any) {
      if (error.message === 'Invalid refresh token' || error.message === 'Refresh token expired' || error.message === 'User not found or inactive') {
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
}

export const authController = new AuthController();
