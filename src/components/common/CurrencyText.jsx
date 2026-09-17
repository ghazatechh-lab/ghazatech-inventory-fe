import React from "react";
import DirhamSymbol from "@/components/common/DirhamSymbol";
import { formatCurrency, formatDate } from "@/lib/utils";

export function CurrencyText({
  value,
  currency = "AED",
  className = "",
  symbolSize = 15,
}) {
  const code = String(currency || "AED").toUpperCase();
  const amount = Number(value ?? 0).toLocaleString("en-AE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (code === "AED") {
    return (
      <span
        className={`inline-flex items-center justify-end gap-1 whitespace-nowrap font-numeric ${className}`}
      >
        <DirhamSymbol size={symbolSize} className="shrink-0" decorative />
        <span>{amount}</span>
      </span>
    );
  }

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
