import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const useCurrentShift = () => {
  return useQuery({
    queryKey: ['currentShift'],
    queryFn: async () => {
      const res = await api.get('/shifts/current');
      return res.data.data; // assuming { success: true, data: { ...shift } }
    },
  });
};

export const useOpenShift = () => {
  return useMutation({
    mutationFn: async (data: { startingCash: number }) => {
      const res = await api.post('/shifts/open', data);
      return res.data.data;
    }
  });
};
