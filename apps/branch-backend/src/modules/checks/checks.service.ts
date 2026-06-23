import { db } from '../../db';
import { checks, checkItems, checkItemModifiers, shifts, options, checkStatus, checkKind, tables, modifiers } from '../../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import crypto from 'crypto';
import { calculateCheckTotals } from '@goldensoft/core-schemas';
import type { CreateCheckInput, AddCheckItemInput, VoidCheckItemInput, EntCheckItemInput } from '@goldensoft/core-schemas';

export class ChecksService {
  
  private async recalculateCheckTotals(chkId: string) {
    const chkRecs = await db.select().from(checks).where(eq(checks.id, chkId)).limit(1);
    if (chkRecs.length === 0) return null;
    const chk = chkRecs[0];

    const items = await db.select().from(checkItems).where(eq(checkItems.chkId, chkId));
    
    const allItemIds = items.map(i => i.id);
    let modifiersList: any[] = [];
    if (allItemIds.length > 0) {
      const allMods = await db.select({
        id: checkItemModifiers.id,
        checkItemId: checkItemModifiers.checkItemId,
        menuItemModifierId: checkItemModifiers.menuItemModifierId,
        modifierId: checkItemModifiers.modifierId,
        qty: checkItemModifiers.qty,
        name: modifiers.name,
        price: modifiers.price
      })
      .from(checkItemModifiers)
      .leftJoin(modifiers, eq(checkItemModifiers.modifierId, modifiers.id));
      modifiersList = allMods.filter(m => allItemIds.includes(m.checkItemId));
    }
    
    const optsList = await db.select().from(options).limit(1);
    const opts = optsList[0] || { serviceChargePercent: 0, taxPercent: 0, entTax: 0 };

    const mapItem = (i: any) => ({
      qty: i.qty,
      entQty: i.entQty,
      itemPrice: i.itemPrice,
      modifiers: modifiersList.filter(m => m.checkItemId === i.id).map(m => ({ price: m.price || 0, qty: m.qty }))
    });

    const totals = calculateCheckTotals(
      items.map(mapItem),
      0, // calculate base first to apply percent
      chk.deliveryCharge || 0,
      {
        serviceChargePercent: opts.serviceChargePercent || 0,
        taxPercent: opts.taxPercent || 0,
        entTax: opts.entTax || 0
      }
    );

    let actualDiscountValue = chk.discount || 0;
    if ((chk.discountPercent || 0) > 0) {
      actualDiscountValue = totals.totalItemsValue * ((chk.discountPercent || 0) / 100);
    }

    const finalTotals = calculateCheckTotals(
      items.map(mapItem),
      actualDiscountValue,
      chk.deliveryCharge || 0,
      {
        serviceChargePercent: opts.serviceChargePercent || 0,
        taxPercent: opts.taxPercent || 0,
        entTax: opts.entTax || 0
      }
    );

    // Update the check record
    await db.update(checks)
      .set({
        discount: actualDiscountValue, // maybe we save the exact value it equated to? Or we just save it in the DB update? Actually we don't need to rewrite discount here, let it be. But maybe we do? Wait, we'll keep `discount` as the absolute value applied.
        net: finalTotals.net,
        serviceCharge: finalTotals.serviceCharge,
        tax: finalTotals.tax,
        entTax: finalTotals.entTax,
        total: finalTotals.total,
        updatedAt: new Date().toISOString()
      })
      .where(eq(checks.id, chkId));

    return await this.getCheckById(chkId);
  }

  async getOpenChecks() {
    return await db.select().from(checks).where(eq(checks.chkStatusId, 1)).orderBy(desc(checks.createdAt));
  }

  async getCheckById(id: string) {
    const chkList = await db.select().from(checks).where(eq(checks.id, id)).limit(1);
    if (chkList.length === 0) return null;
    const chk = chkList[0];

    const items = await db.select().from(checkItems).where(eq(checkItems.chkId, id));
    const allItemIds = items.map(i => i.id);
    
    let modifiersList: any[] = [];
    if (allItemIds.length > 0) {
      // We would ideally use an IN clause but since it's an array we can do it manually or fetch all and filter
      const allMods = await db.select({
        id: checkItemModifiers.id,
        checkItemId: checkItemModifiers.checkItemId,
        menuItemModifierId: checkItemModifiers.menuItemModifierId,
        modifierId: checkItemModifiers.modifierId,
        qty: checkItemModifiers.qty,
        name: modifiers.name,
        price: modifiers.price
      })
      .from(checkItemModifiers)
      .leftJoin(modifiers, eq(checkItemModifiers.modifierId, modifiers.id));
      
      modifiersList = allMods.filter(m => allItemIds.includes(m.checkItemId));
    }

    const itemsWithMods = items.map(item => ({
      ...item,
      modifiers: modifiersList.filter(m => m.checkItemId === item.id)
    }));

    return {
      ...chk,
      items: itemsWithMods
    };
  }

