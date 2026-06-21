import axios from 'axios';
import { env } from '../env';
import { useAuthStore } from '../store/useAuthStore';
import type { LoginResponse } from '@goldensoft/core-schemas';

export const api = axios.create({
  baseURL: env.VITE_API_BASE_URL,
  withCredentials: true,
});

// Add access token to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If the error is 401 and we haven't retried yet
    // Also avoid infinite loops if the refresh endpoint itself returns 401
    if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/refresh') {
      originalRequest._retry = true;

      try {
        // Attempt to refresh the token
        const refreshResponse = await api.post<LoginResponse>('/auth/refresh');
        
        if (refreshResponse.data.success && refreshResponse.data.data?.user) {
          const { accessToken, user } = refreshResponse.data.data;
          if (user) {
            // Update the global store
            useAuthStore.getState().setAuth(accessToken, {
              id: user.id,
              username: user.username,
              role: user.role,
              roleId: user.roleId ?? undefined,
              permissions: user.permissions,
            });
          }
          
          // Update the authorization header for the retried request
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          
          // Retry the original request
          return api(originalRequest);
        }
      } catch (refreshError) {
        // If refresh fails, clear auth store and redirect to login
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
