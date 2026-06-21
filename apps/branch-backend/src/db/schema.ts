import { sqliteTable, text, integer, primaryKey, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const roles = sqliteTable('roles', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  cloudSyncId: text('cloud_sync_id'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const permissions = sqliteTable('permissions', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  cloudSyncId: text('cloud_sync_id'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const rolePermissions = sqliteTable('role_permissions', {
  roleId: text('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permissionId: text('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
  cloudSyncId: text('cloud_sync_id'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),  
}, (table) => [
  primaryKey({ name: 'role_permissions_pk', columns: [table.roleId, table.permissionId] }),
]);

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  pin: text('pin').notNull(), 
  role: text('role').notNull().default('user'),
  roleId: text('role_id').references(() => roles.id),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true), 
  cloudSyncId: text('cloud_sync_id'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const options = sqliteTable('options', {
  id: text('id').primaryKey(),
  version: integer('version').notNull().default(0),
  language: text('language').notNull().default('en'),
  taxPercent: real('tax_percent').notNull().default(0),
  entTax: real('ent_tax').notNull().default(0),
  serviceChargePercent: real('service_charge_percent').notNull().default(0),
  fixedDeliveryCharge: real('fixed_delivery_charge').notNull().default(0),
  fixedMinimumCharge: real('fixed_minimum_charge').notNull().default(0),
  kitchenPrint: integer('kitchen_print').notNull().default(0),
  kitchenControlCount: integer('kitchen_control_count').notNull().default(0),
  discountPercent1: real('discount_percent_1').notNull().default(0),
  discountPercent2: real('discount_percent_2').notNull().default(0),
  discountPercent3: real('discount_percent_3').notNull().default(0),
  discountPercent4: real('discount_percent_4').notNull().default(0),
  discountPercent5: real('discount_percent_5').notNull().default(0),
  branchName: text('branch_name').notNull(),
  branchAddress: text('branch_address'),
  branchPhone: text('branch_phone'),
  branchLogo: text('branch_logo'),
  branchTaxId: text('branch_tax_id'),
  cloudSyncId: text('cloud_sync_id'),
});

export const tableSections = sqliteTable('table_sections', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  cloudSyncId: text('cloud_sync_id'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),  
});

export const tables = sqliteTable('tables', {
  id: text('id').primaryKey(),
  number: integer('number').notNull(),
  name: text('name').notNull().default(''),
  posX: real('pos_x').notNull().default(10),
  posY: real('pos_y').notNull().default(10),
  tableWidth: integer('table_width').notNull().default(125),
  tableHeight: integer('table_height').notNull().default(125),
  angle: integer('angle').notNull().default(0),
  shape: text("shape", { enum: ["rect", "circle"] }).notNull().default("rect"),
  tableSectionId: text('table_section_id').notNull().references(() => tableSections.id),
  cloudSyncId: text('cloud_sync_id'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),  
});

export const customers = sqliteTable('customers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  kind: integer('kind').notNull().default(1),
  discount: real('discount').notNull().default(0),
  cloudSyncId: text('cloud_sync_id'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),  
});

export const deliveryZones = sqliteTable('delivery_zones', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  deliveryCharge: real('delivery_charge').notNull().default(0),
  cloudSyncId: text('cloud_sync_id'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),  
});

export const deliveryCustomers = sqliteTable('delivery_customers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  deliveryZoneId: text('delivery_zone_id').notNull().references(() => deliveryZones.id),
  phone: text('phone').notNull(),
  phone1: text('phone1'),
  phone2: text('phone2'),
  phone3: text('phone3'),
  phone4: text('phone4'),
  address: text('address'),
  address1: text('address1'),
  address2: text('address2'),
  address3: text('address3'),
  address4: text('address4'),
  floor: text('floor'),
  unit: text('unit'),
  landmark: text('landmark'),
  notes: text('notes'),
  cloudSyncId: text('cloud_sync_id'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),  
});

export const deliveryPilots = sqliteTable('delivery_pilots', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  cloudSyncId: text('cloud_sync_id'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),  
});

export const printers = sqliteTable('printers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  ipAddress: text('ip_address').notNull(),
  port: integer('port').notNull().default(9100),
  isUsb: integer('is_usb').notNull().default(0),
  isDefault: integer('is_default').notNull().default(0),
  connection: text('connection').notNull(),
  cloudSyncId: text('cloud_sync_id'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),  
});

