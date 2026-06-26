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

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (error: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token as string);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If the error is 401 and we haven't retried yet
    // Also avoid infinite loops if the refresh endpoint itself returns 401
    // Exclude /auth/login as 401 there means Invalid PIN, not an expired access token
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      originalRequest.url !== '/auth/refresh' &&
      originalRequest.url !== '/auth/login'
    ) {
      
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt to refresh the token using a separate axios instance to avoid request interceptor loops
        const refreshResponse = await axios.post<LoginResponse>(
          `${env.VITE_API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        
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
          
          processQueue(null, accessToken);
          
          // Update the authorization header for the retried request
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          
          // Retry the original request
          return api(originalRequest);
        } else {
          throw new Error('Refresh failed');
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        // If refresh fails, clear auth store and redirect to login
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
