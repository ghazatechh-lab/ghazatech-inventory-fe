export const numberValue = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const currency = (value, currencyCode = "AED") => {
  const code = String(currencyCode || "AED").toUpperCase();
  const amount = numberValue(value);

  if (code === "AED") {
    return `AED ${amount.toLocaleString("en-AE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const taxTreatmentLabel = (value) =>
  String(value || "OUT_OF_SCOPE")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export const transferTaxScopeLabel = (value) =>
  String(value || "OUT_OF_SCOPE").toUpperCase() === "OUT_OF_SCOPE"
    ? "Internal transfer Â· VAT out of scope"
    : taxTreatmentLabel(value);

