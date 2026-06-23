import { db } from '../../db';
import { options } from '../../db/schema';

export const OptionsService = {
  getOptions: async () => {
    const opts = await db.select().from(options).limit(1);
    if (!opts || opts.length === 0) {
      return {
        entTax: 0,
        serviceChargePercent: 0,
        taxPercent: 0,
        fixedDeliveryCharge: 0
      };
    }
    return opts[0];
  }
};
