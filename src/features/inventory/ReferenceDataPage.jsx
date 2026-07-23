import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Edit3, Plus, Tag, Trash2 } from "lucide-react";
import { toast } from "sonner";

import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { useListQuery, DataTable, SearchInput } from "@/hooks/useListQuery";
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
  const { user } = useAuth();
  const canManage = isAdmin(user);

  const { query, page, setPage, q, setQ } = useListQuery(queryKey, endpoint);

  const data = query.data || {
    results: [],
    count: 0,
  };

  const [formOpen, setFormOpen] = React.useState(false);

  const [editingItem, setEditingItem] = React.useState(null);

  const [deleteItem, setDeleteItem] = React.useState(null);

  const [form, setForm] = React.useState(emptyForm);

  const [fieldError, setFieldError] = React.useState("");

  const openCreate = () => {
    setEditingItem(null);
    setForm(emptyForm);
    setFieldError("");
    setFormOpen(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);

    setForm({
      name: item.name || "",
      is_active: item.is_active !== false,
    });

    setFieldError("");
    setFormOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      editingItem?.id
        ? api.patch(`${endpoint}${editingItem.id}/`, payload)
        : api.post(endpoint, payload),

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
      const body = error?.response?.data?.data || error?.response?.data || {};

      const message = body?.name?.[0] || body?.name;

      if (message) {
        setFieldError(String(message));
      }

      if (!error?.__apiErrorShown) {
        toast.error(`Unable to save ${singular.toLowerCase()}.`);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`${endpoint}${id}/`),

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

  const submit = (event) => {
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

  const columns = React.useMemo(
    () => [
      {
        key: "name",
        header: "Name",
        sortKey: "name",
        cell: (row) => (
          <span className="font-medium text-white">{row.name}</span>
        ),
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
                ? "inline-flex rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400"
                : "inline-flex rounded-full bg-slate-500/10 px-2.5 py-1 text-xs font-medium text-slate-400"
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
      {
        key: "actions",
        header: "Actions",
        sortable: false,
        align: "right",
        cell: (row) =>
          canManage ? (
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => openEdit(row)}>
                <Edit3 className="mr-1.5 h-4 w-4" />
                Edit
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="border-red-500/20 text-red-400"
                onClick={() => setDeleteItem(row)}
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                Delete
              </Button>
            </div>
          ) : (
            <span className="text-xs text-slate-500">Admin only</span>
          ),
      },
    ],
    [canManage],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-950/70 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Tag className="mb-2 h-5 w-5 text-blue-400" />

          <h1 className="text-2xl font-semibold text-white">{title}</h1>

          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        </div>

        <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" />
          Add {singular}
        </Button>
      </div>

      <SearchInput
        value={q}
        onChange={setQ}
        placeholder={`Search ${title.toLowerCase()}`}
      />

      <DataTable
        columns={columns}
        data={data.results || []}
        isLoading={query.isLoading}
        page={page}
        total={data.count || 0}
        pageSize={12}
        onPageChange={setPage}
        emptyTitle={`No ${title.toLowerCase()} found`}
        emptyDescription={`Create your first ${singular.toLowerCase()}.`}
        testId={`${testIdPrefix}-table`}
      />

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="border-white/10 bg-slate-950 p-0 sm:max-w-lg">
          <DialogHeader className="border-b border-white/10 px-6 py-5">
            <DialogTitle>
              {editingItem ? `Edit ${singular}` : `Add ${singular}`}
            </DialogTitle>

            <DialogDescription>Enter the name and status.</DialogDescription>
          </DialogHeader>

          <form onSubmit={submit}>
            <div className="space-y-5 px-6 py-6">
              <div>
                <Label>
                  {singular} name
                  <span className="ml-1 text-red-400">*</span>
                </Label>

                <Input
                  autoFocus
                  className="mt-2"
                  value={form.name}
                  onChange={(event) => {
                    setForm({
                      ...form,
                      name: event.target.value,
                    });

                    setFieldError("");
                  }}
                />

                {fieldError && (
                  <p className="mt-1 text-sm text-red-400">{fieldError}</p>
                )}
              </div>

              <div className="flex items-center justify-between rounded-xl border border-white/10 p-4">
                <div>
                  <p className="text-sm font-medium">Active</p>

                  <p className="text-xs text-slate-500">
                    Available in product forms
                  </p>
                </div>

                <Switch
                  checked={form.is_active}
                  onCheckedChange={(value) =>
                    setForm({
                      ...form,
                      is_active: value,
                    })
                  }
                />
              </div>
            </div>

            <DialogFooter className="border-t border-white/10 px-6 py-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setFormOpen(false)}
              >
                Cancel
              </Button>

              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteItem)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteItem(null);
          }
        }}
      >
        <DialogContent className="border-white/10 bg-slate-950">
          <DialogHeader>
            <DialogTitle>Delete {singular}</DialogTitle>

            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>

          <p>
            Delete <strong>{deleteItem?.name}</strong>?
          </p>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteItem(null)}>
              Cancel
            </Button>

            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate(deleteItem.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
