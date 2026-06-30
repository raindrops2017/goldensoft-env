import { Connection } from 'mongoose';
import { getScreenLogModel } from '../../models/tenant/ScreenLog';
import { ScreenLog } from '@goldensoft/core-schemas';

export class LogsService {
  /**
   * Performs a bulk upsert of synchronized screen logs into the tenant database.
   * Upserting ensures that duplicate logs are ignored if a batch is re-sent.
   */
  async syncLogs(tenantDb: Connection, logs: ScreenLog[]) {
    const ScreenLogModel = getScreenLogModel(tenantDb);

    const bulkOps = logs.map((log) => ({
      updateOne: {
        filter: { logId: log.id },
        update: {
          $set: {
            logId: log.id,
            userId: log.userId,
            username: log.username,
            shiftId: log.shiftId,
            businessDate: log.businessDate,
            actionType: log.actionType,
            tableId: log.tableId || null,
            tableNo: log.tableNo || null,
            checkId: log.checkId || null,
            permitterId: log.permitterId || null,
            permitterName: log.permitterName || null,
            details: log.details,
            createdAt: new Date(log.createdAt),
          },
        },
        upsert: true,
      },
    }));

    if (bulkOps.length === 0) {
      return { success: true, count: 0 };
    }

    const result = await ScreenLogModel.bulkWrite(bulkOps as any);
    
    return {
      success: true,
      count: logs.length,
      upsertedCount: result.upsertedCount,
      modifiedCount: result.modifiedCount,
    };
  }
}
