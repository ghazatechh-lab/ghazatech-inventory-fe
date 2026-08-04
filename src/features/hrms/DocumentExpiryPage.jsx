import React from "react";
import { useQuery } from "@tanstack/react-query";

import api, { unwrap } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/hooks/useListQuery";
import { DateText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";

export default function DocumentExpiryPage() {
  const { branchParams } = useActiveBranchFilter();
  const { data: response, isLoading } = useQuery({
    queryKey: ["document-expiry", branchParams],
    queryFn: async () =>
      unwrap(
        await api.get("/hrms/document-expiry/", {
          params: { ...branchParams, days: 90, page_size: 500 },
        }),
      ),
  });
  const rows = Array.isArray(response) ? response : response?.results || [];

  return (
    <div className="hrms-module-page hrms-workspace space-y-5">
      <PageHeader
        title="Document Expiry"
        subtitle="Passport, visa, Emirates ID, contract, and employee document alerts"
      />
      <DataTable
        columns={[
          { key: "employee_name", header: "Employee" },
          { key: "document_type_display", header: "Document" },
          { key: "title", header: "Title" },
          { key: "document_number", header: "Number" },
          {
            key: "expiry_date",
            header: "Expiry",
            cell: (row) => <DateText value={row.expiry_date} />,
          },
          {
            key: "status",
            header: "Status",
            cell: () => <StatusBadge status="EXPIRING" />,
          },
        ]}
        data={rows}
        isLoading={isLoading}
        page={1}
        total={rows.length}
        onPageChange={() => {}}
      />
    </div>
  );
}
