import React from "react";
import { useQuery } from "@tanstack/react-query";
import api, { unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { CurrencyText } from "@/components/common/CurrencyText";

export default function PayablesPage() {
  const { data, isLoading } = useQuery({ queryKey: ["payables"], queryFn: async () => unwrap(await api.get("/finance/supplier-payables/")) });
  const rows = data || [];
  return (
    <div>
      <PageHeader title="Supplier Payables" subtitle="Balances owed to suppliers" />
      <DataTable
        columns={[
          { key: "supplier_code", header: "Code", cell: (r) => <span className="font-numeric text-slate-300">{r.supplier_code}</span> },
          { key: "supplier_name", header: "Supplier" },
          { key: "payment_terms_days", header: "Terms", align: "right", cell: (r) => <span className="font-numeric">{r.payment_terms_days}d</span> },
          { key: "outstanding", header: "Outstanding", align: "right", cell: (r) => <CurrencyText value={r.outstanding} className="text-red-300" /> },
        ]}
        data={rows} isLoading={isLoading} page={1} total={rows.length}
      />
    </div>
  );
}
