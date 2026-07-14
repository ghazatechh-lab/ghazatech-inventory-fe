import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatAED(v) {
  const n = Number(v ?? 0);
  return `AED ${n.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatNumber(v, digits = 0) {
  return Number(v ?? 0).toLocaleString("en-AE", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDate(d) {
  if (!d) return "-";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${dd} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
}

export function formatDateTime(d) {
  if (!d) return "-";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return `${formatDate(d)} ${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
}

export function daysBetween(a, b = new Date()) {
  const d1 = new Date(a); const d2 = new Date(b);
  return Math.round((d1 - d2) / (1000 * 60 * 60 * 24));
}

export function severityForExpiry(days) {
  if (days < 0) return "expired";
  if (days <= 7) return "critical";
  if (days <= 30) return "warning";
  if (days <= 60) return "info";
  return "ok";
}