export const menuTypes = sqliteTable('menu_types', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  isActive: integer('is_active').notNull().default(1),
  cloudSyncId: text('cloud_sync_id'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),  
});

export const menuGroups = sqliteTable('menu_groups', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  menuTypeId: text('menu_type_id').notNull().references(() => menuTypes.id),
  isActive: integer('is_active').notNull().default(1),
  cloudSyncId: text('cloud_sync_id'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),  
});

export const menuSubGroups = sqliteTable('menu_sub_groups', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  menuGroupId: text('menu_group_id').notNull().references(() => menuGroups.id),
  menuTypeId: text('menu_type_id').notNull().references(() => menuTypes.id),
  isActive: integer('is_active').notNull().default(1),
  cloudSyncId: text('cloud_sync_id'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),  
});

export const modifiersGroups = sqliteTable('modifiers_groups', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  cloudSyncId: text('cloud_sync_id'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),  
});

export const modifiers = sqliteTable('modifiers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  price: real('price').notNull().default(0),
  modifiersGroupId: text('modifiers_group_id').notNull().references(() => modifiersGroups.id),
  cloudSyncId: text('cloud_sync_id'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),  
});

export const menuItems = sqliteTable('menu_items', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  arabicName: text('arabic_name').notNull(),
  menuGroupId: text('menu_group_id').notNull().references(() => menuGroups.id),
  menuSubGroupId: text('menu_sub_group_id').references(() => menuSubGroups.id),
  image: text('image'),
  explicitTax: real('explicit_tax').notNull().default(0),
  noDiscount: integer('no_discount').notNull().default(0),
  soldOut: integer('sold_out').notNull().default(0),
  coffeeSugar: integer('coffee_sugar').notNull().default(0),
  meatDoneness: integer('meat_doneness').notNull().default(0),
  notes: text('notes'),
  isActive: integer('is_active').notNull().default(1),
  cloudSyncId: text('cloud_sync_id'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),  
});

export const menuItemPrices = sqliteTable('menu_item_prices', {
  id: text('id').primaryKey(),
  priceName: text('price_name').notNull(),
  menuItemId: text('menu_item_id').notNull().references(() => menuItems.id),
  diningPrice: real('dining_price').notNull().default(0),
  takeAwayPrice: real('take_away_price').notNull().default(0),
  deliveryPrice: real('delivery_price').notNull().default(0),
  officerPrice: real('officer_price').notNull().default(0),
  isActive: integer('is_active').notNull().default(1),
  cloudSyncId: text('cloud_sync_id'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),  
});

export const menuItemModifiers = sqliteTable('menu_item_modifiers', {
  id: text('id').primaryKey(),
  menuItemId: text('menu_item_id').notNull().references(() => menuItems.id),
  modifiersGroupId: text('modifiers_group_id').notNull().references(() => modifiersGroups.id),
  groupOrder: integer('group_order').notNull().default(0),
  choiceCount: integer('choice_count').notNull().default(0),
  cloudSyncId: text('cloud_sync_id'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),  
});

export const menuItemPrinters = sqliteTable('menu_item_printers', {
  id: text('id').primaryKey(),
  menuItemId: text('menu_item_id').notNull().references(() => menuItems.id),
  printerId: text('printer_id').notNull().references(() => printers.id),
  isActive: integer('is_active').notNull().default(1),
  cloudSyncId: text('cloud_sync_id'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),  
});

export const checkStatus = sqliteTable('check_status', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  status: text('status').notNull().unique(),
  cloudSyncId: text('cloud_sync_id'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),  
});

export const checkKind = sqliteTable('check_kind', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  kind: text('kind').notNull().unique(),
  cloudSyncId: text('cloud_sync_id'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),  
});

