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
const codeOf = (branch) => String(branch?.branch_code || "").trim().toUpperCase();
const isPhysical = (branch) => branch?.is_active !== false &&
  ["VAT", "NON_VAT"].includes(String(branch?.tax_mode || "").toUpperCase());
const isMaster = (branch) => Boolean(branch) &&
  (codeOf(branch) === "CONSOLIDATED" ||
    (String(branch.branch_type || "").toUpperCase() === "MASTER" && !isPhysical(branch)));

export function usePurchaseBranchScope() {
  const active = useActiveBranchFilter();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data, isLoading: branchesLoading } = useQuery({
    queryKey: ["purchase-physical-branches"],
    queryFn: async () => unwrap(await api.get("/branches/selector-options/")),
    staleTime: 60_000,
  });
  const branches = React.useMemo(() => normalizeList(data), [data]);
  const physicalBranches = React.useMemo(() => branches.filter(isPhysical), [branches]);
  const activeBranch = React.useMemo(() => branches.find(
    (branch) => String(branch.id) === String(active.branchId ?? "")
  ) || null, [active.branchId, branches]);
  const isCombinedBranch = isMaster(activeBranch);
  const isPhysicalBranch = isPhysical(activeBranch);
  const formBranchId = isPhysicalBranch ? String(activeBranch.id) : "";
  const requestedSource = String(searchParams.get("source_branch") || "ALL").toUpperCase();
  const sourceBranch = requestedSource === "ALL" || physicalBranches.some(
    (branch) => codeOf(branch) === requestedSource
  ) ? requestedSource : "ALL";
  const listBranchParams = React.useMemo(() => ({
    ...(active.branchParams || {}),
    ...(isCombinedBranch && sourceBranch !== "ALL" ? { source_branch: sourceBranch } : {}),
  }), [active.branchParams, isCombinedBranch, sourceBranch]);
  const setSourceBranch = React.useCallback((value) => {
    const next = new URLSearchParams(searchParams);
    const code = String(value || "ALL").toUpperCase();
    if (code === "ALL") next.delete("source_branch");
    else next.set("source_branch", code);
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);
  return {
    ...active, branches, physicalBranches, activeBranch,
    activeBranchCode: codeOf(activeBranch), isCombinedBranch, isPhysicalBranch,
    formBranchId, sourceBranch, setSourceBranch, listBranchParams, branchesLoading,
  };
}
export default usePurchaseBranchScope;
