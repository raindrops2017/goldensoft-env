import { db } from '../../db';
import { checks, checkItems, checkItemModifiers, shifts, options, checkStatus, checkKind, tables, modifiers, menuItems, users, rolePermissions, permissions, printers, roles } from '../../db/schema';
import { eq, and, desc, gte, lte, gt, lt } from 'drizzle-orm';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { calculateCheckTotals } from '@goldensoft/core-schemas';
import type { CreateCheckInput, AddCheckItemInput, VoidCheckItemInput, EntCheckItemInput, SplitCheckInput, CloseCheckInput } from '@goldensoft/core-schemas';
import { PERMISSIONS } from '@goldensoft/core-schemas';
import { checksPrinter } from './checks.printer';

export class ChecksService {
  
  private recalculateCheckTotalsSync(chkId: string, tx: any = db) {
    const chk = tx.select().from(checks).where(eq(checks.id, chkId)).get() as any;
    if (!chk) return null;

    const items = tx.select().from(checkItems).where(eq(checkItems.chkId, chkId)).all() as any[];
    
    const allItemIds = items.map((i: any) => i.id);
    let modifiersList: any[] = [];
    if (allItemIds.length > 0) {
      const allMods = tx.select({
        id: checkItemModifiers.id,
        checkItemId: checkItemModifiers.checkItemId,
        menuItemModifierId: checkItemModifiers.menuItemModifierId,
        modifierId: checkItemModifiers.modifierId,
        qty: checkItemModifiers.qty,
        name: modifiers.name,
        price: modifiers.price
      })
      .from(checkItemModifiers)
      .leftJoin(modifiers, eq(checkItemModifiers.modifierId, modifiers.id))
      .all() as any[];
      modifiersList = allMods.filter((m: any) => allItemIds.includes(m.checkItemId));
    }
    
    const opts = (tx.select().from(options).get() || { serviceChargePercent: 0, taxPercent: 0, entTax: 0 }) as any;

    const mapItem = (i: any) => ({
      qty: i.qty,
      entQty: i.entQty,
      itemPrice: i.itemPrice,
      modifiers: modifiersList.filter((m: any) => m.checkItemId === i.id).map((m: any) => ({ price: m.price || 0, qty: m.qty }))
    });

    const isDining = chk.checkKindId === 1;
    const serviceChargePercent = isDining ? (opts.serviceChargePercent || 0) : 0;

    const totals = calculateCheckTotals(
      items.map(mapItem),
      0, // calculate base first to apply percent
      chk.deliveryCharge || 0,
      {
        serviceChargePercent,
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
        serviceChargePercent,
        taxPercent: opts.taxPercent || 0,
        entTax: opts.entTax || 0
      }
    );

    // Update the check record
    tx.update(checks)
      .set({
        discount: actualDiscountValue,
        net: finalTotals.net,
        serviceCharge: finalTotals.serviceCharge,
        tax: finalTotals.tax,
        entTax: finalTotals.entTax,
        total: finalTotals.total,
        updatedAt: new Date().toISOString()
      })
      .where(eq(checks.id, chkId))
      .run();

    return this.getCheckByIdSync(chkId, tx);
  }

  private async recalculateCheckTotals(chkId: string, tx: any = db) {
    return this.recalculateCheckTotalsSync(chkId, tx);
  }

