import { Request, Response } from 'express';
import { checksService } from './checks.service';
import { 
  CreateCheckInputSchema, 
  AddCheckItemInputSchema, 
  VoidCheckItemInputSchema, 
  EntCheckItemInputSchema,
  SplitCheckInputSchema,
  CloseCheckInputSchema
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

  async getHistoricalChecks(req: Request, res: Response): Promise<void> {
    try {
      const checks = await checksService.getHistoricalChecks(req.query);
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
      const userId = req.supervisorUser?.userId || req.user?.userId || 'system';
      const check = await checksService.voidCheckItem(req.params.id as string, req.params.itemId as string, payload, userId);
      res.json({ success: true, data: check });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async entCheckItem(req: Request, res: Response): Promise<void> {
    try {
      const payload = EntCheckItemInputSchema.parse(req.body);
      const userId = req.supervisorUser?.userId || req.user?.userId || 'system';
      const check = await checksService.entCheckItem(req.params.id as string, req.params.itemId as string, payload, userId);
      res.json({ success: true, data: check });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async voidCheck(req: Request, res: Response): Promise<void> {
    try {
      const reason = req.body.voidReason || 'Unknown';
      const userId = req.supervisorUser?.userId || req.user?.userId || 'system';
      const check = await checksService.voidCheck(req.params.id as string, reason, userId);
      res.json({ success: true, data: check });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async updateCheckDiscount(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body;
      const userId = req.supervisorUser?.userId || req.user?.userId || 'system';
      const check = await checksService.updateCheckDiscount(req.params.id as string, data, userId);
      res.json({ success: true, data: check });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async splitCheck(req: Request, res: Response): Promise<void> {
    try {
      const payload = SplitCheckInputSchema.parse(req.body);
      const userId = req.supervisorUser?.userId || req.user?.userId || 'system';
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
      const { supervisorPin, supervisorId, printerId } = req.body;
      const userId = req.user?.userId || 'system';

      const result = await checksService.printCheck(checkId, userId, { supervisorPin, supervisorId, printerId });

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

  async transferTable(req: Request, res: Response): Promise<void> {
    try {
      const checkId = req.params.id as string;
      const { targetTableId, supervisorPin, supervisorId } = req.body;
      const userId = req.user?.userId || 'system';

      if (!targetTableId) {
        res.status(400).json({ success: false, error: 'targetTableId is required' });
        return;
      }

      const result = await checksService.transferTable(checkId, targetTableId, userId, supervisorPin, supervisorId);

      // Emit socket updates
      const io = req.app.get('io');
      if (io) {
        if (result.oldTableId) {
          io.emit('table:status:changed', { tableId: result.oldTableId, status: 'free' });
        }
        if (result.check.tableId) {
          io.emit('table:status:changed', { 
            tableId: result.check.tableId, 
            status: 'occupied', 
            chkNo: result.check.chkNo 
          });
        }
      }

      res.json({ success: true, data: result.check });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async transferWaiter(req: Request, res: Response): Promise<void> {
    try {
      const checkId = req.params.id as string;
      const { targetWaiterId, supervisorPin, supervisorId } = req.body;
      const userId = req.user?.userId || 'system';

      if (!targetWaiterId) {
        res.status(400).json({ success: false, error: 'targetWaiterId is required' });
        return;
      }

      const updatedCheck = await checksService.transferWaiter(checkId, targetWaiterId, userId, supervisorPin, supervisorId);
      
      const io = req.app.get('io');
      if (io && updatedCheck && updatedCheck.tableId) {
        io.emit('table:status:changed', { 
          tableId: updatedCheck.tableId, 
          status: (updatedCheck.printCount || 0) > 0 ? 'printed' : 'occupied',
          chkNo: updatedCheck.chkNo 
        });
      }

      res.json({ success: true, data: updatedCheck });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async updateGuestCount(req: Request, res: Response): Promise<void> {
    try {
      const checkId = req.params.id as string;
      const { guestCount, supervisorPin, supervisorId } = req.body;
      const userId = req.user?.userId || 'system';

      if (guestCount === undefined || isNaN(Number(guestCount))) {
        res.status(400).json({ success: false, error: 'guestCount is required and must be a number' });
        return;
      }

      const updatedCheck = await checksService.updateGuestCount(
        checkId,
        Number(guestCount),
        userId,
        supervisorPin,
        supervisorId
      );

      const io = req.app.get('io');
      if (io && updatedCheck && updatedCheck.tableId) {
        io.emit('table:status:changed', { 
          tableId: updatedCheck.tableId, 
          status: (updatedCheck.printCount || 0) > 0 ? 'printed' : 'occupied',
          chkNo: updatedCheck.chkNo 
        });
      }

      res.json({ success: true, data: updatedCheck });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async updateTableName(req: Request, res: Response): Promise<void> {
    try {
      const checkId = req.params.id as string;
      const { tableName } = req.body;
      const userId = req.user?.userId || 'system';

      const updatedCheck = await checksService.updateTableName(
        checkId,
        tableName || '',
        userId
      );

      const io = req.app.get('io');
      if (io && updatedCheck && updatedCheck.tableId) {
        io.emit('table:status:changed', { 
          tableId: updatedCheck.tableId, 
          status: (updatedCheck.printCount || 0) > 0 ? 'printed' : 'occupied',
          chkNo: updatedCheck.chkNo 
        });
      }

      res.json({ success: true, data: updatedCheck });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async updateCustomerInfo(req: Request, res: Response): Promise<void> {
    try {
      const checkId = req.params.id as string;
      const { customerName, customerPhone, deliveryCustomerId } = req.body;
      const userId = req.user?.userId || 'system';

      const updatedCheck = await checksService.updateCustomerInfo(
        checkId,
        customerName || null,
        customerPhone || null,
        userId,
        deliveryCustomerId || null
      );

      const io = req.app.get('io');
      if (io && updatedCheck) {
        io.emit('table:status:changed', { 
          tableId: updatedCheck.tableId || 'takeaway', 
          status: 'updated',
          chkNo: updatedCheck.chkNo 
        });
      }

      res.json({ success: true, data: updatedCheck });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async closeCheck(req: Request, res: Response): Promise<void> {
    try {
      const checkId = req.params.id as string;
      const parsed = CloseCheckInputSchema.parse(req.body);
      const userId = req.user?.userId || 'system';

      const updatedCheck = await checksService.closeCheck(checkId, parsed, userId);

      // Emit socket updates to refresh table status/floor plan in real-time
      const io = req.app.get('io');
      if (io && updatedCheck.tableId) {
        io.emit('table:status:changed', { 
          tableId: updatedCheck.tableId, 
          status: 'free' 
        });
      }

      res.json({ success: true, data: updatedCheck });
    } catch (error: any) {
      console.error('Close check error:', error);
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async batchCloseChecks(req: Request, res: Response): Promise<void> {
    try {
      const { checkIds, paymentMethod, supervisorPin, supervisorId } = req.body;
      if (!Array.isArray(checkIds) || checkIds.length === 0) {
        res.status(400).json({ success: false, error: 'checkIds must be a non-empty array' });
        return;
      }
      const userId = req.user?.userId || 'system';

      const io = req.app.get('io');
      const results = [];

      for (const checkId of checkIds) {
        const chk = checksService.getCheckByIdSync(checkId);
        if (!chk) {
          throw new Error(`Check ${checkId} not found`);
        }

        const total = chk.chkTotal;
        const payload = {
          paymentMethod: paymentMethod || 'Cash',
          cash: paymentMethod === 'Visa' ? 0 : total,
          visaAmount: paymentMethod === 'Visa' ? total : 0,
          clAmount: 0,
          tips: 0,
          isComp: paymentMethod === 'Comp',
          discountAmount: chk.discountAmount || 0,
          discountPrsn: chk.discountPrsn || 0,
          visaNo: null,
          cardType: null,
          clNote: null,
          paidCash: paymentMethod === 'Visa' ? 0 : total,
          supervisorPin,
          supervisorId,
        };

        const updatedCheck = await checksService.closeCheck(checkId, payload, userId);
        results.push(updatedCheck);

        if (io) {
          io.emit('table:status:changed', { 
            tableId: updatedCheck.tableId || 'delivery', 
            status: 'free' 
          });
        }
      }

      res.json({ success: true, data: results });
    } catch (error: any) {
      console.error('Batch close checks error:', error);
      res.status(400).json({ success: false, error: error.message });
    }
  }
}

export const checksController = new ChecksController();

