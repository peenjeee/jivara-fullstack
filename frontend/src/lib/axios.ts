import axios from 'axios';
import { notifyAuthExpired } from '@/lib/authNavigation';
import { useAuthStore } from '@/store/auth';

const getApiBaseUrl = () => {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (typeof window !== "undefined" && configuredUrl) return configuredUrl;
  return "/api/v1";
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
});

interface FailedRequest {
  resolve: () => void;
  reject: (error: unknown) => void;
}

let isRefreshing = false;
let failedQueue: FailedRequest[] = [];

const processQueue = (error: unknown) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise<void>(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const { logout, updateUser } = useAuthStore.getState();

      try {
        const { data } = await axios.post('/api/v1/auth/refresh');

        if (data.data.user) updateUser(data.data.user);

        processQueue(null);

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        logout();
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem('jivara-auth-storage');
          notifyAuthExpired();
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
