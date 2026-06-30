import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../../env';
import { JwtPayload, JwtPayloadSchema } from '@goldensoft/core-schemas';
import {
  LanClientToServerEvents,
  LanServerToClientEvents,
} from '@goldensoft/socket-contracts';
import { lockManager } from './lock-manager';
import { db } from '../../db';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { logsDb } from '../../db/logsDb';
import { screenLogs } from '../../db/logsSchema';

type LanSocket = Socket<
  LanClientToServerEvents,
  LanServerToClientEvents,
  any,
  { user: JwtPayload; username: string }
>;

/**
 * Initializes the local LAN Socket.io server.
 * Handles socket authentication, operational table locking, and KDS routing.
 */
export function initializeSocketServer(httpServer: HttpServer) {
  const io = new SocketServer<
    LanClientToServerEvents,
    LanServerToClientEvents,
    any,
    { user: JwtPayload; username: string }
  >(httpServer, {
    cors: {
      origin: '*', // Enforce open origin for LAN clients
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Verify socket handshake connection using JWT tokens
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token || typeof token !== 'string') {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      const parsed = JwtPayloadSchema.safeParse(decoded);

      if (!parsed.success) {
        return next(new Error('Authentication error: Invalid token payload'));
      }

      socket.data.user = parsed.data;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  io.on('connection', (socket: LanSocket) => {
    const user = socket.data.user;
    if (!user) return;

    // Fetch the username from database once to avoid repeated DB lookups
    const userRecord = db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.id, user.userId))
      .get();
    
    const username = userRecord?.username || 'Unknown User';
    socket.data.username = username;

    console.log(`🔌 Socket connected: ${socket.id} (User: ${username}, ID: ${user.userId})`);

    // 1. Client handshake to retrieve current state
    socket.on('lan:handshake', (callback) => {
      try {
        const locks = lockManager.getLocks();
        callback({ success: true, data: { locks } });
      } catch (err: any) {
        callback({
          success: false,
          error: err.message || 'Handshake failed',
        });
      }
    });

    // 2. Try to acquire table lock
    socket.on('table:lock:acquire', (tableId, callback) => {
      try {
        const lock = lockManager.acquireLock(
          tableId,
          socket.id,
          user.userId,
          username
        );

        if (!lock) {
          return callback({
            success: false,
            error: 'Table is currently locked by another terminal.',
          });
        }

        // Notify other clients about the lock acquisition
        socket.broadcast.emit('table:lock:acquired', lock);
        callback({ success: true, data: lock });
      } catch (err: any) {
        callback({
          success: false,
          error: err.message || 'Failed to acquire table lock.',
        });
      }
    });

    // 3. Try to release table lock
    socket.on('table:lock:release', (tableId, callback) => {
      try {
        const released = lockManager.releaseLock(tableId, user.userId);

        if (!released) {
          return callback({
            success: false,
            error: 'Failed to release lock, or you do not own this lock.',
          });
        }

        // Notify other clients about the lock release
        socket.broadcast.emit('table:lock:released', {
          tableId,
          userId: user.userId,
        });
        callback({ success: true, data: { tableId } });
      } catch (err: any) {
        callback({
          success: false,
          error: err.message || 'Failed to release table lock.',
        });
      }
    });

    // 4. Handle table status change propagation
    socket.on('table:update', (payload, callback) => {
      try {
        // Broadcast the update to all other connected client screens
        socket.broadcast.emit('table:status:changed', {
          tableId: payload.tableId,
          status: payload.status,
          chkNo: payload.chkNo,
        });
        callback({ success: true });
      } catch (err: any) {
        callback({
          success: false,
          error: err.message || 'Failed to update table status.',
        });
      }
    });

    // 5. Broadcast kitchen ticket orders to KDS display terminals
    socket.on('kds:order:send', (payload, callback) => {
      try {
        io.emit('kds:order:received', {
          checkId: payload.checkId,
          items: payload.items,
          sentAt: new Date().toISOString(),
        });
        callback({ success: true });
      } catch (err: any) {
        callback({
          success: false,
          error: err.message || 'Failed to dispatch kitchen ticket.',
        });
      }
    });

    // 6. Handle screen/action logs creation from clients
    socket.on('pos:log:create', (payload, callback) => {
      try {
        const logId = (payload as any).id || randomUUID();
        logsDb.insert(screenLogs).values({
          id: logId,
          userId: payload.userId,
          username: payload.username,
          shiftId: payload.shiftId || null,
          businessDate: payload.businessDate,
          actionType: payload.actionType,
          tableId: payload.tableId || null,
          tableNo: payload.tableNo || null,
          checkId: payload.checkId || null,
          permitterId: payload.permitterId || null,
          permitterName: payload.permitterName || null,
          details: JSON.stringify(payload.details),
          synced: false,
          createdAt: new Date().toISOString(),
        }).run();

        callback({ success: true });
      } catch (err: any) {
        console.error('❌ Failed to save screen log:', err);
        callback({
          success: false,
          error: err.message || 'Failed to save screen log',
        });
      }
    });

    // 7. Handle socket disconnect (release locks automatically)
    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id} (User: ${username})`);
      const releasedLocks = lockManager.releaseLocksForSocket(socket.id);

      for (const lock of releasedLocks) {
        socket.broadcast.emit('table:lock:released', {
          tableId: lock.tableId,
          userId: lock.lockedBy.userId,
        });
      }
    });
  });

  return io;
}