  async createCheck(data: CreateCheckInput, userId: string) {
    // Determine active shift to grab businessDate and shift number
    const activeShifts = await db.select().from(shifts).where(eq(shifts.status, 'open')).limit(1);
    if (activeShifts.length === 0) {
      throw new Error("No active shift found. Please open a shift first.");
    }
    const currentShift = activeShifts[0];

    const todayStr = currentShift.businessDate;

    // Auto-generate a chkNo (we should use a sequence, but for simplicity we take max + 1)
    const existingChecks = await db.select({ chkNo: checks.chkNo }).from(checks).orderBy(desc(checks.chkNo)).limit(1);
    const nextChkNo = existingChecks.length > 0 ? existingChecks[0].chkNo + 1 : 1000;

    const checkId = crypto.randomUUID();

    // If dining, determine delivery charge based on CheckKind
    let deliveryCharge = 0;
    if (data.checkKindId === 3) { // Delivery
      const opts = await db.select().from(options).limit(1);
      deliveryCharge = opts[0]?.fixedDeliveryCharge || 0;
    }

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];

    await db.insert(checks).values({
      id: checkId,
      chkNo: nextChkNo,
      transactionNo: nextChkNo,
      chkDate: todayStr, // using business date
      chkTime: timeStr,
      checkKindId: data.checkKindId,
      tableId: data.tableId || null,
      tableName: data.tableName || null,
      chkStatusId: 1, // Open
      guestCount: data.guestCount,
      cashierId: userId,
      waiterId: userId,
      shift: currentShift.shiftNumber,
      deliveryCharge: deliveryCharge,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    });

    return await this.getCheckById(checkId);
  }

  async addCheckItem(chkId: string, data: AddCheckItemInput, userId: string) {
    // Validate check is open
    const chk = await db.select({ chkStatusId: checks.chkStatusId }).from(checks).where(eq(checks.id, chkId)).limit(1);
    if (!chk.length || chk[0].chkStatusId !== 1) {
      throw new Error("Check is not open or does not exist.");
    }

    const itemId = crypto.randomUUID();
    
    // We should look up the actual menu item price, but we assume it's passed or lookup here.
    // For robust implementation, we fetch the price from menuItemPrices
    const { menuItemPrices } = await import('../../db/schema');
    const prices = await db.select().from(menuItemPrices).where(eq(menuItemPrices.menuItemId, data.menuItemId)).limit(1);
    const price = prices.length > 0 ? prices[0].diningPrice : 0; // simplistic assumption

    await db.insert(checkItems).values({
      id: itemId,
      chkId: chkId,
      menuItemId: data.menuItemId,
      itemPrice: price,
      qty: data.qty,
      notes: data.notes || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    if (data.modifiers && data.modifiers.length > 0) {
      const modsToInsert = data.modifiers.map(m => ({
        id: crypto.randomUUID(),
        checkItemId: itemId,
        menuItemModifierId: m.menuItemModifierId,
        modifierId: m.modifierId,
        qty: m.qty,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
      await db.insert(checkItemModifiers).values(modsToInsert);
    }

    return await this.recalculateCheckTotals(chkId);
  }

  async voidCheckItem(chkId: string, itemId: string, data: VoidCheckItemInput, userId: string) {
    const items = await db.select().from(checkItems).where(eq(checkItems.id, itemId)).limit(1);
    if (items.length === 0) throw new Error("Item not found");
    const item = items[0];

    if (data.voidQty > item.qty) {
      throw new Error("Void quantity exceeds available quantity");
    }

    // "voidQty increased by voided item qty and itemqty will decrease by voided item qty also"
    const newQty = item.qty - data.voidQty;
    const newVoidQty = item.voidQty + data.voidQty;

    await db.update(checkItems)
      .set({
        qty: newQty,
        voidQty: newVoidQty,
        voidReasonId: data.voidReasonId,
        voidBy: userId,
        updatedAt: new Date().toISOString()
      })
      .where(eq(checkItems.id, itemId));

    return await this.recalculateCheckTotals(chkId);
  }

  async entCheckItem(chkId: string, itemId: string, data: EntCheckItemInput, userId: string) {
    const items = await db.select().from(checkItems).where(eq(checkItems.id, itemId)).limit(1);
    if (items.length === 0) throw new Error("Item not found");
    const item = items[0];

    const maxEntAllowed = item.qty; // Cannot ENT more than available billable qty
    if (data.entQty > maxEntAllowed) {
      throw new Error("ENT quantity exceeds available quantity");
    }

    const newEntQty = item.entQty + data.entQty;

    await db.update(checkItems)
      .set({
        entQty: newEntQty,
        entBy: userId,
        updatedAt: new Date().toISOString()
      })
      .where(eq(checkItems.id, itemId));

    return await this.recalculateCheckTotals(chkId);
  }

  async voidCheck(chkId: string, voidReason: string, userId: string) {
    const chkList = await db.select().from(checks).where(eq(checks.id, chkId)).limit(1);
    if (chkList.length === 0) throw new Error("Check not found");

    // Check status 3 = Void
    await db.update(checks)
      .set({
        chkStatusId: 3,
        voidReason: voidReason,
        voidBy: userId,
        updatedAt: new Date().toISOString()
      })
      .where(eq(checks.id, chkId));

    return await this.getCheckById(chkId);
  }

  async updateCheckDiscount(chkId: string, data: { discount: number; discountPercent: number }, userId: string) {
    const chkList = await db.select().from(checks).where(eq(checks.id, chkId)).limit(1);
    if (chkList.length === 0) throw new Error("Check not found");

    await db.update(checks)
      .set({
        discount: data.discount,
        discountPercent: data.discountPercent,
        updatedAt: new Date().toISOString()
      })
      .where(eq(checks.id, chkId));

    return await this.recalculateCheckTotals(chkId);
  }
}

export const checksService = new ChecksService();
