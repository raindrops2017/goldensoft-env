import { Router } from 'express';
import { shiftController } from './shift.controller';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();

router.get('/current', requireAuth, shiftController.getCurrent);
router.post('/open', requireAuth, shiftController.openShift);

export default router;
