import React from "react";

import { useAuth } from "@/lib/auth";
import { canViewAllBranches, isAdmin } from "@/lib/permissions";
import { getUserBranchId } from "@/lib/branchAccess";

const normalizeBranchId = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    value === "all" ||
    value === "null" ||
    value === "undefined"
  ) {
    return null;
  }

  if (value && typeof value === "object") {
    return normalizeBranchId(
      value.id ?? value.branch_id ?? value.value ?? null,
    );
  }

  const parsed = Number(value);

  return Number.isNaN(parsed) ? value : parsed;
};

export function useActiveBranchFilter() {
  const { user, branchOverride } = useAuth();

  const administrator = React.useMemo(() => isAdmin(user), [user]);

  const viewAllBranches = React.useMemo(
    () => administrator || canViewAllBranches(user),
    [administrator, user],
  );

  const userBranchId = React.useMemo(
    () => normalizeBranchId(getUserBranchId(user)),
    [user],
  );

  const selectedBranchId = React.useMemo(
    () => normalizeBranchId(branchOverride),
    [branchOverride],
  );

  /*
   * Admin or a user with branches.view_all:
   * - null means All Branches.
   * - a selected branch ID filters records to that branch.
   *
   * A user without branches.view_all:
   * - is always restricted to the assigned branch.
   * - branchOverride is ignored.
   */
  const branchId = viewAllBranches ? selectedBranchId : userBranchId;

  /*
   * For All Branches, return an empty object.
   * This prevents Axios from sending:
   *
   * {
   *   branch: undefined
   * }
   */
  const branchParams = React.useMemo(() => {
    if (branchId === null || branchId === undefined || branchId === "") {
      return {};
    }

    return {
      branch: branchId,
    };
  }, [branchId]);

  return {
    branchId,
    branchParams,

    isAdmin: administrator,

    canViewAllBranches: viewAllBranches,

    canSwitchBranches: viewAllBranches,

    isAllBranches: viewAllBranches && branchId === null,

    userBranchId,
    selectedBranchId,
  };
}

export default useActiveBranchFilter;
