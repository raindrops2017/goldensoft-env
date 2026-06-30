import { Request, Response } from 'express';
import { BranchLogsService } from './logs.service';

const logsService = new BranchLogsService();

export class BranchLogsController {
  async getTableHistory(req: Request, res: Response) {
    try {
      const { tableId } = req.params as { tableId: string };
      if (!tableId) {
        return res.status(400).json({ success: false, error: 'Table ID is required' });
      }

      const results = await logsService.getLogsByTable(tableId);
      // Map JSON details string back to object for responses
      const formatted = results.map(log => ({
        ...log,
        details: log.details ? JSON.parse(log.details) : {},
      }));

      return res.json({ success: true, data: formatted });
    } catch (err: any) {
      console.error('❌ Failed to fetch table history logs:', err);
      return res.status(500).json({ success: false, error: err.message || 'Failed to fetch table history logs' });
    }
  }

  async getCheckHistory(req: Request, res: Response) {
    try {
      const { checkId } = req.params as { checkId: string };
      if (!checkId) {
        return res.status(400).json({ success: false, error: 'Check ID is required' });
      }

      const results = await logsService.getLogsByCheck(checkId);
      // Map JSON details string back to object for responses
      const formatted = results.map(log => ({
        ...log,
        details: log.details ? JSON.parse(log.details) : {},
      }));

      return res.json({ success: true, data: formatted });
    } catch (err: any) {
      console.error('❌ Failed to fetch check history logs:', err);
      return res.status(500).json({ success: false, error: err.message || 'Failed to fetch check history logs' });
    }
  }
}
