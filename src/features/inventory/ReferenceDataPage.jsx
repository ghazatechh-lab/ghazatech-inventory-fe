import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit3, Plus, Search, Tag, Trash2 } from "lucide-react";
import { toast } from "sonner";

import api, { unwrap } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const normalizeList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.results)) return value.data.results;
  return [];
};

const emptyForm = {
  name: "",
  is_active: true,
};

export default function ReferenceDataPage({
  title,
  subtitle,
  singular,
  endpoint,
  queryKey,
  testIdPrefix,
}) {
  const queryClient = useQueryClient();

  const [search, setSearch] = React.useState("");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState(null);
  const [deleteItem, setDeleteItem] = React.useState(null);
  const [form, setForm] = React.useState(emptyForm);
  const [fieldError, setFieldError] = React.useState("");

  const {
    data: response,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: [queryKey],
    queryFn: async () => {
      const apiResponse = await api.get(endpoint, {
        params: { page_size: 500 },
      });
      return unwrap(apiResponse);
    },
    staleTime: 0,
    refetchOnMount: "always",
  });

  const items = React.useMemo(() => normalizeList(response), [response]);

  const visibleItems = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;

    return items.filter((item) =>
      String(item.name || "")
        .toLowerCase()
        .includes(query),
    );
  }, [items, search]);

  const openCreateModal = () => {
    setEditingItem(null);
    setForm(emptyForm);
    setFieldError("");
    setFormOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setForm({
      name: item.name || "",
      is_active: typeof item.is_active === "boolean" ? item.is_active : true,
    });
    setFieldError("");
    setFormOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingItem?.id) {
        return api.patch(`${endpoint}${editingItem.id}/`, payload);
      }
      return api.post(endpoint, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [queryKey],
      });

      toast.success(
        `${singular} ${editingItem ? "updated" : "created"} successfully.`,
      );

      setFormOpen(false);
      setEditingItem(null);
      setForm(emptyForm);
    },
    onError: (error) => {
      const responseData =
        error?.response?.data?.data || error?.response?.data || {};

      const nameError = responseData?.name?.[0] || responseData?.name;

      if (nameError) {
        setFieldError(String(nameError));
      }

      if (!error?.__apiErrorShown) {
        toast.error(
          `Unable to ${
            editingItem ? "update" : "create"
          } ${singular.toLowerCase()}.`,
        );
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => api.delete(`${endpoint}${id}/`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [queryKey],
      });

      toast.success(`${singular} deleted successfully.`);

      setDeleteItem(null);
    },
    onError: (error) => {
      if (!error?.__apiErrorShown) {
        toast.error(`Unable to delete ${singular.toLowerCase()}.`);
      }
    },
  });

  const submitForm = (event) => {
    event.preventDefault();

    const name = form.name.trim();

    if (!name) {
      setFieldError(`${singular} name is required.`);
      return;
    }

    setFieldError("");

    saveMutation.mutate({
      name,
      is_active: Boolean(form.is_active),
    });
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-10">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950/50 shadow-xl shadow-black/20">
        <div className="flex flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
              <Tag className="h-5 w-5" />
            </div>

            <h1 className="text-2xl font-semibold tracking-tight text-white">
              {title}
            </h1>

            <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
          </div>

          <Button
            type="button"
            onClick={openCreateModal}
            className="h-10 bg-blue-600 px-4 shadow-lg shadow-blue-950/30 hover:bg-blue-700"
            data-testid={`${testIdPrefix}-add-btn`}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add {singular}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-lg shadow-black/10">
        <Label htmlFor={`${testIdPrefix}-search`}>Search</Label>

        <div className="relative mt-2 max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

          <Input
            id={`${testIdPrefix}-search`}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`Search ${title.toLowerCase()}`}
            className="h-11 border-white/10 bg-slate-900/80 pl-9"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70 shadow-xl shadow-black/10">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-white/10 bg-white/[0.025]">
              <tr>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Name
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
                    colSpan={3}
                    className="px-5 py-14 text-center text-sm text-slate-400"
                  >
                    Loading {title.toLowerCase()}...
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={3} className="px-5 py-14 text-center">
                    <p className="text-sm text-red-400">
                      Unable to load {title.toLowerCase()}.
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
              ) : visibleItems.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-5 py-14 text-center">
                    <p className="font-medium text-white">
                      No {title.toLowerCase()} found
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Create your first {singular.toLowerCase()} to get started.
                    </p>
                  </td>
                </tr>
              ) : (
                visibleItems.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-white/5 transition last:border-0 hover:bg-white/[0.025]"
                  >
                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-100">
                        {item.name}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={
                          item.is_active
                            ? "inline-flex rounded-full border border-emerald-500/15 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400"
                            : "inline-flex rounded-full border border-slate-500/15 bg-slate-500/10 px-2.5 py-1 text-xs font-medium text-slate-400"
                        }
                      >
                        {item.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => openEditModal(item)}
                          className="border-white/10 bg-white/[0.025]"
                        >
                          <Edit3 className="mr-2 h-4 w-4" />
                          Edit
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setDeleteItem(item)}
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
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setEditingItem(null);
            setFieldError("");
          }
        }}
      >
        <DialogContent className="overflow-hidden border-white/10 bg-slate-950 p-0 sm:max-w-lg">
          <DialogHeader className="border-b border-white/10 bg-gradient-to-r from-slate-950 to-blue-950/40 px-6 py-5">
            <DialogTitle className="text-xl text-white">
              {editingItem ? `Edit ${singular}` : `Add ${singular}`}
            </DialogTitle>

            <DialogDescription className="text-slate-400">
              Enter the {singular.toLowerCase()} name and choose its status.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submitForm}>
            <div className="space-y-5 px-6 py-6">
              <div>
                <Label htmlFor={`${testIdPrefix}-name`}>
                  {singular} name
                  <span className="ml-1 text-red-400">*</span>
                </Label>

                <Input
                  id={`${testIdPrefix}-name`}
                  autoFocus
                  value={form.name}
                  onChange={(event) => {
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }));
                    if (fieldError) setFieldError("");
                  }}
                  placeholder={`Enter ${singular.toLowerCase()} name`}
                  className="mt-2 h-11 border-white/10 bg-slate-900/80"
                />

                {fieldError && (
                  <p className="mt-1.5 text-sm text-red-400">{fieldError}</p>
                )}
              </div>

              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-200">Active</p>

                  <p className="text-xs text-slate-500">
                    Allow this item to be selected in product forms.
                  </p>
                </div>

                <Switch
                  checked={form.is_active}
                  onCheckedChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      is_active: value,
                    }))
                  }
                />
              </div>
            </div>

            <DialogFooter className="border-t border-white/10 bg-white/[0.02] px-6 py-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setFormOpen(false)}
                disabled={saveMutation.isPending}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="min-w-28 bg-blue-600 hover:bg-blue-700"
              >
                {saveMutation.isPending
                  ? "Saving..."
                  : editingItem
                    ? "Save changes"
                    : `Create ${singular.toLowerCase()}`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteItem)}
        onOpenChange={(open) => {
          if (!open) setDeleteItem(null);
        }}
      >
        <DialogContent className="overflow-hidden border-white/10 bg-slate-950 p-0 sm:max-w-md">
          <DialogHeader className="border-b border-white/10 bg-red-500/[0.04] px-6 py-5">
            <DialogTitle className="text-white">Delete {singular}</DialogTitle>

            <DialogDescription className="text-slate-400">
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-6">
            <p className="text-sm text-slate-300">
              Are you sure you want to delete{" "}
              <strong className="text-white">{deleteItem?.name}</strong>?
            </p>
          </div>

          <DialogFooter className="border-t border-white/10 bg-white/[0.02] px-6 py-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteItem(null)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(deleteItem.id)}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
