import React from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/States";
import { HandCoins } from "lucide-react";

export default function SupplierPaymentsPage() {
  return (
    <div>
      <PageHeader title="Supplier Payments" subtitle="Payments issued to suppliers" />
      <div className="card-surface p-6"><EmptyState icon={HandCoins} title="No supplier payments recorded yet" description="Record payments from Suppliers ▸ [Supplier] to see history here." /></div>
    </div>
  );
}
