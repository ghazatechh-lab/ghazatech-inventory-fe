import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Eye,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import api, { getApiErrorMessage, unwrap } from "@/lib/api";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const emptyForm = {
  name: "",
  description: "",
  is_active: true,
};

const getItemsFromResponse = (response) => {
  const data = unwrap(response);

  if (Array.isArray(data)) {
    return data;
  }

  return data?.results || [];
};

const getFallbackError = (error, fallback) =>
  getApiErrorMessage(error, fallback);

export default function ReferenceDataPage({
  title,
  description,
  singular,
  endpoint,
  queryKey,
  testIdPrefix,
}) {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [viewTarget, setViewTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const normalizedEndpoint = endpoint.endsWith("/") ? endpoint : `${endpoint}/`;

  const {
    data: items = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: [queryKey],
    queryFn: async () => {
      const response = await api.get(normalizedEndpoint, {
        params: {
          page_size: 500,
        },
      });

      return getItemsFromResponse(response);
    },
  });

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return items;
    }

    return items.filter((item) => {
      const name = String(item?.name || "").toLowerCase();
      const itemDescription = String(item?.description || "").toLowerCase();

      return name.includes(term) || itemDescription.includes(term);
    });
  }, [items, search]);

  const closeForm = () => {
    setFormOpen(false);
    setEditingItem(null);
    setForm(emptyForm);
  };

  const openCreateForm = () => {
    setEditingItem(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEditForm = (item) => {
    setEditingItem(item);

    setForm({
      name: item?.name || "",
      description: item?.description || "",
      is_active: typeof item?.is_active === "boolean" ? item.is_active : true,
    });

    setFormOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingItem?.id) {
        return api.patch(`${normalizedEndpoint}${editingItem.id}/`, payload);
      }

      return api.post(normalizedEndpoint, payload);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [queryKey],
      });

      toast.success(
        editingItem
          ? `${singular} updated successfully.`
          : `${singular} created successfully.`,
      );

      closeForm();
    },

    onError: (mutationError) => {
      /*
       * api.js already shows the exact backend validation error.
       * Only show a fallback when the shared interceptor did not.
       */
      if (!mutationError?.__apiErrorShown) {
        toast.error(
          getFallbackError(
            mutationError,
            `Unable to save ${singular.toLowerCase()}.`,
          ),
        );
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (itemId) => {
      return api.delete(`${normalizedEndpoint}${itemId}/`);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [queryKey],
      });

      toast.success(`${singular} deleted successfully.`);

      setDeleteTarget(null);
    },

    onError: (mutationError) => {
      /*
       * Prevent duplicate error toast.
       * The shared api.js interceptor normally displays it.
       */
      if (!mutationError?.__apiErrorShown) {
        toast.error(
          getFallbackError(
            mutationError,
            `Unable to delete this ${singular.toLowerCase()}.`,
          ),
        );
      }

      setDeleteTarget(null);
    },
  });

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const name = form.name.trim();

    if (!name) {
      toast.error(`${singular} name is required.`);
      return;
    }

    saveMutation.mutate({
      name,
      description: form.description.trim(),
      is_active: Boolean(form.is_active),
    });
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget?.id) {
      return;
    }

    deleteMutation.mutate(deleteTarget.id);
  };

  return (
    <div className="space-y-6" data-testid={`${testIdPrefix}-page`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>

          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>

        <Button
          type="button"
          onClick={openCreateForm}
          data-testid={`${testIdPrefix}-add-button`}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add {singular}
        </Button>
      </div>

      <div className="rounded-xl border bg-card">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Search ${title.toLowerCase()}...`}
              className="pl-9"
              data-testid={`${testIdPrefix}-search-input`}
            />
          </div>

          <div className="text-sm text-muted-foreground">
            {filteredItems.length} record
            {filteredItems.length === 1 ? "" : "s"}
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[90px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-28 text-center text-muted-foreground"
                  >
                    Loading {title.toLowerCase()}...
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-28 text-center text-destructive"
                  >
                    {getFallbackError(
                      error,
                      `Unable to load ${title.toLowerCase()}.`,
                    )}
                  </TableCell>
                </TableRow>
              ) : filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-28 text-center text-muted-foreground"
                  >
                    No {title.toLowerCase()} found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => (
                  <TableRow
                    key={item.id}
                    data-testid={`${testIdPrefix}-row-${item.id}`}
                  >
                    <TableCell className="font-medium">{item.name}</TableCell>

                    <TableCell className="max-w-md text-muted-foreground">
                      {item.description || "—"}
                    </TableCell>

                    <TableCell>
                      <Badge variant={item.is_active ? "default" : "secondary"}>
                        {item.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`${singular} actions`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewTarget(item)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </DropdownMenuItem>

                          <DropdownMenuItem onClick={() => openEditForm(item)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteTarget(item)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          if (!open && !saveMutation.isPending) {
            closeForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? `Edit ${singular}` : `Add ${singular}`}
            </DialogTitle>

            <DialogDescription>
              {editingItem
                ? `Update the selected ${singular.toLowerCase()}.`
                : `Create a new ${singular.toLowerCase()} record.`}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor={`${testIdPrefix}-name`}>Name</Label>

              <Input
                id={`${testIdPrefix}-name`}
                name="name"
                value={form.name}
                onChange={handleFormChange}
                placeholder={`Enter ${singular.toLowerCase()} name`}
                disabled={saveMutation.isPending}
                required
                data-testid={`${testIdPrefix}-name-input`}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${testIdPrefix}-description`}>Description</Label>

              <textarea
                id={`${testIdPrefix}-description`}
                name="description"
                value={form.description}
                onChange={handleFormChange}
                placeholder="Enter a short description"
                disabled={saveMutation.isPending}
                rows={4}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                data-testid={`${testIdPrefix}-description-input`}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label htmlFor={`${testIdPrefix}-active`}>Active status</Label>

                <p className="mt-1 text-xs text-muted-foreground">
                  Inactive records remain available for historical data.
                </p>
              </div>

              <Switch
                id={`${testIdPrefix}-active`}
                checked={form.is_active}
                onCheckedChange={(checked) =>
                  setForm((current) => ({
                    ...current,
                    is_active: checked,
                  }))
                }
                disabled={saveMutation.isPending}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeForm}
                disabled={saveMutation.isPending}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={saveMutation.isPending}
                data-testid={`${testIdPrefix}-save-button`}
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
        open={Boolean(viewTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setViewTarget(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{singular} details</DialogTitle>

            <DialogDescription>Review the selected record.</DialogDescription>
          </DialogHeader>

          {viewTarget && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Name
                </p>

                <p className="mt-1 font-medium">{viewTarget.name}</p>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Description
                </p>

                <p className="mt-1 whitespace-pre-wrap text-sm">
                  {viewTarget.description || "No description"}
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Status
                </p>

                <div className="mt-2">
                  <Badge
                    variant={viewTarget.is_active ? "default" : "secondary"}
                  >
                    {viewTarget.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setViewTarget(null)}
            >
              Close
            </Button>

            <Button
              type="button"
              onClick={() => {
                const selectedItem = viewTarget;
                setViewTarget(null);
                openEditForm(selectedItem);
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) {
            setDeleteTarget(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {singular}</DialogTitle>

            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>
                {deleteTarget?.name || `this ${singular.toLowerCase()}`}
              </strong>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />

              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
