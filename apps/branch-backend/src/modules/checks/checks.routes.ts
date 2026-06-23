import { Router } from 'express';
import { checksController } from './checks.controller';
import { requireAuth } from '../../middleware/requireAuth';
import { requirePermission } from '../../middleware/requirePermission';
import { PERMISSIONS } from '@goldensoft/core-schemas';

const router = Router();

// Apply requireAuth to all check endpoints
router.use(requireAuth);

router.get('/open', checksController.getOpenChecks);
router.get('/:id', checksController.getCheckById);

router.post('/', requirePermission([PERMISSIONS.CHECK_CREATE]), checksController.createCheck);
router.post('/:id/items', checksController.addCheckItem);

router.put('/:id/items/:itemId/void', requirePermission([PERMISSIONS.CHECK_ITEM_VOID, PERMISSIONS.CHECK_ITEM_PRINTED_VOID]), checksController.voidCheckItem);
router.put('/:id/items/:itemId/ent', requirePermission([PERMISSIONS.CHECK_ITEM_COMP, PERMISSIONS.CHECK_PRINTED_ITEM_COMP]), checksController.entCheckItem);

router.put('/:id/void', requirePermission([PERMISSIONS.CHECK_VOID, PERMISSIONS.CHECK_CLOSED_VOID]), checksController.voidCheck);

router.put('/:id/discount', requirePermission([PERMISSIONS.DISCOUNT_APPLY]), checksController.updateCheckDiscount.bind(checksController));

// Endpoint for closing the check would go here

export default router;
