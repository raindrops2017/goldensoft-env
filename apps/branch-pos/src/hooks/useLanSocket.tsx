import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/useAuthStore';
import { env } from '../env';
import { useQueryClient } from '@tanstack/react-query';
import type {
  LanClientToServerEvents,
  LanServerToClientEvents,
  TableLock,
  SocketAcknowledgement,
} from '@goldensoft/socket-contracts';
import type { CheckItem } from '@goldensoft/core-schemas';
import { toast } from 'sonner';

type LanSocketType = Socket<LanServerToClientEvents, LanClientToServerEvents>;

interface LanSocketContextType {
  socket: LanSocketType | null;
  isConnected: boolean;
  locks: Record<string, TableLock>;
  acquireLock: (tableId: string) => Promise<boolean>;
  releaseLock: (tableId: string) => Promise<boolean>;
  updateTableStatus: (
    tableId: string,
    status: 'occupied' | 'dirty' | 'available',
    chkNo?: number | null
  ) => Promise<boolean>;
  sendKdsOrder: (checkId: string, items: CheckItem[]) => Promise<boolean>;
}

const LanSocketContext = createContext<LanSocketContextType | undefined>(
  undefined
);

const getSocketUrl = () => {
  const url = env.VITE_API_BASE_URL;
  return url.endsWith('/api') ? url.substring(0, url.length - 4) : url;
};

export const LanSocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [locks, setLocks] = useState<Record<string, TableLock>>({});
  const socketRef = useRef<LanSocketType | null>(null);

  useEffect(() => {
    if (!accessToken) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    const socketUrl = getSocketUrl();
    const socket = io(socketUrl, {
      auth: { token: accessToken },
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket as any;

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('🔌 Connected to LAN socket server');

      // Perform handshake sync
      socket.emit('lan:handshake', (res: SocketAcknowledgement<{ locks: TableLock[] }>) => {
        if (res.success && res.data) {
          const lockMap: Record<string, TableLock> = {};
          res.data.locks.forEach((lock: TableLock) => {
            lockMap[lock.tableId] = lock;
          });
          setLocks(lockMap);
        }
      });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('🔌 Disconnected from LAN socket server');
    });

    socket.on('table:lock:acquired', (lock: TableLock) => {
      setLocks((prev) => ({ ...prev, [lock.tableId]: lock }));
    });

    socket.on('table:lock:released', ({ tableId }: { tableId: string }) => {
      setLocks((prev) => {
        const next = { ...prev };
        delete next[tableId];
        return next;
      });
    });

    socket.on('table:status:changed', ({ tableId: _tableId }) => {
      // Invalidate query to refetch tables and sections state
      queryClient.invalidateQueries({ queryKey: ['tableSections'] });
      queryClient.invalidateQueries({ queryKey: ['openChecks'] });
      toast.info('Table status updated in real-time');
    });

    socket.on('kds:order:received', () => {
      queryClient.invalidateQueries({ queryKey: ['openChecks'] });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [accessToken, queryClient]);

  const acquireLock = useCallback((tableId: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const socket = socketRef.current;
      if (!socket || !isConnected) {
        toast.error('Socket offline. Cannot lock table.');
        return resolve(false);
      }

      socket.emit('table:lock:acquire', tableId, (res) => {
        if (res.success && res.data) {
          setLocks((prev) => ({ ...prev, [tableId]: res.data! }));
          resolve(true);
        } else {
          toast.error(res.error || 'Failed to acquire table lock.');
          resolve(false);
        }
      });
    });
  }, [isConnected]);

  const releaseLock = useCallback((tableId: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const socket = socketRef.current;
      if (!socket || !isConnected) {
        return resolve(false);
      }

      socket.emit('table:lock:release', tableId, (res) => {
        if (res.success) {
          setLocks((prev) => {
            const next = { ...prev };
            delete next[tableId];
            return next;
          });
          resolve(true);
        } else {
          resolve(false);
        }
      });
    });
  }, [isConnected]);

  const updateTableStatus = useCallback((
    tableId: string,
    status: 'occupied' | 'dirty' | 'available',
    chkNo?: number | null
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      const socket = socketRef.current;
      if (!socket || !isConnected) {
        return resolve(false);
      }

      socket.emit('table:update', { tableId, status, chkNo }, (res) => {
        if (res.success) {
          queryClient.invalidateQueries({ queryKey: ['tableSections'] });
          resolve(true);
        } else {
          resolve(false);
        }
      });
    });
  }, [isConnected, queryClient]);

  const sendKdsOrder = useCallback((
    checkId: string,
    items: CheckItem[]
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      const socket = socketRef.current;
      if (!socket || !isConnected) {
        toast.error('Socket offline. Cannot send order to kitchen.');
        return resolve(false);
      }

      socket.emit('kds:order:send', { checkId, items }, (res) => {
        if (res.success) {
          resolve(true);
        } else {
          toast.error(res.error || 'Failed to send kitchen order.');
          resolve(false);
        }
      });
    });
  }, [isConnected]);

  return (
    <LanSocketContext.Provider
      value={{
        socket: socketRef.current,
        isConnected,
        locks,
        acquireLock,
        releaseLock,
        updateTableStatus,
        sendKdsOrder,
      }}
    >
      {children}
    </LanSocketContext.Provider>
  );
};

export const useLanSocket = () => {
  const context = useContext(LanSocketContext);
  if (context === undefined) {
    throw new Error('useLanSocket must be used within a LanSocketProvider');
  }
  return context;
};
