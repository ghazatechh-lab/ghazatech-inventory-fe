import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import api, { getApiErrorDetails, unwrap } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const normalizeList = (value) => {
  const data = unwrap(value);

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  if (Array.isArray(data?.data?.results)) {
    return data.data.results;
  }

  if (Array.isArray(value?.data)) {
    return value.data;
  }

  if (Array.isArray(value?.data?.results)) {
    return value.data.results;
  }

  if (Array.isArray(value?.data?.data)) {
    return value.data.data;
  }

  if (Array.isArray(value?.data?.data?.results)) {
    return value.data.data.results;
  }

  return [];
};

const money = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));

const createInitialForm = (fields, row, branchId) => {
  const initial = {};

  fields.forEach((field) => {
    initial[field.key] = row?.[field.key] ?? field.default ?? "";
  });

  if (!row && branchId && fields.some((field) => field.key === "branch")) {
    initial.branch = String(branchId);
  }

  return initial;
};

export default function AccountingCrudPage({
  title,
  subtitle,
  endpoint,
  fields,
  columns,
  readOnly = false,
  extraAction,
  addLabel = "New",
  emptyTitle = "No records found.",
}) {
  const queryClient = useQueryClient();

  const { branchId, branchParams, isAllBranches } = useActiveBranchFilter();

  const [open, setOpen] = React.useState(false);

  const [editing, setEditing] = React.useState(null);

  const [form, setForm] = React.useState({});

  const query = useQuery({
    queryKey: ["accounting-list", endpoint, branchId],

    queryFn: async () =>
      unwrap(
        await api.get(endpoint, {
          params: {
            ...branchParams,
            page_size: 1000,
            ordering: "-created_at",
          },
        }),
      ),

    staleTime: 0,
    refetchOnMount: "always",
  });

  const rows = React.useMemo(() => normalizeList(query.data), [query.data]);

  React.useEffect(() => {
    query.refetch();
    // query identity changes with branchId/endpoint.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, endpoint]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
      };

      fields.forEach((field) => {
        if (
          field.type === "number" &&
          payload[field.key] !== "" &&
          payload[field.key] !== null &&
          payload[field.key] !== undefined
        ) {
          payload[field.key] = Number(payload[field.key]);
        }

        if (field.nullable && payload[field.key] === "") {
          payload[field.key] = null;
        }
      });

      if (editing) {
        return api.patch(`${endpoint}${editing.id}/`, payload, {
          skipGlobalErrorToast: true,
        });
      }

      return api.post(endpoint, payload, {
        skipGlobalErrorToast: true,
      });
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["accounting-list", endpoint],
        exact: false,
      });

      await queryClient.invalidateQueries({
        predicate: (item) =>
          Array.isArray(item.queryKey) && item.queryKey.includes(endpoint),
      });

      await query.refetch();

      toast.success(
        editing ? "Updated successfully." : "Created successfully.",
      );

      setOpen(false);
      setEditing(null);
      setForm({});
    },

    onError: (error) => {
      const details = getApiErrorDetails(error);

      toast.error(details.title || "Unable to save", {
        description: details.summary || details.message,
      });
    },
  });

  const remove = async (row) => {
    if (!window.confirm("Delete this record?")) {
      return;
    }

    try {
      await api.delete(`${endpoint}${row.id}/`);

      await queryClient.invalidateQueries({
        queryKey: ["accounting-list", endpoint],
        exact: false,
      });

      await query.refetch();

      toast.success("Deleted successfully.");
    } catch (error) {
      const details = getApiErrorDetails(error);

      toast.error(details.title || "Unable to delete", {
        description: details.summary || details.message,
      });
    }
  };

  const show = (row = null) => {
    setEditing(row);

    setForm(createInitialForm(fields, row, branchId));

    setOpen(true);
  };

  const close = () => {
    if (save.isPending) {
      return;
    }

    setOpen(false);
    setEditing(null);
    setForm({});
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={title}
        subtitle={`${subtitle}${
          isAllBranches ? " · All branches" : " · Selected branch"
        }`}
        actions={
          !readOnly ? (
            <Button
              type="button"
              onClick={() => show()}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              {addLabel}
            </Button>
          ) : null
        }
      />

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {column.label}
                </th>
              ))}

              {!readOnly && (
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Actions
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {query.isLoading || query.isFetching ? (
              <tr>
                <td
                  colSpan={columns.length + (readOnly ? 0 : 1)}
                  className="p-10 text-center text-muted-foreground"
                >
                  Loading...
                </td>
              </tr>
            ) : rows.length ? (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b last:border-0 hover:bg-muted/20"
                >
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-3">
                      {column.money
                        ? money(row[column.key])
                        : column.render
                          ? column.render(row)
                          : (row[column.key] ?? "—")}
                    </td>
                  ))}

                  {!readOnly && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {extraAction?.(row, queryClient)}

                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => show(row)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => remove(row)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length + (readOnly ? 0 : 1)}
                  className="p-10 text-center text-muted-foreground"
                >
                  {emptyTitle}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              save.mutate();
            }}
            className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border bg-background shadow-2xl"
          >
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  {editing ? "Edit" : "New"} {title}
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Complete the fields and save the record.
                </p>
              </div>

              <Button type="button" size="icon" variant="ghost" onClick={close}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-2">
              {fields.map((field) => (
                <div
                  key={field.key}
                  className={field.full ? "md:col-span-2" : ""}
                >
                  <Label className="text-foreground">
                    {field.label}

                    {field.required ? " *" : ""}
                  </Label>

                  {field.type === "select" ? (
                    <select
                      className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-foreground"
                      value={form[field.key] ?? ""}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          [field.key]: event.target.value,
                        }))
                      }
                      required={field.required}
                    >
                      {field.placeholder && (
                        <option value="">{field.placeholder}</option>
                      )}

                      {field.options?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      className="mt-2 text-foreground"
                      type={field.type || "text"}
                      value={form[field.key] ?? ""}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          [field.key]: event.target.value,
                        }))
                      }
                      required={field.required}
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      placeholder={field.placeholder}
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 border-t p-5">
              <Button
                type="button"
                variant="outline"
                onClick={close}
                className="text-foreground"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={save.isPending}
                className="bg-blue-600 text-white hover:bg-blue-700 disabled:text-white/80"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />

                {save.isPending ? "Saving..." : editing ? "Update" : "Save"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
