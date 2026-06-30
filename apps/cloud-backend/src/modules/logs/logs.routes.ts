import { Router } from 'express';
import { tenantResolver } from '../../middleware/tenantResolver';
import { LogsController } from './logs.controller';

const router = Router();
const logsController = new LogsController();

// POST /api/tenant/logs/sync - Synchronize screen logs batch from branch to cloud
router.post('/sync', tenantResolver, (req, res) => logsController.sync(req, res));

export default router;
