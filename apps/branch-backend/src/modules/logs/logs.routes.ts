import { Router } from 'express';
import { BranchLogsController } from './logs.controller';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();
const logsController = new BranchLogsController();

// GET /api/logs/table/:tableId - Get log history for a specific table
router.get('/table/:tableId', requireAuth, (req, res) => logsController.getTableHistory(req, res));

// GET /api/logs/check/:checkId - Get log history for a specific check
router.get('/check/:checkId', requireAuth, (req, res) => logsController.getCheckHistory(req, res));

export default router;
