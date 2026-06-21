import { z } from 'zod';

export const OpenShiftSchema = z.object({
  startingCash: z.number().min(0, "Starting cash cannot be negative").default(0),
});
export type OpenShift = z.infer<typeof OpenShiftSchema>;
