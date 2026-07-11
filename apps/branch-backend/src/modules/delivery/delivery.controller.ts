import { Request, Response } from 'express';
import { deliveryService } from './delivery.service';
import { CreateDeliveryCustomerInputSchema, AssignPilotInputSchema, CreateDeliveryZoneInputSchema, CreateDeliveryPilotInputSchema } from '@goldensoft/core-schemas';

export class DeliveryController {
  async getDeliveryZones(req: Request, res: Response): Promise<void> {
    try {
      const all = req.query.all === 'true';
      const data = await deliveryService.getDeliveryZones(all);
      res.json({ success: true, data });
    } catch (error: any) {
      console.error('Error fetching delivery zones:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch delivery zones' });
    }
  }

  async getDeliveryPilots(req: Request, res: Response): Promise<void> {
    try {
      const all = req.query.all === 'true';
      const data = await deliveryService.getDeliveryPilots(all);
      res.json({ success: true, data });
    } catch (error: any) {
      console.error('Error fetching delivery pilots:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch delivery pilots' });
    }
  }

  async createDeliveryZone(req: Request, res: Response): Promise<void> {
    try {
      const parsed = CreateDeliveryZoneInputSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: parsed.error.errors[0].message });
        return;
      }
      const data = await deliveryService.createDeliveryZone(parsed.data);
      res.status(201).json({ success: true, data });
    } catch (error: any) {
      console.error('Error creating delivery zone:', error);
      res.status(500).json({ success: false, error: 'Failed to create delivery zone' });
    }
  }

  async updateDeliveryZone(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const parsed = CreateDeliveryZoneInputSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: parsed.error.errors[0].message });
        return;
      }
      const data = await deliveryService.updateDeliveryZone(id, parsed.data);
      if (!data) {
        res.status(404).json({ success: false, error: 'Zone not found' });
        return;
      }
      res.json({ success: true, data });
    } catch (error: any) {
      console.error('Error updating delivery zone:', error);
      res.status(500).json({ success: false, error: 'Failed to update delivery zone' });
    }
  }

  async deactivateDeliveryZone(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const data = await deliveryService.deactivateDeliveryZone(id);
      if (!data) {
        res.status(404).json({ success: false, error: 'Zone not found' });
        return;
      }
      res.json({ success: true, data });
    } catch (error: any) {
      console.error('Error deactivating delivery zone:', error);
      res.status(500).json({ success: false, error: 'Failed to deactivate delivery zone' });
    }
  }

  async createDeliveryPilot(req: Request, res: Response): Promise<void> {
    try {
      const parsed = CreateDeliveryPilotInputSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: parsed.error.errors[0].message });
        return;
      }
      const data = await deliveryService.createDeliveryPilot(parsed.data);
      res.status(201).json({ success: true, data });
    } catch (error: any) {
      console.error('Error creating delivery pilot:', error);
      res.status(500).json({ success: false, error: 'Failed to create delivery pilot' });
    }
  }

  async updateDeliveryPilot(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const parsed = CreateDeliveryPilotInputSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: parsed.error.errors[0].message });
        return;
      }
      const data = await deliveryService.updateDeliveryPilot(id, parsed.data);
      if (!data) {
        res.status(404).json({ success: false, error: 'Pilot not found' });
        return;
      }
      res.json({ success: true, data });
    } catch (error: any) {
      console.error('Error updating delivery pilot:', error);
      res.status(500).json({ success: false, error: 'Failed to update delivery pilot' });
    }
  }

  async deactivateDeliveryPilot(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const data = await deliveryService.deactivateDeliveryPilot(id);
      if (!data) {
        res.status(404).json({ success: false, error: 'Pilot not found' });
        return;
      }
      res.json({ success: true, data });
    } catch (error: any) {
      console.error('Error deactivating delivery pilot:', error);
      res.status(500).json({ success: false, error: 'Failed to deactivate delivery pilot' });
    }
  }

  async searchDeliveryCustomer(req: Request, res: Response): Promise<void> {
    try {
      const query = (req.query.query || req.query.phone) as string;
      if (!query) {
        res.status(400).json({ success: false, error: 'Search query parameter is required' });
        return;
      }
      const data = await deliveryService.searchDeliveryCustomer(query);
      res.json({ success: true, data });
    } catch (error: any) {
      console.error('Error searching delivery customer:', error);
      res.status(500).json({ success: false, error: 'Failed to search delivery customer' });
    }
  }

  async createDeliveryCustomer(req: Request, res: Response): Promise<void> {
    try {
      const parsed = CreateDeliveryCustomerInputSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: parsed.error.errors[0].message });
        return;
      }
      const data = await deliveryService.createDeliveryCustomer(parsed.data);
      res.status(201).json({ success: true, data });
    } catch (error: any) {
      console.error('Error creating delivery customer:', error);
      res.status(500).json({ success: false, error: 'Failed to create delivery customer' });
    }
  }

  async assignPilot(req: Request, res: Response): Promise<void> {
    try {
      const parsed = AssignPilotInputSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: parsed.error.errors[0].message });
        return;
      }
      const { checkIds, pilotId } = parsed.data;

      const updatedChecks = await deliveryService.assignPilotToChecks(checkIds, pilotId);

      // Emit socket updates for real-time sync
      const io = req.app.get('io');
      if (io) {
        for (const check of updatedChecks) {
          io.emit('table:status:changed', {
            tableId: 'delivery',
            status: 'updated',
            chkNo: check.chkNo
          });
        }
      }

      res.json({ success: true, data: updatedChecks });
    } catch (error: any) {
      console.error('Error assigning pilot to checks:', error);
      res.status(500).json({ success: false, error: 'Failed to assign pilot to checks' });
    }
  }

  async updateDeliveryCustomer(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const parsed = CreateDeliveryCustomerInputSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: parsed.error.errors[0].message });
        return;
      }
      const data = await deliveryService.updateDeliveryCustomer(id, parsed.data);
      if (!data) {
        res.status(404).json({ success: false, error: 'Customer not found' });
        return;
      }
      res.json({ success: true, data });
    } catch (error: any) {
      console.error('Error updating delivery customer:', error);
      res.status(500).json({ success: false, error: 'Failed to update delivery customer' });
    }
  }

  async getLastOrder(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const data = await deliveryService.getLastOrderForCustomer(id);
      res.json({ success: true, data });
    } catch (error: any) {
      console.error('Error fetching last order for customer:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch last order for customer' });
    }
  }

  async updateCheckDeliveryState(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const { state } = req.body;
      if (!state) {
        res.status(400).json({ success: false, error: 'State is required' });
        return;
      }
      const data = await deliveryService.updateCheckDeliveryState(id, state);

      const io = req.app.get('io');
      if (io) {
        io.emit('table:status:changed', {
          tableId: 'delivery',
          status: 'updated',
          chkNo: (data as any).chkNo
        });
      }

      res.json({ success: true, data });
    } catch (error: any) {
      console.error('Error updating check delivery state:', error);
      res.status(500).json({ success: false, error: 'Failed to update check delivery state' });
    }
  }

  async dispatchChecks(req: Request, res: Response): Promise<void> {
    try {
      const { checkIds, pilotId } = req.body;
      if (!checkIds || !Array.isArray(checkIds) || !pilotId) {
        res.status(400).json({ success: false, error: 'checkIds (array) and pilotId are required' });
        return;
      }
      const data = await deliveryService.dispatchChecks(checkIds, pilotId);

      const io = req.app.get('io');
      if (io) {
        for (const check of data) {
          io.emit('table:status:changed', {
            tableId: 'delivery',
            status: 'updated',
            chkNo: check.chkNo
          });
        }
      }

      res.json({ success: true, data });
    } catch (error: any) {
      console.error('Error dispatching checks:', error);
      res.status(500).json({ success: false, error: 'Failed to dispatch checks' });
    }
  }

  async returnPilot(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      await deliveryService.returnPilot(id);

      const io = req.app.get('io');
      if (io) {
        io.emit('table:status:changed', {
          tableId: 'delivery',
          status: 'updated'
        });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error('Error returning pilot:', error);
      res.status(500).json({ success: false, error: 'Failed to return pilot' });
    }
  }

  async unassignCheck(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const data = await deliveryService.unassignCheck(id);

      const io = req.app.get('io');
      if (io) {
        io.emit('table:status:changed', {
          tableId: 'delivery',
          status: 'updated',
          chkNo: (data as any).chkNo
        });
      }

      res.json({ success: true, data });
    } catch (error: any) {
      console.error('Error unassigning pilot from check:', error);
      res.status(500).json({ success: false, error: 'Failed to unassign pilot from check' });
    }
  }

  async arrivePilot(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      await deliveryService.arrivePilot(id);

      const io = req.app.get('io');
      if (io) {
        io.emit('table:status:changed', {
          tableId: 'delivery',
          status: 'updated'
        });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error('Error marking pilot as arrived:', error);
      res.status(500).json({ success: false, error: 'Failed to mark pilot as arrived' });
    }
  }
}

export const deliveryController = new DeliveryController();
