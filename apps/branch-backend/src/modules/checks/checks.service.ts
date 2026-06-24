import { db } from '../../db';
import { checks, checkItems, checkItemModifiers, shifts, options, checkStatus, checkKind, tables, modifiers, menuItems, users, rolePermissions, permissions, printers } from '../../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { calculateCheckTotals } from '@goldensoft/core-schemas';
import type { CreateCheckInput, AddCheckItemInput, VoidCheckItemInput, EntCheckItemInput, SplitCheckInput } from '@goldensoft/core-schemas';
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

  async getOpenChecks() {
    return await db.select().from(checks).where(eq(checks.chkStatusId, 1)).orderBy(desc(checks.createdAt));
  }

  getCheckByIdSync(id: string, tx: any = db) {
    const chk = tx.select().from(checks).where(eq(checks.id, id)).get();
    if (!chk) return null;

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
            chkStatusId: 1, // Open
            guestCount: 1, // Default to 1
            cashierId: userId,
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
          let targetTableName = sourceCheck.tableName || null;
          if (split.tableId) {
            const tableRec = tx.select().from(tables).where(eq(tables.id, split.tableId)).limit(1).all();
            if (tableRec.length > 0) {
              targetTableId = tableRec[0].id;
              targetTableName = tableRec[0].name || `Table ${tableRec[0].number}`;
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
            chkStatusId: 1, // Open
            guestCount: split.guestCount || 1,
            cashierId: userId,
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

  async verifySupervisorPin(pin: string, requiredPermission: string): Promise<boolean> {
    const activeUsers = db.select().from(users).where(eq(users.isActive, true)).all();
    let matchedUser = null;
    for (const u of activeUsers) {
      if (bcrypt.compareSync(pin, u.pin)) {
        matchedUser = u;
        break;
      }
    }

    if (!matchedUser) {
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
    options: { supervisorPin?: string; printerId?: string } = {}
  ) {
    const now = new Date();
    const chk = this.getCheckByIdSync(chkId);
    if (!chk) {
      throw new Error('Check not found');
    }

    const isPrinted = (chk.printCount || 0) > 0;
    const requiredPermission = isPrinted 
      ? 'check:reprint' 
      : 'check:print';

    // Validate permissions using supervisorPin if provided
    if (options.supervisorPin) {
      const isValid = await this.verifySupervisorPin(options.supervisorPin, requiredPermission);
      if (!isValid) {
        throw new Error(`Supervisor authorization failed. Requires permission ${requiredPermission}`);
      }
    }

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
}

export const checksService = new ChecksService();
