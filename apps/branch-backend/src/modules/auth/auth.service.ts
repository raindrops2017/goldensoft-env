import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../../db';
import { users, rolePermissions, permissions, refreshTokens } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { env } from '../../env';
import crypto from 'crypto';

export class AuthService {
  async loginWithPin(pin: string) {
    const activeUsers = db.select().from(users).where(eq(users.isActive, true)).all();

    let matchedUser = null;
    for (const user of activeUsers) {
      if (bcrypt.compareSync(pin, user.pin)) {
        matchedUser = user;
        break;
      }
    }

    if (!matchedUser) {
      throw new Error('Invalid PIN');
    }

    return this.generateTokensForUser(matchedUser);
  }

  async refresh(refreshTokenStr: string) {
    const tokenRecord = db.select()
      .from(refreshTokens)
      .where(eq(refreshTokens.token, refreshTokenStr))
      .get();

    if (!tokenRecord) {
      throw new Error('Invalid refresh token');
    }

    if (new Date(tokenRecord.expiresAt).getTime() < Date.now()) {
      db.delete(refreshTokens).where(eq(refreshTokens.id, tokenRecord.id)).run();
      throw new Error('Refresh token expired');
    }

    const matchedUser = db.select().from(users).where(eq(users.id, tokenRecord.userId)).get();
    if (!matchedUser || !matchedUser.isActive) {
      throw new Error('User not found or inactive');
    }

    // Delete the old refresh token to enforce single-use and prevent database bloat
    db.delete(refreshTokens).where(eq(refreshTokens.id, tokenRecord.id)).run();

    return this.generateTokensForUser(matchedUser);
  }

  async logout(refreshTokenStr: string) {
    db.delete(refreshTokens).where(eq(refreshTokens.token, refreshTokenStr)).run();
  }

  private generateTokensForUser(user: any) {
    let userPermissions: string[] = [];
    if (user.roleId) {
      const perms = db.select({ name: permissions.name })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(eq(rolePermissions.roleId, user.roleId))
        .all();
      
      userPermissions = perms.map(p => p.name);
    }

    const payload = {
      userId: user.id,
      roleId: user.roleId,
      permissions: userPermissions,
    };

    const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as any });
    const refreshToken = crypto.randomBytes(40).toString('hex');
    
    // Defaulting 7d for refresh token if REFRESH_TOKEN_EXPIRES_IN is 7d
    const days = parseInt(env.REFRESH_TOKEN_EXPIRES_IN) || 7;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    db.insert(refreshTokens).values({
      id: crypto.randomUUID(),
      token: refreshToken,
      userId: user.id,
      expiresAt: expiresAt,
    }).run();

    return {
      token,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        roleId: user.roleId,
        permissions: userPermissions,
      }
    };
  }
}

export const authService = new AuthService();
