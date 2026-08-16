import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, Check, ChevronDown, Loader2 } from "lucide-react";

import api, { unwrap } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { canChangeActiveBranch, canViewAllBranches } from "@/lib/permissions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const normalizeBranches = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.results)) {
    return value.data.results;
  }
  return [];
};

const getAssignedBranchId = (user) =>
  user?.branch?.id ?? user?.branch_id ?? user?.branch_detail?.id ?? null;

const getBranchLabel = (branch) =>
  branch?.branch_code ||
  branch?.branch_name ||
  (branch?.id ? `Branch ${branch.id}` : "Select branch");

export function BranchSelector() {
  const { user, branchOverride, setBranchOverride } = useAuth();

  const canSwitch = canChangeActiveBranch(user);
  const canSelectAll = canViewAllBranches(user);

  const assignedBranchId = getAssignedBranchId(user);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["branches-select", canSwitch, canSelectAll, assignedBranchId],

    queryFn: async () => {
      const response = await api.get("/branches/selector-options/");

      return unwrap(response);
    },

    enabled: canSwitch,

    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const branches = React.useMemo(() => normalizeBranches(data), [data]);

  const assignedBranch = React.useMemo(
    () =>
      branches.find(
        (branch) => String(branch.id) === String(assignedBranchId),
      ) || null,
    [branches, assignedBranchId],
  );

  /*
   * IMPORTANT:
   *
   * null means "All Branches" only for users who actually have
   * branches.view_all.
   *
   * A branches.switch-only user must always have one concrete branch
   * selected. This prevents older branch-filter code from accidentally
   * interpreting null as cross-branch access.
   */
  React.useEffect(() => {
    if (!canSwitch || canSelectAll || isLoading) {
      return;
    }

    const selectedStillExists = branches.some(
      (branch) => String(branch.id) === String(branchOverride),
    );

    if (branchOverride && selectedStillExists) {
      return;
    }

    const fallbackId = assignedBranch?.id ?? branches[0]?.id ?? null;

    if (fallbackId !== null) {
      setBranchOverride(Number(fallbackId));
    }
  }, [
    canSwitch,
    canSelectAll,
    isLoading,
    branches,
    branchOverride,
    assignedBranch,
    setBranchOverride,
  ]);

  /*
   * If an All-Branches user selected a branch that later becomes
   * inactive/deleted, safely return them to All Branches.
   */
  React.useEffect(() => {
    if (!canSwitch || !canSelectAll || !branchOverride || isLoading) {
      return;
    }

    const selectedStillExists = branches.some(
      (branch) => String(branch.id) === String(branchOverride),
    );

    if (!selectedStillExists) {
      setBranchOverride(null);
    }
  }, [
    canSwitch,
    canSelectAll,
    isLoading,
    branches,
    branchOverride,
    setBranchOverride,
  ]);

  if (!canSwitch) {
    return null;
  }

  const effectiveBranchId = canSelectAll
    ? branchOverride
    : (branchOverride ?? assignedBranchId);

  const currentBranch =
    branches.find(
      (branch) => String(branch.id) === String(effectiveBranchId),
    ) || null;

  const showingAll =
    canSelectAll &&
    (branchOverride === null ||
      branchOverride === undefined ||
      branchOverride === "");

  const currentLabel = showingAll
    ? "All branches"
    : getBranchLabel(currentBranch || assignedBranch);

  const selectSpecificBranch = (branchId) => {
    if (!canSwitch || !branchId) {
      return;
    }

    setBranchOverride(Number(branchId));
  };

  const selectAllBranches = () => {
    if (!canSelectAll) {
      return;
    }

    setBranchOverride(null);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-300 dark:shadow-none dark:hover:bg-white/5"
          aria-label="Select active branch"
          disabled={isLoading}
        >
          {isLoading || isFetching ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />
          ) : (
            <Building2 className="h-3.5 w-3.5 text-slate-500" />
          )}

          <span className="max-w-[170px] truncate">
            {isLoading ? "Loading branches..." : currentLabel}
          </span>

          <ChevronDown className="h-3 w-3 text-slate-500" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Active working branch</DropdownMenuLabel>

        <div className="px-2 pb-2 text-[11px] leading-4 text-muted-foreground">
          {canSelectAll
            ? "You can work in a specific branch or view all branches."
            : "You can change the branch you are currently working in."}
        </div>

        <DropdownMenuSeparator />

        {canSelectAll && (
          <>
            <DropdownMenuItem
              onClick={selectAllBranches}
              className="cursor-pointer"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <Building2 className="h-4 w-4 shrink-0 text-slate-500" />

                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">All branches</div>

                  <div className="truncate text-[11px] text-muted-foreground">
                    Combined branch data
                  </div>
                </div>
              </div>

              {showingAll && (
                <Check className="ml-2 h-4 w-4 shrink-0 text-blue-500" />
              )}
            </DropdownMenuItem>

            <DropdownMenuSeparator />
          </>
        )}

        {branches.map((branch) => {
          const selected =
            !showingAll && String(effectiveBranchId) === String(branch.id);

          return (
            <DropdownMenuItem
              key={branch.id}
              onClick={() => selectSpecificBranch(branch.id)}
              className="cursor-pointer"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">
                  {branch.branch_code || `Branch ${branch.id}`}
                </div>

                {branch.branch_name && (
                  <div className="truncate text-[11px] text-muted-foreground">
                    {branch.branch_name}
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
          <div className="px-3 py-5 text-center text-xs text-muted-foreground">
            No active branches are available.
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
