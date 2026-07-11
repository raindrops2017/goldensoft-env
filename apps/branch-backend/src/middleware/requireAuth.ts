import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../env';
import { JwtPayload, JwtPayloadSchema } from '@goldensoft/core-schemas';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

    // Verify user still exists in the local database
    const userExists = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.id, parsed.data.userId))
      .limit(1);

    if (userExists.length === 0) {
      res.status(401).json({ success: false, error: 'Unauthorized: Session user no longer exists' });
      return;
    }

    req.user = parsed.data;
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Unauthorized: Invalid or expired token' });
    return;
  }
};
