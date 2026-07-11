import { db } from '../db';
import { 
  roles, permissions, rolePermissions, users, options, tableSections, tables,
  customers, deliveryZones, deliveryCustomers, deliveryAddresses, deliveryPhones, deliveryPilots, printers,
  menuTypes, menuGroups, menuSubGroups, modifiersGroups, modifiers,
  menuItems, menuItemPrices, menuItemModifiers, menuItemPrinters,
  checkStatus, checkKind, checks, checkItems, checkItemModifiers,
  closedDays, refreshTokens, syncQueue, shifts, voidReasons
} from '../db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { permissionsList } from '@goldensoft/core-schemas';

async function seed() {
  console.log('⏳ Starting complete SQLite database seeding...');
  try {
    // Disable foreign keys temporarily for truncation
    console.log('🧹 Clearing existing database tables...');
    
    // We truncate tables in leaf-to-root dependency order
    const tablesToClear = [
      refreshTokens,
      syncQueue,
      closedDays,
      checkItemModifiers,
      checkItems,
      checks,
      menuItemPrinters,
      menuItemModifiers,
      menuItemPrices,
      menuItems,
      menuSubGroups,
      menuGroups,
      menuTypes,
      modifiers,
      modifiersGroups,
      deliveryAddresses,
      deliveryPhones,
      deliveryCustomers,
      deliveryZones,
      deliveryPilots,
      customers,
      tables,
      tableSections,
      printers,
      options,
      shifts,
      users,
      rolePermissions,
      permissions,
      roles,
      checkStatus,
      checkKind,
      voidReasons
    ];

    for (const table of tablesToClear) {
      await db.delete(table);
    }
    console.log('✅ Databases cleared.');

    // 1. Seed Roles
    console.log('👥 Seeding roles...');
    const adminRoleId = '10000000-0000-0000-0000-000000000001';
    const managerRoleId = '10000000-0000-0000-0000-000000000002';
    const cashierRoleId = '10000000-0000-0000-0000-000000000003';
    const waiterRoleId = '10000000-0000-0000-0000-000000000004';

    await db.insert(roles).values([
      { id: adminRoleId, name: 'admin', description: 'Administrator with full system control', isWaiter: false },
      { id: managerRoleId, name: 'manager', description: 'Branch manager managing shifts and checkout', isWaiter: false },
      { id: cashierRoleId, name: 'cashier', description: 'Cashier managing payments and checkout', isWaiter: false },
      { id: waiterRoleId, name: 'waiter', description: 'Waiter handling dining tables and taking orders', isWaiter: true }
    ]);

    // 2. Seed Permissions
    console.log('🔑 Seeding permissions...');
    const insertedPermissions: { id: string; name: string }[] = [];
    for (const p of permissionsList) {
      const id = crypto.randomUUID();
      await db.insert(permissions).values({
        id,
        name: p.name,
        description: p.description
      });
      insertedPermissions.push({ id, name: p.name });
    }

    // 3. Assign Permissions to Roles
    console.log('🔗 Mapping permissions to roles...');
    // Admin gets all permissions
    for (const p of insertedPermissions) {
      await db.insert(rolePermissions).values({
        roleId: adminRoleId,
        permissionId: p.id
      });
    }

    // Manager gets most permissions except modifying users
    for (const p of insertedPermissions) {
      if (!p.name.startsWith('users:')) {
        await db.insert(rolePermissions).values({
          roleId: managerRoleId,
          permissionId: p.id
        });
      }
    }

    // Cashier gets POS check and shift permissions
    const cashierPermNames = [
      'check:create', 'check:print', 'check:reprint', 'check:close', 
      'dining:open', 'takeaway:open', 'delivery:open', 'workShift:close'
    ];
    for (const p of insertedPermissions) {
      if (cashierPermNames.includes(p.name)) {
        await db.insert(rolePermissions).values({
          roleId: cashierRoleId,
          permissionId: p.id
        });
      }
    }

    // Waiter gets open tables and order creation
    const waiterPermNames = [
      'check:create', 'check:print', 'dining:open', 'takeaway:open'
    ];
    for (const p of insertedPermissions) {
      if (waiterPermNames.includes(p.name)) {
        await db.insert(rolePermissions).values({
          roleId: waiterRoleId,
          permissionId: p.id
        });
      }
    }

    // 4. Seed Users
    console.log('👤 Seeding users...');
    const hashedPinAdmin = await bcrypt.hash('1234', 10);
    const hashedPinManager = await bcrypt.hash('9999', 10);
    const hashedPinCashier = await bcrypt.hash('1111', 10);
    const hashedPinWaiter = await bcrypt.hash('2222', 10);
    const hashedPinWaiter2 = await bcrypt.hash('3333', 10);

    const adminUserId = '20000000-0000-0000-0000-000000000001';
    const managerUserId = '20000000-0000-0000-0000-000000000002';
    const cashierUserId = '20000000-0000-0000-0000-000000000003';
    const waiterUserId = '20000000-0000-0000-0000-000000000004';
    const waiterUserId2 = '20000000-0000-0000-0000-000000000005';

    await db.insert(users).values([
      { id: adminUserId, username: 'admin', pin: hashedPinAdmin, role: 'admin', roleId: adminRoleId, isActive: true },
      { id: managerUserId, username: 'manager', pin: hashedPinManager, role: 'manager', roleId: managerRoleId, isActive: true },
      { id: cashierUserId, username: 'cashier', pin: hashedPinCashier, role: 'cashier', roleId: cashierRoleId, isActive: true },
      { id: waiterUserId, username: 'waiter', pin: hashedPinWaiter, role: 'waiter', roleId: waiterRoleId, isActive: true },
      { id: waiterUserId2, username: 'waiter2', pin: hashedPinWaiter2, role: 'waiter', roleId: waiterRoleId, isActive: true }
    ]);

    // 5. Seed Options (Branch settings)
    console.log('⚙️ Seeding options...');
    await db.insert(options).values({
      id: crypto.randomUUID(),
      version: 1,
      language: 'en',
      taxPercent: 14.0,
      entTax: 0.0,
      serviceChargePercent: 12.0,
      fixedDeliveryCharge: 15.0,
      fixedMinimumCharge: 50.0,
      kitchenPrint: 1,
      kitchenControlCount: 1,
      branchName: 'Golden Soft - Maadi Branch',
      branchAddress: 'Building 14, Road 9, Maadi, Cairo, Egypt',
      branchPhone: '+20 2 2358 1234',
      branchTaxId: '123-456-789'
    });

    // 6. Seed Table Sections & Tables
    console.log('📐 Seeding table sections & tables...');
    const sectionsInfo = [
      { name: 'Outdoor', startNum: 1, endNum: 31 },
      { name: 'Indoor', startNum: 32, endNum: 61 },
      { name: 'Officer', startNum: 62, endNum: 91 }
    ];

    for (const sec of sectionsInfo) {
      const sectionId = crypto.randomUUID();
      await db.insert(tableSections).values({
        id: sectionId,
        name: sec.name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Generate table numbers from startNum to endNum, excluding 13
      const tableNumbers = [];
      for (let num = sec.startNum; num <= sec.endNum; num++) {
        if (num !== 13) {
          tableNumbers.push(num);
        }
      }

      for (let i = 0; i < tableNumbers.length; i++) {
        const tableNum = tableNumbers[i];
        const row = Math.floor(i / 6);
        const col = i % 6;

        await db.insert(tables).values({
          id: crypto.randomUUID(),
          number: tableNum,
          name: `T${tableNum}`,
          posX: 30 + col * 165,
          posY: 30 + row * 110,
          tableWidth: 100,
          tableHeight: 100,
          angle: 0,
          shape: 'rect',
          tableSectionId: sectionId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    // 8. Seed Printers
    console.log('🖨️ Seeding printers...');
    const printCashierId = crypto.randomUUID();
    const printKitchenId = crypto.randomUUID();
    const printBarId = crypto.randomUUID();

    await db.insert(printers).values([
      { id: printCashierId, name: 'Cashier Printer', ipAddress: '192.168.1.200', connection: 'TCP', isDefault: 1 },
      { id: printKitchenId, name: 'Kitchen Printer', ipAddress: '192.168.1.201', connection: 'TCP', isDefault: 0 },
      { id: printBarId, name: 'Bar Printer', ipAddress: '192.168.1.202', connection: 'TCP', isDefault: 0 }
    ]);

    // 9. Seed Customers
    console.log('👤 Seeding customers...');
    const custWalkInId = crypto.randomUUID();
    const custSherifId = crypto.randomUUID();
    const custMariamId = crypto.randomUUID();
    const custStaffId = crypto.randomUUID();
    const custOfficerId = crypto.randomUUID();

    await db.insert(customers).values([
      { id: custWalkInId, name: 'Walk-In Customer', kind: 1, discount: 0 },
      { id: custSherifId, name: 'Sherif Abdel-Meguid', kind: 1, discount: 10 }, // 10% loyalty discount
      { id: custMariamId, name: 'Mariam Aly', kind: 1, discount: 5 },
      { id: custStaffId, name: 'Staff Member Ahmed', kind: 2, discount: 15 },
      { id: custOfficerId, name: 'Officer Khaled', kind: 3, discount: 0 }
    ]);

    // 10. Seed Delivery Zones & Pilots
    console.log('🛵 Seeding delivery zones and pilots...');
    const zoneMaadiId = crypto.randomUUID();
    const zoneNewCairoId = crypto.randomUUID();
    const zoneZamalekId = crypto.randomUUID();
    const zoneHeliopolisId = crypto.randomUUID();

    await db.insert(deliveryZones).values([
      { id: zoneMaadiId, name: 'Maadi', deliveryCharge: 20 },
      { id: zoneNewCairoId, name: 'New Cairo', deliveryCharge: 40 },
      { id: zoneZamalekId, name: 'Zamalek', deliveryCharge: 35 },
      { id: zoneHeliopolisId, name: 'Heliopolis', deliveryCharge: 30 }
    ]);

    const pilotAhmedId = crypto.randomUUID();
    const pilotMohamedId = crypto.randomUUID();
    await db.insert(deliveryPilots).values([
      { id: pilotAhmedId, name: 'Captain Ahmed Fawzy', phone: '01012345678' },
      { id: pilotMohamedId, name: 'Captain Mohamed Samir', phone: '01234567890' }
    ]);

    // Seed some delivery customers
    const delCustId = crypto.randomUUID();
    await db.insert(deliveryCustomers).values({
      id: delCustId,
      name: 'Amr Diab',
    });

    await db.insert(deliveryAddresses).values({
      id: crypto.randomUUID(),
      deliveryCustomerId: delCustId,
      deliveryZoneId: zoneMaadiId,
      address: 'Villa 12, Road 200, Degla',
      floor: 'Ground',
      notes: 'Ring the outer bell',
      isDefault: true,
    });

    await db.insert(deliveryPhones).values({
      id: crypto.randomUUID(),
      deliveryCustomerId: delCustId,
      phone: '01001234567',
      isDefault: true,
    });

    // 11. Seed Menu Types
    console.log('🍽️ Seeding menu types...');
    const typeFoodId = crypto.randomUUID();
    const typeBeverageId = crypto.randomUUID();

    await db.insert(menuTypes).values([
      { id: typeFoodId, name: 'Food', isActive: 1 },
      { id: typeBeverageId, name: 'Beverages', isActive: 1 }
    ]);

    // 12. Seed Modifiers Groups & Modifiers
    console.log('✨ Seeding modifiers groups and modifiers...');
    const modGrpToppingsId = crypto.randomUUID();
    const modGrpSaladDressingId = crypto.randomUUID();
    const modGrpCoffeeCustomId = crypto.randomUUID();
    const modGrpDonenessId = crypto.randomUUID();
    const modGrpSidesId = crypto.randomUUID();

    await db.insert(modifiersGroups).values([
      { id: modGrpToppingsId, name: 'Extra Toppings / إضافات' },
      { id: modGrpSaladDressingId, name: 'Salad Dressings / صوصات' },
      { id: modGrpCoffeeCustomId, name: 'Coffee Options / خيارات القهوة' },
      { id: modGrpDonenessId, name: 'Meat Doneness / درجة الطهو' },
      { id: modGrpSidesId, name: 'Side Dishes / أطباق جانبية' }
    ]);

    const modifierItems: { id: string; name: string; price: number; grpId: string }[] = [
      // Toppings
      { id: crypto.randomUUID(), name: 'Extra Cheese / جبنة زيادة', price: 20, grpId: modGrpToppingsId },
      { id: crypto.randomUUID(), name: 'Mushrooms / مشروم', price: 25, grpId: modGrpToppingsId },
      { id: crypto.randomUUID(), name: 'Jalapeno / هالبينو', price: 15, grpId: modGrpToppingsId },
      // Dressings
      { id: crypto.randomUUID(), name: 'Caesar Sauce / صوص سيزر', price: 10, grpId: modGrpSaladDressingId },
      { id: crypto.randomUUID(), name: 'Tahini / طحينة', price: 8, grpId: modGrpSaladDressingId },
      { id: crypto.randomUUID(), name: 'Garlic Sauce / تومية', price: 10, grpId: modGrpSaladDressingId },
      // Coffee Customizations
      { id: crypto.randomUUID(), name: 'Double Shot / دبل شوت', price: 20, grpId: modGrpCoffeeCustomId },
      { id: crypto.randomUUID(), name: 'Oat Milk / حليب شوفان', price: 25, grpId: modGrpCoffeeCustomId },
      { id: crypto.randomUUID(), name: 'Caramel Syrup / سيرب كراميل', price: 15, grpId: modGrpCoffeeCustomId },
      // Meat Doneness
      { id: crypto.randomUUID(), name: 'Medium Rare / وسط نيء', price: 0, grpId: modGrpDonenessId },
      { id: crypto.randomUUID(), name: 'Medium / وسط', price: 0, grpId: modGrpDonenessId },
      { id: crypto.randomUUID(), name: 'Well Done / مطهو جيداً', price: 0, grpId: modGrpDonenessId },
      // Sides
      { id: crypto.randomUUID(), name: 'French Fries / بطاطس مقلية', price: 35, grpId: modGrpSidesId },
      { id: crypto.randomUUID(), name: 'Basmati Rice / أرز بسمتي', price: 25, grpId: modGrpSidesId },
      { id: crypto.randomUUID(), name: 'Sautéed Vegetables / خضار سوتيه', price: 30, grpId: modGrpSidesId }
    ];

    for (const mod of modifierItems) {
      await db.insert(modifiers).values({
        id: mod.id,
        name: mod.name,
        price: mod.price,
        modifiersGroupId: mod.grpId
      });
    }

    // 13. Seed 20 Menu Groups (Item Groups) and 100 Menu Items (5 per group)
    console.log('🍕 Seeding 20 menu groups and 100 menu items...');

    const menuGroupsData = [
      { name: 'Appetizers & Soups / مقبلات وشوربة', isBeverage: false },
      { name: 'Egyptian Classics / أكلات مصرية', isBeverage: false },
      { name: 'Koshary Specials / كشري', isBeverage: false },
      { name: 'Grill & Kebabs / مشويات', isBeverage: false },
      { name: 'Traditional Tagines / طواجن', isBeverage: false },
      { name: 'Seafood Dishes / مأكولات بحرية', isBeverage: false },
      { name: 'Shawarma & Kaiser / شاورما وكايزر', isBeverage: false },
      { name: 'Burgers & Wraps / برجر وراب', isBeverage: false },
      { name: 'Pizzas / بيتزا', isBeverage: false },
      { name: 'Crepes & Feteer / كريب وفطير', isBeverage: false },
      { name: 'Vegetarian Delights / أطباق نباتية', isBeverage: false },
      { name: 'Rice & Pasta / أرز ومكرونة', isBeverage: false },
      { name: 'Salads & Dips / سلطات مقبلات', isBeverage: false },
      { name: 'Kids Meals / وجبات أطفال', isBeverage: false },
      { name: 'Oriental Desserts / حلويات شرقية', isBeverage: false },
      { name: 'Western Desserts / حلويات غربية', isBeverage: false },
      { name: 'Fresh Juices / عصائر طبيعية', isBeverage: true },
      { name: 'Hot Beverages / مشروبات ساخنة', isBeverage: true },
      { name: 'Soft Drinks / مشروبات غازية', isBeverage: true },
      { name: 'Smoothies & Shakes / سموذي وشيك', isBeverage: true }
    ];

    const itemDetails: { [key: string]: { name: string; ar: string; price: number; doneness?: boolean; toppings?: boolean; coffee?: boolean; salads?: boolean }[] } = {
      'Appetizers & Soups / مقبلات وشوربة': [
        { name: 'Lentil Soup', ar: 'شوربة عدس', price: 45 },
        { name: 'Orzo Soup', ar: 'شوربة لسان عصفور', price: 40 },
        { name: 'Garlic Bread with Cheese', ar: 'خبز بالثوم والجبنة', price: 55 },
        { name: 'Kobeba', ar: 'كبيبة شرقية', price: 70 },
        { name: 'Sambousek Cheese', ar: 'سمبوسك جبنة', price: 60 }
      ],
      'Egyptian Classics / أكلات مصرية': [
        { name: 'Molokhia with Chicken', ar: 'ملوخية بالفراخ', price: 120 },
        { name: 'Stuffed Pigeon', ar: 'حمام محشي', price: 180 },
        { name: 'Stuffed Vine Leaves', ar: 'ورق عنب بالليمون', price: 85 },
        { name: 'Fatta with Meat', ar: 'فتة باللحمة', price: 195 },
        { name: 'Falafel Plate', ar: 'طبق فلافل مشكل', price: 40 }
      ],
      'Koshary Specials / كشري': [
        { name: 'Koshary King Size', ar: 'كشري الحجم الملكي', price: 75 },
        { name: 'Koshary with Liver', ar: 'كشري بالكبدة', price: 110 },
        { name: 'Koshary with Meat', ar: 'كشري باللحمة المفرومة', price: 105 },
        { name: 'Koshary Classic', ar: 'كشري كلاسيك', price: 50 },
        { name: 'Koshary Rice Pudding', ar: 'أرز باللبن كشري حلو', price: 45 }
      ],
      'Grill & Kebabs / مشويات': [
        { name: 'Charcoal Kebab', ar: 'كباب على الفحم', price: 380, doneness: true },
        { name: 'Shish Tawook', ar: 'شيش طاووق', price: 190 },
        { name: 'Kofta Halaby', ar: 'كفتة حلبي', price: 290 },
        { name: 'Mix Grill', ar: 'مشويات مشكل', price: 420, doneness: true },
        { name: 'Grilled Chicken Breast', ar: 'صدور دجاج مشوية', price: 175 }
      ],
      'Traditional Tagines / طواجن': [
        { name: 'Bamia Tagin with Meat', ar: 'طاجن بامية باللحمة', price: 160 },
        { name: 'Potatoes Tagin with Beef', ar: 'طاجن بطاطس باللحم', price: 165 },
        { name: 'Moussaka with Minced Meat', ar: 'مسقعة باللحمة المفرومة', price: 110 },
        { name: 'Rice Tagin with Cream', ar: 'طاجن رز معمر', price: 90 },
        { name: 'Akawi Tagin', ar: 'طاجن عكاوي', price: 280 }
      ],
      'Seafood Dishes / مأكولات بحرية': [
        { name: 'Grilled Sea Bass', ar: 'قاروص مشوي', price: 320 },
        { name: 'Shrimp Pan', ar: 'طاجن جمبري', price: 290 },
        { name: 'Fried Calamari', ar: 'كالاماري مقلي', price: 180 },
        { name: 'Seafood Soup', ar: 'شوربة فواكه البحر', price: 140 },
        { name: 'Sayadeya Fish', ar: 'سمك صيادية', price: 150 }
      ],
      'Shawarma & Kaiser / شاورما وكايزر': [
        { name: 'Beef Shawarma Kaiser', ar: 'شاورما لحم كايزر', price: 65 },
        { name: 'Chicken Shawarma Wrap', ar: 'شاورما دجاج صاج', price: 75 },
        { name: 'Hawawshi', ar: 'حواوشي بلدي', price: 80 },
        { name: 'Pane Sandwich', ar: 'سندوتش بانيه', price: 55 },
        { name: 'Kofta Sandwich', ar: 'سندوتش كفتة', price: 60 }
      ],
      'Burgers & Wraps / برجر وراب': [
        { name: 'Classic Beef Burger', ar: 'برجر لحم كلاسيك', price: 120, doneness: true, toppings: true },
        { name: 'Cheese Burger', ar: 'تشيز برجر', price: 135, doneness: true, toppings: true },
        { name: 'Crispy Chicken Burger', ar: 'برجر دجاج مقرمش', price: 130, toppings: true },
        { name: 'BBQ Smoke Burger', ar: 'برجر باربيكيو مدخن', price: 145, doneness: true, toppings: true },
        { name: 'Spicy Jalapeno Burger', ar: 'برجر هالبينو حار', price: 140, doneness: true, toppings: true }
      ],
      'Pizzas / بيتزا': [
        { name: 'Margherita Pizza', ar: 'بيتزا مارجريتا', price: 110, toppings: true },
        { name: 'Pepperoni Pizza', ar: 'بيتزا بيبيروني', price: 150, toppings: true },
        { name: 'Super Supreme Pizza', ar: 'بيتزا سوبر سوبريم', price: 170, toppings: true },
        { name: 'Four Cheese Pizza', ar: 'بيتزا أربع أجبان', price: 160, toppings: true },
        { name: 'Seafood Pizza', ar: 'بيتزا سي فود', price: 195, toppings: true }
      ],
      'Crepes & Feteer / كريب وفطير': [
        { name: 'Mixed Cheese Feteer', ar: 'فطيرة مشكل جبن', price: 130 },
        { name: 'Custard and Honey Feteer', ar: 'فطيرة قشطة وعسل وسكر', price: 110 },
        { name: 'Nutella Banana Crepe', ar: 'كريب نوتيلا بالموز', price: 85 },
        { name: 'Crispy Chicken Crepe', ar: 'كريب دجاج مقرمش', price: 95 },
        { name: 'Shawarma Crepe', ar: 'كريب شاورما لحمة', price: 100 }
      ],
      'Vegetarian Delights / أطباق نباتية': [
        { name: 'Baba Ganoush', ar: 'بابا غنوج', price: 35 },
        { name: 'Shakshuka', ar: 'شكشوكة مصري', price: 50 },
        { name: 'Foul Medames with Olive Oil', ar: 'فول مدمس بالزيت الحار', price: 30 },
        { name: 'Grilled Halloumi Salad', ar: 'سلطة حلوم مشوي', price: 90 },
        { name: 'Vegetable Soup', ar: 'شوربة خضار مشكل', price: 35 }
      ],
      'Rice & Pasta / أرز ومكرونة': [
        { name: 'Pasta Bolognese', ar: 'مكرونة بولونيز', price: 110 },
        { name: 'Alfredo Pasta with Chicken', ar: 'مكرونة ألفريدو بالدجاج', price: 140 },
        { name: 'White Rice with Vermicelli', ar: 'أرز بالشعرية', price: 35 },
        { name: 'Khalta Rice with Nuts', ar: 'أرز بالخلطة والمكسرات', price: 65 },
        { name: 'Baked Negresco Pasta', ar: 'نجرسكو بالفرن', price: 130 }
      ],
      'Salads & Dips / سلطات مقبلات': [
        { name: 'Green Salad', ar: 'سلطة خضراء بلدي', price: 30 },
        { name: 'Tahini Salad', ar: 'سلطة طحينة', price: 25 },
        { name: 'Garlic Dip', ar: 'تومية سوري', price: 30, salads: true },
        { name: 'Greek Salad', ar: 'سلطة يونانية', price: 65, salads: true },
        { name: 'Tabbouleh', ar: 'تبولة لبناني', price: 55, salads: true }
      ],
      'Kids Meals / وجبات أطفال': [
        { name: 'Chicken Nuggets with Fries', ar: 'ناجتس دجاج مع بطاطس', price: 85 },
        { name: 'Kids Mini Burger', ar: 'ميني برجر أطفال', price: 90 },
        { name: 'Kids Mac and Cheese', ar: 'مكرونة بالجبنة للأطفال', price: 75 },
        { name: 'Mini Margherita Pizza', ar: 'ميني بيتزا مارجريتا', price: 80 },
        { name: 'Fish Fingers with Fries', ar: 'أصابع السمك مع بطاطس', price: 95 }
      ],
      'Oriental Desserts / حلويات شرقية': [
        { name: 'Basbousa with Almonds', ar: 'بسبوسة باللوز', price: 50 },
        { name: 'Konafa with Cream', ar: 'كنافة بالقشطة', price: 60 },
        { name: 'Om Ali with Nuts', ar: 'أم علي بالمكسرات', price: 70 },
        { name: 'Rice Pudding', ar: 'أرز باللبن', price: 35 },
        { name: 'Qatayef with Nuts', ar: 'قطايف بالمكسرات', price: 45 }
      ],
      'Western Desserts / حلويات غربية': [
        { name: 'Molten Chocolate Cake', ar: 'مولتن كيك الشوكولاتة', price: 95 },
        { name: 'New York Cheesecake', ar: 'تشيز كيك نيويورك', price: 85 },
        { name: 'Chocolate Fudge Cake', ar: 'فادج شوكولاتة', price: 80 },
        { name: 'Waffle with Caramel', ar: 'وافل بالكراميل', price: 75 },
        { name: 'Tiramisu', ar: 'تيراميسو إيطالي', price: 90 }
      ],
      'Fresh Juices / عصائر طبيعية': [
        { name: 'Fresh Mango Juice', ar: 'عصير مانجو طبيعي', price: 55 },
        { name: 'Fresh Strawberry Juice', ar: 'عصير فراولة طبيعي', price: 45 },
        { name: 'Mint Lemonade', ar: 'ليمون بالنعناع', price: 40 },
        { name: 'Fresh Orange Juice', ar: 'عصير برتقال طبيعي', price: 45 },
        { name: 'Guava with Milk', ar: 'جوافة باللبن', price: 45 }
      ],
      'Hot Beverages / مشروبات ساخنة': [
        { name: 'Turkish Coffee', ar: 'قهوة تركي', price: 30, coffee: true },
        { name: 'Espresso Single', ar: 'إسبريسو سينجل', price: 35, coffee: true },
        { name: 'Egyptian Tea', ar: 'شاي كشري بلدي', price: 20, coffee: true },
        { name: 'Green Tea', ar: 'شاي أخضر', price: 25 },
        { name: 'Hot Chocolate', ar: 'هوت شوكلت', price: 50, coffee: true }
      ],
      'Soft Drinks / مشروبات غازية': [
        { name: 'Pepsi', ar: 'بيبسي', price: 25 },
        { name: '7Up', ar: 'سفن أب', price: 25 },
        { name: 'Mirinda Orange', ar: 'ميرندا برتقال', price: 25 },
        { name: 'Red Bull', ar: 'ريد بول', price: 65 },
        { name: 'Sparkling Water', ar: 'مياه فوارة', price: 30 }
      ],
      'Smoothies & Shakes / سموذي وشيك': [
        { name: 'Vanilla Milkshake', ar: 'ميلك شيك فانيليا', price: 70 },
        { name: 'Chocolate Milkshake', ar: 'ميلك شيك شوكولاتة', price: 70 },
        { name: 'Blue Lagoon Mocktail', ar: 'بلو لاجون موكتيل', price: 65 },
        { name: 'Mango Smoothie', ar: 'سموذي مانجو', price: 60 },
        { name: 'Strawberry Smoothie', ar: 'سموذي فراولة', price: 60 }
      ]
    };

    const insertedMenuItems: { id: string; name: string; price: number; isBeverage: boolean }[] = [];

    // Seed menu groups and menu items
    for (const group of menuGroupsData) {
      const menuGroupId = crypto.randomUUID();
      const menuTypeId = group.isBeverage ? typeBeverageId : typeFoodId;

      await db.insert(menuGroups).values({
        id: menuGroupId,
        name: group.name,
        menuTypeId,
        isActive: 1
      });

      const items = itemDetails[group.name] || [];
      for (const item of items) {
        const itemId = crypto.randomUUID();
        
        await db.insert(menuItems).values({
          id: itemId,
          name: item.name,
          arabicName: item.ar,
          menuGroupId,
          isActive: 1
        });

        // Seed prices: Dining, Takeaway, Delivery, Officer
        await db.insert(menuItemPrices).values({
          id: crypto.randomUUID(),
          priceName: 'Standard',
          menuItemId: itemId,
          diningPrice: item.price,
          takeAwayPrice: Math.max(item.price - 5, 5),
          deliveryPrice: item.price + 5,
          officerPrice: Math.round(item.price * 0.7), // 30% discount for officers
          isActive: 1
        });

        // Link item to printers: Food items to Kitchen, Beverages to Bar
        await db.insert(menuItemPrinters).values({
          id: crypto.randomUUID(),
          menuItemId: itemId,
          printerId: group.isBeverage ? printBarId : printKitchenId,
          isActive: 1
        });

        // Associate modifier groups if applicable
        if (item.doneness) {
          await db.insert(menuItemModifiers).values({
            id: crypto.randomUUID(),
            menuItemId: itemId,
            modifiersGroupId: modGrpDonenessId,
            groupOrder: 1,
            choiceCount: 1
          });
        }
        if (item.toppings) {
          await db.insert(menuItemModifiers).values({
            id: crypto.randomUUID(),
            menuItemId: itemId,
            modifiersGroupId: modGrpToppingsId,
            groupOrder: 2,
            choiceCount: 3
          });
        }
        if (item.coffee) {
          await db.insert(menuItemModifiers).values({
            id: crypto.randomUUID(),
            menuItemId: itemId,
            modifiersGroupId: modGrpCoffeeCustomId,
            groupOrder: 1,
            choiceCount: 2
          });
        }
        if (item.salads) {
          await db.insert(menuItemModifiers).values({
            id: crypto.randomUUID(),
            menuItemId: itemId,
            modifiersGroupId: modGrpSaladDressingId,
            groupOrder: 1,
            choiceCount: 1
          });
        }

        insertedMenuItems.push({
          id: itemId,
          name: item.name,
          price: item.price,
          isBeverage: group.isBeverage
        });
      }
    }
    console.log(`✅ Successfully seeded 20 menu groups and ${insertedMenuItems.length} menu items.`);

    // 14. Seed Check Kind & Status
    console.log('🏁 Seeding check statuses & kinds...');
    await db.insert(checkStatus).values([
      { id: 1, status: 'Open' },
      { id: 2, status: 'Cash' },
      { id: 3, status: 'Visa' },
      { id: 4, status: 'Owner CL' },
      { id: 5, status: 'Voided' },
      { id: 6, status: 'Mixed' },
      { id: 7, status: 'Comp' },
      { id: 8, status: 'Officer' },
      { id: 9, status: 'Merged' },
      { id: 10, status: 'Staff CL' },
      { id: 11, status: 'Food Test' }
    ]);

    await db.insert(checkKind).values([
      { id: 1, kind: 'Dine in' },
      { id: 2, kind: 'Delivery' },
      { id: 3, kind: 'Take away' }
    ]);

    console.log('🗑️ Seeding void reasons...');
    await db.insert(voidReasons).values([
      { id: 1, reason: "Customer changed mind", isWaste: false },
      { id: 2, reason: "Kitchen mistake", isWaste: true },
      { id: 3, reason: "Wrong entry", isWaste: false },
      { id: 4, reason: "Spoiled / Dropped", isWaste: true }
    ]);

    // 15. Seed Shifts & Transactions
    console.log('⏰ Seeding shifts & transaction history...');
    
    // YESTERDAY SHIFT (Closed)
    const yesterdayDate = '2026-06-20';
    const shiftYesterdayId = crypto.randomUUID();
    await db.insert(shifts).values({
      id: shiftYesterdayId,
      shiftNumber: 1,
      businessDate: yesterdayDate,
      openedBy: managerUserId,
      closedBy: managerUserId,
      startingCash: 1000,
      expectedClosingCash: 3500,
      actualClosingCash: 3500,
      status: 'closed',
      createdAt: `${yesterdayDate}T09:00:00Z`,
      updatedAt: `${yesterdayDate}T23:30:00Z`
    });

    // Close the day for yesterday
    await db.insert(closedDays).values({
      id: crypto.randomUUID(),
      closedDate: yesterdayDate,
      closedBy: managerUserId,
      closeTime: `${yesterdayDate}T23:30:00Z`
    });



    console.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding SQLite database:', error);
    throw error;
  }
}

seed();
