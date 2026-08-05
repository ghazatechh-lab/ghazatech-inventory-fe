import React from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Keeps the supplier filter in the browser URL and provides an API-ready value.
 *
 * Example URL:
 * /purchases/supplier-payments?supplier=1
 */
export function useSupplierUrlFilter() {
  const [searchParams, setSearchParams] = useSearchParams();

  const supplierId = searchParams.get("supplier") || "";

  const setSupplierId = React.useCallback(
    (value) => {
      const next = new URLSearchParams(searchParams);

      if (value && value !== "all") {
        next.set("supplier", String(value));
      } else {
        next.delete("supplier");
      }

      next.delete("page");

      setSearchParams(next, {
        replace: true,
      });
    },
    [searchParams, setSearchParams],
  );

  const supplierParams = React.useMemo(
    () => ({
      supplier: supplierId || undefined,
    }),
    [supplierId],
  );

  return {
    supplierId,
    supplierParams,
    setSupplierId,
    clearSupplierFilter: () => setSupplierId(""),
  };
}
