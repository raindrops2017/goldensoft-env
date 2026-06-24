import { Request, Response } from 'express';
import { checksService } from './checks.service';
import { 
  CreateCheckInputSchema, 
  AddCheckItemInputSchema, 
  VoidCheckItemInputSchema, 
  EntCheckItemInputSchema,
  SplitCheckInputSchema
} from '@goldensoft/core-schemas';

export class ChecksController {
  async getOpenChecks(req: Request, res: Response): Promise<void> {
    try {
      const checks = await checksService.getOpenChecks();
      res.json({ success: true, data: checks });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getCheckById(req: Request, res: Response): Promise<void> {
    try {
      const check = await checksService.getCheckById(req.params.id as string);
      if (!check) {
        res.status(404).json({ success: false, error: 'Check not found' });
        return;
      }
      res.json({ success: true, data: check });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async createCheck(req: Request, res: Response): Promise<void> {
    try {
      const payload = CreateCheckInputSchema.parse(req.body);
      const userId = req.user?.userId || 'system';
      const check = await checksService.createCheck(payload, userId);
      res.json({ success: true, data: check });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async addCheckItem(req: Request, res: Response): Promise<void> {
    try {
      const payload = AddCheckItemInputSchema.parse(req.body);
      const userId = req.user?.userId || 'system';
      const check = await checksService.addCheckItem(req.params.id as string, payload, userId);
      res.json({ success: true, data: check });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async voidCheckItem(req: Request, res: Response): Promise<void> {
    try {
      const payload = VoidCheckItemInputSchema.parse(req.body);
      const userId = req.user?.userId || 'system';
      const check = await checksService.voidCheckItem(req.params.id as string, req.params.itemId as string, payload, userId);
      res.json({ success: true, data: check });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async entCheckItem(req: Request, res: Response): Promise<void> {
    try {
      const payload = EntCheckItemInputSchema.parse(req.body);
      const userId = req.user?.userId || 'system';
      const check = await checksService.entCheckItem(req.params.id as string, req.params.itemId as string, payload, userId);
      res.json({ success: true, data: check });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async voidCheck(req: Request, res: Response): Promise<void> {
    try {
      const reason = req.body.voidReason || 'Unknown';
      const userId = req.user?.userId || 'system';
      const check = await checksService.voidCheck(req.params.id as string, reason, userId);
      res.json({ success: true, data: check });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async updateCheckDiscount(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body;
      const userId = req.user?.userId || 'system';
      const check = await checksService.updateCheckDiscount(req.params.id as string, data, userId);
      res.json({ success: true, data: check });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async splitCheck(req: Request, res: Response): Promise<void> {
    try {
      const payload = SplitCheckInputSchema.parse(req.body);
      const userId = req.user?.userId || 'system';
      const result = await checksService.splitCheck(req.params.id as string, payload, userId);

      // Emit socket updates to refresh table floor plans in real-time
      const io = req.app.get('io');
      if (io && result.tableIds) {
        for (const tableId of result.tableIds) {
          io.emit('table:status:changed', { tableId, status: 'occupied' });
        }
      }

      res.json({
        success: true,
        data: {
          sourceCheck: result.sourceCheck,
          splitChecks: result.splitChecks
        }
      });
    } catch (error: any) {
      console.error('Split check error:', error);
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async printCheck(req: Request, res: Response): Promise<void> {
    try {
      const checkId = req.params.id as string;
      const { supervisorPin, printerId } = req.body;
      const userId = req.user?.userId || 'system';

      const result = await checksService.printCheck(checkId, userId, { supervisorPin, printerId });

      // Emit socket updates to refresh table status/floor plan in real-time
      const io = req.app.get('io');
      if (io && result.check.tableId) {
        io.emit('table:status:changed', { 
          tableId: result.check.tableId, 
          status: 'printed',
          chkNo: result.check.chkNo 
        });
      }

      res.json({ 
        success: true, 
        data: result.check,
        printResult: {
          mocked: result.printResult.mocked,
          error: result.printResult.error
        }
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
}

export const checksController = new ChecksController();
