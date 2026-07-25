import React from "react";

import { useAuth } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";

const getUserBranchId = (user) =>
  user?.branch?.id ?? user?.branch_id ?? user?.branch_detail?.id ?? null;

export function useActiveBranchFilter() {
  const { user, branchOverride } = useAuth();

  const admin = isAdmin(user);

  const branchId = admin ? branchOverride : getUserBranchId(user);

  const branchParams = React.useMemo(
    () => ({
      branch: branchId || undefined,
    }),
    [branchId],
  );

  return {
    branchId,
    branchParams,
    isAllBranches: admin && !branchId,
  };
}
