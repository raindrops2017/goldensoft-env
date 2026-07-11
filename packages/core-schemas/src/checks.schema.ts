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
  deliveryAddress: z.string().nullable().optional(),
  deliveryFloor: z.string().nullable().optional(),
  deliveryUnit: z.string().nullable().optional(),
  deliveryLandmark: z.string().nullable().optional(),
  deliveryNotes: z.string().nullable().optional(),
  deliveryState: z.string().nullable().optional(),
  dispatchedAt: z.string().nullable().optional(),
  cashierId: z.string().nullable().optional(),
  waiterId: z.string().nullable().optional(),
  waiterName: z.string().nullable().optional(),
  cashierName: z.string().nullable().optional(),
  shift: z.number().default(1),
  paymentNote: z.string().nullable().optional(),
  cloudSyncId: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deliveryCustomer: z.lazy(() => DeliveryCustomerSchema).nullable().optional(),
  deliveryZone: z.lazy(() => DeliveryZoneSchema).nullable().optional(),
  deliveryPilot: z.lazy(() => DeliveryPilotSchema).nullable().optional(),
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
  deliveryCustomerId: z.string().optional(),
  deliveryZoneId: z.string().optional(),
  deliveryCharge: z.number().optional(),
  deliveryAddress: z.string().optional(),
  deliveryFloor: z.string().optional(),
  deliveryUnit: z.string().optional(),
  deliveryLandmark: z.string().optional(),
  deliveryNotes: z.string().optional(),
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

export const DeliveryZoneSchema = z.object({
  id: z.string(),
  name: z.string(),
  deliveryCharge: z.number(),
  isActive: z.boolean().default(true),
  cloudSyncId: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type DeliveryZone = z.infer<typeof DeliveryZoneSchema>;

export const DeliveryAddressSchema = z.object({
  id: z.string(),
  deliveryCustomerId: z.string(),
  deliveryZoneId: z.string(),
  address: z.string(),
  floor: z.string().nullable().optional(),
  unit: z.string().nullable().optional(),
  landmark: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  isDefault: z.boolean().default(false),
  cloudSyncId: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type DeliveryAddress = z.infer<typeof DeliveryAddressSchema>;

export const DeliveryPhoneSchema = z.object({
  id: z.string(),
  deliveryCustomerId: z.string(),
  phone: z.string(),
  isDefault: z.boolean().default(false),
  cloudSyncId: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type DeliveryPhone = z.infer<typeof DeliveryPhoneSchema>;

export const DeliveryCustomerSchema = z.object({
  id: z.string(),
  name: z.string(),
  agentNotes: z.string().nullable().optional(),
  totalOrders: z.number().default(0),
  totalSpent: z.number().default(0),
  averageTicket: z.number().default(0),
  cloudSyncId: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  addresses: z.array(DeliveryAddressSchema).default([]),
  phones: z.array(DeliveryPhoneSchema).default([]),
});
export type DeliveryCustomer = z.infer<typeof DeliveryCustomerSchema>;

export const DeliveryPilotSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
  cloudSyncId: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type DeliveryPilot = z.infer<typeof DeliveryPilotSchema>;

export const CreateDeliveryCustomerInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  agentNotes: z.string().nullable().optional(),
  phones: z.array(z.object({
    phone: z.string().min(11, 'Phone must be at least 11 digits'),
    isDefault: z.boolean().default(false)
  })).min(1, 'At least one phone number is required'),
  addresses: z.array(z.object({
    deliveryZoneId: z.string().min(1, 'Delivery zone is required'),
    address: z.string().min(1, 'Address is required'),
    floor: z.string().optional().nullable(),
    unit: z.string().optional().nullable(),
    landmark: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    isDefault: z.boolean().default(false)
  })).min(1, 'At least one address is required'),
});
export type CreateDeliveryCustomerInput = z.infer<typeof CreateDeliveryCustomerInputSchema>;

export const AssignPilotInputSchema = z.object({
  checkIds: z.array(z.string()).min(1, 'At least one check is required'),
  pilotId: z.string().min(1, 'Pilot is required'),
});
export type AssignPilotInput = z.infer<typeof AssignPilotInputSchema>;

export const CreateDeliveryZoneInputSchema = z.object({
  name: z.string().min(1, 'Zone name is required'),
  deliveryCharge: z.number().nonnegative('Delivery charge must be non-negative'),
  isActive: z.boolean().optional(),
});
export type CreateDeliveryZoneInput = z.infer<typeof CreateDeliveryZoneInputSchema>;

export const CreateDeliveryPilotInputSchema = z.object({
  name: z.string().min(1, 'Pilot name is required'),
  phone: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});
export type CreateDeliveryPilotInput = z.infer<typeof CreateDeliveryPilotInputSchema>;


