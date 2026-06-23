import { z } from "zod";
import { paymentSchema } from "../../schema/payment.schema";

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
  }>;
  tax?: number;
}
