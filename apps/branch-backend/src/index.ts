import express, { Request, Response } from 'express';
import cors from 'cors';
import { db } from './db';
import { initializeLogsDb } from './db/logsDb';
import { sql } from 'drizzle-orm';
import { env } from './env';
import cookieParser from 'cookie-parser';
import http from 'http';
import { initializeSocketServer } from './modules/sockets/socket.server';
// import { startLogsSyncWorker } from './modules/logs/logs.worker';

// Initialize the isolated SQLite logs database
initializeLogsDb();

import { ensurePermissionsExist } from './db/ensurePermissions';
ensurePermissionsExist();

const app = express();
const PORT = env.PORT;


import authRoutes from './modules/auth/auth.routes';
import shiftRoutes from './modules/shifts/shift.routes';
import tablesRoutes from './modules/tables/tables.routes';
import menusRoutes from './modules/menus/menus.routes';
import checksRoutes from './modules/checks/checks.routes';
import optionsRoutes from './modules/options/options.routes';
import logsRoutes from './modules/logs/logs.routes';
import customersRoutes from './modules/customers/customers.routes';

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/tables', tablesRoutes);
app.use('/api/menus', menusRoutes);
app.use('/api/checks', checksRoutes);
app.use('/api/options', optionsRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/customers', customersRoutes);

app.get('/api/health', async (req: Request, res: Response) => {
  try {
    // Query the local SQLite DB to verify connection
    const result = db.get(sql`SELECT 1 as alive`);
    res.json({ success: true, message: 'Branch backend is healthy', db: result });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ success: false, error: 'Database connection failed' });
  }
});
const server = http.createServer(app);

// Initialize LAN Socket.io Server
const io = initializeSocketServer(server);
app.set('io', io);

server.listen(PORT, () => {
  console.log(`Branch backend running on port ${PORT}`);
  // startLogsSyncWorker();
});

