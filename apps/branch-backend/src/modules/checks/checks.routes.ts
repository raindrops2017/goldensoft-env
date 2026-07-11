import { Router, Request, Response, NextFunction } from 'express';
import { checksController } from './checks.controller';
import { requireAuth } from '../../middleware/requireAuth';
import { requirePermission } from '../../middleware/requirePermission';
import { PERMISSIONS } from '@goldensoft/core-schemas';
import { db } from '../../db';
import { checks, users, rolePermissions, permissions } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const router = Router();

// Apply requireAuth to all check endpoints
router.use(requireAuth);

// Dynamic split check permission middleware
const requireSplitPermission = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const checkId = req.params.id as string;
    const checkRecs = await db.select({ printCount: checks.printCount }).from(checks).where(eq(checks.id, checkId)).limit(1);
    
    if (checkRecs.length === 0) {
      res.status(404).json({ success: false, error: 'Check not found' });
      return;
    }
    
    const isPrinted = (checkRecs[0].printCount || 0) > 0;
    const requiredPermission = isPrinted 
      ? PERMISSIONS.CHECK_PRINTED_SEPERATE 
      : PERMISSIONS.CHECK_SEPERATE;

    if (req.body && req.body.supervisorPin && req.body.supervisorId) {
      const pin = req.body.supervisorPin;
      const supervisorId = req.body.supervisorId;
      const supervisor = db.select()
        .from(users)
        .where(and(eq(users.id, supervisorId), eq(users.isActive, true)))
        .get() as any;

      if (!supervisor) {
        res.status(403).json({ success: false, error: 'Supervisor user not found or inactive' });
        return;
      }

      if (!bcrypt.compareSync(pin, supervisor.pin)) {
        res.status(403).json({ success: false, error: 'Invalid supervisor PIN' });
        return;
      }

      let supervisorPermissions: string[] = [];
      if (supervisor.roleId) {
        const perms = db.select({ name: permissions.name })
          .from(rolePermissions)
          .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
          .where(eq(rolePermissions.roleId, supervisor.roleId))
          .all();
        supervisorPermissions = perms.map((p) => p.name);
      }

      if (!supervisorPermissions.includes(requiredPermission)) {
        res.status(403).json({ success: false, error: `Forbidden: Supervisor lacks required permission ${requiredPermission}` });
        return;
      }

      req.supervisorUser = {
        userId: supervisor.id,
        username: supervisor.username,
        permissions: supervisorPermissions,
      };

      next();
      return;
    }
      
    if (!req.user || !req.user.permissions.includes(requiredPermission)) {
      res.status(403).json({ success: false, error: `Forbidden: Requires permission ${requiredPermission}` });
      return;
    }
    
    next();
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Dynamic print check permission middleware
const requirePrintPermission = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.body && req.body.supervisorPin) {
      next();
      return;
    }

    const checkId = req.params.id as string;
    const checkRecs = await db.select({ printCount: checks.printCount }).from(checks).where(eq(checks.id, checkId)).limit(1);
    
    if (checkRecs.length === 0) {
      res.status(404).json({ success: false, error: 'Check not found' });
      return;
    }
    
    const isPrinted = (checkRecs[0].printCount || 0) > 0;
    const requiredPermission = isPrinted 
      ? PERMISSIONS.CHECK_REPRINT 
      : PERMISSIONS.CHECK_PRINT;
      
    if (!req.user || !req.user.permissions.includes(requiredPermission)) {
      res.status(403).json({ success: false, error: `Forbidden: Requires permission ${requiredPermission}` });
      return;
    }
    
    next();
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Dynamic table transfer permission middleware
const requireTableTransferPermission = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.body && req.body.supervisorPin) {
      next();
      return;
    }
    
    const requiredPermission = PERMISSIONS.CHECK_TABLE_TRANSFER;
    if (!req.user || !req.user.permissions.includes(requiredPermission)) {
      res.status(403).json({ success: false, error: `Forbidden: Requires permission ${requiredPermission}` });
      return;
    }
    
    next();
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Dynamic waiter transfer permission middleware
const requireWaiterTransferPermission = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.body && req.body.supervisorPin) {
      next();
      return;
    }
    
    const requiredPermission = PERMISSIONS.CHECK_WAITER_TRANSFER;
    if (!req.user || !req.user.permissions.includes(requiredPermission)) {
      res.status(403).json({ success: false, error: `Forbidden: Requires permission ${requiredPermission}` });
      return;
    }
    
    next();
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Dynamic guest count update permission middleware
const requireGuestCountPermission = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const checkId = req.params.id as string;
    const newGuestCount = Number(req.body.guestCount);
    
    if (isNaN(newGuestCount) || newGuestCount < 1) {
      res.status(400).json({ success: false, error: 'Guest count must be at least 1' });
      return;
    }

    const checkRecs = await db.select({ guestCount: checks.guestCount }).from(checks).where(eq(checks.id, checkId)).limit(1);
    if (checkRecs.length === 0) {
      res.status(404).json({ success: false, error: 'Check not found' });
      return;
    }

    const currentGuestCount = checkRecs[0].guestCount || 1;
    
    // Decreasing guest count requires permission
    if (newGuestCount < currentGuestCount) {
      const requiredPermission = PERMISSIONS.CHECK_GUEST_DECREASE;

      if (req.body && req.body.supervisorPin && req.body.supervisorId) {
        const pin = req.body.supervisorPin;
        const supervisorId = req.body.supervisorId;
        const supervisor = db.select()
          .from(users)
          .where(and(eq(users.id, supervisorId), eq(users.isActive, true)))
          .get() as any;

        if (!supervisor) {
          res.status(403).json({ success: false, error: 'Supervisor user not found or inactive' });
          return;
        }

        if (!bcrypt.compareSync(pin, supervisor.pin)) {
          res.status(403).json({ success: false, error: 'Invalid supervisor PIN' });
          return;
        }

        let supervisorPermissions: string[] = [];
        if (supervisor.roleId) {
          const perms = db.select({ name: permissions.name })
            .from(rolePermissions)
            .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
            .where(eq(rolePermissions.roleId, supervisor.roleId))
            .all();
          supervisorPermissions = perms.map((p) => p.name);
        }

        if (!supervisorPermissions.includes(requiredPermission)) {
          res.status(403).json({ success: false, error: `Forbidden: Supervisor lacks required permission ${requiredPermission}` });
          return;
        }

        req.supervisorUser = {
          userId: supervisor.id,
          username: supervisor.username,
          permissions: supervisorPermissions,
        };

        next();
        return;
      }

      if (!req.user || !req.user.permissions.includes(requiredPermission)) {
        res.status(403).json({ success: false, error: `Forbidden: Requires permission ${requiredPermission}` });
        return;
      }
    }
    
    next();
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

