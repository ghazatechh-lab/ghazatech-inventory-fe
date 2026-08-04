export const extractRows = (response) => {
  const value = response?.data ?? response;

  if (Array.isArray(value)) {
    return value;
  }

  if (Array.isArray(value?.results)) {
    return value.results;
  }

  if (Array.isArray(value?.data)) {
    return value.data;
  }

  if (Array.isArray(value?.data?.results)) {
    return value.data.results;
  }

  if (Array.isArray(value?.data?.data)) {
    return value.data.data;
  }

  if (Array.isArray(value?.data?.data?.results)) {
    return value.data.data.results;
  }

  return [];
};

export const extractPayload = (response) => {
  if (response?.data?.data !== undefined) {
    return response.data.data;
  }

  if (response?.data !== undefined) {
    return response.data;
  }

  return response ?? {};
};

export const extractCount = (response) => {
  const value = response?.data ?? response;

  return Number(
    value?.count ??
      value?.data?.count ??
      value?.data?.data?.count ??
      extractRows(response).length,
  );
};

export const money = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export const number = (
  value,
  minimumFractionDigits = 0,
  maximumFractionDigits = 2,
) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(Number(value || 0));

export const percent = (value, maximumFractionDigits = 1) =>
  `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(Number(value || 0))}%`;

export const today = () => new Date().toISOString().slice(0, 10);

export const firstDayOfMonth = (value = new Date()) => {
  const date = new Date(value);

  return new Date(date.getFullYear(), date.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
};

export const lastDayOfMonth = (value = new Date()) => {
  const date = new Date(value);

  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);
};

export const firstDayOfYear = (value = new Date()) => {
  const date = new Date(value);

  return `${date.getFullYear()}-01-01`;
};

export const lastDayOfYear = (value = new Date()) => {
  const date = new Date(value);

  return `${date.getFullYear()}-12-31`;
};

export const addDays = (value, days) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  date.setDate(date.getDate() + Number(days || 0));

  return date.toISOString().slice(0, 10);
};

export const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
};

export const toNullableNumber = (value) => {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
};

export const calculatePercentage = (amount, rate) =>
  (toNumber(amount) * toNumber(rate)) / 100;

export const calculateLineAmount = ({ quantity, unitPrice, vatRate = 0 }) => {
  const subtotal = toNumber(quantity) * toNumber(unitPrice);

  const vatAmount = calculatePercentage(subtotal, vatRate);

  return {
    subtotal,
    vatAmount,
    total: subtotal + vatAmount,
  };
};

export const formatDate = (value, options = {}) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    ...options,
  }).format(date);
};

export const normalizeBoolean = (value) => {
  if (value === true || value === false) {
    return value;
  }

  if (typeof value === "string") {
    return ["true", "1", "yes", "on"].includes(value.trim().toLowerCase());
  }

  return Boolean(value);
};

export const getStatusLabel = (value) => {
  if (!value) {
    return "—";
  }

  return String(value)
    .trim()
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};
