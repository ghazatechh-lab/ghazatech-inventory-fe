import React from "react";
import ReferenceDataPage from "./ReferenceDataPage";

export default function CategoryListPage() {
  return (
    <ReferenceDataPage
      title="Categories"
      subtitle="Organize products into clear inventory categories."
      singular="Category"
      endpoint="/categories/"
      queryKey="categories"
      testIdPrefix="category"
    />
  );
}
