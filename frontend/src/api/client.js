/**
 * Backward compatibility re-export.
 * Core API client logic is centralized in src/services/apiClient.js
 */
export { apiClient, healthService, ApiError, normalizeError, API_BASE_URL } from '../services/apiClient';
export { default } from '../services/apiClient';
