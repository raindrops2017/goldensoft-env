import { Request, Response } from 'express';
import { 
  CreateTableSectionSchema, 
  CreateTableSchema, 
  UpdateTableSchema 
} from '@goldensoft/core-schemas';
import { tablesService } from './tables.service';

export class TablesController {
  async getSections(req: Request, res: Response) {
    try {
      const data = await tablesService.getSectionsWithTables();
      res.json({ success: true, data });
    } catch (error: any) {
      console.error('Error fetching table sections:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch table sections' });
    }
  }

  async createSection(req: Request, res: Response) {
    try {
      const parsed = CreateTableSectionSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: 'Invalid input', data: parsed.error.format() });
        return;
      }

      const newSection = await tablesService.createSection(parsed.data);
      res.json({ success: true, data: newSection });
    } catch (error: any) {
      console.error('Error creating table section:', error);
      res.status(500).json({ success: false, error: 'Failed to create table section' });
    }
  }

  async createTable(req: Request, res: Response) {
    try {
      const parsed = CreateTableSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: 'Invalid input', data: parsed.error.format() });
        return;
      }

      const newTable = await tablesService.createTable(parsed.data);
      res.json({ success: true, data: newTable });
    } catch (error: any) {
      console.error('Error creating table:', error);
      res.status(500).json({ success: false, error: 'Failed to create table' });
    }
  }

  async updateTable(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const parsed = UpdateTableSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: 'Invalid input', data: parsed.error.format() });
        return;
      }

      const updatedTable = await tablesService.updateTable(id, parsed.data);
      res.json({ success: true, data: updatedTable });
    } catch (error: any) {
      if (error.message === 'Table not found') {
        res.status(404).json({ success: false, error: error.message });
        return;
      }
      console.error('Error updating table:', error);
      res.status(500).json({ success: false, error: 'Failed to update table' });
    }
  }

  async deleteTable(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await tablesService.deleteTable(id);
      res.json({ success: true });
    } catch (error: any) {
      if (error.message === 'Table not found') {
        res.status(404).json({ success: false, error: error.message });
        return;
      }
      console.error('Error deleting table:', error);
      res.status(500).json({ success: false, error: 'Failed to delete table' });
    }
  }

  async deleteSection(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await tablesService.deleteSection(id);
      res.json({ success: true });
    } catch (error: any) {
      if (error.message === 'Section not found') {
        res.status(404).json({ success: false, error: error.message });
        return;
      }
      console.error('Error deleting section:', error);
      res.status(500).json({ success: false, error: 'Failed to delete section' });
    }
  }

  async seedDefault(req: Request, res: Response) {
    try {
      const data = await tablesService.seedDefaultLayout();
      res.json({ success: true, data });
    } catch (error: any) {
      console.error('Error seeding default layout:', error);
      res.status(500).json({ success: false, error: 'Failed to seed default layout' });
    }
  }
}

export const tablesController = new TablesController();
