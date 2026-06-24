import { TableLock } from '@goldensoft/socket-contracts';

class LockManager {
  // Map tableId -> lock details
  private locks = new Map<string, {
    socketId: string;
    userId: string;
    username: string;
    acquiredAt: string;
  }>();

  /**
   * Tries to acquire a lock for a table.
   * If already locked by someone else, returns null.
   * If already locked by the same user/socket, returns the existing lock details.
   */
  acquireLock(
    tableId: string,
    socketId: string,
    userId: string,
    username: string
  ): TableLock | null {
    const existing = this.locks.get(tableId);
    if (existing) {
      if (existing.userId === userId && existing.socketId === socketId) {
        return {
          tableId,
          lockedBy: { userId: existing.userId, username: existing.username },
          acquiredAt: existing.acquiredAt,
        };
      }
      return null; // Locked by someone else
    }

    const acquiredAt = new Date().toISOString();
    this.locks.set(tableId, { socketId, userId, username, acquiredAt });
    return {
      tableId,
      lockedBy: { userId, username },
      acquiredAt,
    };
  }

  /**
   * Releases a lock if owned by the requesting user.
   */
  releaseLock(tableId: string, userId: string): boolean {
    const existing = this.locks.get(tableId);
    if (existing && existing.userId === userId) {
      this.locks.delete(tableId);
      return true;
    }
    return false;
  }

  /**
   * Releases all locks held by a socket connection. Useful on client disconnect.
   */
  releaseLocksForSocket(socketId: string): TableLock[] {
    const released: TableLock[] = [];
    for (const [tableId, lock] of this.locks.entries()) {
      if (lock.socketId === socketId) {
        this.locks.delete(tableId);
        released.push({
          tableId,
          lockedBy: { userId: lock.userId, username: lock.username },
          acquiredAt: lock.acquiredAt,
        });
      }
    }
    return released;
  }

  /**
   * Returns all active table locks.
   */
  getLocks(): TableLock[] {
    const list: TableLock[] = [];
    for (const [tableId, lock] of this.locks.entries()) {
      list.push({
        tableId,
        lockedBy: { userId: lock.userId, username: lock.username },
        acquiredAt: lock.acquiredAt,
      });
    }
    return list;
  }
}

export const lockManager = new LockManager();
export type { TableLock };
