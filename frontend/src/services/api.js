import axios from 'axios';

const api = axios.create({
  baseURL:
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
    '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

const TOKEN_KEY = 'token';
const REFRESH_KEY = 'refresh_token';

export const getStoredToken = () =>
  localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);

export const getStoredRefreshToken = () =>
  localStorage.getItem(REFRESH_KEY) || sessionStorage.getItem(REFRESH_KEY);

export const storeTokens = (access, refresh, rememberMe = true) => {
  const primary = rememberMe ? localStorage : sessionStorage;
  const secondary = rememberMe ? sessionStorage : localStorage;
  primary.setItem(TOKEN_KEY, access);
  if (refresh) {
    primary.setItem(REFRESH_KEY, refresh);
  }
  secondary.removeItem(TOKEN_KEY);
  secondary.removeItem(REFRESH_KEY);
};

export const clearTokens = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
};

const isAuthEndpoint = (url = '') =>
  url.includes('/auth/login') ||
  url.includes('/auth/admin-login') ||
  url.includes('/auth/agency-login') ||
  url.includes('/auth/register') ||
  url.includes('/auth/token/refresh') ||
  url.includes('/auth/password-reset');

let isRefreshing = false;
let refreshQueue = [];

const processQueue = (error, token = null) => {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  refreshQueue = [];
};

api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token && token !== 'null' && token !== 'undefined') {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};
    const status = error.response?.status;

    // Never retry rate limits — retries make 429 worse
    if (status === 429) {
      error.formattedMessage =
        error.response?.data?.message ||
        'Too many requests — wait a moment and try again.';
      return Promise.reject(error);
    }

    // Retry once on empty/network drops (common during Django auto-reload)
    const isNetworkDrop =
      !error.response &&
      (error.code === 'ERR_NETWORK' ||
        error.message === 'Network Error' ||
        error.code === 'ECONNABORTED');
    if (isNetworkDrop && !originalRequest._networkRetry) {
      originalRequest._networkRetry = true;
      await new Promise((r) => setTimeout(r, 600));
      return api(originalRequest);
    }

    if (
      status === 401 &&
      !originalRequest._retry &&
      !isAuthEndpoint(originalRequest.url || '')
    ) {
      const refreshToken = getStoredRefreshToken();
      if (!refreshToken) {
        clearTokens();
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${api.defaults.baseURL}/auth/token/refresh/`,
          { refresh: refreshToken },
          { headers: { 'Content-Type': 'application/json' } }
        );

        const access = data.access;
        const newRefresh = data.refresh || refreshToken;
        const useLocal = Boolean(localStorage.getItem(REFRESH_KEY));
        storeTokens(access, newRefresh, useLocal);

        processQueue(null, access);
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearTokens();
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    const errorMessage =
      error.response?.data?.message ||
      error.response?.data?.detail ||
      error.message ||
      'An error occurred';

    error.formattedMessage = errorMessage;
    return Promise.reject(error);
  }
);

export default api;
