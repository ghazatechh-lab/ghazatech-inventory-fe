import React from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { ExportButtons } from "@/components/common/ExportButtons";
import DocumentExpiryPage from "@/features/hrms/DocumentExpiryPage";

export default function HRMSReportPage() {
  return (
    <div>
      <PageHeader title="HRMS Reports" subtitle="Employee documents and compliance" actions={<ExportButtons />} />
      <DocumentExpiryPage />
    </div>
  );
}
