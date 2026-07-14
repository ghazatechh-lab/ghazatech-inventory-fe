import axios from "axios";
import { toast } from "sonner";

// Prefer the explicit API base URL if provided; otherwise fall back to
// `${REACT_APP_BACKEND_URL}/api` for local Emergent-hosted development.
const EXPLICIT_BASE = process.env.REACT_APP_API_BASE_URL;
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = EXPLICIT_BASE || `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let queue = [];

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");

  const url = config.url || "";

  const isAuthPublicEndpoint =
    url.includes("/auth/login/") ||
    url.includes("/auth/forgot-password/") ||
    url.includes("/auth/reset-password/") ||
    url.includes("/auth/refresh/");

  config.headers = config.headers || {};

  if (isAuthPublicEndpoint) {
    delete config.headers.Authorization;
  } else if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;

/* Helpers to unwrap the {success, message, data} envelope */
export const unwrap = (resp) => resp?.data?.data ?? resp?.data;
