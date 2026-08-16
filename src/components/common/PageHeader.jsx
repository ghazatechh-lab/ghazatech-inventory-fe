import React from "react";

import { useAuth } from "@/lib/auth";
import { canChangeActiveBranch } from "@/lib/permissions";
import { BranchSelector } from "@/components/common/BranchSelector";

export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
  className = "",
  children,
}) {
  const { user } = useAuth();

  const canSwitchBranch = canChangeActiveBranch(user);

  return (
    <div
      className={`flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between ${className}`}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}

        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>

        {subtitle ? (
          <p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted-foreground">
            {subtitle}
          </p>
        ) : null}

        {children}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {canSwitchBranch ? <BranchSelector /> : null}

        {actions}
      </div>
    </div>
  );
}

export default PageHeader;
