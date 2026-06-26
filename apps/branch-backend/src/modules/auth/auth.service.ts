import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../../db';
import { users, rolePermissions, permissions, refreshTokens, roles } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { env } from '../../env';
import crypto from 'crypto';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export class AuthService {
  /**
   * New O(1) login: user selects themselves first, then enters their PIN.
   * Includes brute-force protection via failedPinAttempts / lockedUntil.
   */
  async loginWithPin(userId: string, pin: string) {
    const user = db.select().from(users).where(
      and(eq(users.id, userId), eq(users.isActive, true))
    ).get();

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check if account is currently locked
    if (user.lockedUntil) {
      const lockedUntilMs = new Date(user.lockedUntil).getTime();
      if (Date.now() < lockedUntilMs) {
        const remainingSeconds = Math.ceil((lockedUntilMs - Date.now()) / 1000);
        throw new Error(`Account locked. Try again in ${remainingSeconds} seconds.`);
      }
      // Lock has expired — clear it automatically
      db.update(users)
        .set({ lockedUntil: null, failedPinAttempts: 0 })
        .where(eq(users.id, userId))
        .run();
    }

    const isPinValid = bcrypt.compareSync(pin, user.pin);

    if (!isPinValid) {
      const newAttempts = (user.failedPinAttempts ?? 0) + 1;

      if (newAttempts >= MAX_FAILED_ATTEMPTS) {
        const lockUntil = new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString();
        db.update(users)
          .set({ failedPinAttempts: 0, lockedUntil: lockUntil })
          .where(eq(users.id, userId))
          .run();
        throw new Error(`Too many failed attempts. Account locked for 5 minutes.`);
      }

      db.update(users)
        .set({ failedPinAttempts: newAttempts })
        .where(eq(users.id, userId))
        .run();

      throw new Error('Invalid PIN');
    }

    // Success — reset the failure counter
    db.update(users)
      .set({ failedPinAttempts: 0, lockedUntil: null })
      .where(eq(users.id, userId))
      .run();

    return this.generateTokensForUser(user);
  }

  /**
   * Returns all active users for the employee selection grid on the login page.
   */
  getActiveUsers() {
    return db.select({
      id: users.id,
      username: users.username,
    })
    .from(users)
    .where(eq(users.isActive, true))
    .all();
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
    let isWaiter = false;

    if (user.roleId) {
      const perms = db.select({ name: permissions.name })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(eq(rolePermissions.roleId, user.roleId))
        .all();

      userPermissions = perms.map(p => p.name);

      const r = db.select({ isWaiter: roles.isWaiter })
        .from(roles)
        .where(eq(roles.id, user.roleId))
        .get() as any;

      if (r) {
        isWaiter = !!r.isWaiter;
      }
    }

    const payload = {
      userId: user.id,
      roleId: user.roleId,
      permissions: userPermissions,
      isWaiter,
    };

    const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as any });
    const refreshToken = crypto.randomBytes(40).toString('hex');

    const days = parseInt(env.REFRESH_TOKEN_EXPIRES_IN) || 7;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    db.insert(refreshTokens).values({
      id: crypto.randomUUID(),
      token: refreshToken,
      userId: user.id,
      expiresAt,
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
        isWaiter,
      },
    };
  }
}

export const authService = new AuthService();
