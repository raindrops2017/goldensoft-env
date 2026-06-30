import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './logsSchema';
import path from 'path';
import { env } from '../env';

// Determine logs db path based on the main db path
const mainDbDir = path.dirname(env.LOCAL_DB_PATH);
const logsDbPath = path.join(mainDbDir, 'local_logs.db');

const sqlite = new Database(logsDbPath);
sqlite.pragma('journal_mode = WAL');

export const logsDb = drizzle(sqlite, { schema });

/**
 * Initializes the logs database and creates the logs table if it does not exist.
 * This runs on application startup to ensure database readiness.
 */
export function initializeLogsDb() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS screen_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      shift_id TEXT,
      business_date TEXT NOT NULL,
      action_type TEXT NOT NULL,
      details TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Dynamically add columns if migrating from an older schema version
  try {
    sqlite.exec(`ALTER TABLE screen_logs ADD COLUMN table_id TEXT;`);
  } catch (e) {
    // Column already exists
  }
  try {
    sqlite.exec(`ALTER TABLE screen_logs ADD COLUMN table_no TEXT;`);
  } catch (e) {
    // Column already exists
  }
  try {
    sqlite.exec(`ALTER TABLE screen_logs ADD COLUMN check_id TEXT;`);
  } catch (e) {
    // Column already exists
  }
  try {
    sqlite.exec(`ALTER TABLE screen_logs ADD COLUMN permitter_id TEXT;`);
  } catch (e) {
    // Column already exists
  }
  try {
    sqlite.exec(`ALTER TABLE screen_logs ADD COLUMN permitter_name TEXT;`);
  } catch (e) {
    // Column already exists
  }

  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_screen_logs_synced ON screen_logs(synced);
    CREATE INDEX IF NOT EXISTS idx_screen_logs_business_date ON screen_logs(business_date);
    CREATE INDEX IF NOT EXISTS idx_screen_logs_table_id ON screen_logs(table_id);
    CREATE INDEX IF NOT EXISTS idx_screen_logs_check_id ON screen_logs(check_id);
  `);
  console.log('✅ Logs Database initialized (WAL mode and columns check completed)');
}
