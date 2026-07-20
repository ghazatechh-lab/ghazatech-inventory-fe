import React from "react";
import ReferenceDataPage from "@/features/inventory/ReferenceDataPage";

export default function CategoryListPage() {
  return (
    <ReferenceDataPage
      title="Categories"
      description="Manage product categories used to organize inventory."
      singular="Category"
      endpoint="/categories/"
      queryKey="categories"
      testIdPrefix="category"
    />
  );
}
