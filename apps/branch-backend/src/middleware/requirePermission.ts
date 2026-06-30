import { Request, Response, NextFunction } from 'express';
import type { Permission } from '@goldensoft/core-schemas';
import { db } from '../db';
import { users, rolePermissions, permissions } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

declare global {
  namespace Express {
    interface Request {
      supervisorUser?: {
        userId: string;
        username: string;
        permissions: string[];
      };
    }
  }
}

export const requirePermission = (requiredPermissions: (Permission | string)[], requireAll = false) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Ensure requireAuth has already run and populated req.user
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized: User not authenticated' });
      return;
    }

    let userPermissions = req.user.permissions;

    // Check if supervisor override is requested
    if (req.body && req.body.supervisorPin && req.body.supervisorId) {
      const pin = req.body.supervisorPin;
      const supervisorId = req.body.supervisorId;

      try {
        // Query specifically for the active user matching supervisorId
        const supervisor = db.select()
          .from(users)
          .where(and(eq(users.id, supervisorId), eq(users.isActive, true)))
          .get() as any;

        if (!supervisor) {
          res.status(403).json({ success: false, error: 'Supervisor user not found or inactive' });
          return;
        }

        // Compare the PIN against that specific user's hashed PIN
        const isPinValid = bcrypt.compareSync(pin, supervisor.pin);
        if (!isPinValid) {
          res.status(403).json({ success: false, error: 'Invalid supervisor PIN' });
          return;
        }

        // Retrieve supervisor permissions
        let supervisorPermissions: string[] = [];
        if (supervisor.roleId) {
          const perms = db.select({ name: permissions.name })
            .from(rolePermissions)
            .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
            .where(eq(rolePermissions.roleId, supervisor.roleId))
            .all();
          supervisorPermissions = perms.map((p) => p.name);
        }

        // Verify supervisor has the required permission
        let isSupervisorAllowed = false;
        if (requireAll) {
          isSupervisorAllowed = requiredPermissions.every((p) => supervisorPermissions.includes(p));
        } else {
          isSupervisorAllowed = requiredPermissions.some((p) => supervisorPermissions.includes(p));
        }

        if (!isSupervisorAllowed) {
          res.status(403).json({ success: false, error: 'Forbidden: Supervisor lacks required permissions' });
          return;
        }

        // Attach supervisorUser to request so controllers can attribute actions to them
        req.supervisorUser = {
          userId: supervisor.id,
          username: supervisor.username,
          permissions: supervisorPermissions,
        };

        next();
        return;
      } catch (err: any) {
        res.status(500).json({ success: false, error: `Supervisor override error: ${err.message}` });
        return;
      }
    }

    let isAllowed = false;

    if (requireAll) {
      isAllowed = requiredPermissions.every((p) => userPermissions.includes(p));
    } else {
      isAllowed = requiredPermissions.some((p) => userPermissions.includes(p));
    }

    if (!isAllowed) {
      res.status(403).json({ success: false, error: `Forbidden: Insufficient permissions` });
      return;
    }

    next();
  };
};
