import { canViewAllBranches, isAdmin } from "@/lib/permissions";

export const getUserBranchId = (user) =>
  user?.branch?.id ||
  user?.branch_id ||
  user?.employee?.branch?.id ||
  user?.employee?.branch_id ||
  null;

export const getAccessibleBranches = (branches, user) => {
  const values = Array.isArray(branches) ? branches : [];

  if (isAdmin(user) || canViewAllBranches(user)) {
    return values;
  }

  const userBranchId = getUserBranchId(user);

  if (!userBranchId) {
    return [];
  }

  return values.filter((branch) => String(branch.id) === String(userBranchId));
};

export const canSelectAnyBranch = (user) =>
  isAdmin(user) || canViewAllBranches(user);
