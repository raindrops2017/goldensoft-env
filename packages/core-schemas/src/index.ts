import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string(),
  username: z.string(),
  pin: z.string(),
  role: z.string().default('user'),
  roleId: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
  cloudSyncId: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type User = z.infer<typeof UserSchema>;

// Check schemas have been moved to checks.schema.ts

export const SyncQueueSchema = z.object({
  id: z.string(),
  tableName: z.string(),
  action: z.enum(['INSERT', 'UPDATE', 'DELETE']),
  payloadId: z.string(),
  createdAt: z.string(),
});
export type SyncQueue = z.infer<typeof SyncQueueSchema>;

export * from './auth.schema';
export * from './shift.schema';
export * from './permissions';
export * from './tables.schema';
export * from './menu.schema';
export * from './checks.schema';
export * from './calculations';
export * from './logs.schema';

