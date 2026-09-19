import React from "react";
import { PageHeader } from "@/components/common/PageHeader";

export function SalesHeroHeader({
  title,
  subtitle,
  actions,
  eyebrow = "Sales Management",
  icon,
}) {
  return (
    <PageHeader
      title={title}
      subtitle={subtitle}
      actions={actions}
      eyebrow={eyebrow}
      icon={icon}
    />
  );
}

export default SalesHeroHeader;