  private validateWaiterAccessSync(chk: any, userId: string, tx: any = db) {
    const userRole = tx.select({ isWaiter: roles.isWaiter })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.id, userId))
      .get() as any;

    const isWaiterUser = userRole && !!userRole.isWaiter;

    if (isWaiterUser) {
      if (!chk.waiterId) {
        throw new Error("Forbidden: Waiters are strictly blocked from operating on checks where waiterId is null, unless a supervisor assigns them first.");
      }
      if (chk.waiterId !== userId) {
        throw new Error("Forbidden: This check belongs to another waiter.");
      }
    } else {
      if (chk.cashierId !== userId) {
        tx.update(checks)
          .set({ cashierId: userId, updatedAt: new Date().toISOString() })
          .where(eq(checks.id, chk.id))
          .run();
        chk.cashierId = userId;
      }
    }
  }

  private async validateWaiterAccess(chk: any, userId: string, tx: any = db) {
    return this.validateWaiterAccessSync(chk, userId, tx);
  }

  async getOpenChecks() {
    const list = await db.select().from(checks).where(eq(checks.chkStatusId, 1)).orderBy(desc(checks.createdAt));
    return list.map(chk => this.getCheckByIdSync(chk.id)).filter(Boolean);
  }

  async getHistoricalChecks(filters: any) {
    const conditions = [];

    if (filters.status) {
      conditions.push(eq(checks.chkStatusId, Number(filters.status)));
    }
    if (filters.dateFrom) {
      conditions.push(gte(checks.chkDate, filters.dateFrom));
    }
    if (filters.dateTo) {
      conditions.push(lte(checks.chkDate, filters.dateTo));
    }
    if (filters.chkNo) {
      conditions.push(eq(checks.chkNo, Number(filters.chkNo)));
    }
    if (filters.tableId) {
      conditions.push(eq(checks.tableId, filters.tableId));
    }
    
    if (filters.amountValue !== undefined && filters.amountValue !== null && filters.amountOperator) {
      const val = Number(filters.amountValue);
      switch (filters.amountOperator) {
        case '>':
          conditions.push(gt(checks.total, val));
          break;
        case '<':
          conditions.push(lt(checks.total, val));
          break;
        case '>=':
          conditions.push(gte(checks.total, val));
          break;
        case '<=':
          conditions.push(lte(checks.total, val));
          break;
        case '=':
          conditions.push(eq(checks.total, val));
          break;
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const list = await db.select().from(checks).where(whereClause).orderBy(desc(checks.createdAt));
    return list.map(chk => this.getCheckByIdSync(chk.id)).filter(Boolean);
  }

  getCheckByIdSync(id: string, tx: any = db) {
    const chk = tx.select().from(checks).where(eq(checks.id, id)).get();
    if (!chk) return null;

    let waiterName: string | null = null;
    if (chk.waiterId) {
      const w = tx.select({ username: users.username }).from(users).where(eq(users.id, chk.waiterId)).get() as any;
      if (w) waiterName = w.username;
    }

    let cashierName: string | null = null;
    if (chk.cashierId) {
      const c = tx.select({ username: users.username }).from(users).where(eq(users.id, chk.cashierId)).get() as any;
      if (c) cashierName = c.username;
    }

    const items = tx.select({
      id: checkItems.id,
      chkId: checkItems.chkId,
      menuItemId: checkItems.menuItemId,
      itemPrice: checkItems.itemPrice,
      qty: checkItems.qty,
      notes: checkItems.notes,
      voidQty: checkItems.voidQty,
      voidBy: checkItems.voidBy,
      voidReasonId: checkItems.voidReasonId,
      voidKind: checkItems.voidKind,
      entQty: checkItems.entQty,
      entBy: checkItems.entBy,
      cloudSyncId: checkItems.cloudSyncId,
      createdAt: checkItems.createdAt,
      updatedAt: checkItems.updatedAt,
      itemName: menuItems.name,
      arabicName: menuItems.arabicName
    })
    .from(checkItems)
    .leftJoin(menuItems, eq(checkItems.menuItemId, menuItems.id))
    .where(eq(checkItems.chkId, id))
    .all() as any[];
    const allItemIds = items.map(i => i.id);
    
    let modifiersList: any[] = [];
    if (allItemIds.length > 0) {
      // We would ideally use an IN clause but since it's an array we can do it manually or fetch all and filter
      const allMods = tx.select({
        id: checkItemModifiers.id,
        checkItemId: checkItemModifiers.checkItemId,
        menuItemModifierId: checkItemModifiers.menuItemModifierId,
        modifierId: checkItemModifiers.modifierId,
        qty: checkItemModifiers.qty,
        name: modifiers.name,
        price: modifiers.price
      })
      .from(checkItemModifiers)
      .leftJoin(modifiers, eq(checkItemModifiers.modifierId, modifiers.id))
      .all() as any[];
      
      modifiersList = allMods.filter(m => allItemIds.includes(m.checkItemId));
    }

    const itemsWithMods = items.map(item => ({
      ...item,
      modifiers: modifiersList.filter(m => m.checkItemId === item.id)
    }));

    return {
      ...chk,
      waiterName,
      cashierName,
      items: itemsWithMods
    };
  }

  async getCheckById(id: string, tx: any = db) {
    return this.getCheckByIdSync(id, tx);
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

    const userRole = await db.select({ isWaiter: roles.isWaiter })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.id, userId))
      .limit(1);
    const isWaiterUser = userRole.length > 0 && !!userRole[0].isWaiter;

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
      cashierId: isWaiterUser ? null : userId,
      waiterId: isWaiterUser ? userId : null,
      shift: currentShift.shiftNumber,
      deliveryCharge: deliveryCharge,
      customerName: data.customerName || null,
      customerPhone: data.customerPhone || null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    });

    return await this.getCheckById(checkId);
  }

  async addCheckItem(chkId: string, data: AddCheckItemInput, userId: string) {
    // Validate check is open
    const chk = await db.select({ 
      id: checks.id,
      chkStatusId: checks.chkStatusId,
      waiterId: checks.waiterId,
      cashierId: checks.cashierId
    }).from(checks).where(eq(checks.id, chkId)).limit(1);
    if (!chk.length || chk[0].chkStatusId !== 1) {
      throw new Error("Check is not open or does not exist.");
    }
    await this.validateWaiterAccess(chk[0], userId);

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
    const chk = await db.select({
      id: checks.id,
      chkStatusId: checks.chkStatusId,
      waiterId: checks.waiterId,
      cashierId: checks.cashierId
    }).from(checks).where(eq(checks.id, chkId)).limit(1);
    if (!chk.length || chk[0].chkStatusId !== 1) {
      throw new Error("Closed check cannot be modified.");
    }
    await this.validateWaiterAccess(chk[0], userId);

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
    const chk = await db.select({
      id: checks.id,
      chkStatusId: checks.chkStatusId,
      waiterId: checks.waiterId,
      cashierId: checks.cashierId
    }).from(checks).where(eq(checks.id, chkId)).limit(1);
    if (!chk.length || chk[0].chkStatusId !== 1) {
      throw new Error("Closed check cannot be modified.");
    }
    await this.validateWaiterAccess(chk[0], userId);

    const items = await db.select().from(checkItems).where(eq(checkItems.id, itemId)).limit(1);
    if (items.length === 0) throw new Error("Item not found");
    const item = items[0];

    const newEntQty = item.entQty + data.entQty;
    if (newEntQty < 0) {
      throw new Error("Complimentary quantity cannot be less than zero.");
    }
    if (newEntQty > item.qty) {
      throw new Error("ENT quantity exceeds available quantity");
    }

    // Check if comping this would make the entire check's billable quantity 0
    const allItemsInCheck = await db.select({ id: checkItems.id, qty: checkItems.qty, entQty: checkItems.entQty }).from(checkItems).where(eq(checkItems.chkId, chkId)).all();
    let totalBillableQty = 0;
    for (const it of allItemsInCheck) {
      totalBillableQty += Math.max(0, it.qty - it.entQty);
    }
    if (totalBillableQty - data.entQty <= 0) {
      throw new Error("Cannot comp the last remaining billable item in the check.");
    }

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
    const chk = chkList[0];
    if (chk.chkStatusId !== 1) {
      throw new Error("Closed check cannot be modified.");
    }
    await this.validateWaiterAccess(chk, userId);

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
    const chk = chkList[0];
    if (chk.chkStatusId !== 1) {
      throw new Error("Closed check cannot be modified.");
    }
    await this.validateWaiterAccess(chk, userId);

    // Discount Rule: if data.discount > 0 and data.discountPercent === 0, it is a discount value (amount).
    // Ensure discount value <= 49% of subtotal (totalItemsValue before discount)
    if (data.discount > 0 && (!data.discountPercent || data.discountPercent === 0)) {
      const items = db.select().from(checkItems).where(eq(checkItems.chkId, chkId)).all() as any[];
      let totalItemsValue = 0;
      for (const item of items) {
        const billableQty = Math.max(0, item.qty - item.entQty);
        let itemPriceTotal = item.itemPrice;
        const mods = db.select({ price: modifiers.price, qty: checkItemModifiers.qty })
          .from(checkItemModifiers)
          .leftJoin(modifiers, eq(checkItemModifiers.modifierId, modifiers.id))
          .where(eq(checkItemModifiers.checkItemId, item.id))
          .all();
        for (const m of mods) {
          itemPriceTotal += (m.price || 0) * (m.qty || 1);
        }
        totalItemsValue += itemPriceTotal * billableQty;
      }
      if (data.discount > 0.49 * totalItemsValue) {
        throw new Error("Discount value must not exceed 49% of the subtotal.");
      }
    }

    await db.update(checks)
      .set({
        discount: data.discount,
        discountPercent: data.discountPercent,
        discountBy: userId,
        updatedAt: new Date().toISOString()
      })
      .where(eq(checks.id, chkId));

    return await this.recalculateCheckTotals(chkId);
  }

  async splitCheck(chkId: string, data: SplitCheckInput, userId: string) {
    return db.transaction((tx) => {
      // 1. Get original check and validate it exists and is open
      const sourceCheck = this.getCheckByIdSync(chkId, tx);
      if (!sourceCheck) {
        throw new Error("Source check not found");
      }
      if (sourceCheck.chkStatusId !== 1) {
        throw new Error("Only open checks can be split");
      }

      this.validateWaiterAccessSync(sourceCheck, userId, tx);

      const userRole = tx.select({ isWaiter: roles.isWaiter })
        .from(users)
        .leftJoin(roles, eq(users.roleId, roles.id))
        .where(eq(users.id, userId))
        .get() as any;
      const isWaiterUser = userRole && !!userRole.isWaiter;
      const newCashierId = isWaiterUser ? null : userId;

      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];

      // Get next check numbers
      const existingChecks = tx.select({ chkNo: checks.chkNo })
        .from(checks)
        .orderBy(desc(checks.chkNo))
        .limit(1)
        .all();
      let nextChkNo = existingChecks.length > 0 ? existingChecks[0].chkNo + 1 : 1000;

      const createdCheckIds: string[] = [];
      const tableIdsToUpdate = new Set<string>();
      if (sourceCheck.tableId) {
        tableIdsToUpdate.add(sourceCheck.tableId);
      }

      // Resolve source table name if missing
      if (!sourceCheck.tableName && sourceCheck.tableId) {
        const tableRec = tx.select().from(tables).where(eq(tables.id, sourceCheck.tableId)).limit(1).get() as any;
        if (tableRec) {
          sourceCheck.tableName = tableRec.name || `Table ${tableRec.number}`;
          tx.update(checks)
            .set({ tableName: sourceCheck.tableName, updatedAt: now.toISOString() })
            .where(eq(checks.id, chkId))
            .run();
        }
      }

      if (data.type === 'evenly') {
        const count = data.evenSplitCount;
        if (!count || count < 2) {
          throw new Error("Invalid even split count");
        }

        const fraction = 1 / count;

        // Create count - 1 new checks
        for (let i = 0; i < count - 1; i++) {
          const newCheckId = crypto.randomUUID();
          const targetChkNo = nextChkNo++;

          tx.insert(checks).values({
            id: newCheckId,
            chkNo: targetChkNo,
            transactionNo: targetChkNo,
            chkDate: sourceCheck.chkDate,
            chkTime: timeStr,
            checkKindId: sourceCheck.checkKindId,
            tableId: sourceCheck.tableId || null,
            tableName: sourceCheck.tableName || null,
            chkStatusId: sourceCheck.chkStatusId,
            printCount: sourceCheck.printCount,
            guestCount: 1, // Default to 1
            cashierId: newCashierId,
            waiterId: sourceCheck.waiterId,
            shift: sourceCheck.shift,
            deliveryCharge: sourceCheck.deliveryCharge || 0,
            discount: 0, // Clear value discount
            discountPercent: sourceCheck.discountPercent || 0, // Copy percent discount
            createdAt: now.toISOString(),
            updatedAt: now.toISOString()
          }).run();

          createdCheckIds.push(newCheckId);

          // For each item in original check, duplicate with fractional quantity
          for (const item of sourceCheck.items) {
            const newCheckItemId = crypto.randomUUID();
            const newQty = item.qty * fraction;

            tx.insert(checkItems).values({
              id: newCheckItemId,
              chkId: newCheckId,
              menuItemId: item.menuItemId,
              itemPrice: item.itemPrice,
              qty: newQty,
              notes: item.notes,
              voidQty: item.voidQty * fraction,
              entQty: item.entQty * fraction,
              createdAt: now.toISOString(),
              updatedAt: now.toISOString()
            }).run();

            // Clone modifiers proportionally
            if (item.modifiers && item.modifiers.length > 0) {
              const modsToInsert = item.modifiers.map((m: any) => ({
                id: crypto.randomUUID(),
                checkItemId: newCheckItemId,
                menuItemModifierId: m.menuItemModifierId,
                modifierId: m.modifierId,
                qty: m.qty * fraction,
                createdAt: now.toISOString(),
                updatedAt: now.toISOString()
              }));
              tx.insert(checkItemModifiers).values(modsToInsert).run();
            }
          }
        }

        // Update original check items
        for (const item of sourceCheck.items) {
          const newQty = item.qty * fraction;
          tx.update(checkItems)
            .set({
              qty: newQty,
              voidQty: item.voidQty * fraction,
              entQty: item.entQty * fraction,
              updatedAt: now.toISOString()
            })
            .where(eq(checkItems.id, item.id))
            .run();

          // Update original modifiers
          if (item.modifiers && item.modifiers.length > 0) {
            for (const m of item.modifiers) {
              tx.update(checkItemModifiers)
                .set({
                  qty: m.qty * fraction,
                  updatedAt: now.toISOString()
                })
                .where(eq(checkItemModifiers.id, m.id))
                .run();
            }
          }
        }

        // Clear value discount on source check if no percent discount
        if (!sourceCheck.discountPercent || sourceCheck.discountPercent === 0) {
          tx.update(checks)
            .set({ discount: 0, updatedAt: now.toISOString() })
            .where(eq(checks.id, chkId))
            .run();
        }

      } else {
        // type === 'items'
        const splits = data.itemsSplits;
        if (!splits || splits.length === 0) {
          throw new Error("No items splits provided");
        }

        // Keep track of remaining quantities on source check during the loop
        const sourceItemRemainingQty = new Map<string, number>();
        for (const item of sourceCheck.items) {
          sourceItemRemainingQty.set(item.id, item.qty);
        }

        for (const split of splits) {
          const newCheckId = crypto.randomUUID();
          const targetChkNo = nextChkNo++;

          // Resolve target table
          let targetTableId = sourceCheck.tableId || null;
          let targetTableName = split.tableName || sourceCheck.tableName || null;
          if (split.tableId) {
            const tableRec = tx.select().from(tables).where(eq(tables.id, split.tableId)).limit(1).all();
            if (tableRec.length > 0) {
              targetTableId = tableRec[0].id;
              targetTableName = split.tableName || tableRec[0].name || `Table ${tableRec[0].number}`;
              tableIdsToUpdate.add(targetTableId);
            }
          }

          tx.insert(checks).values({
            id: newCheckId,
            chkNo: targetChkNo,
            transactionNo: targetChkNo,
            chkDate: sourceCheck.chkDate,
            chkTime: timeStr,
            checkKindId: sourceCheck.checkKindId,
            tableId: targetTableId,
            tableName: targetTableName,
            chkStatusId: sourceCheck.chkStatusId,
            printCount: sourceCheck.printCount,
            guestCount: split.guestCount || 1,
            cashierId: newCashierId,
            waiterId: sourceCheck.waiterId,
            shift: sourceCheck.shift,
            deliveryCharge: sourceCheck.deliveryCharge || 0,
            discount: 0, // Clear value discount
            discountPercent: sourceCheck.discountPercent || 0, // Copy percent discount
            createdAt: now.toISOString(),
            updatedAt: now.toISOString()
          }).run();

          createdCheckIds.push(newCheckId);

          for (const splitItem of split.items) {
            const sourceItem = sourceCheck.items.find((i: any) => i.id === splitItem.checkItemId);
            if (!sourceItem) {
              throw new Error(`Item ${splitItem.checkItemId} not found on source check`);
            }

            const currentAvailable = sourceItemRemainingQty.get(sourceItem.id) || 0;
            if (splitItem.qty > currentAvailable) {
              throw new Error(`Quantity ${splitItem.qty} exceeds available ${currentAvailable} for item ID ${sourceItem.id}`);
            }

            const nextRemaining = currentAvailable - splitItem.qty;
            sourceItemRemainingQty.set(sourceItem.id, nextRemaining);

            if (splitItem.qty === currentAvailable) {
              // Move full quantity: re-link checks
              tx.update(checkItems)
                .set({
                  chkId: newCheckId,
                  updatedAt: now.toISOString()
                })
                .where(eq(checkItems.id, sourceItem.id))
                .run();
            } else {
              // Move partial quantity: insert new item and clone modifiers
              const newCheckItemId = crypto.randomUUID();
              tx.insert(checkItems).values({
                id: newCheckItemId,
                chkId: newCheckId,
                menuItemId: sourceItem.menuItemId,
                itemPrice: sourceItem.itemPrice,
                qty: splitItem.qty,
                notes: sourceItem.notes,
                createdAt: now.toISOString(),
                updatedAt: now.toISOString()
              }).run();

              // Subtract quantity from source item
              tx.update(checkItems)
                .set({
                  qty: nextRemaining,
                  updatedAt: now.toISOString()
                })
                .where(eq(checkItems.id, sourceItem.id))
                .run();

              // Clone modifiers proportionally
              if (sourceItem.modifiers && sourceItem.modifiers.length > 0) {
                const ratio = splitItem.qty / sourceItem.qty;

                const modsToInsert = sourceItem.modifiers.map((m: any) => ({
                  id: crypto.randomUUID(),
                  checkItemId: newCheckItemId,
                  menuItemModifierId: m.menuItemModifierId,
                  modifierId: m.modifierId,
                  qty: m.qty * ratio,
                  createdAt: now.toISOString(),
                  updatedAt: now.toISOString()
                }));
                tx.insert(checkItemModifiers).values(modsToInsert).run();

                // Update original modifier quantities
                for (const m of sourceItem.modifiers) {
                  tx.update(checkItemModifiers)
                    .set({
                      qty: m.qty * (1 - ratio),
                      updatedAt: now.toISOString()
                    })
                    .where(eq(checkItemModifiers.id, m.id))
                    .run();
                }
              }
            }
          }
        }

        // Adjust original check discount (if value, clear it)
        if (!sourceCheck.discountPercent || sourceCheck.discountPercent === 0) {
          tx.update(checks)
            .set({ discount: 0, updatedAt: now.toISOString() })
            .where(eq(checks.id, chkId))
            .run();
        }
      }

      // Recalculate totals
      this.recalculateCheckTotalsSync(chkId, tx);
      for (const newCheckId of createdCheckIds) {
        this.recalculateCheckTotalsSync(newCheckId, tx);
      }

      // Get full return data
      const updatedSourceCheck = this.getCheckByIdSync(chkId, tx);
      const splitChecksList = [];
      for (const newCheckId of createdCheckIds) {
        const c = this.getCheckByIdSync(newCheckId, tx);
        if (c) splitChecksList.push(c);
      }

      return {
        sourceCheck: updatedSourceCheck,
        splitChecks: splitChecksList,
        tableIds: Array.from(tableIdsToUpdate)
      };
    });
  }

  async checkUserHasPermission(userId: string, requiredPermission: string): Promise<boolean> {
    const matchedUser = db.select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.isActive, true)))
      .get() as any;

    if (!matchedUser || !matchedUser.roleId) {
      return false;
    }

    const perms = db.select({ name: permissions.name })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, matchedUser.roleId))
      .all();
    
    return perms.map(p => p.name).includes(requiredPermission);
  }

  async verifySupervisorPin(pin: string, requiredPermission: string, supervisorId?: string): Promise<boolean> {
    let matchedUser = null;
    if (supervisorId) {
      matchedUser = db.select()
        .from(users)
        .where(and(eq(users.id, supervisorId), eq(users.isActive, true)))
        .get() as any;
    } else {
      const activeUsers = db.select().from(users).where(eq(users.isActive, true)).all();
      for (const u of activeUsers) {
        if (bcrypt.compareSync(pin, u.pin)) {
          matchedUser = u;
          break;
        }
      }
    }

    if (!matchedUser) {
      return false;
    }

    if (!bcrypt.compareSync(pin, matchedUser.pin)) {
      return false;
    }

    // Retrieve user permissions
    let userPermissions: string[] = [];
    if (matchedUser.roleId) {
      const perms = db.select({ name: permissions.name })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(eq(rolePermissions.roleId, matchedUser.roleId))
        .all();
      userPermissions = perms.map(p => p.name);
    }

    return userPermissions.includes(requiredPermission);
  }

  async printCheck(
    chkId: string,
    userId: string,
    options: { supervisorPin?: string; supervisorId?: string; printerId?: string } = {}
  ) {
    const now = new Date();
    const chk = this.getCheckByIdSync(chkId);
    if (!chk) {
      throw new Error('Check not found');
    }

    if (chk.chkStatusId !== 1) {
      throw new Error("Closed check cannot be modified.");
    }
    const isPrinted = (chk.printCount || 0) > 0;
    const requiredPermission = isPrinted 
      ? 'check:reprint' 
      : 'check:print';

    // Validate permissions using supervisorPin if provided
    let effectiveUserId = userId;
    if (options.supervisorPin) {
      const isValid = await this.verifySupervisorPin(options.supervisorPin, requiredPermission, options.supervisorId);
      if (!isValid) {
        throw new Error(`Supervisor authorization failed. Requires permission ${requiredPermission}`);
      }
      if (options.supervisorId) {
        effectiveUserId = options.supervisorId;
      }
    }

    await this.validateWaiterAccess(chk, effectiveUserId);

    // Select printer
    let targetPrinter;
    if (options.printerId) {
      targetPrinter = db.select().from(printers).where(eq(printers.id, options.printerId)).get() as any;
      if (!targetPrinter) {
        throw new Error('Selected printer not found');
      }
    } else {
      targetPrinter = db.select().from(printers).where(eq(printers.isDefault, 1)).get() as any;
      if (!targetPrinter) {
        throw new Error('No default printer configured');
      }
    }

    // Increment printCount in db
    const nextPrintCount = (chk.printCount || 0) + 1;
    db.update(checks)
      .set({ 
        printCount: nextPrintCount, 
        updatedAt: now.toISOString() 
      })
      .where(eq(checks.id, chkId))
      .run();

    // Re-fetch check to have the updated print count in the printed receipt
    const updatedCheck = this.getCheckByIdSync(chkId);
    if (!updatedCheck) {
      throw new Error('Check not found after print update');
    }

    // Send to printing engine
    const printResult = await checksPrinter.print(updatedCheck, {
      name: targetPrinter.name,
      ipAddress: targetPrinter.ipAddress,
      port: targetPrinter.port,
    });

    return {
      check: updatedCheck,
      printResult
    };
  }

  async transferTable(chkId: string, targetTableId: string, userId: string, supervisorPin?: string, supervisorId?: string) {
    const chk = this.getCheckByIdSync(chkId);
    if (!chk) {
      throw new Error('Check not found');
    }

    if (chk.chkStatusId !== 1) {
      throw new Error('Only open checks can be transferred.');
    }

    const requiredPermission = PERMISSIONS.CHECK_TABLE_TRANSFER;
    let effectiveUserId = userId;
    if (supervisorPin) {
      const isValid = await this.verifySupervisorPin(supervisorPin, requiredPermission, supervisorId);
      if (!isValid) {
        throw new Error('Unauthorized: Invalid supervisor PIN or insufficient privileges.');
      }
      if (supervisorId) {
        effectiveUserId = supervisorId;
      }
    }

    await this.validateWaiterAccess(chk, effectiveUserId);

    // Load target table
    const targetTable = db.select().from(tables).where(eq(tables.id, targetTableId)).get() as any;
    if (!targetTable) {
      throw new Error('Target table not found');
    }

    const oldTableId = chk.tableId;

    // Update check table
    db.update(checks)
      .set({
        tableId: targetTableId,
        tableName: chk.tableName,
        updatedAt: new Date().toISOString()
      })
      .where(eq(checks.id, chkId))
      .run();

    const updatedCheck = this.getCheckByIdSync(chkId);
    return {
      check: updatedCheck,
      oldTableId
    };
  }

  async transferWaiter(chkId: string, targetWaiterId: string, userId: string, supervisorPin?: string, supervisorId?: string) {
    const chk = this.getCheckByIdSync(chkId);
    if (!chk) {
      throw new Error('Check not found');
    }

    if (chk.chkStatusId !== 1) {
      throw new Error('Only open checks can be transferred.');
    }

    const requiredPermission = PERMISSIONS.CHECK_WAITER_TRANSFER;
    let effectiveUserId = userId;
    if (supervisorPin) {
      const isValid = await this.verifySupervisorPin(supervisorPin, requiredPermission, supervisorId);
      if (!isValid) {
        throw new Error('Unauthorized: Invalid supervisor PIN or insufficient privileges.');
      }
      if (supervisorId) {
        effectiveUserId = supervisorId;
      }
    }

    await this.validateWaiterAccess(chk, effectiveUserId);

    // Verify target waiter exists and has role isWaiter = true
    const waiterUser = db.select({
      id: users.id,
      isWaiter: roles.isWaiter,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(and(eq(users.id, targetWaiterId), eq(users.isActive, true)))
    .get() as any;

    if (!waiterUser || !waiterUser.isWaiter) {
      throw new Error('Target user is not a valid active waiter');
    }

    // Update check waiter
    db.update(checks)
      .set({
        waiterId: targetWaiterId,
        updatedAt: new Date().toISOString()
      })
      .where(eq(checks.id, chkId))
      .run();

    return this.getCheckByIdSync(chkId);
  }

  async updateGuestCount(chkId: string, guestCount: number, userId: string, supervisorPin?: string, supervisorId?: string) {
    const chk = this.getCheckByIdSync(chkId);
    if (!chk) {
      throw new Error('Check not found');
    }

    if (chk.chkStatusId !== 1) {
      throw new Error('Only open checks can be modified.');
    }

    if (guestCount < 1) {
      throw new Error('Guest count must be at least 1');
    }

    const currentGuestCount = chk.guestCount || 1;

    // Decreasing guest count requires permission check
    if (guestCount < currentGuestCount) {
      const requiredPermission = PERMISSIONS.CHECK_GUEST_DECREASE;
      let effectiveUserId = userId;
      if (supervisorPin) {
        const isValid = await this.verifySupervisorPin(supervisorPin, requiredPermission, supervisorId);
        if (!isValid) {
          throw new Error('Unauthorized: Invalid supervisor PIN or insufficient privileges.');
        }
        if (supervisorId) {
          effectiveUserId = supervisorId;
        }
      } else {
        await this.validateWaiterAccess(chk, effectiveUserId);
        
        // Check if current user has role/permissions directly
        const userRec = db.select({ roleId: users.roleId }).from(users).where(eq(users.id, userId)).get() as any;
        let hasDirectPermission = false;
        if (userRec && userRec.roleId) {
          const permCheck = db.select({ name: permissions.name })
            .from(rolePermissions)
            .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
            .where(and(eq(rolePermissions.roleId, userRec.roleId), eq(permissions.name, requiredPermission)))
            .get();
          if (permCheck) {
            hasDirectPermission = true;
          }
        }

        if (!hasDirectPermission) {
          throw new Error(`Unauthorized: Requires permission ${requiredPermission}`);
        }
      }
    } else {
      await this.validateWaiterAccess(chk, userId);
    }

    db.update(checks)
      .set({
        guestCount,
        updatedAt: new Date().toISOString()
      })
      .where(eq(checks.id, chkId))
      .run();

    return await this.recalculateCheckTotals(chkId);
  }

  async updateTableName(chkId: string, tableName: string, userId: string) {
    const chk = this.getCheckByIdSync(chkId);
    if (!chk) {
      throw new Error('Check not found');
    }

    if (chk.chkStatusId !== 1) {
      throw new Error('Only open checks can be modified.');
    }

    await this.validateWaiterAccess(chk, userId);

    db.update(checks)
      .set({
        tableName: tableName || null,
        updatedAt: new Date().toISOString()
      })
      .where(eq(checks.id, chkId))
      .run();

    return this.getCheckByIdSync(chkId);
  }

  async updateCustomerInfo(chkId: string, customerName: string | null, customerPhone: string | null, userId: string) {
    const chk = this.getCheckByIdSync(chkId);
    if (!chk) {
      throw new Error('Check not found');
    }

    if (chk.chkStatusId !== 1) {
      throw new Error('Only open checks can be modified.');
    }

    await this.validateWaiterAccess(chk, userId);

    db.update(checks)
      .set({
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        updatedAt: new Date().toISOString()
      })
      .where(eq(checks.id, chkId))
      .run();

    return this.getCheckByIdSync(chkId);
  }

  async closeCheck(chkId: string, payload: CloseCheckInput, userId: string) {
    const chk = this.getCheckByIdSync(chkId);
    if (!chk) {
      throw new Error('Check not found');
    }

    if (chk.chkStatusId !== 1) {
      throw new Error('Only open checks can be modified.');
    }

    await this.validateWaiterAccess(chk, userId);

    if (payload.isComp) {
      const isPrinted = (chk.printCount || 0) > 0;
      const requiredPermission = isPrinted ? 'check.printed:comp' : 'check:comp';

      const hasDirectPermission = await this.checkUserHasPermission(userId, requiredPermission);
      if (!hasDirectPermission) {
        if (!payload.supervisorPin) {
          throw new Error('Supervisor authorization is required to complimentary this check.');
        }
        const isValid = await this.verifySupervisorPin(payload.supervisorPin, requiredPermission, payload.supervisorId || undefined);
        if (!isValid) {
          throw new Error(`Supervisor authorization failed. Requires permission ${requiredPermission}`);
        }
      }
    }

    const clAmount = payload.clAmount || 0;
    const visaAmount = payload.visaAmount || 0;
    const physicalCash = payload.cash || 0;
    
    const total = chk.total;

    const nonCashPaid = clAmount + visaAmount;
    const cashRequired = Math.max(0, total - nonCashPaid);
    
    const changeDue = Math.max(0, physicalCash - cashRequired);
    const cashApplied = Math.max(0, physicalCash - changeDue);

    let tipsCash = 0;
    let tipsVisa = 0;
    const tipsValue = payload.tips || 0;
    if (tipsValue > 0) {
      if (payload.paymentMethod === 'visa') {
        tipsVisa = tipsValue;
      } else {
        tipsCash = tipsValue;
      }
    }

    let targetStatusId = 2; // Cash default
    if (payload.chkStut) {
      targetStatusId = payload.chkStut;
    } else {
      if (payload.paymentMethod === 'visa') {
        targetStatusId = 3; // Visa
      } else if (payload.paymentMethod === 'cl') {
        targetStatusId = 4; // Owner CL
      } else if (payload.paymentMethod === 'mixed') {
        targetStatusId = 6; // Mixed
      }
    }

    const updatedValues: any = {
      cash: cashApplied,
      visa: visaAmount,
      credit: clAmount,
      paidCash: physicalCash,
      tipsCash: tipsCash,
      tipsVisa: tipsVisa,
      chkStatusId: targetStatusId,
      customerId: payload.customerId || null,
      customerName: payload.customerName || null,
      paymentNote: payload.clNote || null,
      visaNumber: payload.visaNo || null,
      closeTime: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (payload.tax !== undefined) updatedValues.tax = payload.tax;
    if (payload.service !== undefined) updatedValues.serviceCharge = payload.service;
    if (payload.discountAmount !== undefined) updatedValues.discount = payload.discountAmount;
    if (payload.discountPrsn !== undefined) updatedValues.discountPercent = payload.discountPrsn;
    if (payload.discountAmount && payload.discountAmount > 0) {
      updatedValues.discountBy = userId;
    }

    if (targetStatusId === 7) {
      updatedValues.entAmount = total;
      updatedValues.cash = 0;
      updatedValues.visa = 0;
      updatedValues.credit = 0;
      updatedValues.paidCash = 0;
      updatedValues.total = 0;
      updatedValues.discount = 0;
      updatedValues.discountPercent = 0;
      updatedValues.discountBy = null;
    }

    if (targetStatusId === 8 || targetStatusId === 11) {
      updatedValues.tax = 0;
      updatedValues.serviceCharge = 0;
      updatedValues.discount = 0;
      updatedValues.discountPercent = 0;
      updatedValues.discountBy = null;
      updatedValues.total = chk.net;
      updatedValues.credit = chk.net;
      updatedValues.entAmount = 0;
      updatedValues.cash = 0;
      updatedValues.visa = 0;
      updatedValues.paidCash = 0;
    }

    db.update(checks)
      .set(updatedValues)
      .where(eq(checks.id, chkId))
      .run();

    return this.getCheckByIdSync(chkId);
  }
}


export const checksService = new ChecksService();
