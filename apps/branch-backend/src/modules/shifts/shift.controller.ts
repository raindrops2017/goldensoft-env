import { Request, Response } from 'express';
import { CloseShiftSchema, CloseDaySchema } from '@goldensoft/core-schemas';
import { shiftService } from './shift.service';

export class ShiftController {
  async getCurrent(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      const currentShift = await shiftService.getCurrentShift(userId);

      res.json({ success: true, data: currentShift });
    } catch (error) {
      console.error('Error fetching current shift:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  async closeShift(req: Request, res: Response) {
    try {
      const parsed = CloseShiftSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: 'Invalid input', data: parsed.error.format() });
        return;
      }

      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { actualClosingCash } = parsed.data;
      const nextShift = await shiftService.closeShift(userId, actualClosingCash);

      res.json({ success: true, data: nextShift });
    } catch (error: any) {
      console.error('Error closing shift:', error);
      res.status(error.message.includes('Shift 3') ? 400 : 500).json({ 
        success: false, 
        error: error.message || 'Internal server error' 
      });
    }
  }

  async closeBusinessDay(req: Request, res: Response) {
    try {
      const parsed = CloseDaySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: 'Invalid input', data: parsed.error.format() });
        return;
      }

      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { actualClosingCash } = parsed.data;
      const result = await shiftService.closeBusinessDay(userId, actualClosingCash);

      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('Error closing business day:', error);
      const isValidationError = error.message.includes('checks are still open');
      res.status(isValidationError ? 400 : 500).json({ 
        success: false, 
        error: error.message || 'Internal server error' 
      });
    }
  }
}

export const shiftController = new ShiftController();
