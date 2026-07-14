import React from "react";
import { formatAED, formatDate } from "@/lib/utils";

export function CurrencyText({ value, className = "" }) {
  return <span className={`font-numeric ${className}`}>{formatAED(value)}</span>;
}

export function DateText({ value, className = "" }) {
  return <span className={`font-numeric ${className}`}>{formatDate(value)}</span>;
}
