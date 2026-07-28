import React from "react";

import { useAuth } from "@/lib/auth";

const normalizeRoleCode = (user) =>
  String(
    user?.role_code ||
      user?.role?.code ||
      user?.role_detail?.code ||
      user?.role_name ||
      "",
  )
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");

const isAdministrator = (user) => {
  const roleCode = normalizeRoleCode(user);

  return Boolean(
    user?.is_superuser === true ||
    roleCode === "ADMIN" ||
    roleCode === "SUPER_ADMIN" ||
    roleCode === "ADMINISTRATOR",
  );
};

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

const getUserBranchId = (user) =>
  normalizeBranchId(
    user?.branch?.id ?? user?.branch_id ?? user?.branch_detail?.id ?? null,
  );

export function useActiveBranchFilter() {
  const { user, branchOverride } = useAuth();

  const admin = React.useMemo(() => isAdministrator(user), [user]);

  const userBranchId = React.useMemo(() => getUserBranchId(user), [user]);

  const selectedBranchId = React.useMemo(
    () => normalizeBranchId(branchOverride),
    [branchOverride],
  );

  /*
   * Admin:
   * - null means All branches.
   * - selected branch ID means filter by that branch.
   *
   * Non-admin:
   * - always restricted to the user's assigned branch.
   */
  const branchId = admin ? selectedBranchId : userBranchId;

  /*
   * For All branches, return an entirely empty object.
   * Do not return:
   *
   * {
   *   branch: undefined
   * }
   *
   * This guarantees Axios will not send a branch parameter.
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

    isAdmin: admin,

    isAllBranches: admin && branchId === null,

    userBranchId,
  };
}

export default useActiveBranchFilter;
