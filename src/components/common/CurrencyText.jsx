import React from "react";
import { formatCurrency, formatDate } from "@/lib/utils";

export function CurrencyText({ value, currency = "AED", className = "" }) {
  return (
    <span className={`font-numeric ${className}`}>
      {formatCurrency(value, currency)}
    </span>
  );
}

export function DateText({ value, className = "" }) {
  return (
    <span className={`font-numeric ${className}`}>{formatDate(value)}</span>
  );
}
