import { Request, Response } from 'express';
import { LogsService } from './logs.service';
import { z } from 'zod';
import { ScreenLogSchema } from '@goldensoft/core-schemas';

const logsService = new LogsService();

// Validation schema for log batch synchronization requests
const LogsSyncInputSchema = z.array(ScreenLogSchema as any);

export class LogsController {
  /**
   * Synchronizes a batch of screen logs sent from a branch backend.
   * Validates the payload structure and performs bulk upserts into the tenant database.
   */
  async sync(req: Request, res: Response): Promise<void> {
    try {
      const tenantDb = req.tenantDb;
      if (!tenantDb) {
        res.status(400).json({ success: false, error: 'Tenant DB connection context is required' });
        return;
      }

      const parsed = LogsSyncInputSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid logs payload format',
          details: parsed.error.format(),
        });
        return;
      }

      const result = await logsService.syncLogs(tenantDb, parsed.data as any[]);
      
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      console.error('❌ Failed to sync logs:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Internal server error during logs sync',
      });
    }
  }
}
