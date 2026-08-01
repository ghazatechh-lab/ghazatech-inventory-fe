export const numberValue = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const currency = (value, currencyCode = "AED") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numberValue(value));

export const taxTreatmentLabel = (value) =>
  String(value || "OUT_OF_SCOPE")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export const transferTaxScopeLabel = (value) =>
  String(value || "OUT_OF_SCOPE").toUpperCase() === "OUT_OF_SCOPE"
    ? "Internal transfer · VAT out of scope"
    : taxTreatmentLabel(value);