export const checks = sqliteTable('checks', {
  id: text('id').primaryKey(),
  chkNo: integer('chk_no').notNull(),
  transactionNo: text('transaction_no').notNull(),
  chkDate: text('chk_date').notNull(),
  chkTime: text('chk_time').notNull(),
  checkKindId: integer('check_kind_id').notNull().references(() => checkKind.id),
  tableId: text('table_id').references(() => tables.id),
  tableName: text('table_name'),
  net: real('net').notNull().default(0),
  discount: real('discount').notNull().default(0),
  discountPercent: real('discount_percent').notNull().default(0),
  discountBy: text('discount_by').references(() => users.id),
  serviceCharge: real('service_charge').notNull().default(0),
  tax: real('tax').notNull().default(0),
  entTax: real('ent_tax').notNull().default(0),
  deliveryCharge: real('delivery_charge').notNull().default(0),
  total: real('total').notNull().default(0),
  cash: real('cash').notNull().default(0),
  visa: real('visa').notNull().default(0),
  credit: real('credit').notNull().default(0),
  paidCash: real('paid_cash').notNull().default(0),
  tipsCash: real('tips_cash').notNull().default(0),
  tipsVisa: real('tips_visa').notNull().default(0),
  entAmount: real('ent_amount').notNull().default(0),
  minimumCharge: real('minimum_charge').notNull().default(0),
  voidAmount: real('void_amount').notNull().default(0),
  voidReason: text('void_reason'),
  voidBy: text('void_by').references(() => users.id),
  visaNumber: text('visa_number'),
  closeTime: text('close_time'),
  chkStatusId: integer('chk_status_id').notNull().references(() => checkStatus.id),
  guestCount: integer('guest_count').notNull().default(1),
  printCount: integer('print_count').notNull().default(0),
  customerId: text('customer_id').references(() => customers.id),
  deliveryCustomerId: text('delivery_customer_id').references(() => deliveryCustomers.id),
  deliveryPilotId: text('delivery_pilot_id').references(() => deliveryPilots.id),
  cashierId: text('cashier_id').references(() => users.id),
  waiterId: text('waiter_id').references(() => users.id),
  shift: integer('shift').notNull().default(1),
  cloudSyncId: text('cloud_sync_id'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),  
});

export const checkItems = sqliteTable('check_items', {
  id: text('id').primaryKey(),
  chkId: text('chk_id').notNull().references(() => checks.id),
  menuItemId: text('menu_item_id').notNull().references(() => menuItems.id),
  itemPrice: real('item_price').notNull().default(0),
  qty: real('qty').notNull().default(1),
  notes: text('notes'),
  voidQty: real('void_qty').notNull().default(0),
  voidBy: text('void_by').references(() => users.id),
  voidReason: text('void_reason'),
  voidKind: integer('void_kind').notNull().default(0),
  entQty: real('ent_qty').notNull().default(0),
  entBy: text('ent_by').references(() => users.id),
  cloudSyncId: text('cloud_sync_id'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),  
});

export const checkItemModifiers = sqliteTable('check_item_modifiers', {
  id: text('id').primaryKey(),
  checkItemId: text('check_item_id').notNull().references(() => checkItems.id),
  menuItemModifierId: text('menu_item_modifier_id').notNull().references(() => menuItemModifiers.id),
  modifierId: text('modifier_id').notNull().references(() => modifiers.id),
  qty: real('qty').notNull().default(1),
  cloudSyncId: text('cloud_sync_id'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),  
});

export const closedDays = sqliteTable('closed_days', {
  id: text('id').primaryKey(),
  closedDate: text('closed_date').notNull(),
  closedBy: text('closed_by').references(() => users.id),
  closeTime: text('close_time').notNull(),
  cloudSyncId: text('cloud_sync_id'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),  
});

export const refreshTokens = sqliteTable('refresh_tokens', {
  id: text('id').primaryKey(),
  token: text('token').notNull(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: text('expires_at').notNull(),
  cloudSyncId: text('cloud_sync_id'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

// --- NEW TABLES ---
export const syncQueue = sqliteTable('sync_queue', {
  id: text('id').primaryKey(),
  tableName: text('table_name').notNull(),
  action: text('action').notNull(), // 'INSERT', 'UPDATE', 'DELETE'
  payloadId: text('payload_id').notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const shifts = sqliteTable('shifts', {
  id: text('id').primaryKey(),
  shiftNumber: integer('shift_number').notNull(),
  businessDate: text('business_date').notNull(),
  openedBy: text('opened_by').notNull().references(() => users.id),
  closedBy: text('closed_by').references(() => users.id),
  startingCash: real('starting_cash').notNull().default(0),
  expectedClosingCash: real('expected_closing_cash').default(0),
  actualClosingCash: real('actual_closing_cash').default(0),
  status: text('status').notNull().default('open'), // 'open' or 'closed'
  cloudSyncId: text('cloud_sync_id'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),  
});
