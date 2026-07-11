import { db } from '../../db';
import { shifts, closedDays, checks, users } from '../../db/schema';
import { eq, desc, and, notInArray } from 'drizzle-orm';
import crypto from 'crypto';
import { logsDb } from '../../db/logsDb';
import { screenLogs } from '../../db/logsSchema';

export type ShiftSelect = typeof shifts.$inferSelect;

export class ShiftService {
  async getBusinessDate(): Promise<string> {
    const latestClosed = db.select()
      .from(closedDays)
      .orderBy(desc(closedDays.closedDate))
      .limit(1)
      .get();
    
    if (latestClosed) {
      const dateParts = latestClosed.closedDate.split('-');
      const year = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1;
      const day = parseInt(dateParts[2], 10);
      const d = new Date(Date.UTC(year, month, day));
      d.setUTCDate(d.getUTCDate() + 1);
      return d.toISOString().split('T')[0];
    }
    
    const now = new Date();
    const egyptTime = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Cairo' }));
    return egyptTime.toISOString().split('T')[0];
  }

  async getCurrentShift(userIdForAutoOpen?: string): Promise<ShiftSelect> {
    const businessDate = await this.getBusinessDate();
    let currentShift = db.select()
      .from(shifts)
      .where(and(
        eq(shifts.status, 'open'),
        eq(shifts.businessDate, businessDate)
      ))
      .orderBy(desc(shifts.createdAt))
      .get();

    if (!currentShift) {
      const lastClosedShift = db.select()
        .from(shifts)
        .where(eq(shifts.status, 'closed'))
        .orderBy(desc(shifts.createdAt))
        .limit(1)
        .get();
        
      const startingCash = lastClosedShift?.actualClosingCash || 0;
      const openedBy = userIdForAutoOpen || 'system';

      const newShift: ShiftSelect = {
        id: crypto.randomUUID(),
        shiftNumber: 1,
        businessDate,
        openedBy,
        closedBy: null,
        startingCash,
        expectedClosingCash: null,
        actualClosingCash: null,
        status: 'open',
        cloudSyncId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      db.insert(shifts).values(newShift).run();
      currentShift = newShift;
    }

    if (currentShift) {
      const checksList = db.select({
        cash: checks.cash,
        tipsCash: checks.tipsCash,
        chkStatusId: checks.chkStatusId
      })
      .from(checks)
      .where(and(
        eq(checks.chkDate, currentShift.businessDate),
        eq(checks.shift, currentShift.shiftNumber),
        notInArray(checks.chkStatusId, [1, 5, 9])
      ))
      .all();

      const cashReceived = checksList.reduce((sum, c) => sum + (c.cash || 0) + (c.tipsCash || 0), 0);
      currentShift.expectedClosingCash = currentShift.startingCash + cashReceived;
    }

    return currentShift;
  }

  async closeShift(userId: string, actualClosingCash: number) {
    const activeShift = await this.getCurrentShift(userId);
    if (!activeShift) {
      throw new Error('No active shift found.');
    }

    if (activeShift.shiftNumber >= 3) {
      throw new Error('Shift 3 can only be closed during End of Day (EOD) closure.');
    }

    const businessDate = activeShift.businessDate;
    const shiftNumber = activeShift.shiftNumber;

    const checksList = db.select({
      cash: checks.cash,
      tipsCash: checks.tipsCash,
      chkStatusId: checks.chkStatusId
    })
    .from(checks)
    .where(and(
      eq(checks.chkDate, businessDate),
      eq(checks.shift, shiftNumber),
      notInArray(checks.chkStatusId, [1, 5, 9])
    ))
    .all();

    const cashReceived = checksList.reduce((sum, c) => sum + (c.cash || 0) + (c.tipsCash || 0), 0);
    const expectedClosingCash = activeShift.startingCash + cashReceived;

    const nowStr = new Date().toISOString();

    db.update(shifts)
      .set({
        status: 'closed',
        actualClosingCash,
        expectedClosingCash,
        closedBy: userId,
        updatedAt: nowStr
      })
      .where(eq(shifts.id, activeShift.id))
      .run();

    await this.logShiftAction(userId, activeShift.id, businessDate, 'WORK_SHIFT_CLOSE', {
      shiftNumber,
      startingCash: activeShift.startingCash,
      expectedClosingCash,
      actualClosingCash,
    });

    const nextShiftNumber = shiftNumber + 1;
    const nextShift: ShiftSelect = {
      id: crypto.randomUUID(),
      shiftNumber: nextShiftNumber,
      businessDate,
      openedBy: userId,
      closedBy: null,
      startingCash: actualClosingCash,
      expectedClosingCash: null,
      actualClosingCash: null,
      status: 'open',
      cloudSyncId: null,
      createdAt: nowStr,
      updatedAt: nowStr
    };

    db.insert(shifts).values(nextShift).run();

    return nextShift;
  }

  async closeBusinessDay(userId: string, actualClosingCash: number) {
    const businessDate = await this.getBusinessDate();

    const openChecksList = db.select({ chkNo: checks.chkNo })
      .from(checks)
      .where(and(
        eq(checks.chkDate, businessDate),
        eq(checks.chkStatusId, 1)
      ))
      .all();

    if (openChecksList.length > 0) {
      const checkNumbers = openChecksList.map(c => c.chkNo).join(', ');
      throw new Error(`Cannot close business day. The following checks are still open: ${checkNumbers}`);
    }

    const nowStr = new Date().toISOString();
    const activeShift = db.select()
      .from(shifts)
      .where(and(
        eq(shifts.status, 'open'),
        eq(shifts.businessDate, businessDate)
      ))
      .get();

    let finalClosingCash = actualClosingCash;

    if (activeShift) {
      const checksList = db.select({
        cash: checks.cash,
        tipsCash: checks.tipsCash,
        chkStatusId: checks.chkStatusId
      })
      .from(checks)
      .where(and(
        eq(checks.chkDate, businessDate),
        eq(checks.shift, activeShift.shiftNumber),
        notInArray(checks.chkStatusId, [1, 5, 9])
      ))
      .all();

      const cashReceived = checksList.reduce((sum, c) => sum + (c.cash || 0) + (c.tipsCash || 0), 0);
      const expectedClosingCash = activeShift.startingCash + cashReceived;

      db.update(shifts)
        .set({
          status: 'closed',
          actualClosingCash,
          expectedClosingCash,
          closedBy: userId,
          updatedAt: nowStr
        })
        .where(eq(shifts.id, activeShift.id))
        .run();

      await this.logShiftAction(userId, activeShift.id, businessDate, 'WORK_SHIFT_CLOSE', {
        shiftNumber: activeShift.shiftNumber,
        startingCash: activeShift.startingCash,
        expectedClosingCash,
        actualClosingCash,
        isEod: true
      });
    }

    db.insert(closedDays).values({
      id: crypto.randomUUID(),
      closedDate: businessDate,
      closedBy: userId,
      closeTime: nowStr,
      createdAt: nowStr,
      updatedAt: nowStr
    }).run();

    await this.logShiftAction(userId, activeShift?.id || null, businessDate, 'WORKDAY_CLOSE', {
      closedDate: businessDate,
      closedBy: userId,
      closeTime: nowStr
    });

    const nextBusinessDate = (() => {
      const dateParts = businessDate.split('-');
      const year = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1;
      const day = parseInt(dateParts[2], 10);
      const d = new Date(Date.UTC(year, month, day));
      d.setUTCDate(d.getUTCDate() + 1);
      return d.toISOString().split('T')[0];
    })();

    const newShift: ShiftSelect = {
      id: crypto.randomUUID(),
      shiftNumber: 1,
      businessDate: nextBusinessDate,
      openedBy: userId,
      closedBy: null,
      startingCash: finalClosingCash,
      expectedClosingCash: null,
      actualClosingCash: null,
      status: 'open',
      cloudSyncId: null,
      createdAt: nowStr,
      updatedAt: nowStr
    };

    db.insert(shifts).values(newShift).run();

    return {
      closedDate: businessDate,
      nextBusinessDate,
      newShift
    };
  }

  private async logShiftAction(userId: string, shiftId: string | null, businessDate: string, actionType: string, details: any) {
    try {
      const userRecord = db
        .select({ username: users.username })
        .from(users)
        .where(eq(users.id, userId))
        .get();
      const username = userRecord?.username || 'Unknown User';

      logsDb.insert(screenLogs).values({
        id: crypto.randomUUID(),
        userId,
        username,
        shiftId,
        businessDate,
        actionType,
        details: JSON.stringify(details),
        synced: false,
        createdAt: new Date().toISOString()
      }).run();
    } catch (err) {
      console.error('Failed to write shift action log:', err);
    }
  }
}

export const shiftService = new ShiftService();
