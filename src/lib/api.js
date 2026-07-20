import axios from "axios";
import { toast } from "sonner";

const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://127.0.0.1:8000/api";

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: "application/json",
  },
});

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);

const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);

const clearStoredAuth = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem("user");
};

const redirectToLogin = () => {
  if (window.location.pathname !== "/login") {
    window.location.replace("/login");
  }
};

const humanizeFieldName = (fieldName = "") =>
  String(fieldName)
    .replace(/\[(\d+)\]/g, " $1")
    .replace(/\./g, " ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

const friendlyClientMessage = (field, message) => {
  const label = humanizeFieldName(field || "field");

  const text = String(message || "").trim();
  const lower = text.toLowerCase();

  if (
    lower.includes("invalid pk") ||
    lower.includes("object does not exist") ||
    lower.includes("expected pk value")
  ) {
    return `Select a valid ${label.toLowerCase()}.`;
  }

  if (
    lower.includes("this field is required") ||
    lower.includes("may not be blank") ||
    lower.includes("may not be null")
  ) {
    return `${label} is required.`;
  }

  if (
    lower.includes("already exists") ||
    lower.includes("must be unique") ||
    lower.includes("unique set")
  ) {
    return `${label} already exists. Please use a different value.`;
  }

  if (lower.includes("valid email")) {
    return "Enter a valid email address.";
  }

  if (lower.includes("valid image")) {
    return "Select a valid JPG, PNG, or WebP image.";
  }

  if (
    lower.includes("invalid image") ||
    lower.includes("upload a valid image")
  ) {
    return "The selected image could not be processed.";
  }

  if (lower.includes("no file was submitted")) {
    return `${label} is required.`;
  }

  if (lower.includes("ensure this field has no more than")) {
    return `${label} is too long.`;
  }

  if (lower.includes("ensure this value is greater than or equal")) {
    return `${label} is below the allowed minimum.`;
  }

  if (lower.includes("ensure this value is less than or equal")) {
    return `${label} exceeds the allowed maximum.`;
  }

  if (lower.includes("a valid number")) {
    return `Enter a valid number for ${label.toLowerCase()}.`;
  }

  if (lower.includes("a valid integer")) {
    return `Enter a valid whole number for ${label.toLowerCase()}.`;
  }

  if (lower.includes("a valid date")) {
    return `Enter a valid date for ${label.toLowerCase()}.`;
  }

  return text || `Enter a valid value for ${label.toLowerCase()}.`;
};

const flattenValidationErrors = (value, path = "", output = []) => {
  if (value === null || value === undefined || value === "") {
    return output;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      if (["string", "number", "boolean"].includes(typeof item)) {
        output.push({
          field: path,
          message: friendlyClientMessage(path, item),
        });
      } else {
        const nextPath = path ? `${path}[${index + 1}]` : `Item ${index + 1}`;

        flattenValidationErrors(item, nextPath, output);
      }
    });

    return output;
  }

  if (typeof value === "object") {
    Object.entries(value).forEach(([key, nestedValue]) => {
      const nextPath = ["non_field_errors", "detail"].includes(key)
        ? path
        : path
          ? `${path}.${key}`
          : key;

      flattenValidationErrors(nestedValue, nextPath, output);
    });

    return output;
  }

  output.push({
    field: path,
    message: friendlyClientMessage(path, value),
  });

  return output;
};

const statusTitle = (status) => {
  if (status === 400) {
    return "Please check the form";
  }

  if (status === 401) {
    return "Sign in required";
  }

  if (status === 403) {
    return "Permission denied";
  }

  if (status === 404) {
    return "Record not found";
  }

  if (status === 405) {
    return "Action not allowed";
  }

  if (status === 409) {
    return "Cannot complete action";
  }

  if (status === 413) {
    return "File too large";
  }

  if (status === 429) {
    return "Too many attempts";
  }

  if (status >= 500) {
    return "Server error";
  }

  return "Request failed";
};

