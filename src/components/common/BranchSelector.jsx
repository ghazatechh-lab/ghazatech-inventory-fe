import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, Check, ChevronDown, Loader2 } from "lucide-react";

import api, { unwrap } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { canViewAllBranches, hasPermission } from "@/lib/permissions";
import { getAccessibleBranches, getUserBranchId } from "@/lib/branchAccess";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const normalizeBranches = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (Array.isArray(value?.results)) {
    return value.results;
  }

  if (Array.isArray(value?.data)) {
    return value.data;
  }

  if (Array.isArray(value?.data?.results)) {
    return value.data.results;
  }

  return [];
};

export function BranchSelector() {
  const { user, branchOverride, setBranchOverride } = useAuth();

  const viewAllBranches = canViewAllBranches(user);
  const canSwitchBranch =
    viewAllBranches || hasPermission(user, "branches.switch");

  const { data, isLoading, isFetching } = useQuery({
    /*
     * This key must match the
     * invalidation used in
     * BranchFormPage.
     */
    queryKey: ["branches-select"],

    queryFn: async () => {
      const response = await api.get("/branches/", {
        params: {
          page_size: 500,
          ordering: "branch_code",
          is_active: true,
        },
      });

      return unwrap(response);
    },

    staleTime: 0,

    refetchOnMount: "always",

    refetchOnWindowFocus: true,
  });

  const branches = React.useMemo(
    () => getAccessibleBranches(normalizeBranches(data), user),
    [data, user],
  );

  const current = React.useMemo(
    () =>
      branches.find((branch) => String(branch.id) === String(branchOverride)),
    [branches, branchOverride],
  );

  /*
   * If the selected branch was deleted
   * or became inactive, automatically
   * return to All branches.
   */
  React.useEffect(() => {
    if (!viewAllBranches) {
      const assignedBranchId = getUserBranchId(user);

      if (
        assignedBranchId &&
        String(branchOverride || "") !== String(assignedBranchId)
      ) {
        setBranchOverride(assignedBranchId);
      }

      return;
    }

    if (branchOverride && !isLoading && branches.length > 0 && !current) {
      setBranchOverride(null);
    }
  }, [
    branchOverride,
    branches,
    current,
    isLoading,
    setBranchOverride,
    user,
    viewAllBranches,
  ]);

  const currentLabel =
    current?.branch_code ||
    current?.branch_name ||
    (viewAllBranches ? "All branches" : "Assigned branch");

  if (!canSwitchBranch) {
    return (
      <div className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-300 dark:shadow-none">
        <Building2 className="h-3.5 w-3.5 text-slate-500" />
        <span className="max-w-[160px] truncate">{currentLabel}</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-300 dark:shadow-none dark:hover:bg-white/5"
          aria-label="Select branch"
        >
          {isLoading || isFetching ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />
          ) : (
            <Building2 className="h-3.5 w-3.5 text-slate-500" />
          )}

          <span className="max-w-[160px] truncate">{currentLabel}</span>

          <ChevronDown className="h-3 w-3 text-slate-500" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Filter data by branch</DropdownMenuLabel>

        <DropdownMenuSeparator />

        {viewAllBranches && (
          <DropdownMenuItem onClick={() => setBranchOverride(null)}>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Building2 className="h-4 w-4 shrink-0 text-slate-500" />

              <span className="truncate">All branches</span>
            </div>

            {!branchOverride && (
              <Check className="ml-2 h-4 w-4 shrink-0 text-blue-500" />
            )}
          </DropdownMenuItem>
        )}

        {branches.map((branch) => {
          const selected = String(branchOverride) === String(branch.id);

          const branchCode = branch.branch_code || `Branch ${branch.id}`;

          const branchName = branch.branch_name || branch.name || "";

          return (
            <DropdownMenuItem
              key={branch.id}
              onClick={() => setBranchOverride(branch.id)}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{branchCode}</div>

                {branchName && (
                  <div className="truncate text-[11px] text-slate-500">
                    {branchName}
                  </div>
                )}
              </div>

              {selected && (
                <Check className="ml-2 h-4 w-4 shrink-0 text-blue-500" />
              )}
            </DropdownMenuItem>
          );
        })}

        {!isLoading && !branches.length && (
          <div className="px-3 py-5 text-center text-xs text-slate-500">
            No active branches found.
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
