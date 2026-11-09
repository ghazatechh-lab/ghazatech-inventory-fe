import React from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { DirhamSymbol } from "@/components/common/DirhamSymbol";

export function CurrencyText({ value, currency = "AED", className = "" }) {
  const code = String(currency || "AED").toUpperCase();
  if (code === "AED") {
    const number = Number(value ?? 0);
    const formatted = Number.isFinite(number)
      ? number.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : "—";
    return (
      <span className={`inline-flex items-baseline gap-[0.22em] whitespace-nowrap font-numeric ${className}`}>
        <DirhamSymbol />
        <span>{formatted}</span>
      </span>
    );
  }
  return <span className={`whitespace-nowrap font-numeric ${className}`}>{formatCurrency(value, currency)}</span>;
}

export function DateText({ value, className = "" }) {
  return <span className={`font-numeric ${className}`}>{formatDate(value)}</span>;
}