export const getApiErrorDetails = (error) => {
  if (!error?.response) {
    return {
      title: "Connection error",
      message:
        error?.message === "Network Error"
          ? "The server could not be reached. Check your connection and try again."
          : error?.message || "Something went wrong. Please try again.",
      summary: "",
      errors: [],
      status: null,
    };
  }

  const status = error.response.status;
  const responseData = error.response.data;

  if (typeof responseData === "string") {
    const looksLikeHtml =
      /<!doctype html|<html|<body|traceback|unicodeerror/i.test(responseData);

    const safeMessage = looksLikeHtml
      ? status >= 500
        ? "The server could not process the request. Please try again or contact support."
        : "The submitted data could not be processed. Please check the form and try again."
      : responseData;

    return {
      title: statusTitle(status),
      message: safeMessage,
      summary: safeMessage,
      errors: [],
      status,
    };
  }

  const errorContainer =
    responseData?.errors ||
    responseData?.validation_errors ||
    responseData?.error ||
    {};

  const errors = flattenValidationErrors(errorContainer).map((item) => ({
    field: item.field,
    label: item.field ? humanizeFieldName(item.field) : "",
    message: item.message,
  }));

  const uniqueMessages = [...new Set(errors.map((item) => item.message))];

  const fieldSummary = uniqueMessages
    .slice(0, 6)
    .map((message) => `• ${message}`)
    .join("\n");

  const backendMessage = responseData?.message || responseData?.detail || "";

  const fallback =
    status === 400
      ? "Please correct the form and try again."
      : status === 401
        ? "Your session has expired. Please sign in again."
        : status === 403
          ? "You do not have permission to perform this action."
          : status === 404
            ? "The requested record could not be found."
            : status === 409
              ? "This record is in use or conflicts with existing data."
              : status === 413
                ? "The selected file is too large."
                : status >= 500
                  ? "An unexpected server error occurred. Please try again."
                  : "The request could not be completed.";

  const summary = fieldSummary || backendMessage || fallback;

  return {
    title: statusTitle(status),
    message: errors[0]?.message || backendMessage || fallback,
    summary,
    errors,
    status,
    code: responseData?.code,
  };
};

export const getApiErrorMessage = (
  error,
  fallbackMessage = "Something went wrong.",
) => getApiErrorDetails(error)?.message || fallbackMessage;

const buildToastId = (details) => {
  const message = String(details.summary || details.message || "request-error")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 80);

  return `api-error-${details.status || "network"}-${message}`;
};

export const showApiError = (error, fallbackMessage) => {
  if (error?.__apiErrorShown) {
    return error.apiErrorDetails || getApiErrorDetails(error);
  }

  const details = getApiErrorDetails(error);

  toast.error(details.title, {
    description:
      details.summary ||
      details.message ||
      fallbackMessage ||
      "The request could not be completed.",
    duration: 7000,
    id: buildToastId(details),
  });

  error.__apiErrorShown = true;
  error.apiErrorDetails = details;

  return details;
};

api.interceptors.request.use(
  (config) => {
    const accessToken = getAccessToken();

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    /*
     * Never manually set Content-Type for FormData.
     * The browser must add the multipart boundary.
     */
    if (config.data instanceof FormData) {
      if (typeof config.headers?.setContentType === "function") {
        config.headers.setContentType(undefined);
      } else {
        delete config.headers["Content-Type"];
        delete config.headers["content-type"];
      }
    }

    return config;
  },
  (error) => Promise.reject(error),
);

let isRefreshing = false;
let refreshQueue = [];

const processRefreshQueue = (error, accessToken = null) => {
  refreshQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(accessToken),
  );

  refreshQueue = [];
};

const isRefreshEndpoint = (url = "") => url.includes("/auth/refresh/");

const isLogoutEndpoint = (url = "") => url.includes("/auth/logout/");

const shouldShowGlobalError = (error) => {
  const config = error?.config || {};

  const method = String(config.method || "get").toLowerCase();

  if (config.skipGlobalErrorToast || error.__apiErrorShown) {
    return false;
  }

  if (!["post", "put", "patch", "delete"].includes(method)) {
    return false;
  }

  if (isRefreshEndpoint(config.url) || isLogoutEndpoint(config.url)) {
    return false;
  }

  return true;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const statusCode = error.response?.status;

    if (
      statusCode === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isRefreshEndpoint(originalRequest.url) &&
      !isLogoutEndpoint(originalRequest.url)
    ) {
      const refreshToken = getRefreshToken();

      if (!refreshToken) {
        clearStoredAuth();
        redirectToLogin();

        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({
            resolve,
            reject,
          });
        })
          .then((newAccessToken) => {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

            return api(originalRequest);
          })
          .catch((refreshError) => Promise.reject(refreshError));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await refreshClient.post("/auth/refresh/", {
          refresh: refreshToken,
        });

        const tokenData = refreshResponse.data?.data || refreshResponse.data;

        const newAccessToken = tokenData?.access;

        const newRefreshToken = tokenData?.refresh;

        if (!newAccessToken) {
          throw new Error("Unable to refresh session.");
        }

        localStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken);

        if (newRefreshToken) {
          localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
        }

        api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        processRefreshQueue(null, newAccessToken);

        return api(originalRequest);
      } catch (refreshError) {
        processRefreshQueue(refreshError, null);

        clearStoredAuth();
        redirectToLogin();

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (shouldShowGlobalError(error)) {
      showApiError(error);
    }

    return Promise.reject(error);
  },
);

export const unwrap = (response) => {
  const body = response?.data;

  return body && typeof body === "object" && "data" in body ? body.data : body;
};

export {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  clearStoredAuth,
  getAccessToken,
  getRefreshToken,
};

export default api;
