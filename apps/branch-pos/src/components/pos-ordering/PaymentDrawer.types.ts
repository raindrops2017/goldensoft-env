import { z } from "zod";

export const paymentSchema = z.object({
  paymentMethod: z.string(),
  cash: z.number().optional(),
  currency: z.string().optional(),
  customerName: z.string().optional(),
  clAmount: z.number().optional(),
  clNote: z.string().optional(),
  visaAmount: z.number().optional(),
  visaNo: z.string().optional(),
  cardType: z.string().optional(),
  tips: z.number().optional(),
  isComp: z.boolean().optional(),
  discountAmount: z.number().optional(),
  chkStut: z.number().optional(),
  tax: z.number().optional(),
  service: z.number().optional(),
  discountPrsn: z.number().optional(),
  customerId: z.string().optional(),
  supervisorPin: z.string().nullable().optional(),
  supervisorId: z.string().nullable().optional()
});

export type CurrencyOption = "Egyptian Pound (EGP)" | "US Dollar (USD)" | "Euro (EUR)";

export type PaymentFormData = z.infer<typeof paymentSchema>;

export interface PaymentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  checkTotal: number;
  tableNumber: string | number;
  onConfirm: (data: PaymentFormData) => void;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    note?: string;
    entQty?: number;
  }>;
  tax?: number;
  serviceCharge?: number;
  deliveryCharge?: number;
  discountAmount?: number;
  discountPrsn?: number;
  printCount?: number;
}
