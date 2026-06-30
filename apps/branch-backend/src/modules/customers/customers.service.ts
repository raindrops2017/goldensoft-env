import { db } from '../../db';
import { customers } from '../../db/schema';
import { asc } from 'drizzle-orm';

export class CustomersService {
  async getCustomers() {
    return db.select()
      .from(customers)
      .orderBy(asc(customers.name))
      .all();
  }
}

export const customersService = new CustomersService();
