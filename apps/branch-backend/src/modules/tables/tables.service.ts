import { db } from '../../db';
import { tables, tableSections, checks } from '../../db/schema';
import { eq, asc, inArray } from 'drizzle-orm';
import crypto from 'crypto';
import type { 
  CreateTableInput, 
  UpdateTableInput, 
  CreateTableSectionInput 
} from '@goldensoft/core-schemas';

export class TablesService {
  async getSectionsWithTables(userId?: string, isWaiter?: boolean) {
    const sections = db.select()
      .from(tableSections)
      .orderBy(asc(tableSections.createdAt))
      .all();

    const allTables = db.select()
      .from(tables)
      .orderBy(asc(tables.number))
      .all();

    const openChecksList = db.select({
      id: checks.id,
      tableId: checks.tableId,
      waiterId: checks.waiterId,
    })
    .from(checks)
    .where(eq(checks.chkStatusId, 1))
    .all();

    // Map tables to their sections
    return sections.map(section => ({
      ...section,
      tables: allTables.filter(t => t.tableSectionId === section.id).map(t => {
        const tableChecks = openChecksList.filter(c => c.tableId === t.id);
        let belongsToCurrentUser = true;
        
        if (isWaiter && tableChecks.length > 0) {
          belongsToCurrentUser = tableChecks.some(c => c.waiterId === userId);
        }
        
        return {
          ...t,
          belongsToCurrentUser
        };
      })
    }));
  }

  async createSection(data: CreateTableSectionInput) {
    const newSection = {
      id: crypto.randomUUID(),
      name: data.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.insert(tableSections).values(newSection).run();
    return newSection;
  }

  async createTable(data: CreateTableInput) {
    const newTable = {
      id: crypto.randomUUID(),
      number: data.number,
      name: data.name || `Table ${data.number}`,
      posX: data.posX ?? 50,
      posY: data.posY ?? 50,
      tableWidth: data.tableWidth ?? 125,
      tableHeight: data.tableHeight ?? 125,
      angle: 0,
      shape: data.shape || 'rect',
      tableSectionId: data.tableSectionId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.insert(tables).values(newTable).run();
    return newTable;
  }

  async updateTable(id: string, data: UpdateTableInput) {
    const existing = db.select()
      .from(tables)
      .where(eq(tables.id, id))
      .get();

    if (!existing) {
      throw new Error('Table not found');
    }

    const updatedFields = {
      name: data.name !== undefined ? data.name : existing.name,
      number: data.number !== undefined ? data.number : existing.number,
      posX: data.posX !== undefined ? data.posX : existing.posX,
      posY: data.posY !== undefined ? data.posY : existing.posY,
      tableWidth: data.tableWidth !== undefined ? data.tableWidth : existing.tableWidth,
      tableHeight: data.tableHeight !== undefined ? data.tableHeight : existing.tableHeight,
      shape: data.shape !== undefined ? data.shape : existing.shape,
      angle: data.angle !== undefined ? data.angle : existing.angle,
      updatedAt: new Date().toISOString()
    };

    db.update(tables)
      .set(updatedFields)
      .where(eq(tables.id, id))
      .run();

    return { ...existing, ...updatedFields };
  }

  async deleteTable(id: string) {
    const existing = db.select()
      .from(tables)
      .where(eq(tables.id, id))
      .get();

    if (!existing) {
      throw new Error('Table not found');
    }

    // Nullify tableId in checks referencing this table to prevent foreign key violation
    db.update(checks)
      .set({ tableId: null })
      .where(eq(checks.tableId, id))
      .run();

    db.delete(tables).where(eq(tables.id, id)).run();
    return { success: true };
  }

  async deleteSection(id: string) {
    const existing = db.select()
      .from(tableSections)
      .where(eq(tableSections.id, id))
      .get();

    if (!existing) {
      throw new Error('Section not found');
    }

    // Fetch all table IDs in this section to nullify their checks' tableId
    const sectionTables = db.select({ id: tables.id })
      .from(tables)
      .where(eq(tables.tableSectionId, id))
      .all();
    
    const tableIds = sectionTables.map(t => t.id);
    if (tableIds.length > 0) {
      db.update(checks)
        .set({ tableId: null })
        .where(inArray(checks.tableId, tableIds))
        .run();
    }

    db.delete(tables).where(eq(tables.tableSectionId, id)).run();
    db.delete(tableSections).where(eq(tableSections.id, id)).run();
    return { success: true };
  }

  async seedDefaultLayout() {
    // 1. Nullify tableId in checks to prevent foreign key constraint violation
    db.update(checks).set({ tableId: null }).run();

    // 2. Delete all existing tables and sections
    db.delete(tables).run();
    db.delete(tableSections).run();

    const sectionsInfo = [
      { name: 'Outdoor', startNum: 1, endNum: 31 },
      { name: 'Indoor', startNum: 32, endNum: 61 },
      { name: 'Officer', startNum: 62, endNum: 91 }
    ];

    const seededData = [];

    for (const sec of sectionsInfo) {
      const sectionId = crypto.randomUUID();
      const newSection = {
        id: sectionId,
        name: sec.name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      db.insert(tableSections).values(newSection).run();

      // Generate table numbers from startNum to endNum, excluding 13
      const tableNumbers = [];
      for (let num = sec.startNum; num <= sec.endNum; num++) {
        if (num !== 13) {
          tableNumbers.push(num);
        }
      }

      // We need exactly 30 tables per section
      // If we skipped 13, the range might span slightly larger to hit 30
      // Outdoor: 1 to 31 = 31 numbers. Skipping 13 leaves exactly 30!
      // Indoor: 32 to 61 = 30 numbers.
      // Officer: 62 to 91 = 30 numbers.
      const tablesList = [];
      for (let i = 0; i < tableNumbers.length; i++) {
        const tableNum = tableNumbers[i];
        const row = Math.floor(i / 6);
        const col = i % 6;

        const newTable = {
          id: crypto.randomUUID(),
          number: tableNum,
          name: `T${tableNum}`,
          posX: 30 + col * 165,
          posY: 30 + row * 110,
          tableWidth: 100,
          tableHeight: 100,
          angle: 0,
          shape: 'rect' as const,
          tableSectionId: sectionId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        db.insert(tables).values(newTable).run();
        tablesList.push(newTable);
      }

      seededData.push({
        ...newSection,
        tables: tablesList
      });
    }

    return seededData;
  }
}

export const tablesService = new TablesService();
