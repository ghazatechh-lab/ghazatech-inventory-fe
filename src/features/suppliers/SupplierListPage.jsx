import React from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Plus,
  Building2,
  Users,
  Trash2,
  Pencil,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api, { getApiErrorDetails } from "@/lib/api";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { SearchInput, useListQuery } from "@/hooks/useListQuery";
import { CurrencyText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";
import { usePurchaseBranchScope } from "@/features/purchases/usePurchaseBranchScope";
import { PageHeader } from "@/features/purchases/PurchasePageHeader";

const PAGE_SIZE = 12;

const numberValue = (...values) => {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const textValue = (...values) => {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value);
    }
  }
  return "";
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numberValue(value));

const normalizeRows = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.results)) return payload.data.results;
  return [];
};

const getOutstanding = (supplier) =>
  numberValue(
    supplier.outstanding_balance,
    supplier.outstanding,
    supplier.balance,
    supplier.total_outstanding,
  );

const getStatus = (supplier) => {
  const rawStatus = textValue(
    supplier.status,
    supplier.supplier_status,
  ).toUpperCase();

  if (
    supplier.is_blocked === true ||
    rawStatus === "BLOCKED" ||
    rawStatus === "INACTIVE" ||
    supplier.is_active === false
  ) {
    return "Blocked";
  }

  return "Active";
};

function MetricCard({
  label,
  value,
  tone = "text-slate-900 dark:text-white",
  icon: Icon,
}) {
  return (
    <div className="supplier-metric-card group">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <div
            className={`mt-2 text-2xl font-extrabold tracking-tight ${tone}`}
          >
            {value}
          </div>
        </div>
        {Icon && (
          <span className="supplier-metric-icon">
            <Icon className="h-5 w-5" />
          </span>
        )}
      </div>
    </div>
  );
}


