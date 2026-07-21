import React from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Edit3, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import api from "@/lib/api";
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

export default function RackListPage() {
  const queryClient = useQueryClient();

  const { query, page, setPage, q, setQ } = useListQuery("racks", "/racks/");

  const data = query.data || {
    results: [],
    count: 0,
  };

  const [deleteRack, setDeleteRack] = React.useState(null);

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

  const columns = [
    {
      key: "rack_code",
      header: "Rack code",
      sortKey: "rack_code",
      cell: (row) => (
        <span className="font-medium text-white">{row.rack_code}</span>
      ),
    },
    {
      key: "rack_name",
      header: "Rack name",
      sortKey: "rack_name",
      cell: (row) => row.rack_name || "—",
    },
    {
      key: "branch_code",
      header: "Branch",
      sortKey: "branch__branch_code",
      cell: (row) => row.branch_code || row.branch_name || "—",
    },
    {
      key: "is_active",
      header: "Status",
      sortKey: "is_active",
      cell: (row) => (
        <span className={row.is_active ? "text-emerald-400" : "text-slate-500"}>
          {row.is_active ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "created_at",
      header: "Created",
      sortKey: "created_at",
      cell: (row) =>
        row.created_at ? new Date(row.created_at).toLocaleString() : "—",
    },
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
            size="sm"
            variant="outline"
            className="border-red-500/20 text-red-400"
            onClick={() => setDeleteRack(row)}
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Racks"
        subtitle="Manage branch-wise storage locations"
        actions={
          <Button asChild className="bg-blue-600">
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
        data={data.results || []}
        isLoading={query.isLoading}
        page={page}
        pageSize={12}
        total={data.count || 0}
        onPageChange={setPage}
        emptyTitle="No racks found"
        emptyDescription="Create your first rack."
      />

      <Dialog
        open={Boolean(deleteRack)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteRack(null);
          }
        }}
      >
        <DialogContent className="border-white/10 bg-slate-950">
          <DialogHeader>
            <DialogTitle>Delete rack</DialogTitle>

            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>

          <p>
            Delete <strong>{deleteRack?.rack_code}</strong>?
          </p>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteRack(null)}>
              Cancel
            </Button>

            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(deleteRack.id)}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
