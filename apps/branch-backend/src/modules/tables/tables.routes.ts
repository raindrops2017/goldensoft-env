import { Router } from 'express';
import { tablesController } from './tables.controller';
import { requireAuth } from '../../middleware/requireAuth';
import { requirePermission } from '../../middleware/requirePermission';
import { PERMISSIONS } from '@goldensoft/core-schemas';

const router = Router();

// Retrieve sections with tables is accessible to anyone authenticated
router.get('/sections', requireAuth, tablesController.getSections);

// Layout management routes require requireAuth and requirePermission(PERMISSIONS.TABLES_EDIT)
router.post('/sections', requireAuth, requirePermission([PERMISSIONS.TABLES_EDIT]), tablesController.createSection);
router.post('/', requireAuth, requirePermission([PERMISSIONS.TABLES_EDIT]), tablesController.createTable);
router.put('/:id', requireAuth, requirePermission([PERMISSIONS.TABLES_EDIT]), tablesController.updateTable);
router.delete("/:id", requireAuth, requirePermission([PERMISSIONS.TABLES_EDIT]), tablesController.deleteTable);
router.delete("/sections/:id", requireAuth, requirePermission([PERMISSIONS.TABLES_EDIT]), tablesController.deleteSection);
router.post("/seed-default", requireAuth, requirePermission([PERMISSIONS.TABLES_EDIT]), tablesController.seedDefault);

export default router;
