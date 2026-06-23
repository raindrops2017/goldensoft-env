import { z } from 'zod';
  
export const MenuTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  isActive: z.number().default(1),
  cloudSyncId: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type MenuType = z.infer<typeof MenuTypeSchema>;

export const MenuGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  menuTypeId: z.string(),
  isActive: z.number().default(1),
  cloudSyncId: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type MenuGroup = z.infer<typeof MenuGroupSchema>;

export const MenuSubGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  menuGroupId: z.string(),
  isActive: z.number().default(1),
  cloudSyncId: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type MenuSubGroup = z.infer<typeof MenuSubGroupSchema>;

export const ModifiersGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  cloudSyncId: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ModifiersGroup = z.infer<typeof ModifiersGroupSchema>;

export const ModifierSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number().default(0),
  modifiersGroupId: z.string(),
  cloudSyncId: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Modifier = z.infer<typeof ModifierSchema>;

export const MenuItemPriceSchema = z.object({
  id: z.string(),
  priceName: z.string(),
  menuItemId: z.string(),
  diningPrice: z.number().default(0),
  takeAwayPrice: z.number().default(0),
  deliveryPrice: z.number().default(0),
  officerPrice: z.number().default(0),
  isActive: z.number().default(1),
  cloudSyncId: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type MenuItemPrice = z.infer<typeof MenuItemPriceSchema>;

export const MenuItemModifierSchema = z.object({
  id: z.string(),
  menuItemId: z.string(),
  modifiersGroupId: z.string(),
  groupOrder: z.number().default(0),
  choiceCount: z.number().default(0),
  cloudSyncId: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type MenuItemModifier = z.infer<typeof MenuItemModifierSchema>;

export const MenuItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  arabicName: z.string(),
  menuGroupId: z.string(),
  menuSubGroupId: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
  explicitTax: z.number().default(0),
  noDiscount: z.number().default(0),
  soldOut: z.number().default(0),
  coffeeSugar: z.number().default(0),
  meatDoneness: z.number().default(0),
  notes: z.string().nullable().optional(),
  isActive: z.number().default(1),
  cloudSyncId: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  // For deep nesting representation in POS UI
  prices: z.array(MenuItemPriceSchema).optional(),
  modifiers: z.array(MenuItemModifierSchema).optional(),
});
export type MenuItem = z.infer<typeof MenuItemSchema>;
