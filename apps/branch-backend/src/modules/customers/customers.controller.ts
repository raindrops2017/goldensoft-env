import { Request, Response } from 'express';
import { customersService } from './customers.service';

export class CustomersController {
  async getCustomers(req: Request, res: Response) {
    try {
      const data = await customersService.getCustomers();
      res.json({ success: true, data });
    } catch (error: any) {
      console.error('Error fetching customers:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch customers' });
    }
  }
}

export const customersController = new CustomersController();
