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

export const CheckSchema = z.object({
  id: z.string(),
  chkNo: z.number(),
  transactionNo: z.string(),
  chkDate: z.string(),
  chkTime: z.string(),
  checkKindId: z.number(),
  tableId: z.string().nullable().optional(),
  tableName: z.string().nullable().optional(),
  net: z.number().default(0),
  discount: z.number().default(0),
  discountPercent: z.number().default(0),
  discountBy: z.string().nullable().optional(),
  serviceCharge: z.number().default(0),
  tax: z.number().default(0),
  entTax: z.number().default(0),
  deliveryCharge: z.number().default(0),
  total: z.number().default(0),
  cash: z.number().default(0),
  visa: z.number().default(0),
  credit: z.number().default(0),
  paidCash: z.number().default(0),
  tipsCash: z.number().default(0),
  tipsVisa: z.number().default(0),
  entAmount: z.number().default(0),
  minimumCharge: z.number().default(0),
  voidAmount: z.number().default(0),
  voidReason: z.string().nullable().optional(),
  voidBy: z.string().nullable().optional(),
  visaNumber: z.string().nullable().optional(),
  closeTime: z.string().nullable().optional(),
  chkStatusId: z.number(),
  guestCount: z.number().default(1),
  printCount: z.number().default(0),
  customerId: z.string().nullable().optional(),
  deliveryCustomerId: z.string().nullable().optional(),
  deliveryPilotId: z.string().nullable().optional(),
  cashierId: z.string().nullable().optional(),
  waiterId: z.string().nullable().optional(),
  shift: z.number().default(1),
  cloudSyncId: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Check = z.infer<typeof CheckSchema>;

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
