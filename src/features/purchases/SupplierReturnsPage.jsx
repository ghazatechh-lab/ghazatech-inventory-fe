import React from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/States";
import { RotateCcw } from "lucide-react";

export default function SupplierReturnsPage() {
  return (
    <div>
      <PageHeader title="Supplier Returns" subtitle="Damaged / wrong item returns to suppliers" />
      <div className="card-surface p-6"><EmptyState icon={RotateCcw} title="No supplier returns" description="Returns will appear here once created against a GRN." /></div>
    </div>
  );
}
