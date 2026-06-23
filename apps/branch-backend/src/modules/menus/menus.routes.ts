import { Router } from 'express';
import { menusController } from './menus.controller';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();

// Retrieve the full nested menu (read-only)
router.get('/', requireAuth, menusController.getFullMenu);

export default router;
