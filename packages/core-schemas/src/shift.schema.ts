import { z } from 'zod';

export const OpenShiftSchema = z.object({
  startingCash: z.number().min(0, "Starting cash cannot be negative").default(0),
});
export type OpenShift = z.infer<typeof OpenShiftSchema>;

export const CloseShiftSchema = z.object({
  actualClosingCash: z.number().min(0, "Actual closing cash cannot be negative"),
});
export type CloseShift = z.infer<typeof CloseShiftSchema>;

export const CloseDaySchema = z.object({
  actualClosingCash: z.number().min(0, "Actual closing cash cannot be negative"),
});
export type CloseDay = z.infer<typeof CloseDaySchema>;

