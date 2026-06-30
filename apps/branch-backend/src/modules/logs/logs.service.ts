import { eq, inArray, desc } from 'drizzle-orm';
import { logsDb } from '../../db/logsDb';
import { screenLogs } from '../../db/logsSchema';

export class BranchLogsService {
  /**
   * Retrieves a batch of local logs that have not yet been synced to the cloud.
   */
  async getUnsyncedLogs(limit: number = 100) {
    return logsDb
      .select()
      .from(screenLogs)
      .where(eq(screenLogs.synced, false))
      .limit(limit)
      .all();
  }

  /**
   * Marks a set of logs as successfully synced in the local SQLite database.
   */
  async markLogsAsSynced(logIds: string[]) {
    if (logIds.length === 0) {
      return;
    }
    
    logsDb
      .update(screenLogs)
      .set({ synced: true })
      .where(inArray(screenLogs.id, logIds))
      .run();
  }

  /**
   * Retrieves all log entries associated with a specific table, ordered by creation time descending.
   */
  async getLogsByTable(tableId: string) {
    return logsDb
      .select()
      .from(screenLogs)
      .where(eq(screenLogs.tableId, tableId))
      .orderBy(desc(screenLogs.createdAt))
      .all();
  }

  /**
   * Retrieves all log entries associated with a specific check, ordered by creation time descending.
   */
  async getLogsByCheck(checkId: string) {
    return logsDb
      .select()
      .from(screenLogs)
      .where(eq(screenLogs.checkId, checkId))
      .orderBy(desc(screenLogs.createdAt))
      .all();
  }
}
