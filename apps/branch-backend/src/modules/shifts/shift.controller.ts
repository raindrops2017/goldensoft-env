import { Request, Response } from 'express';
import { OpenShiftSchema } from '@goldensoft/core-schemas';
import { shiftService } from './shift.service';

export class ShiftController {
  async getCurrent(req: Request, res: Response) {
    try {
      const currentShift = await shiftService.getCurrentShift();

      if (!currentShift) {
        res.status(404).json({ success: false, error: 'No active shift found' });
        return;
      }

      res.json({ success: true, data: currentShift });
    } catch (error) {
      console.error('Error fetching current shift:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  async openShift(req: Request, res: Response) {
    try {
      const parsed = OpenShiftSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: 'Invalid input', data: parsed.error.format() });
        return;
      }

      const { startingCash } = parsed.data;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const newShift = await shiftService.openShift(userId, startingCash);

      res.json({ success: true, data: newShift });
    } catch (error: any) {
      if (error.message === 'A shift is already open') {
        res.status(400).json({ success: false, error: error.message });
        return;
      }
      console.error('Error opening shift:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
}

export const shiftController = new ShiftController();