export default function SupplierListPage() {
  const queryClient = useQueryClient();
  const [supplierToDelete, setSupplierToDelete] = React.useState(null);
  const deleteSupplier = useMutation({
    mutationFn: async (supplier) => {
      const supplierId = supplier.resource_key || supplier.id;
      if (!supplierId) throw new Error("Missing supplier identifier");
      return api.delete(`/suppliers/${encodeURIComponent(supplierId)}/`);
    },
    onSuccess: async () => {
      setSupplierToDelete(null);
      toast.success("Supplier moved to recovery");
      await queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      await queryClient.invalidateQueries({ queryKey: ["suppliers-summary"] });
    },
    onError: (error) => {
      toast.error(getApiErrorDetails(error)?.title || error.message || "Unable to delete supplier");
    },
  });
  const { branchId, physicalBranches, listBranchParams: branchParams } = usePurchaseBranchScope();

  const branchName = (supplier) => {
    const sid = supplier.source_branch_id || (typeof supplier.branch === "object" ? supplier.branch?.id : supplier.branch);
    const code = supplier.source_branch_code || supplier.branch_code;
    const found = physicalBranches.find(b => String(b.id) === String(sid) || b.branch_code === code);
    return found ? `${found.branch_code} — ${found.branch_name || found.name}` :
      (supplier.source_branch_name || supplier.branch_name || code || "—");
  };
  const normalizedBranchId =
    branchId && String(branchId).trim().toLowerCase() !== "all"
      ? String(branchId)
      : "";

  const { query, q, setQ, page, setPage } = useListQuery(
    "suppliers",
    "/suppliers/",
    {
      ...branchParams,
      branch: normalizedBranchId || undefined,
    },
  );

  React.useEffect(() => {
    setPage(1);
  }, [normalizedBranchId, setPage]);

  const payload = React.useMemo(
    () =>
      query.data || {
        results: [],
        count: 0,
      },
    [query.data],
  );

  const rows = React.useMemo(() => normalizeRows(payload), [payload]);

  const summary = React.useMemo(() => {
    const fallback = rows.reduce(
      (totals, supplier) => {
        totals.active += getStatus(supplier) === "Active" ? 1 : 0;
        totals.outstanding += getOutstanding(supplier);
        return totals;
      },
      { active: 0, outstanding: 0 },
    );

    return {
      totalSuppliers: numberValue(
        payload.count,
        payload.total_suppliers,
        rows.length,
      ),
      active: numberValue(
        payload.active_suppliers,
        payload.summary?.active,
        fallback.active,
      ),
      outstanding: numberValue(
        payload.total_outstanding,
        payload.summary?.total_outstanding,
        fallback.outstanding,
      ),
    };
  }, [payload, rows]);

  const totalPages = Math.max(1, Math.ceil(summary.totalSuppliers / PAGE_SIZE));

  return (
    <div className="purchase-module-page purchase-workspace w-full space-y-5 pb-10">
      <PageHeader
        showSourceFilter
        title="Suppliers"
        subtitle={`Find suppliers and manage their records.${
          normalizedBranchId
            ? " Showing suppliers for the selected branch."
            : " Showing suppliers from all branches."
        }`}
        actions={
          <Button asChild>
            <Link to="/suppliers/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Supplier
            </Link>
          </Button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Total Suppliers" value={summary.totalSuppliers} icon={Users} />
        <MetricCard label="Active" value={summary.active} tone="text-emerald-600 dark:text-emerald-400" icon={Building2} />
        <MetricCard label="Outstanding" value={formatCurrency(summary.outstanding)} icon={AlertCircle} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-950/60">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Search supplier name, code, phone or email..."
        />
      </section>

      <section className="supplier-table-card">
        <div className="overflow-x-auto">
          <table className="min-w-[840px] w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:border-white/10 dark:bg-white/[0.025] dark:text-slate-400">
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3 text-right">Outstanding</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {query.isLoading ? (
                <tr><td colSpan={6} className="px-4 py-14 text-center text-slate-500">Loading suppliers...</td></tr>
              ) : rows.length ? (
                rows.map((supplier) => {
                  const key = supplier.resource_key || supplier.id;
                  const status = getStatus(supplier);
                  return (
                    <tr key={key} className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50/80 dark:border-white/5 dark:hover:bg-white/[0.025]">
                      <td className="px-4 py-4 font-semibold text-slate-700 dark:text-slate-200">{branchName(supplier)}</td>
                      <td className="px-4 py-4">
                        <Link to={`/suppliers/${encodeURIComponent(key)}`} className="font-bold text-slate-950 transition hover:text-blue-600 dark:text-white dark:hover:text-blue-300">
                          {textValue(supplier.supplier_name, supplier.legal_name, supplier.name, "Unnamed supplier")}
                        </Link>
                        {supplier.supplier_code && <p className="mt-1 text-xs text-slate-500">{supplier.supplier_code}</p>}
                      </td>
                      <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{textValue(supplier.phone, supplier.mobile, "—")}</td>
                      <td className="px-4 py-4 text-right font-medium"><CurrencyText value={getOutstanding(supplier)} /></td>
                      <td className="px-4 py-4"><StatusBadge status={status} /></td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button asChild size="sm" variant="outline" className="h-8 px-3">
                            <Link to={`/suppliers/${encodeURIComponent(key)}`}>View</Link>
                          </Button>
                          <Button asChild size="sm" variant="outline" className="h-8 gap-1">
                            <Link to={`/suppliers/${encodeURIComponent(key)}/edit`}><Pencil className="h-3.5 w-3.5" /> Edit</Link>
                          </Button>
                          <Button type="button" size="sm" variant="outline"
                            className="h-8 gap-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/60 dark:hover:bg-red-950/30"
                            onClick={() => setSupplierToDelete(supplier)} disabled={deleteSupplier.isPending}
                            aria-label={`Delete ${textValue(supplier.supplier_name, supplier.name, "supplier")}`}>
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan={6} className="px-4 py-14 text-center">
                  <AlertCircle className="mx-auto h-7 w-7 text-slate-400" />
                  <p className="mt-3 font-medium">No suppliers found</p>
                  <p className="mt-1 text-sm text-slate-500">Add a supplier for the selected branch or change the search.</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Showing {rows.length} of {summary.totalSuppliers}
          </p>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => setPage(Math.max(1, page - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-blue-600 px-2 text-xs font-bold text-white shadow-sm shadow-blue-600/20">
              {page}
            </span>

            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-8 w-8"
              disabled={page >= totalPages}
              onClick={() => setPage(Math.min(totalPages, page + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>
      <ConfirmDialog
        open={Boolean(supplierToDelete)}
        onOpenChange={(open) => {
          if (!open && !deleteSupplier.isPending) setSupplierToDelete(null);
        }}
        title="Delete Supplier?"
        description={supplierToDelete
          ? `Move "${textValue(supplierToDelete.supplier_name, supplierToDelete.legal_name, supplierToDelete.name, "this supplier")}" to recovery? This will remove the supplier from active lists. Existing linked purchase and payment records are not deleted.`
          : ""}
        confirmLabel={deleteSupplier.isPending ? "Deleting..." : "Delete Supplier"}
        destructive
        onConfirm={() => {
          if (supplierToDelete && !deleteSupplier.isPending) deleteSupplier.mutate(supplierToDelete);
        }}
      />
    </div>
  );
}
