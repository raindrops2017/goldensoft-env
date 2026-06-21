import { Request, Response, NextFunction } from 'express';
import type { Permission } from '@goldensoft/core-schemas';

export const requirePermission = (requiredPermissions: (Permission | string)[], requireAll = false) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Ensure requireAuth has already run and populated req.user
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized: User not authenticated' });
      return;
    }

    const userPermissions = req.user.permissions;

    let isAllowed = false;

    if (requireAll) {
      isAllowed = requiredPermissions.every((p) => userPermissions.includes(p));
    } else {
      isAllowed = requiredPermissions.some((p) => userPermissions.includes(p));
    }

    if (!isAllowed) {
      res.status(403).json({ success: false, error: 'Forbidden: Insufficient permissions' });
      return;
    }

    next();
  };
};
