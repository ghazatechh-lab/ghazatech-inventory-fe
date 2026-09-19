import React from "react";
import { PageHeader as SharedPageHeader } from "@/components/common/PageHeader";

export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow = "Purchase Management",
  icon,
}) {
  return (
    <SharedPageHeader
      title={title}
      subtitle={subtitle}
      actions={actions}
      eyebrow={eyebrow}
      icon={icon}
    />
  );
}

export default PageHeader;
