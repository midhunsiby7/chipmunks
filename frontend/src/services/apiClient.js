import axios from 'axios';
import { authService } from './authService';

const DEFAULT_API_BASE = 'http://localhost:8000/api/v1';

function resolveApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
    // If accessing through a remote tunnel or forwarded port, route via relative /api/v1
    // to utilize Vite's dev server proxy and avoid unreachable client-side localhost requests
    if (!isLocal && (!envUrl || envUrl.includes('localhost') || envUrl.includes('127.0.0.1'))) {
      return '/api/v1';
    }
  }
  return envUrl || DEFAULT_API_BASE;
}

export const API_BASE_URL = resolveApiBaseUrl();

/**
 * Normalized API Error class
 */
export class ApiError extends Error {
  constructor({ message, status = null, detail = null, data = null, isNetworkError = false }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
    this.data = data;
    this.isNetworkError = isNetworkError;
  }
}

/**
 * Centralized Axios API Client instance
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor: Injects Bearer token from Firebase Auth or local session
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await authService.getCurrentUserToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.warn('[Brightloop ApiClient] Could not attach bearer token:', err);
    }
    return config;
  },
  (error) => Promise.reject(normalizeError(error))
);

// Response Interceptor: Normalizes responses and standardizes error payloads
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('brightloop_token');
      localStorage.removeItem('brightloop_user');
      // Dispatch an event so app context can gracefully handle session expiration
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('brightloop:unauthorized'));
      }
    }
    return Promise.reject(normalizeError(error));
  }
);

/**
 * Standardizes raw Axios errors into a clean, typed ApiError object.
 * @param {any} error
 * @returns {ApiError}
 */
export function normalizeError(error) {
  if (error instanceof ApiError) {
    return error;
  }

  // Server responded with an HTTP status code outside 2xx
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;
    const detail =
      (typeof data?.detail === 'string' && data.detail) ||
      data?.message ||
      `Request failed with status ${status}`;

    return new ApiError({
      message: detail,
      status,
      detail,
      data,
      isNetworkError: false,
    });
  }

  // Request was made but no response was received (network failure or timeout)
  if (error.request) {
    const isTimeout = error.code === 'ECONNABORTED';
    return new ApiError({
      message: isTimeout
        ? 'The request timed out. Please verify the backend server is responding.'
        : 'Backend server is unreachable. Please verify it is running at ' + API_BASE_URL,
      status: null,
      detail: error.message,
      data: null,
      isNetworkError: true,
    });
  }

  // Setup error
  return new ApiError({
    message: error.message || 'An unexpected client error occurred',
    status: null,
    detail: error.message,
    data: null,
    isNetworkError: false,
  });
}

/**
 * Health check diagnostic service against Developer 1's backend API
 */
export const healthService = {
  checkHealth: async () => {
    const response = await apiClient.get('/health');
    return response.data;
  },
};

export default apiClient;
