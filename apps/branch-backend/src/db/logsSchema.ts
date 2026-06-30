import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const screenLogs = sqliteTable('screen_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  username: text('username').notNull(),
  shiftId: text('shift_id'),
  businessDate: text('business_date').notNull(),
  actionType: text('action_type').notNull(),
  tableId: text('table_id'),
  tableNo: text('table_no'),
  checkId: text('check_id'),
  permitterId: text('permitter_id'),
  permitterName: text('permitter_name'),
  details: text('details').notNull(), // JSON stringified object
  synced: integer('synced', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});
