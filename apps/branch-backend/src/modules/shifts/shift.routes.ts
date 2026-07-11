import { Router } from 'express';
import { shiftController } from './shift.controller';
import { requireAuth } from '../../middleware/requireAuth';
import { requirePermission } from '../../middleware/requirePermission';
import { PERMISSIONS } from '@goldensoft/core-schemas';

const router = Router();

router.get('/current', requireAuth, shiftController.getCurrent);
router.post('/close', requireAuth, requirePermission([PERMISSIONS.WORK_SHIFT_CLOSE]), shiftController.closeShift);
router.post('/close-day', requireAuth, requirePermission([PERMISSIONS.WORKDAY_CLOSE]), shiftController.closeBusinessDay);

export default router;
