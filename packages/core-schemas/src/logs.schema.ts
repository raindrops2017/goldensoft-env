import { z } from 'zod';

export const ScreenLogSchema = z.object({
  id: z.string(),
  userId: z.string(),
  username: z.string(),
  shiftId: z.string().nullable().optional(),
  businessDate: z.string(),
  actionType: z.string(),
  tableId: z.string().nullable().optional(),
  tableNo: z.string().nullable().optional(),
  checkId: z.string().nullable().optional(),
  permitterId: z.string().nullable().optional(),
  permitterName: z.string().nullable().optional(),
  details: z.record(z.any()), // JSON detail
  createdAt: z.string(),
});

export type ScreenLog = z.infer<typeof ScreenLogSchema>;

export const ScreenLogInputSchema = ScreenLogSchema.omit({ id: true, createdAt: true });
export type ScreenLogInput = z.infer<typeof ScreenLogInputSchema>;
