import React from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit3, Plus, Rows3, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import api, { unwrap } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ALL_BRANCHES = "__all__";

const normalizeList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.results)) return value.data.results;
  return [];
};

const branchName = (rack) =>
  rack.branch_name ||
  rack.branch?.branch_name ||
  rack.branch_detail?.branch_name ||
  "—";

export default function RackListPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = React.useState("");
  const [branchFilter, setBranchFilter] = React.useState(ALL_BRANCHES);
  const [deleteRack, setDeleteRack] = React.useState(null);

  const {
    data: rackResponse,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["racks", branchFilter],
    queryFn: async () => {
      const params = { page_size: 500 };

      if (branchFilter !== ALL_BRANCHES) {
        params.branch = branchFilter;
      }

      return unwrap(await api.get("/racks/", { params }));
    },
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: branchResponse } = useQuery({
    queryKey: ["rack-branch-options"],
    queryFn: async () =>
      unwrap(
        await api.get("/branches/", {
          params: { page_size: 500 },
        }),
      ),
  });

  const racks = React.useMemo(
    () => normalizeList(rackResponse),
    [rackResponse],
  );

  const branches = React.useMemo(
    () => normalizeList(branchResponse),
    [branchResponse],
  );

  const visibleRacks = React.useMemo(() => {
    const query = search.trim().toLowerCase();

    return racks.filter((rack) => {
      if (!query) return true;

      return [rack.rack_code, rack.rack_name, branchName(rack)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [racks, search]);

  const deleteMutation = useMutation({
    mutationFn: async (id) => api.delete(`/racks/${id}/`),
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

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-10">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950/50 shadow-xl shadow-black/20">
        <div className="flex flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
              <Rows3 className="h-5 w-5" />
            </div>

            <h1 className="text-2xl font-semibold tracking-tight text-white">
              Racks
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Manage branch-wise product storage locations.
            </p>
          </div>

          <Button
            asChild
            className="h-10 bg-blue-600 shadow-lg shadow-blue-950/30 hover:bg-blue-700"
          >
            <Link to="/inventory/racks/new">
              <Plus className="mr-2 h-4 w-4" />
              Add rack
            </Link>
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-lg shadow-black/10">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
          <div>
            <Label htmlFor="rack-search">Search</Label>

            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

              <Input
                id="rack-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by rack code, name or branch"
                className="h-11 border-white/10 bg-slate-900/80 pl-9"
              />
            </div>
          </div>

          <div>
            <Label>Branch</Label>

            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="mt-2 h-11 border-white/10 bg-slate-900/80">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value={ALL_BRANCHES}>All branches</SelectItem>

                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={String(branch.id)}>
                    {branch.branch_code || branch.branch_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70 shadow-xl shadow-black/10">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-white/10 bg-white/[0.025]">
              <tr>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Rack code
                </th>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Rack name
                </th>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Branch
                </th>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>
                <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-14 text-center text-sm text-slate-400"
                  >
                    Loading racks...
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={5} className="px-5 py-14 text-center">
                    <p className="text-sm text-red-400">
                      Unable to load racks.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-4"
                      onClick={() => refetch()}
                    >
                      Try again
                    </Button>
                  </td>
                </tr>
              ) : visibleRacks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-14 text-center">
                    <p className="font-medium text-white">No racks found</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Add a rack to organize branch stock.
                    </p>
                  </td>
                </tr>
              ) : (
                visibleRacks.map((rack) => (
                  <tr
                    key={rack.id}
                    className="border-b border-white/5 transition last:border-0 hover:bg-white/[0.025]"
                  >
                    <td className="px-5 py-4 font-medium text-white">
                      {rack.rack_code}
                    </td>

                    <td className="px-5 py-4 text-slate-300">
                      {rack.rack_name || "—"}
                    </td>

                    <td className="px-5 py-4 text-slate-300">
                      {branchName(rack)}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={
                          rack.is_active
                            ? "inline-flex rounded-full border border-emerald-500/15 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400"
                            : "inline-flex rounded-full border border-slate-500/15 bg-slate-500/10 px-2.5 py-1 text-xs font-medium text-slate-400"
                        }
                      >
                        {rack.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="border-white/10 bg-white/[0.025]"
                        >
                          <Link to={`/inventory/racks/${rack.id}/edit`}>
                            <Edit3 className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setDeleteRack(rack)}
                          className="border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog
        open={Boolean(deleteRack)}
        onOpenChange={(open) => {
          if (!open) setDeleteRack(null);
        }}
      >
        <DialogContent className="overflow-hidden border-white/10 bg-slate-950 p-0 sm:max-w-md">
          <DialogHeader className="border-b border-white/10 bg-red-500/[0.04] px-6 py-5">
            <DialogTitle className="text-white">Delete rack</DialogTitle>
            <DialogDescription className="text-slate-400">
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-6">
            <p className="text-sm text-slate-300">
              Delete rack{" "}
              <strong className="text-white">{deleteRack?.rack_code}</strong>?
            </p>
          </div>

          <DialogFooter className="border-t border-white/10 bg-white/[0.02] px-6 py-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteRack(null)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(deleteRack.id)}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete rack"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
