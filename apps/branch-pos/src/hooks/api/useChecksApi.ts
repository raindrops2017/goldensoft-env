import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { 
  CreateCheckInput, 
  AddCheckItemInput, 
  VoidCheckItemInput, 
  EntCheckItemInput,
  CheckWithItems,
  SplitCheckInput,
  CloseCheckInput
} from '@goldensoft/core-schemas';

export const useOpenChecks = () => {
  return useQuery({
    queryKey: ['openChecks'],
    queryFn: async () => {
      const res = await api.get('/checks/open');
      return res.data.data as CheckWithItems[];
    },
  });
};

export const useCustomers = () => {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await api.get('/customers');
      return res.data.data;
    },
  });
};

export const useHistoricalChecks = (filters: any) => {
  return useQuery({
    queryKey: ['historicalChecks', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.chkNo) params.append('chkNo', filters.chkNo);
      if (filters.tableId) params.append('tableId', filters.tableId);
      if (filters.amountOperator) params.append('amountOperator', filters.amountOperator);
      if (filters.amountValue) params.append('amountValue', filters.amountValue);

      const res = await api.get(`/checks/historical?${params.toString()}`);
      return res.data.data as CheckWithItems[];
    },
    enabled: !!filters, // Maybe disable if no filters are applied? Or fetch all if they want, but usually it should be enabled when the modal is open.
  });
};

export const useCheck = (id: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['check', id],
    queryFn: async () => {
      const res = await api.get(`/checks/${id}`);
      return res.data.data as CheckWithItems;
    },
    enabled: options?.enabled ?? true,
  });
};

export const useChecksApi = () => {
  const createCheck = useMutation({
    mutationFn: async (data: CreateCheckInput) => {
      const res = await api.post('/checks', data);
      return res.data.data as CheckWithItems;
    }
  });

  const addCheckItems = useMutation({
    mutationFn: async ({ chkId, data }: { chkId: string, data: AddCheckItemInput }) => {
      const res = await api.post(`/checks/${chkId}/items`, data);
      return res.data.data as CheckWithItems;
    }
  });

  const voidCheckItem = useMutation({
    mutationFn: async ({ chkId, itemId, data }: { chkId: string, itemId: string, data: VoidCheckItemInput }) => {
      const res = await api.put(`/checks/${chkId}/items/${itemId}/void`, data);
      return res.data.data as CheckWithItems;
    }
  });

  const entCheckItem = useMutation({
    mutationFn: async ({ chkId, itemId, data }: { chkId: string, itemId: string, data: EntCheckItemInput }) => {
      const res = await api.put(`/checks/${chkId}/items/${itemId}/ent`, data);
      return res.data.data as CheckWithItems;
    }
  });

  const voidCheck = useMutation({
    mutationFn: async ({ chkId, reasonId, supervisorPin, supervisorId }: { chkId: string, reasonId: string, supervisorPin?: string, supervisorId?: string }) => {
      const res = await api.put(`/checks/${chkId}/void`, { voidReason: reasonId, supervisorPin, supervisorId });
      return res.data.data as CheckWithItems;
    }
  });

  const updateCheckDiscount = useMutation({
    mutationFn: async ({ chkId, data }: { chkId: string, data: { discount: number; discountPercent: number; supervisorPin?: string; supervisorId?: string } }) => {
      const res = await api.put(`/checks/${chkId}/discount`, data);
      return res.data.data as CheckWithItems;
    }
  });

  const splitCheck = useMutation({
    mutationFn: async ({ chkId, data }: { chkId: string, data: SplitCheckInput }) => {
      const res = await api.post(`/checks/${chkId}/split`, data);
      return res.data.data as { sourceCheck: CheckWithItems, splitChecks: CheckWithItems[] };
    }
  });

  const printCheck = useMutation({
    mutationFn: async ({ chkId, supervisorPin, supervisorId, printerId }: { chkId: string, supervisorPin?: string, supervisorId?: string, printerId?: string }) => {
      const res = await api.post(`/checks/${chkId}/print`, { supervisorPin, supervisorId, printerId });
      return res.data.data as CheckWithItems;
    }
  });

  const transferTable = useMutation({
    mutationFn: async ({ chkId, targetTableId, supervisorPin, supervisorId }: { chkId: string, targetTableId: string, supervisorPin?: string, supervisorId?: string }) => {
      const res = await api.put(`/checks/${chkId}/table-transfer`, { targetTableId, supervisorPin, supervisorId });
      return res.data.data as CheckWithItems;
    }
  });

  const transferWaiter = useMutation({
    mutationFn: async ({ chkId, targetWaiterId, supervisorPin, supervisorId }: { chkId: string, targetWaiterId: string, supervisorPin?: string, supervisorId?: string }) => {
      const res = await api.put(`/checks/${chkId}/waiter-transfer`, { targetWaiterId, supervisorPin, supervisorId });
      return res.data.data as CheckWithItems;
    }
  });

  const updateCheckGuestCount = useMutation({
    mutationFn: async ({ chkId, guestCount, supervisorPin, supervisorId }: { chkId: string, guestCount: number, supervisorPin?: string, supervisorId?: string }) => {
      const res = await api.put(`/checks/${chkId}/guest-count`, { guestCount, supervisorPin, supervisorId });
      return res.data.data as CheckWithItems;
    }
  });

  const updateCheckTableName = useMutation({
    mutationFn: async ({ chkId, tableName }: { chkId: string, tableName: string }) => {
      const res = await api.put(`/checks/${chkId}/table-name`, { tableName });
      return res.data.data as CheckWithItems;
    }
  });

  const updateCheckCustomerInfo = useMutation({
    mutationFn: async ({ chkId, customerName, customerPhone }: { chkId: string, customerName?: string, customerPhone?: string }) => {
      const res = await api.put(`/checks/${chkId}/customer`, { customerName, customerPhone });
      return res.data.data as CheckWithItems;
    }
  });

  const closeCheck = useMutation({
    mutationFn: async ({ chkId, data }: { chkId: string, data: CloseCheckInput }) => {
      const res = await api.post(`/checks/${chkId}/close`, data);
      return res.data.data as CheckWithItems;
    }
  });

  return {
    createCheck,
    addCheckItems,
    voidCheckItem,
    entCheckItem,
    voidCheck,
    updateCheckDiscount,
    splitCheck,
    printCheck,
    transferTable,
    transferWaiter,
    updateCheckGuestCount,
    updateCheckTableName,
    updateCheckCustomerInfo,
    closeCheck
  };
};

