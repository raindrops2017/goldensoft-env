import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const useCurrentShift = () => {
  return useQuery({
    queryKey: ['currentShift'],
    queryFn: async () => {
      const res = await api.get('/shifts/current');
      return res.data.data;
    },
  });
};

export const useCloseShift = () => {
  return useMutation({
    mutationFn: async (data: { actualClosingCash: number }) => {
      const res = await api.post('/shifts/close', data);
      return res.data.data;
    }
  });
};

export const useCloseDay = () => {
  return useMutation({
    mutationFn: async (data: { actualClosingCash: number }) => {
      const res = await api.post('/shifts/close-day', data);
      return res.data.data;
    }
  });
};
