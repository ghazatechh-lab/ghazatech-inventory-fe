import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Edit3,
  FolderTree,
  Layers3,
  Plus,
  Search,
  Tag,
  Trash2,
  XCircle,
} from "lucide-react";
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

const formatDate = (value) => {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-AE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
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

  const rows = data.results || [];
  const activeCount = rows.filter((item) => item.is_active !== false).length;
  const inactiveCount = rows.filter((item) => item.is_active === false).length;

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
      await queryClient.invalidateQueries({ queryKey: [queryKey] });

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

      if (message) setFieldError(String(message));

      if (!error?.__apiErrorShown) {
        toast.error(`Unable to save ${singular.toLowerCase()}.`);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`${endpoint}${id}/`),

    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [queryKey] });
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
        header: `${singular} name`,
        sortKey: "name",
        cell: (row) => (
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-300">
              <FolderTree className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                {row.name}
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Inventory {singular.toLowerCase()}
              </p>
            </div>
          </div>
        ),
      },
      {
        key: "is_active",
        header: "Status",
        sortKey: "is_active",
        sortType: "active",
        cell: (row) =>
          row.is_active ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              <XCircle className="h-3.5 w-3.5" />
              Inactive
            </span>
          ),
      },
      {
        key: "created_at",
        header: "Created on",
        sortKey: "created_at",
        sortType: "datetime",
        cell: (row) => (
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {formatDate(row.created_at)}
          </span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        sortable: false,
        align: "right",
        cell: (row) =>
          canManage ? (
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => openEdit(row)}
                className="h-9 rounded-lg border-slate-200 bg-white px-3 font-semibold text-slate-700 shadow-sm hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-blue-400/30 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"
              >
                <Edit3 className="mr-1.5 h-3.5 w-3.5" />
                Edit
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setDeleteItem(row)}
                className="h-9 rounded-lg border-red-200 bg-white px-3 font-semibold text-red-600 shadow-sm hover:border-red-300 hover:bg-red-50 dark:border-red-400/20 dark:bg-white/5 dark:text-red-300 dark:hover:bg-red-500/10"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Delete
              </Button>
            </div>
          ) : (
            <span className="text-xs font-medium text-slate-400">
              Admin only
            </span>
          ),
      },
    ],
    [canManage, singular],
  );

  return (
    <div className="space-y-6 pb-8">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-950/70 sm:p-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-1/3 h-36 w-36 rounded-full bg-amber-300/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-500/20">
              <Tag className="h-6 w-6" />
            </div>

            <div>
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.15em] text-blue-700 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-300">
                  Inventory setup
                </span>
              </div>

              <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                {title}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                {subtitle}
              </p>
            </div>
          </div>

          {canManage && (
            <Button
              onClick={openCreate}
              className="h-11 rounded-xl bg-blue-600 px-5 font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
              data-testid={`${testIdPrefix}-add-btn`}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add {singular}
            </Button>
          )}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                Total {title}
              </p>
              <p className="mt-2 text-2xl font-extrabold text-slate-950 dark:text-white">
                {data.count || 0}
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
              <Layers3 className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                Active on page
              </p>
              <p className="mt-2 text-2xl font-extrabold text-slate-950 dark:text-white">
                {activeCount}
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                Inactive on page
              </p>
              <p className="mt-2 text-2xl font-extrabold text-slate-950 dark:text-white">
                {inactiveCount}
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300">
              <Archive className="h-5 w-5" />
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950/60">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              {title} directory
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Search, review and manage inventory {title.toLowerCase()}.
            </p>
          </div>

          <div className="w-full sm:max-w-sm">
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder={`Search ${title.toLowerCase()}...`}
            />
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <DataTable
            columns={columns}
            data={rows}
            isLoading={query.isLoading}
            page={page}
            total={data.count || 0}
            pageSize={12}
            onPageChange={setPage}
            emptyTitle={`No ${title.toLowerCase()} found`}
            emptyDescription={`Create your first ${singular.toLowerCase()} to organize products.`}
            testId={`${testIdPrefix}-table`}
          />
        </div>
      </section>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="overflow-hidden rounded-2xl border-slate-200 bg-white p-0 shadow-2xl dark:border-white/10 dark:bg-slate-950 sm:max-w-lg">
          <DialogHeader className="border-b border-slate-200 bg-slate-50/80 px-6 py-5 text-left dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
                {editingItem ? (
                  <Edit3 className="h-5 w-5" />
                ) : (
                  <Plus className="h-5 w-5" />
                )}
              </div>
              <div>
                <DialogTitle className="text-lg font-extrabold text-slate-950 dark:text-white">
                  {editingItem ? `Edit ${singular}` : `Add ${singular}`}
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {editingItem
                    ? `Update the ${singular.toLowerCase()} information and availability.`
                    : `Create a new ${singular.toLowerCase()} for inventory organization.`}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={submit}>
            <div className="space-y-5 px-6 py-6">
              <div>
                <Label className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  {singular} name
                  <span className="ml-1 text-red-500">*</span>
                </Label>

                <Input
                  autoFocus
                  className="mt-2 h-11 rounded-xl border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  value={form.name}
                  placeholder={`Enter ${singular.toLowerCase()} name`}
                  onChange={(event) => {
                    setForm({ ...form, name: event.target.value });
                    setFieldError("");
                  }}
                />

                {fieldError && (
                  <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-red-600 dark:text-red-400">
                    <AlertTriangle className="h-4 w-4" />
                    {fieldError}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="pr-4">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    Active status
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    Active {title.toLowerCase()} will be available in product
                    forms.
                  </p>
                </div>

                <Switch
                  checked={form.is_active}
                  onCheckedChange={(value) =>
                    setForm({ ...form, is_active: value })
                  }
                />
              </div>
            </div>

            <DialogFooter className="border-t border-slate-200 bg-slate-50/70 px-6 py-4 dark:border-white/10 dark:bg-white/[0.025]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
                className="h-10 rounded-xl border-slate-300 bg-white px-4 font-semibold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="h-10 rounded-xl bg-blue-600 px-5 font-bold text-white hover:bg-blue-700"
              >
                {saveMutation.isPending
                  ? "Saving..."
                  : editingItem
                    ? `Update ${singular}`
                    : `Create ${singular}`}
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
        <DialogContent className="overflow-hidden rounded-2xl border-slate-200 bg-white p-0 shadow-2xl dark:border-white/10 dark:bg-slate-950 sm:max-w-md">
          <DialogHeader className="border-b border-red-100 bg-red-50 px-6 py-5 text-left dark:border-red-400/10 dark:bg-red-500/[0.06]">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-extrabold text-slate-950 dark:text-white">
                  Delete {singular}
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  This action cannot be undone.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="px-6 py-6">
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
              Are you sure you want to delete
              <strong className="mx-1 font-extrabold text-slate-950 dark:text-white">
                {deleteItem?.name}
              </strong>
              ? Products using this {singular.toLowerCase()} may be affected.
            </p>
          </div>

          <DialogFooter className="border-t border-slate-200 bg-slate-50/70 px-6 py-4 dark:border-white/10 dark:bg-white/[0.025]">
            <Button
              variant="outline"
              onClick={() => setDeleteItem(null)}
              className="h-10 rounded-xl border-slate-300 bg-white px-4 font-semibold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
            >
              Cancel
            </Button>

            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate(deleteItem.id)}
              disabled={deleteMutation.isPending}
              className="h-10 rounded-xl px-5 font-bold"
            >
              {deleteMutation.isPending ? "Deleting..." : `Delete ${singular}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
