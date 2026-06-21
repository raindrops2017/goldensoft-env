import { db } from '../../db';
import { shifts } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';
import crypto from 'crypto';

export class ShiftService {
  async getCurrentShift() {
    const currentShift = db.select()
      .from(shifts)
      .where(eq(shifts.status, 'open'))
      .orderBy(desc(shifts.createdAt))
      .get();

    return currentShift || null;
  }

  async openShift(userId: string, startingCash: number) {
    const existingShift = await this.getCurrentShift();

    if (existingShift) {
      throw new Error('A shift is already open');
    }

    const businessDate = new Date().toISOString().split('T')[0];

    const lastShift = db.select({ shiftNumber: shifts.shiftNumber })
      .from(shifts)
      .orderBy(desc(shifts.shiftNumber))
      .get();
      
    const shiftNumber = lastShift ? lastShift.shiftNumber + 1 : 1;

    const newShift = {
      id: crypto.randomUUID(),
      shiftNumber,
      businessDate,
      openedBy: userId,
      startingCash,
      status: 'open'
    };

    db.insert(shifts).values(newShift).run();

    return newShift;
  }
}

export const shiftService = new ShiftService();
