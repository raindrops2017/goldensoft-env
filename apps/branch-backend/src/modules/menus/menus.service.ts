import { db } from '../../db';
import { 
  menuTypes, menuGroups, menuSubGroups, menuItems, menuItemPrices, 
  menuItemModifiers, modifiersGroups, modifiers 
} from '../../db/schema';
import { eq } from 'drizzle-orm';

export class MenusService {
  async getFullMenu() {
    const types = await db.select().from(menuTypes).where(eq(menuTypes.isActive, 1));
    const groups = await db.select().from(menuGroups).where(eq(menuGroups.isActive, 1));
    const subGroups = await db.select().from(menuSubGroups).where(eq(menuSubGroups.isActive, 1));
    
    // Fetch all active items and their nested components
    const itemsData = await db.select().from(menuItems).where(eq(menuItems.isActive, 1));
    const pricesData = await db.select().from(menuItemPrices).where(eq(menuItemPrices.isActive, 1));
    const itemModifiersData = await db.select().from(menuItemModifiers);
    
    // Fetch modifiers globally
    const modGroups = await db.select().from(modifiersGroups);
    const mods = await db.select().from(modifiers);

    // Hydrate the items with prices and modifiers relationships
    const items = itemsData.map(item => {
      const itemPrices = pricesData.filter(p => p.menuItemId === item.id);
      const itemMods = itemModifiersData.filter(m => m.menuItemId === item.id);
      
      return {
        ...item,
        prices: itemPrices,
        modifiers: itemMods
      };
    });

    return {
      types,
      groups,
      subGroups,
      items,
      modifierGroups: modGroups,
      modifiers: mods
    };
  }
}

export const menusService = new MenusService();
