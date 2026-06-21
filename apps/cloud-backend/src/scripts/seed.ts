import { getGlobalDb, getTenantDb } from '../db/connectionManager';
import { getTenantModel } from '../models/global/Tenant';
import { getOrderModel } from '../models/tenant/Order';

async function seed() {
  console.log('⏳ Starting MongoDB database seeding...');
  try {
    // 1. Wait for Global DB connection to open
    const globalDb = getGlobalDb();
    if (globalDb.readyState !== 1) {
      console.log('Waiting for Global DB connection...');
      await new Promise<void>((resolve, reject) => {
        globalDb.once('open', () => resolve());
        globalDb.once('error', (err) => reject(err));
      });
    }
    console.log('✅ Connected to Global DB.');

    // 2. Seed Tenant in Global DB
    const Tenant = getTenantModel();
    console.log('🧹 Clearing Tenant collection...');
    await Tenant.deleteMany({});
    
    console.log('👥 Seeding default Tenant...');
    const tenantDemo = await Tenant.create({
      subdomain: 'demo',
      tenantDbName: 'tenant_demo',
      status: 'active',
    });
    console.log(`✅ Default Tenant seeded: Subdomain "${tenantDemo.subdomain}", DB: "${tenantDemo.tenantDbName}"`);

    // 3. Connect to Tenant DB and wait for it to open
    const tenantDb = getTenantDb('tenant_demo');
    if (tenantDb.readyState !== 1) {
      console.log('Waiting for Tenant DB connection...');
      await new Promise<void>((resolve, reject) => {
        tenantDb.once('open', () => resolve());
        tenantDb.once('error', (err) => reject(err));
      });
    }
    console.log('✅ Connected to Tenant DB (tenant_demo).');

    // 4. Seed Orders in Tenant DB
    const Order = getOrderModel(tenantDb);
    console.log('🧹 Clearing Order collection...');
    await Order.deleteMany({});

    console.log('🧾 Seeding 50 simulated cloud orders...');
    const menuItemsSample = [
      'Molokhia with Chicken', 'Charcoal Kebab', 'Fatta with Meat', 
      'Koshary King Size', 'Shish Tawook', 'Margherita Pizza', 
      'Super Supreme Pizza', 'Classic Beef Burger', 'Cheese Burger', 
      'Turkish Coffee', 'Fresh Mango Juice', 'Mint Lemonade'
    ];

    const today = new Date();
    const ordersToInsert = [];

    for (let i = 1; i <= 50; i++) {
      // Distribute orders over the last 5 days
      const daysAgo = Math.floor(i / 10); // 10 orders per day
      const orderDate = new Date();
      orderDate.setDate(today.getDate() - daysAgo);
      orderDate.setHours(12 + (i % 8), (i * 11) % 60, 0, 0);

      // Business date formatting (YYYY-MM-DD)
      const businessDate = orderDate.toISOString().split('T')[0];

      // Pick 1 to 4 random items
      const itemsCount = 1 + (i % 4);
      const items = [];
      let total = 0;
      for (let j = 0; j < itemsCount; j++) {
        const item = menuItemsSample[(i * 3 + j * 7) % menuItemsSample.length];
        items.push(item);
        // Approximate realistic Egyptian Pound prices
        total += 40 + ((i * j * 17) % 350); 
      }

      ordersToInsert.push({
        items,
        total: Math.round(total),
        createdAt: orderDate,
        businessDate,
      });
    }

    await Order.insertMany(ordersToInsert);
    console.log('✅ Seeding 50 cloud orders completed.');

    // 5. Close DB connections
    console.log('🔌 Closing MongoDB connections...');
    await tenantDb.close();
    await globalDb.close();
    console.log('🎉 MongoDB database seeding finished successfully!');
  } catch (error) {
    console.error('❌ Error seeding MongoDB:', error);
    process.exit(1);
  }
}

seed();
