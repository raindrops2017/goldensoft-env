import axios from 'axios';
import { env } from '../../env';
import { BranchLogsService } from './logs.service';

const logsService = new BranchLogsService();
let isSyncing = false;

/**
 * Syncs unsynced local screen logs to the cloud backend.
 * Queries unsynced logs, sends them in a single batch, and updates their synced status locally on success.
 */
export async function syncLogsToCloud() {
  if (isSyncing) {
    return;
  }
  isSyncing = true;

  try {
    const unsynced = await logsService.getUnsyncedLogs(100);
    if (unsynced.length === 0) {
      isSyncing = false;
      return;
    }

    console.log(`⏳ [Sync Worker] Found ${unsynced.length} unsynced logs. Syncing to cloud...`);

    // Map SQLite schema properties to format expected by cloud backend
    const payload = unsynced.map(log => ({
      id: log.id,
      userId: log.userId,
      username: log.username,
      shiftId: log.shiftId,
      businessDate: log.businessDate,
      actionType: log.actionType,
      tableId: log.tableId,
      tableNo: log.tableNo,
      checkId: log.checkId,
      permitterId: log.permitterId,
      permitterName: log.permitterName,
      details: JSON.parse(log.details),
      createdAt: log.createdAt,
    }));

    // Send logs batch to cloud-backend
    const response = await axios.post(
      `${env.CLOUD_API_URL}/tenant/logs/sync`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-subdomain': env.TENANT_SUBDOMAIN,
        },
        timeout: 10000, // 10 seconds timeout
      }
    );

    if (response.data?.success) {
      const syncedIds = unsynced.map(log => log.id);
      await logsService.markLogsAsSynced(syncedIds);
      console.log(`✅ [Sync Worker] Successfully synced ${syncedIds.length} logs to cloud.`);
    } else {
      console.error(`❌ [Sync Worker] Cloud sync failed:`, response.data?.error || 'Unknown error');
    }
  } catch (err: any) {
    console.error(`❌ [Sync Worker] Error during log sync:`, err.message || err);
  } finally {
    isSyncing = false;
  }
}

/**
 * Starts the periodic sync worker for logs.
 * Default interval is 1 minute (60000ms).
 */
export function startLogsSyncWorker(intervalMs: number = 60000) {
  console.log(`⚙️  [Sync Worker] Starting log sync worker (Interval: ${intervalMs}ms)`);
  
  // Run once on startup
  syncLogsToCloud();

  // Schedule periodic execution
  setInterval(syncLogsToCloud, intervalMs);
}
