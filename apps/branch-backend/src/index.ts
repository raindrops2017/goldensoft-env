import express, { Request, Response } from 'express';
import cors from 'cors';
import { db } from './db';
import { sql } from 'drizzle-orm';
import { env } from './env';

import cookieParser from 'cookie-parser';

const app = express();
const PORT = env.PORT;

import authRoutes from './modules/auth/auth.routes';
import shiftRoutes from './modules/shifts/shift.routes';
import tablesRoutes from './modules/tables/tables.routes';

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/tables', tablesRoutes);

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

app.listen(PORT, () => {
  console.log(`Branch backend running on port ${PORT}`);
});
