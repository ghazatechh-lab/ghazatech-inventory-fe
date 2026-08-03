import React from "react";
import ReferenceDataPage from "./ReferenceDataPage";

export default function CategoryListPage() {
  return (
    <ReferenceDataPage
      title="Categories"
      subtitle="Create and maintain a clear product category structure for faster inventory organization, reporting and product selection."
      singular="Category"
      endpoint="/categories/"
      queryKey="categories"
      testIdPrefix="category"
    />
  );
}
