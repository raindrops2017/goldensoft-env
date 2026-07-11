import { db } from '../../db';
import { deliveryZones, deliveryCustomers, deliveryPilots, checks, checkItems, deliveryAddresses, deliveryPhones } from '../../db/schema';
import { eq, or, inArray, asc, and, desc, like } from 'drizzle-orm';
import crypto from 'crypto';
import type { CreateDeliveryCustomerInput, CreateDeliveryZoneInput, CreateDeliveryPilotInput } from '@goldensoft/core-schemas';

export class DeliveryService {
  async getDeliveryZones(all = false) {
    if (all) {
      return db.select()
        .from(deliveryZones)
        .orderBy(asc(deliveryZones.name))
        .all();
    }
    return db.select()
      .from(deliveryZones)
      .where(eq(deliveryZones.isActive, true))
      .orderBy(asc(deliveryZones.name))
      .all();
  }

  async getDeliveryPilots(all = false) {
    if (all) {
      return db.select()
        .from(deliveryPilots)
        .orderBy(asc(deliveryPilots.name))
        .all();
    }
    return db.select()
      .from(deliveryPilots)
      .where(eq(deliveryPilots.isActive, true))
      .orderBy(asc(deliveryPilots.name))
      .all();
  }

  async createDeliveryZone(data: CreateDeliveryZoneInput) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.insert(deliveryZones)
      .values({
        id,
        name: data.name,
        deliveryCharge: data.deliveryCharge,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    return db.select()
      .from(deliveryZones)
      .where(eq(deliveryZones.id, id))
      .get();
  }

  async updateDeliveryZone(id: string, data: CreateDeliveryZoneInput) {
    const now = new Date().toISOString();

    db.update(deliveryZones)
      .set({
        name: data.name,
        deliveryCharge: data.deliveryCharge,
        isActive: data.isActive !== undefined ? data.isActive : undefined,
        updatedAt: now,
      })
      .where(eq(deliveryZones.id, id))
      .run();

    return db.select()
      .from(deliveryZones)
      .where(eq(deliveryZones.id, id))
      .get();
  }

  async deactivateDeliveryZone(id: string) {
    const now = new Date().toISOString();

    db.update(deliveryZones)
      .set({
        isActive: false,
        updatedAt: now,
      })
      .where(eq(deliveryZones.id, id))
      .run();

    return db.select()
      .from(deliveryZones)
      .where(eq(deliveryZones.id, id))
      .get();
  }

  async createDeliveryPilot(data: CreateDeliveryPilotInput) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.insert(deliveryPilots)
      .values({
        id,
        name: data.name,
        phone: data.phone || null,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    return db.select()
      .from(deliveryPilots)
      .where(eq(deliveryPilots.id, id))
      .get();
  }

  async updateDeliveryPilot(id: string, data: CreateDeliveryPilotInput) {
    const now = new Date().toISOString();

    db.update(deliveryPilots)
      .set({
        name: data.name,
        phone: data.phone || null,
        isActive: data.isActive !== undefined ? data.isActive : undefined,
        updatedAt: now,
      })
      .where(eq(deliveryPilots.id, id))
      .run();

    return db.select()
      .from(deliveryPilots)
      .where(eq(deliveryPilots.id, id))
      .get();
  }

  async deactivateDeliveryPilot(id: string) {
    const now = new Date().toISOString();

    db.update(deliveryPilots)
      .set({
        isActive: false,
        updatedAt: now,
      })
      .where(eq(deliveryPilots.id, id))
      .run();

    return db.select()
      .from(deliveryPilots)
      .where(eq(deliveryPilots.id, id))
      .get();
  }

  async searchDeliveryCustomer(query: string) {
    // Find customer IDs matching phone query in deliveryPhones
    const matchingPhones = db.select({ deliveryCustomerId: deliveryPhones.deliveryCustomerId })
      .from(deliveryPhones)
      .where(like(deliveryPhones.phone, `%${query}%`))
      .all();
    const customerIdsFromPhones = matchingPhones.map(p => p.deliveryCustomerId);

    const conditions = [like(deliveryCustomers.name, `%${query}%`)];
    if (customerIdsFromPhones.length > 0) {
      conditions.push(inArray(deliveryCustomers.id, customerIdsFromPhones));
    }

    const customersList = db.select()
      .from(deliveryCustomers)
      .where(or(...conditions))
      .limit(10)
      .all();

    // Fetch addresses and phones for each customer
    const results = [];
    for (const cust of customersList) {
      const addresses = db.select()
        .from(deliveryAddresses)
        .where(eq(deliveryAddresses.deliveryCustomerId, cust.id))
        .all();
      const phones = db.select()
        .from(deliveryPhones)
        .where(eq(deliveryPhones.deliveryCustomerId, cust.id))
        .all();
      results.push({
        ...cust,
        addresses,
        phones
      });
    }
    return results;
  }

  async createDeliveryCustomer(data: CreateDeliveryCustomerInput) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    // Use transaction to insert customer, phones, and addresses
    db.transaction((tx) => {
      tx.insert(deliveryCustomers)
        .values({
          id,
          name: data.name,
          agentNotes: data.agentNotes || null,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      for (const phoneItem of data.phones) {
        const phoneId = crypto.randomUUID();
        tx.insert(deliveryPhones)
          .values({
            id: phoneId,
            deliveryCustomerId: id,
            phone: phoneItem.phone,
            isDefault: phoneItem.isDefault,
            createdAt: now,
            updatedAt: now,
          })
          .run();
      }

      for (const addrItem of data.addresses) {
        const addressId = crypto.randomUUID();
        tx.insert(deliveryAddresses)
          .values({
            id: addressId,
            deliveryCustomerId: id,
            deliveryZoneId: addrItem.deliveryZoneId,
            address: addrItem.address,
            floor: addrItem.floor || null,
            unit: addrItem.unit || null,
            landmark: addrItem.landmark || null,
            notes: addrItem.notes || null,
            isDefault: addrItem.isDefault,
            createdAt: now,
            updatedAt: now,
          })
          .run();
      }
    });

    // Retrieve and return the created customer
    const cust = db.select().from(deliveryCustomers).where(eq(deliveryCustomers.id, id)).get();
    if (!cust) return null;
    const addresses = db.select().from(deliveryAddresses).where(eq(deliveryAddresses.deliveryCustomerId, id)).all();
    const phones = db.select().from(deliveryPhones).where(eq(deliveryPhones.deliveryCustomerId, id)).all();

    return {
      ...cust,
      addresses,
      phones
    };
  }

  async assignPilotToChecks(checkIds: string[], pilotId: string) {
    if (checkIds.length === 0) return [];

    const now = new Date().toISOString();

    db.update(checks)
      .set({
        deliveryPilotId: pilotId,
        updatedAt: now,
      })
      .where(inArray(checks.id, checkIds))
      .run();

    // Return the updated checks
    return db.select()
      .from(checks)
      .where(inArray(checks.id, checkIds))
      .all();
  }

  async updateDeliveryCustomer(id: string, data: CreateDeliveryCustomerInput) {
    const now = new Date().toISOString();

    db.transaction((tx) => {
      tx.update(deliveryCustomers)
        .set({
          name: data.name,
          agentNotes: data.agentNotes || null,
          updatedAt: now,
        })
        .where(eq(deliveryCustomers.id, id))
        .run();

      // Delete old addresses and phones
      tx.delete(deliveryAddresses).where(eq(deliveryAddresses.deliveryCustomerId, id)).run();
      tx.delete(deliveryPhones).where(eq(deliveryPhones.deliveryCustomerId, id)).run();

      // Re-insert addresses and phones
      for (const phoneItem of data.phones) {
        const phoneId = crypto.randomUUID();
        tx.insert(deliveryPhones)
          .values({
            id: phoneId,
            deliveryCustomerId: id,
            phone: phoneItem.phone,
            isDefault: phoneItem.isDefault,
            createdAt: now,
            updatedAt: now,
          })
          .run();
      }

      for (const addrItem of data.addresses) {
        const addressId = crypto.randomUUID();
        tx.insert(deliveryAddresses)
          .values({
            id: addressId,
            deliveryCustomerId: id,
            deliveryZoneId: addrItem.deliveryZoneId,
            address: addrItem.address,
            floor: addrItem.floor || null,
            unit: addrItem.unit || null,
            landmark: addrItem.landmark || null,
            notes: addrItem.notes || null,
            isDefault: addrItem.isDefault,
            createdAt: now,
            updatedAt: now,
          })
          .run();
      }
    });

    const cust = db.select().from(deliveryCustomers).where(eq(deliveryCustomers.id, id)).get();
    if (!cust) return null;
    const addresses = db.select().from(deliveryAddresses).where(eq(deliveryAddresses.deliveryCustomerId, id)).all();
    const phones = db.select().from(deliveryPhones).where(eq(deliveryPhones.deliveryCustomerId, id)).all();

    return {
      ...cust,
      addresses,
      phones
    };
  }

  async getLastOrderForCustomer(customerId: string) {
    const lastCheck = db.select()
      .from(checks)
      .where(
        and(
          eq(checks.deliveryCustomerId, customerId),
          inArray(checks.chkStatusId, [2, 3, 4, 6, 7, 8, 11])
        )
      )
      .orderBy(desc(checks.createdAt))
      .limit(1)
      .get() as any;

    if (!lastCheck) return null;

    const items = db.select()
      .from(checkItems)
      .where(eq(checkItems.chkId, lastCheck.id))
      .all();

    return {
      ...lastCheck,
      items
    };
  }

  async updateCheckDeliveryState(checkId: string, state: string) {
    const now = new Date().toISOString();
    db.update(checks)
      .set({
        deliveryState: state,
        updatedAt: now,
      })
      .where(eq(checks.id, checkId))
      .run();

    return db.select()
      .from(checks)
      .where(eq(checks.id, checkId))
      .get();
  }

  async dispatchChecks(checkIds: string[], pilotId: string) {
    if (checkIds.length === 0) return [];
    const now = new Date().toISOString();
    db.update(checks)
      .set({
        deliveryPilotId: pilotId,
        deliveryState: 'Dispatched',
        dispatchedAt: now,
        updatedAt: now,
      })
      .where(inArray(checks.id, checkIds))
      .run();

    return db.select()
      .from(checks)
      .where(inArray(checks.id, checkIds))
      .all();
  }

  async returnPilot(pilotId: string) {
    const now = new Date().toISOString();
    db.update(checks)
      .set({
        deliveryPilotId: null,
        deliveryState: 'Ready',
        dispatchedAt: null,
        updatedAt: now,
      })
      .where(and(
        eq(checks.deliveryPilotId, pilotId),
        eq(checks.chkStatusId, 1)
      ))
      .run();
  }

  async unassignCheck(checkId: string) {
    const now = new Date().toISOString();
    db.update(checks)
      .set({
        deliveryPilotId: null,
        deliveryState: 'Ready',
        dispatchedAt: null,
        updatedAt: now,
      })
      .where(eq(checks.id, checkId))
      .run();

    return db.select()
      .from(checks)
      .where(eq(checks.id, checkId))
      .get();
  }

  async arrivePilot(pilotId: string) {
    const now = new Date().toISOString();
    db.update(checks)
      .set({
        deliveryState: 'Delivered',
        updatedAt: now,
      })
      .where(and(
        eq(checks.deliveryPilotId, pilotId),
        eq(checks.chkStatusId, 1),
        eq(checks.deliveryState, 'Dispatched')
      ))
      .run();
  }
}

export const deliveryService = new DeliveryService();
