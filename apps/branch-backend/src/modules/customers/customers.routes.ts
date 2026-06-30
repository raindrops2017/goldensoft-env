import { Router } from 'express';
import { customersController } from './customers.controller';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();

// Retrieve customers is accessible to anyone authenticated
router.get('/', requireAuth, customersController.getCustomers);

export default router;
