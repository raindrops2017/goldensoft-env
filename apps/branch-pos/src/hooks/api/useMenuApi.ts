import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { MenuType, MenuGroup, MenuSubGroup, MenuItem, ModifiersGroup, Modifier } from '@goldensoft/core-schemas';

export interface FullMenuResponse {
  types: MenuType[];
  groups: MenuGroup[];
  subGroups: MenuSubGroup[];
  items: MenuItem[];
  modifierGroups: ModifiersGroup[];
  modifiers: Modifier[];
}

export const useMenuApi = () => {
  return useQuery({
    queryKey: ['fullMenu'],
    queryFn: async () => {
      const res = await api.get('/menus');
      return res.data.data as FullMenuResponse;
    },
  });
};