router.get('/open', checksController.getOpenChecks);
router.get('/historical', requirePermission([PERMISSIONS.HISTORICAL_CHECKS_VIEW]), checksController.getHistoricalChecks);
router.get('/:id', checksController.getCheckById);

router.post('/', requirePermission([PERMISSIONS.CHECK_CREATE]), checksController.createCheck);
router.post('/:id/items', checksController.addCheckItem);
router.post('/:id/split', requireSplitPermission, checksController.splitCheck);
router.post('/:id/print', requirePrintPermission, checksController.printCheck);
router.post('/batch-close', requirePermission([PERMISSIONS.CHECK_CLOSE]), checksController.batchCloseChecks.bind(checksController));
router.post('/:id/close', requirePermission([PERMISSIONS.CHECK_CLOSE]), checksController.closeCheck.bind(checksController));


router.put('/:id/items/:itemId/void', requirePermission([PERMISSIONS.CHECK_ITEM_VOID, PERMISSIONS.CHECK_ITEM_PRINTED_VOID]), checksController.voidCheckItem);
router.put('/:id/items/:itemId/ent', requirePermission([PERMISSIONS.CHECK_ITEM_COMP, PERMISSIONS.CHECK_PRINTED_ITEM_COMP]), checksController.entCheckItem);

router.put('/:id/void', requirePermission([PERMISSIONS.CHECK_VOID, PERMISSIONS.CHECK_CLOSED_VOID]), checksController.voidCheck);

router.put('/:id/discount', requirePermission([PERMISSIONS.DISCOUNT_APPLY]), checksController.updateCheckDiscount.bind(checksController));
router.put('/:id/table-transfer', requireTableTransferPermission, checksController.transferTable.bind(checksController));
router.put('/:id/waiter-transfer', requireWaiterTransferPermission, checksController.transferWaiter.bind(checksController));
router.put('/:id/guest-count', requireGuestCountPermission, checksController.updateGuestCount.bind(checksController));
router.put('/:id/table-name', checksController.updateTableName.bind(checksController));
router.put('/:id/customer', requirePermission([PERMISSIONS.DELIVERY_CUSTOMER_EDIT]), checksController.updateCustomerInfo.bind(checksController));

export default router;
