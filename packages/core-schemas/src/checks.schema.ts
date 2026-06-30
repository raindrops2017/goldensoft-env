import { z } from 'zod';
  
export const VoidReasonSchema = z.object({
  id: z.number(),
  reason: z.string(),
  isWaste: z.boolean(),
});
export type VoidReason = z.infer<typeof VoidReasonSchema>;
  
export const CheckSchema = z.object({
  id: z.string(),
  chkNo: z.number(),
  transactionNo: z.number().int(),
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
  customerName: z.string().nullable().optional(),
  customerPhone: z.string().nullable().optional(),
  deliveryCustomerId: z.string().nullable().optional(),
  deliveryPilotId: z.string().nullable().optional(),
  cashierId: z.string().nullable().optional(),
  waiterId: z.string().nullable().optional(),
  waiterName: z.string().nullable().optional(),
  cashierName: z.string().nullable().optional(),
  shift: z.number().default(1),
  paymentNote: z.string().nullable().optional(),
  cloudSyncId: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Check = z.infer<typeof CheckSchema>;

export const CheckItemModifierSchema = z.object({
  id: z.string(),
  checkItemId: z.string(),
  menuItemModifierId: z.string(),
  modifierId: z.string(),
  name: z.string().optional(),
  price: z.number().default(0),
  qty: z.number().default(1),
  cloudSyncId: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CheckItemModifier = z.infer<typeof CheckItemModifierSchema>;

export const CheckItemSchema = z.object({
  id: z.string(),
  chkId: z.string(),
  menuItemId: z.string(),
  itemName: z.string().optional(),
  arabicName: z.string().optional(),
  itemPrice: z.number().default(0),
  qty: z.number().default(1),
  notes: z.string().nullable().optional(),
  voidQty: z.number().default(0),
  voidBy: z.string().nullable().optional(),
  voidReasonId: z.number().nullable().optional(),
  voidKind: z.number().default(0),
  entQty: z.number().default(0),
  entBy: z.string().nullable().optional(),
  cloudSyncId: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  modifiers: z.array(CheckItemModifierSchema).optional(),
});
export type CheckItem = z.infer<typeof CheckItemSchema>;

export const CheckWithItemsSchema = CheckSchema.extend({
  items: z.array(CheckItemSchema).optional(),
});
export type CheckWithItems = z.infer<typeof CheckWithItemsSchema>;

export const CreateCheckInputSchema = z.object({
  checkKindId: z.number(),
  tableId: z.string().optional(),
  tableName: z.string().optional(),
  guestCount: z.number().default(1),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
});
export type CreateCheckInput = z.infer<typeof CreateCheckInputSchema>;

export const AddCheckItemInputSchema = z.object({
  menuItemId: z.string(),
  qty: z.number().default(1),
  notes: z.string().optional(),
  modifiers: z.array(z.object({
    menuItemModifierId: z.string(),
    modifierId: z.string(),
    qty: z.number().default(1),
    price: z.number().default(0),
    name: z.string().optional(),
  })).optional(),
});
export type AddCheckItemInput = z.infer<typeof AddCheckItemInputSchema>;

export const VoidCheckItemInputSchema = z.object({
  voidQty: z.number().min(0.01),
  voidReasonId: z.number(),
  supervisorId: z.string().optional(),
  supervisorPin: z.string().optional(),
});
export type VoidCheckItemInput = z.infer<typeof VoidCheckItemInputSchema>;

export const EntCheckItemInputSchema = z.object({
  entQty: z.number(),
  entReason: z.string().optional(), // Adding a reason field just in case
  supervisorId: z.string().optional(),
  supervisorPin: z.string().optional(),
});
export type EntCheckItemInput = z.infer<typeof EntCheckItemInputSchema>;

export const SplitCheckInputSchema = z.object({
  type: z.enum(['items', 'evenly']),
  itemsSplits: z.array(
    z.object({
      guestCount: z.number().int().min(1).default(1),
      tableId: z.string().nullable().optional(),
      tableName: z.string().nullable().optional(),
      items: z.array(
        z.object({
          checkItemId: z.string(),
          qty: z.number().positive(),
        })
      ),
    })
  ).optional(),
  evenSplitCount: z.number().int().min(2).max(100).optional(),
  supervisorId: z.string().optional(),
  supervisorPin: z.string().optional(),
});
export type SplitCheckInput = z.infer<typeof SplitCheckInputSchema>;

export const CloseCheckInputSchema = z.object({
  paymentMethod: z.string(),
  cash: z.number().default(0),
  visaAmount: z.number().default(0),
  clAmount: z.number().default(0),
  paidCash: z.number().default(0),
  tips: z.number().default(0),
  isComp: z.boolean().default(false),
  discountAmount: z.number().default(0),
  chkStut: z.number().optional(),
  tax: z.number().optional(),
  service: z.number().optional(),
  discountPrsn: z.number().default(0),
  customerId: z.string().nullable().optional(),
  customerName: z.string().nullable().optional(),
  visaNo: z.string().nullable().optional(),
  cardType: z.string().nullable().optional(),
  clNote: z.string().nullable().optional(),
  supervisorPin: z.string().nullable().optional(),
  supervisorId: z.string().nullable().optional()
});
export type CloseCheckInput = z.input<typeof CloseCheckInputSchema>;

