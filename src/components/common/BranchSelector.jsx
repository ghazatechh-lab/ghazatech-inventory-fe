import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, Check, ChevronDown } from "lucide-react";

import api, { unwrap } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const normalizeList = (value) => {
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

const getBranchCode = (branch) => {
  return branch?.branch_code || branch?.code || `BR-${branch?.id ?? ""}`;
};

export function BranchSelector() {
  const { branchOverride, setBranchOverride } = useAuth();

  const { data: branchResponse, isLoading } = useQuery({
    queryKey: ["branches-select"],
    queryFn: async () => {
      const response = await api.get("/branches/", {
        params: {
          page_size: 500,
        },
      });

      const result = unwrap(response);

      console.log("[Header Branch Selector] Branches:", result);

      return result;
    },
    staleTime: 60_000,
  });

  const branches = React.useMemo(
    () => normalizeList(branchResponse),
    [branchResponse],
  );

  const currentBranch = branches.find(
    (branch) => String(branch.id) === String(branchOverride),
  );

  const selectBranch = (branchId) => {
    console.log("[Header Branch Selector] Selected:", branchId);

    setBranchOverride(branchId === null ? null : Number(branchId));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.02] px-3 text-xs text-slate-300 transition hover:bg-white/5"
          data-testid="branch-selector-btn"
          disabled={isLoading}
        >
          <Building2 className="h-3.5 w-3.5 text-slate-500" />

          <span className="max-w-[160px] truncate">
            {isLoading
              ? "Loading..."
              : currentBranch
                ? getBranchCode(currentBranch)
                : "All branches"}
          </span>

          <ChevronDown className="h-3 w-3 text-slate-500" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Filter data by branch</DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => selectBranch(null)}>
          <span className="flex-1">All branches</span>

          {!branchOverride && <Check className="h-4 w-4 text-blue-400" />}
        </DropdownMenuItem>

        {branches.map((branch) => {
          const isSelected = String(branchOverride) === String(branch.id);

          return (
            <DropdownMenuItem
              key={branch.id}
              onClick={() => selectBranch(branch.id)}
            >
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">
                  {getBranchCode(branch)}
                </span>

                {branch.branch_name && (
                  <span className="truncate text-[11px] text-slate-500">
                    {branch.branch_name}
                  </span>
                )}
              </div>

              {isSelected && (
                <Check className="h-4 w-4 shrink-0 text-blue-400" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
