import React from "react";
import ReferenceDataPage from "./ReferenceDataPage";

export default function BrandListPage() {
  return (
    <ReferenceDataPage
      title="Brands"
      subtitle="Manage product brands used across the inventory catalogue."
      singular="Brand"
      endpoint="/brands/"
      queryKey="brands"
      testIdPrefix="brand"
    />
  );
}
