import React from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { SalesSourceBranchFilter } from "@/features/sales/SalesPageHeader";

export function SalesHeroHeader({
  title,
  subtitle,
  actions,
  eyebrow = "Sales Management",
  icon,
  showSourceFilter = false,
}) {
  return (
    <div className="space-y-3">
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={actions}
        eyebrow={eyebrow}
        icon={icon}
      />
      {showSourceFilter ? <SalesSourceBranchFilter /> : null}
    </div>
  );
}

export default SalesHeroHeader;
