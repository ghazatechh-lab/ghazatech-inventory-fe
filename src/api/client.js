import axios from 'axios';
import { toast } from 'sonner';

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1').replace(/\/$/, '');
let accessToken = null;
export const setAccessToken = (token) => { accessToken = token; };
export const apiClient = axios.create({ baseURL: API_BASE_URL, withCredentials: true, headers: { 'Content-Type': 'application/json' } });
let refreshPromise = null;
export const refreshSession = () => {
  if (!refreshPromise) refreshPromise = axios.post(`${API_BASE_URL}/auth/token/refresh/`, {}, { withCredentials: true })
    .then(({ data }) => { setAccessToken(data.access); return data.access; })
    .finally(() => { refreshPromise = null; });
  return refreshPromise;
};
apiClient.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});
export const errorMessage = (error) => {
  const status = error.response?.status;
  const data = error.response?.data;
  if (!data) return 'Unable to reach the backend. Check that it is running.';
  if (typeof data === 'string') {
    // Django/NGINX can return an HTML error page; never enumerate its characters.
    if (/^\s*</.test(data) || /<html[\s>]/i.test(data)) {
      return status === 404
        ? 'API endpoint not found (404). Verify that the promotions backend is deployed and the frontend API base URL is correct.'
        : `Server returned an HTML error page (HTTP ${status || 'unknown'}). Check the backend logs and API URL.`;
    }
    return data.slice(0, 500);
  }
  if (typeof data.detail === 'string') return data.detail;
  if (typeof data.message === 'string') return data.message;
  if (Array.isArray(data)) return data.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join('; ');
  if (typeof data === 'object') return Object.entries(data).map(([key, val]) =>
    `${key}: ${Array.isArray(val) ? val.join(', ') : typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val)}`
  ).join('; ');
  return `Request failed (HTTP ${status || 'unknown'}).`;
};

apiClient.interceptors.response.use((response) => response, async (error) => {
  const original = error.config;
  if (error.response?.status === 401 && original && !original._retry && !/^\/auth\/(login|token\/refresh|password\/reset)/.test(original.url)) {
    original._retry = true;
    try { original.headers.Authorization = `Bearer ${await refreshSession()}`; return apiClient(original); }
    catch { setAccessToken(null); window.dispatchEvent(new Event('auth:unauthorized')); }
  }
  error.normalizedErrors = error.response?.data;
  if (!original?.url.includes('/auth/')) toast.error(errorMessage(error));
  return Promise.reject(error);
});
