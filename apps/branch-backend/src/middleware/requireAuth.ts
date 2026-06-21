import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../env';
import { JwtPayload, JwtPayloadSchema } from '@goldensoft/core-schemas';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    const parsed = JwtPayloadSchema.safeParse(decoded);
    
    if (!parsed.success) {
      res.status(401).json({ success: false, error: 'Unauthorized: Invalid token payload' });
      return;
    }

    req.user = parsed.data;
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Unauthorized: Invalid or expired token' });
    return;
  }
};
