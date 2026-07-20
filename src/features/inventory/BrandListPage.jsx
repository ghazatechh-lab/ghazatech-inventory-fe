import React from "react";
import ReferenceDataPage from "@/features/inventory/ReferenceDataPage";

export default function BrandListPage() {
  return (
    <ReferenceDataPage
      title="Brands"
      description="Manage product manufacturers and brand information."
      singular="Brand"
      endpoint="/brands/"
      queryKey="brands"
      testIdPrefix="brand"
    />
  );
}
