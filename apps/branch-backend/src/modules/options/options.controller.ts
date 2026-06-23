import { Request, Response } from 'express';
import { OptionsService } from './options.service';

export const OptionsController = {
  getOptions: async (req: Request, res: Response) => {
    try {
      const options = await OptionsService.getOptions();
      res.json({ success: true, data: options });
    } catch (error) {
      console.error('Error fetching options:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch options' });
    }
  }
};
