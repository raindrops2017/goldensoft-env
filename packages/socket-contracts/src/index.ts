import type { CheckItem } from '@goldensoft/core-schemas';

export interface TableLock {
  tableId: string;
  lockedBy: {
    userId: string;
    username: string;
  };
  acquiredAt: string;
}

export interface SocketAcknowledgement<T = any> {
  success: boolean;
  error?: string;
  data?: T;
}

/**
 * Socket.io events sent from Branch POS terminals to the Branch Backend server (Local LAN)
 */
export interface LanClientToServerEvents {
  /**
   * Client identifies itself, performs verification, and requests the current state
   * (e.g. active table locks, KDS queues, occupied tables).
   */
  "lan:handshake": (
    callback: (res: SocketAcknowledgement<{ locks: TableLock[] }>) => void
  ) => void;

  /**
   * Acquire a lock on a table before opening the cart or making changes.
   */
  "table:lock:acquire": (
    tableId: string,
    callback: (res: SocketAcknowledgement<TableLock>) => void
  ) => void;

  /**
   * Manually release a table lock (e.g., when closing the cart screen or navigating back).
   */
  "table:lock:release": (
    tableId: string,
    callback: (res: SocketAcknowledgement<{ tableId: string }>) => void
  ) => void;

  /**
   * Broadcast a table state change (occupied, dirty, available) to other tablets.
   */
  "table:update": (
    payload: { tableId: string; status: 'occupied' | 'dirty' | 'available'; chkNo?: number | null },
    callback: (res: SocketAcknowledgement) => void
  ) => void;

  /**
   * Send a check's items to the kitchen (KDS broadcast).
   */
  "kds:order:send": (
    payload: { checkId: string; items: CheckItem[] },
    callback: (res: SocketAcknowledgement) => void
  ) => void;
}

/**
 * Socket.io events sent from the Branch Backend server to Branch POS terminals (Local LAN)
 */
export interface LanServerToClientEvents {
  /**
   * Notifies all clients that a table has been locked.
   */
  "table:lock:acquired": (payload: TableLock) => void;

  /**
   * Notifies all clients that a table lock has been released.
   */
  "table:lock:released": (payload: { tableId: string; userId: string }) => void;

  /**
   * Notifies all clients that a table status has changed.
   */
  "table:status:changed": (payload: {
    tableId: string;
    status: 'occupied' | 'dirty' | 'available';
    chkNo?: number | null;
  }) => void;

  /**
   * Notifies KDS screens that new check items have been sent to the kitchen.
   */
  "kds:order:received": (payload: {
    checkId: string;
    items: CheckItem[];
    sentAt: string;
  }) => void;
}

/**
 * Sockets events for the Cloud Sync Pipeline (Branch Backend <-> Cloud Backend)
 * Placeholder definitions for future sync implementation.
 */
export interface CloudClientToServerEvents {
  "sync:register": (
    branchId: string,
    callback: (res: SocketAcknowledgement) => void
  ) => void;
  "sync:push": (
    payload: { queueItems: any[] },
    callback: (res: SocketAcknowledgement) => void
  ) => void;
}

export interface CloudServerToClientEvents {
  "sync:pull": (payload: { configs: any[] }) => void;
  "sync:request_push": () => void;
}
