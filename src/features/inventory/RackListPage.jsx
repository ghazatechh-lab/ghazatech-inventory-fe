import React from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Edit3, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { useListQuery, DataTable, SearchInput } from "@/hooks/useListQuery";
import { PageHeader } from "@/components/common/PageHeader";
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

export default function RackListPage() {
  const queryClient = useQueryClient();

  const { user, branchOverride } = useAuth();

  const canManage = isAdmin(user);

  /*
   * Admin:
   * - branchOverride has a value when a branch is selected.
   * - branchOverride is null for All branches.
   *
   * Branch Manager / Staff:
   * - always use their assigned branch.
   */
  const selectedBranchId = canManage ? branchOverride : getUserBranchId(user);

  const listParams = React.useMemo(
    () => ({
      branch: selectedBranchId || undefined,
    }),
    [selectedBranchId],
  );

  const { query, page, setPage, q, setQ } = useListQuery(
    "racks",
    "/racks/",
    listParams,
  );

  const payload = query.data || {
    results: [],
    count: 0,
  };

  const rows = React.useMemo(() => payload.results || [], [payload.results]);

  const [deleteRack, setDeleteRack] = React.useState(null);

  /*
   * Return to page 1 whenever the selected
   * header branch changes.
   */
  React.useEffect(() => {
    setPage(1);
  }, [selectedBranchId, setPage]);

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/racks/${id}/`),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["racks"],
      });

      toast.success("Rack deleted successfully.");

      setDeleteRack(null);
    },

    onError: (error) => {
      if (!error?.__apiErrorShown) {
        toast.error("Unable to delete rack.");
      }
    },
  });

  const columns = React.useMemo(
    () => [
      {
        key: "rack_code",
        header: "Rack code",
        sortKey: "rack_code",
        sortType: "text",

        cell: (row) => (
          <span className="font-medium text-slate-950 dark:text-white">
            {row.rack_code || "—"}
          </span>
        ),
      },

      {
        key: "rack_name",
        header: "Rack name",
        sortKey: "rack_name",
        sortType: "text",

        cell: (row) => row.rack_name || "—",
      },

      {
        key: "branch_code",
        header: "Branch",
        sortKey: "branch__branch_code",
        sortType: "text",

        cell: (row) => {
          const branchCode = row.branch_code || row.branch?.branch_code;

          const branchName =
            row.branch_name || row.branch?.branch_name || row.branch?.name;

          if (branchCode && branchName) {
            return (
              <div>
                <div className="font-medium text-slate-900 dark:text-slate-200">
                  {branchCode}
                </div>

                <div className="text-xs text-slate-500">{branchName}</div>
              </div>
            );
          }

          return branchCode || branchName || "—";
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
                ? "inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                : "inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-500/10 dark:text-slate-400"
            }
          >
            {row.is_active ? "Active" : "Inactive"}
          </span>
        ),
      },

      {
        key: "created_at",
        header: "Created",
        sortKey: "created_at",
        sortType: "datetime",

        cell: (row) =>
          row.created_at ? new Date(row.created_at).toLocaleString() : "—",
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
                  <Button asChild size="sm" variant="outline">
                    <Link to={`/inventory/racks/${row.id}/edit`}>
                      <Edit3 className="mr-1.5 h-4 w-4" />
                      Edit
                    </Link>
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-500/20 dark:text-red-400 dark:hover:bg-red-500/10"
                    onClick={() => setDeleteRack(row)}
                  >
                    <Trash2 className="mr-1.5 h-4 w-4" />
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
    ? "Showing racks for the selected branch"
    : "Showing racks from all branches";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Racks"
        subtitle={branchSubtitle}
        actions={
          <Button asChild className="bg-blue-600 text-white hover:bg-blue-700">
            <Link to="/inventory/racks/new">
              <Plus className="mr-2 h-4 w-4" />
              Add rack
            </Link>
          </Button>
        }
      />

      <SearchInput
        value={q}
        onChange={setQ}
        placeholder="Search rack code, name or branch"
      />

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
            : "Create your first rack."
        }
      />

      <Dialog
        open={Boolean(deleteRack)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteRack(null);
          }
        }}
      >
        <DialogContent className="border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950">
          <DialogHeader>
            <DialogTitle>Delete rack</DialogTitle>

            <DialogDescription>
              This action cannot be undone. Products assigned to this rack may
              need to be reassigned.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.025]">
            <p className="text-sm text-slate-700 dark:text-slate-200">
              Delete <strong>{deleteRack?.rack_code}</strong>?
            </p>

            {(deleteRack?.branch_code || deleteRack?.branch_name) && (
              <p className="mt-1 text-xs text-slate-500">
                Branch: {deleteRack.branch_code || deleteRack.branch_name}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteRack(null)}
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (deleteRack?.id) {
                  deleteMutation.mutate(deleteRack.id);
                }
              }}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
