import { Router } from 'express';
import { deliveryController } from './delivery.controller';
import { requireAuth } from '../../middleware/requireAuth';
import { requirePermission } from '../../middleware/requirePermission';
import { PERMISSIONS } from '@goldensoft/core-schemas';

const router = Router();

// Apply requireAuth to all delivery endpoints
router.use(requireAuth);

// All delivery endpoints require DELIVERY_OPEN permission
router.use(requirePermission([PERMISSIONS.DELIVERY_OPEN]));

router.get('/zones', deliveryController.getDeliveryZones);
router.post('/zones', deliveryController.createDeliveryZone);
router.put('/zones/:id', deliveryController.updateDeliveryZone);
router.put('/zones/:id/deactivate', deliveryController.deactivateDeliveryZone);

router.get('/pilots', deliveryController.getDeliveryPilots);
router.post('/pilots', deliveryController.createDeliveryPilot);
router.put('/pilots/:id', deliveryController.updateDeliveryPilot);
router.put('/pilots/:id/deactivate', deliveryController.deactivateDeliveryPilot);

router.get('/customers/search', deliveryController.searchDeliveryCustomer);
router.post('/customers', deliveryController.createDeliveryCustomer);
router.put('/customers/:id', deliveryController.updateDeliveryCustomer);
router.get('/customers/:id/last-order', deliveryController.getLastOrder);
router.put('/checks/assign-pilot', deliveryController.assignPilot);
router.put('/checks/:id/state', deliveryController.updateCheckDeliveryState.bind(deliveryController));
router.put('/checks/:id/unassign', deliveryController.unassignCheck.bind(deliveryController));
router.post('/checks/dispatch', deliveryController.dispatchChecks.bind(deliveryController));
router.post('/pilots/:id/return', deliveryController.returnPilot.bind(deliveryController));
router.post('/pilots/:id/arrive', deliveryController.arrivePilot.bind(deliveryController));

export default router;
