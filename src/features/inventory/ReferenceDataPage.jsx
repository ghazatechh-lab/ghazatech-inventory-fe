import React, { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Tags, Trash2 } from "lucide-react";

import api from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useListQuery, DataTable, SearchInput } from "@/hooks/useListQuery";

const emptyForm = { name: "", description: "", is_active: true };

function getApiError(error, fallback) {
  const body = error?.response?.data;
  const details = body?.data || body;
  if (details?.name?.[0]) return details.name[0];
  if (body?.message) return body.message;
  return fallback;
}

export default function ReferenceDataPage({ type }) {
  const config = useMemo(() => {
    if (type === "brand") {
      return {
        singular: "Brand",
        plural: "Brands",
        endpoint: "/brands/",
        queryKey: "brands",
        subtitle: "Manage product manufacturers and brand availability",
      };
    }
    return {
      singular: "Category",
      plural: "Categories",
      endpoint: "/categories/",
      queryKey: "categories",
      subtitle: "Organize products into reusable inventory categories",
    };
  }, [type]);

  const queryClient = useQueryClient();
  const { query, q, setQ, page, setPage } = useListQuery(
    config.queryKey,
    config.endpoint
  );
  const data = query.data || { results: [], count: 0 };
  const rows = Array.isArray(data) ? data : data.results || [];
  const total = Array.isArray(data) ? data.length : data.count || 0;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (editing) {
        return api.patch(`${config.endpoint}${editing.id}/`, payload);
      }
      return api.post(config.endpoint, payload);
    },
    onSuccess: () => {
      toast.success(`${config.singular} ${editing ? "updated" : "created"} successfully`);
      queryClient.invalidateQueries({ queryKey: [config.queryKey] });
      closeDialog();
    },
    onError: (error) => {
      toast.error(getApiError(error, `Unable to save ${config.singular.toLowerCase()}`));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (item) => api.delete(`${config.endpoint}${item.id}/`),
    onSuccess: () => {
      toast.success(`${config.singular} deleted successfully`);
      queryClient.invalidateQueries({ queryKey: [config.queryKey] });
      setDeleteTarget(null);
    },
    onError: (error) => {
      toast.error(
        getApiError(
          error,
          `Unable to delete this ${config.singular.toLowerCase()}. It may be used by existing products.`
        )
      );
      setDeleteTarget(null);
    },
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(item) {
    setEditing(item);
    setForm({
      name: item.name || "",
      description: item.description || "",
      is_active: item.is_active !== false,
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditing(null);
    setForm(emptyForm);
  }

  function submit(event) {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) {
      toast.error(`${config.singular} name is required`);
      return;
    }
    saveMutation.mutate({
      name,
      description: form.description.trim(),
      is_active: form.is_active,
    });
  }

  return (
    <div>
      <PageHeader
        title={config.plural}
        subtitle={config.subtitle}
        actions={
          <Button
            onClick={openCreate}
            className="bg-blue-600 hover:bg-blue-700"
            data-testid={`new-${type}-btn`}
          >
            <Plus className="w-4 h-4 mr-1.5" /> New {config.singular.toLowerCase()}
          </Button>
        }
      />

      <div className="mb-4">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder={`Search ${config.plural.toLowerCase()}…`}
        />
      </div>

      <DataTable
        columns={[
          {
            key: "name",
            header: "Name",
            cell: (row) => (
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <Tags className="w-4 h-4 text-blue-400" />
                </div>
                <span className="font-medium text-slate-100">{row.name}</span>
              </div>
            ),
          },
          {
            key: "description",
            header: "Description",
            cell: (row) => (
              <span className="text-slate-400 line-clamp-2">
                {row.description || "—"}
              </span>
            ),
          },
          {
            key: "is_active",
            header: "Status",
            cell: (row) => (
              <StatusBadge
                status={row.is_active ? "active" : "inactive"}
                label={row.is_active ? "Active" : "Inactive"}
              />
            ),
          },
          {
            key: "actions",
            header: "Actions",
            align: "right",
            cell: (row) => (
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEdit(row)}
                  aria-label={`Edit ${row.name}`}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteTarget(row)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  aria-label={`Delete ${row.name}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ),
          },
        ]}
        data={rows}
        isLoading={query.isLoading}
        page={page}
        total={total}
        onPageChange={setPage}
        emptyTitle={`No ${config.plural.toLowerCase()}`}
        emptyDescription={`Create the first ${config.singular.toLowerCase()} to use it in product management.`}
        testId={`${type}-table`}
      />

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="border-white/10 bg-slate-950 text-white">
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>
                {editing ? `Edit ${config.singular.toLowerCase()}` : `New ${config.singular.toLowerCase()}`}
              </DialogTitle>
              <DialogDescription>
                {editing
                  ? `Update this ${config.singular.toLowerCase()}'s details.`
                  : `Add a ${config.singular.toLowerCase()} that can be selected while creating products.`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-5">
              <div>
                <Label htmlFor={`${type}-name`}>Name</Label>
                <Input
                  id={`${type}-name`}
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder={`${config.singular} name`}
                  maxLength={type === "brand" ? 100 : 120}
                  autoFocus
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor={`${type}-description`}>Description</Label>
                <Textarea
                  id={`${type}-description`}
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder={`Optional ${config.singular.toLowerCase()} description`}
                  rows={4}
                  className="mt-1.5"
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-3">
                <div>
                  <Label htmlFor={`${type}-active`}>Active</Label>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Inactive records remain saved but should not be selected for new products.
                  </p>
                </div>
                <Switch
                  id={`${type}-active`}
                  checked={form.is_active}
                  onCheckedChange={(checked) => setForm((current) => ({ ...current, is_active: checked }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
                {saveMutation.isPending ? "Saving…" : editing ? "Save changes" : `Create ${config.singular.toLowerCase()}`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete ${config.singular.toLowerCase()}?`}
        description={
          deleteTarget
            ? `Delete “${deleteTarget.name}”? This will fail if existing products are using it.`
            : ""
        }
        confirmLabel={deleteMutation.isPending ? "Deleting…" : "Delete"}
        destructive
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
      />
    </div>
  );
}
