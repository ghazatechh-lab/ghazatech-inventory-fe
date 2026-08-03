import React from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  CheckCircle2,
  Edit3,
  Layers3,
  MapPin,
  Plus,
  Search,
  Trash2,
  Warehouse,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { useListQuery, DataTable, SearchInput } from "@/hooks/useListQuery";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const getUserBranchId = (user) =>
  user?.branch?.id ?? user?.branch_id ?? user?.branch_detail?.id ?? null;

const formatDate = (value) => {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-AE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

function SummaryCard({ label, value, helper, icon: Icon, tone = "blue" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20",
    emerald:
      "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20",
    slate:
      "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-500/20",
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-slate-950/70 dark:shadow-black/10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
            {value}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {helper}
          </p>
        </div>
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ring-1 ${tones[tone]}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default function RackListPage() {
  const queryClient = useQueryClient();
  const { user, branchOverride } = useAuth();
  const canManage = isAdmin(user);
  const selectedBranchId = canManage ? branchOverride : getUserBranchId(user);

  const listParams = React.useMemo(
    () => ({ branch: selectedBranchId || undefined }),
    [selectedBranchId],
  );

  const { query, page, setPage, q, setQ } = useListQuery(
    "racks",
    "/racks/",
    listParams,
  );

  const payload = query.data || { results: [], count: 0 };
  const rows = React.useMemo(() => payload.results || [], [payload.results]);
  const [deleteRack, setDeleteRack] = React.useState(null);

  React.useEffect(() => {
    setPage(1);
  }, [selectedBranchId, setPage]);

  const activeOnPage = rows.filter((row) => row.is_active).length;
  const inactiveOnPage = rows.filter((row) => !row.is_active).length;

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/racks/${id}/`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["racks"] });
      toast.success("Rack deleted successfully.");
      setDeleteRack(null);
    },
    onError: (error) => {
      if (!error?.__apiErrorShown) toast.error("Unable to delete rack.");
    },
  });

  const columns = React.useMemo(
    () => [
      {
        key: "rack_code",
        header: "Rack",
        sortKey: "rack_code",
        sortType: "text",
        cell: (row) => (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20">
              <Layers3 className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-bold text-slate-950 dark:text-white">
                {row.rack_code || "—"}
              </p>
              <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                {row.rack_name || "Unnamed rack"}
              </p>
            </div>
          </div>
        ),
      },
      {
        key: "branch_code",
        header: "Branch location",
        sortKey: "branch__branch_code",
        sortType: "text",
        cell: (row) => {
          const branchCode = row.branch_code || row.branch?.branch_code;
          const branchName =
            row.branch_name || row.branch?.branch_name || row.branch?.name;

          return (
            <div className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {branchName || branchCode || "—"}
                </p>
                {branchCode && branchName && (
                  <p className="mt-0.5 text-xs font-medium text-slate-500">
                    {branchCode}
                  </p>
                )}
              </div>
            </div>
          );
        },
      },
      {
        key: "is_active",
        header: "Status",
        sortKey: "is_active",
        sortType: "active",
        cell: (row) => (
          <span
            className={
              row.is_active
                ? "inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20"
                : "inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-inset ring-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-500/20"
            }
          >
            {row.is_active ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <XCircle className="h-3.5 w-3.5" />
            )}
            {row.is_active ? "Active" : "Inactive"}
          </span>
        ),
      },
      {
        key: "created_at",
        header: "Created",
        sortKey: "created_at",
        sortType: "datetime",
        cell: (row) => (
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {formatDate(row.created_at)}
          </span>
        ),
      },
      ...(canManage
        ? [
            {
              key: "actions",
              header: "Actions",
              sortable: false,
              align: "right",
              cell: (row) => (
                <div className="flex justify-end gap-2">
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="h-9 rounded-lg border-slate-200 bg-white font-semibold shadow-sm hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-blue-500/10 dark:hover:text-blue-300"
                  >
                    <Link to={`/inventory/racks/${row.id}/edit`}>
                      <Edit3 className="mr-1.5 h-3.5 w-3.5" />
                      Edit
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-9 rounded-lg border-red-200 bg-white font-semibold text-red-600 shadow-sm hover:bg-red-50 hover:text-red-700 dark:border-red-500/20 dark:bg-white/[0.03] dark:text-red-400 dark:hover:bg-red-500/10"
                    onClick={() => setDeleteRack(row)}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              ),
            },
          ]
        : []),
    ],
    [canManage],
  );

  const branchSubtitle = selectedBranchId
    ? "Manage storage racks for the currently selected branch."
    : "View and manage storage racks across all branches.";

  return (
    <div className="space-y-6 pb-10">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white px-6 py-7 shadow-sm dark:border-white/10 dark:bg-slate-950/80 sm:px-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-28 h-32 w-32 rounded-full bg-amber-400/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-600/20">
              <Warehouse className="h-6 w-6" />
            </div>
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-blue-700 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20">
                  Inventory setup
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  Storage management
                </span>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                Rack Management
              </h1>
              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                {branchSubtitle}
              </p>
            </div>
          </div>

          {canManage && (
            <Button
              asChild
              className="h-11 rounded-xl bg-blue-600 px-5 font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
            >
              <Link to="/inventory/racks/new">
                <Plus className="mr-2 h-4 w-4" />
                Add new rack
              </Link>
            </Button>
          )}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard
          label="Total racks"
          value={payload.count || 0}
          helper={
            selectedBranchId ? "In selected branch" : "Across all branches"
          }
          icon={Building2}
          tone="blue"
        />
        <SummaryCard
          label="Active on page"
          value={activeOnPage}
          helper="Available for product assignment"
          icon={CheckCircle2}
          tone="emerald"
        />
        <SummaryCard
          label="Inactive on page"
          value={inactiveOnPage}
          helper="Currently unavailable"
          icon={XCircle}
          tone="slate"
        />
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950/70">
        <div className="flex flex-col gap-4 border-b border-slate-200/80 px-5 py-5 dark:border-white/10 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-950 dark:text-white">
              Rack directory
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Search, review and maintain branch storage locations.
            </p>
          </div>
          <div className="w-full lg:max-w-md">
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder="Search rack code, name or branch"
            />
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <DataTable
            columns={columns}
            data={rows}
            isLoading={query.isLoading}
            page={page}
            pageSize={12}
            total={payload.count || 0}
            onPageChange={setPage}
            emptyTitle="No racks found"
            emptyDescription={
              selectedBranchId
                ? "No racks are available for the selected branch."
                : "Create your first storage rack to organize inventory."
            }
          />
        </div>
      </section>

      <Dialog
        open={Boolean(deleteRack)}
        onOpenChange={(open) => !open && setDeleteRack(null)}
      >
        <DialogContent className="overflow-hidden rounded-2xl border-slate-200 bg-white p-0 dark:border-white/10 dark:bg-slate-950">
          <div className="border-b border-red-100 bg-red-50/80 px-6 py-5 dark:border-red-500/10 dark:bg-red-500/[0.08]">
            <DialogHeader>
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300">
                <Trash2 className="h-5 w-5" />
              </div>
              <DialogTitle className="text-xl">Delete rack</DialogTitle>
              <DialogDescription>
                This action is permanent and cannot be undone.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-4 px-6 py-5">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="text-sm text-slate-700 dark:text-slate-200">
                You are about to delete
                <strong className="mx-1 text-slate-950 dark:text-white">
                  {deleteRack?.rack_code}
                </strong>
                {deleteRack?.rack_name ? `(${deleteRack.rack_name})` : ""}.
              </p>
              {(deleteRack?.branch_code || deleteRack?.branch_name) && (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <MapPin className="h-3.5 w-3.5" />
                  {deleteRack.branch_name || deleteRack.branch_code}
                </p>
              )}
            </div>
            <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
              Products assigned to this rack may need to be moved to another
              storage location before deletion.
            </p>
          </div>

          <DialogFooter className="border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-white/10 dark:bg-white/[0.02]">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteRack(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() =>
                deleteRack?.id && deleteMutation.mutate(deleteRack.id)
              }
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete rack"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
