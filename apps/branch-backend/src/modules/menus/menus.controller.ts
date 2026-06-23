import { Request, Response } from 'express';
import { menusService } from './menus.service';

export class MenusController {
  async getFullMenu(req: Request, res: Response): Promise<void> {
    try {
      const menu = await menusService.getFullMenu();
      res.json({
        success: true,
        data: menu
      });
    } catch (error) {
      console.error('Error fetching full menu:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch menu data' });
    }
  }
}

export const menusController = new MenusController();
