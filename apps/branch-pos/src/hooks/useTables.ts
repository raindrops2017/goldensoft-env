import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type {
  Table,
  TableSection,
  CreateTableInput,
  UpdateTableInput,
  CreateTableSectionInput,
} from '@goldensoft/core-schemas';

export type TableSectionWithTables = TableSection & {
  tables: Table[];
};

export const useTableSections = () => {
  return useQuery<TableSectionWithTables[]>({
    queryKey: ['tableSections'],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: TableSectionWithTables[] }>(
        '/tables/sections'
      );
      return response.data.data;
    },
  });
};

export const useCreateSection = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateTableSectionInput) => {
      const response = await api.post<{ success: boolean; data: TableSection }>(
        '/tables/sections',
        data
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tableSections'] });
    },
  });
};

export const useCreateTable = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateTableInput) => {
      const response = await api.post<{ success: boolean; data: Table }>(
        '/tables',
        data
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tableSections'] });
    },
  });
};

export const useUpdateTable = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTableInput }) => {
      const response = await api.put<{ success: boolean; data: Table }>(
        `/tables/${id}`,
        data
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tableSections'] });
    },
  });
};

export const useDeleteTable = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<{ success: boolean }>(`/tables/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tableSections'] });
    },
  });
};

export const useDeleteSection = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<{ success: boolean }>(`/tables/sections/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tableSections'] });
    },
  });
};

export const useSeedDefaultLayout = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await api.post<{ success: boolean; data: TableSectionWithTables[] }>(
        '/tables/seed-default'
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tableSections'] });
    },
  });
};
