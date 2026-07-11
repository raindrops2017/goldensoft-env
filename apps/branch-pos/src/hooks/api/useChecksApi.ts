import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { 
  CreateCheckInput, 
  AddCheckItemInput, 
  VoidCheckItemInput, 
  EntCheckItemInput,
  CheckWithItems,
  SplitCheckInput,
  CloseCheckInput,
  DeliveryZone,
  DeliveryCustomer,
  DeliveryPilot,
  CreateDeliveryCustomerInput
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

export const useDeliveryZones = (all = false) => {
  return useQuery({
    queryKey: ['deliveryZones', all],
    queryFn: async () => {
      const res = await api.get(`/delivery/zones?all=${all}`);
      return res.data.data as DeliveryZone[];
    },
  });
};

export const useDeliveryPilots = (all = false) => {
  return useQuery({
    queryKey: ['deliveryPilots', all],
    queryFn: async () => {
      const res = await api.get(`/delivery/pilots?all=${all}`);
      return res.data.data as DeliveryPilot[];
    },
  });
};

export const useSearchDeliveryCustomer = (phone: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['searchDeliveryCustomer', phone],
    queryFn: async () => {
      const res = await api.get(`/delivery/customers/search?phone=${phone}`);
      return res.data.data as DeliveryCustomer[];
    },
    enabled: options?.enabled ?? false,
  });
};

export const useCustomerLastOrder = (customerId: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['customerLastOrder', customerId],
    queryFn: async () => {
      if (!customerId) return null;
      const res = await api.get(`/delivery/customers/${customerId}/last-order`);
      return res.data.data;
    },
    enabled: options?.enabled ?? !!customerId,
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
      if (filters.deliveryCustomerId) params.append('deliveryCustomerId', filters.deliveryCustomerId);

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
    mutationFn: async ({ chkId, customerName, customerPhone, deliveryCustomerId }: { chkId: string, customerName?: string, customerPhone?: string, deliveryCustomerId?: string }) => {
      const res = await api.put(`/checks/${chkId}/customer`, { customerName, customerPhone, deliveryCustomerId });
      return res.data.data as CheckWithItems;
    }
  });

  const closeCheck = useMutation({
    mutationFn: async ({ chkId, data }: { chkId: string, data: CloseCheckInput }) => {
      const res = await api.post(`/checks/${chkId}/close`, data);
      return res.data.data as CheckWithItems;
    }
  });

  const createDeliveryCustomer = useMutation({
    mutationFn: async (data: CreateDeliveryCustomerInput) => {
      const res = await api.post('/delivery/customers', data);
      return res.data.data as DeliveryCustomer;
    }
  });

  const updateDeliveryCustomer = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: CreateDeliveryCustomerInput }) => {
      const res = await api.put(`/delivery/customers/${id}`, data);
      return res.data.data as DeliveryCustomer;
    }
  });

  const assignPilot = useMutation({
    mutationFn: async ({ checkIds, pilotId }: { checkIds: string[], pilotId: string }) => {
      const res = await api.put('/delivery/checks/assign-pilot', { checkIds, pilotId });
      return res.data.data as CheckWithItems[];
    }
  });

  const batchCloseChecks = useMutation({
    mutationFn: async (data: { checkIds: string[], paymentMethod: string, supervisorPin?: string, supervisorId?: string }) => {
      const res = await api.post('/checks/batch-close', data);
      return res.data.data as CheckWithItems[];
    }
  });

  const createDeliveryZone = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/delivery/zones', data);
      return res.data.data;
    }
  });

  const updateDeliveryZone = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      const res = await api.put(`/delivery/zones/${id}`, data);
      return res.data.data;
    }
  });

  const deactivateDeliveryZone = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.put(`/delivery/zones/${id}/deactivate`);
      return res.data.data;
    }
  });

  const createDeliveryPilot = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/delivery/pilots', data);
      return res.data.data;
    }
  });

  const updateDeliveryPilot = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      const res = await api.put(`/delivery/pilots/${id}`, data);
      return res.data.data;
    }
  });

  const deactivateDeliveryPilot = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.put(`/delivery/pilots/${id}/deactivate`);
      return res.data.data;
    }
  });

  const updateCheckDeliveryState = useMutation({
    mutationFn: async ({ checkId, state }: { checkId: string, state: string }) => {
      const res = await api.put(`/delivery/checks/${checkId}/state`, { state });
      return res.data.data;
    }
  });

  const dispatchChecks = useMutation({
    mutationFn: async ({ checkIds, pilotId }: { checkIds: string[], pilotId: string }) => {
      const res = await api.post('/delivery/checks/dispatch', { checkIds, pilotId });
      return res.data.data;
    }
  });

  const returnPilot = useMutation({
    mutationFn: async (pilotId: string) => {
      const res = await api.post(`/delivery/pilots/${pilotId}/return`);
      return res.data.data;
    }
  });

  const unassignCheckPilot = useMutation({
    mutationFn: async (checkId: string) => {
      const res = await api.put(`/delivery/checks/${checkId}/unassign`);
      return res.data.data;
    }
  });

  const arrivePilot = useMutation({
    mutationFn: async (pilotId: string) => {
      const res = await api.post(`/delivery/pilots/${pilotId}/arrive`);
      return res.data.data;
    }
  });

  return {
    updateCheckDeliveryState,
    dispatchChecks,
    returnPilot,
    unassignCheckPilot,
    arrivePilot,
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
    closeCheck,
    createDeliveryCustomer,
    updateDeliveryCustomer,
    assignPilot,
    batchCloseChecks,
    createDeliveryZone,
    updateDeliveryZone,
    deactivateDeliveryZone,
    createDeliveryPilot,
    updateDeliveryPilot,
    deactivateDeliveryPilot
  };
};

