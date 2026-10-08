import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";

import api, { unwrap } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";

function normalizeList(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.results)) return value.data.results;
  return [];
}

function codeOf(branch) {
  return String(branch?.branch_code || "").trim().toUpperCase();
}

export function usePurchaseBranchScope() {
  const active = useActiveBranchFilter();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data } = useQuery({
    queryKey: ["purchase-physical-branches"],
    queryFn: async () => unwrap(await api.get("/branches/selector-options/")),
    staleTime: 60_000,
  });

  const branches = React.useMemo(() => normalizeList(data), [data]);
  const physicalBranches = React.useMemo(
    () => branches.filter((branch) => ["BR01", "BR02"].includes(codeOf(branch))),
    [branches],
  );

  const activeBranch = React.useMemo(
    () => branches.find((branch) => String(branch.id) === String(active.branchId ?? "")) || null,
    [active.branchId, branches],
  );

  const activeCode = codeOf(activeBranch);
  const isCombinedBranch = activeCode === "BR03";
  const isPhysicalBranch = ["BR01", "BR02"].includes(activeCode);
  const formBranchId = isPhysicalBranch ? String(activeBranch.id) : "";

  const sourceBranch = String(searchParams.get("source_branch") || "ALL").toUpperCase();
  const normalizedSource = ["ALL", "BR01", "BR02"].includes(sourceBranch)
    ? sourceBranch
    : "ALL";

  const listBranchParams = React.useMemo(() => {
    const params = { ...(active.branchParams || {}) };
    if (isCombinedBranch) {
      params.source_branch = normalizedSource;
    }
    return params;
  }, [active.branchParams, isCombinedBranch, normalizedSource]);

  const setSourceBranch = React.useCallback(
    (value) => {
      const next = new URLSearchParams(searchParams);
      const normalized = String(value || "ALL").toUpperCase();
      if (normalized === "ALL") next.delete("source_branch");
      else next.set("source_branch", normalized);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  return {
    ...active,
    branches,
    physicalBranches,
    activeBranch,
    activeBranchCode: activeCode,
    isCombinedBranch,
    isPhysicalBranch,
    formBranchId,
    sourceBranch: normalizedSource,
    setSourceBranch,
    listBranchParams,
  };
}

export default usePurchaseBranchScope;
