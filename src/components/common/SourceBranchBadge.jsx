import React from "react";

export default function SourceBranchBadge({ source }) {
  const value = String(source || "").toUpperCase().replace("-", "_");
  const label = ["BR01", "VAT"].includes(value)
    ? "Branch 1"
    : ["BR02", "NON_VAT"].includes(value)
      ? "Branch 2"
      : source || "—";
  return (
    <span className="inline-flex whitespace-nowrap items-center rounded-full border px-2.5 py-1 text-xs font-semibold">
      {label}
    </span>
  );
}
