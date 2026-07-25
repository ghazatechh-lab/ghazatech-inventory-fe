import React from "react";
import { Download, Plus, Save, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import api, { getApiErrorDetails, unwrap } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { DataTable, SearchInput, useListQuery } from "@/hooks/useListQuery";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CurrencyText, DateText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";
import { SalesDocumentFlow } from "@/components/sales/SalesDocumentFlow";
import { MetricCard } from "@/components/sales/MetricCard";

const normalizeList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.results)) return value.data.results;
  return [];
};

const today = () => new Date().toISOString().slice(0, 10);

const number = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const createForm = (branchId) => ({
  branch: branchId ? String(branchId) : "",
  name: "",
  status: "DRAFT",
  applies_to: "ALL_CUSTOMERS",
  customer_category: "",
  discount_type: "PERCENTAGE",
  discount_percentage: 10,
  fixed_discount: 0,
  apply_scope: "ALL_ITEMS",
  valid_from: today(),
  valid_until: "",
  customer_ids: [],
  items: [],
});

export default function PriceListsPage() {
  const queryClient = useQueryClient();
  const { branchId, branchParams } = useActiveBranchFilter();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(() => createForm(branchId));
  const [errors, setErrors] = React.useState({});

  const { query, q, setQ, page, setPage } = useListQuery(
    "price-lists",
    "/sales/price-lists/",
    branchParams,
  );

  const { data: summaryResponse } = useQuery({
    queryKey: ["price-lists-summary", branchParams],
    queryFn: async () =>
      unwrap(
        await api.get("/sales/price-lists/summary/", { params: branchParams }),
      ),
  });

  const { data: optionsResponse } = useQuery({
    queryKey: ["price-list-form-options", form.branch],
    queryFn: async () =>
      unwrap(
        await api.get("/sales/price-lists/form-options/", {
          params: { branch: form.branch || undefined },
        }),
      ),
    enabled: open,
  });

  const summary = summaryResponse || {};
  const payload = query.data || { results: [], count: 0 };

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = "Price list name is required.";
    if (!form.valid_from) next.valid_from = "Valid-from date is required.";
    if (form.valid_until && form.valid_until < form.valid_from) {
      next.valid_until = "Valid-until date cannot be before valid-from date.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const mutation = useMutation({
    mutationFn: async () =>
      api.post(
        "/sales/price-lists/",
        {
          branch: form.branch ? Number(form.branch) : null,
          name: form.name,
          status: form.status,
          applies_to: form.applies_to,
          customer_category: form.customer_category || null,
          discount_type: form.discount_type,
          discount_percentage:
            form.discount_type === "PERCENTAGE"
              ? number(form.discount_percentage)
              : 0,
          fixed_discount:
            form.discount_type === "FIXED" ? number(form.fixed_discount) : 0,
          valid_from: form.valid_from,
          valid_until: form.valid_until || null,
          customer_ids: form.customer_ids,
          items: form.items,
        },
        { skipGlobalErrorToast: true },
      ),

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["price-lists"] }),
        queryClient.invalidateQueries({ queryKey: ["price-lists-summary"] }),
      ]);
      toast.success("Price list saved.");
      setOpen(false);
    },

    onError: (error) => {
      const details = getApiErrorDetails(error);
      toast.error(details.title || "Unable to save price list", {
        description: details.summary || details.message,
      });
    },
  });

  const exportRows = async () => {
    const response = await api.get("/sales/price-lists/export/", {
      params: branchParams,
      responseType: "blob",
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "price-lists.csv";
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  const columns = [
    { key: "name", header: "Price List" },
    { key: "applies_to_display", header: "Applies To" },
    { key: "item_count", header: "Items" },
    { key: "discount_display", header: "Discount" },
    {
      key: "valid_until",
      header: "Valid Until",
      cell: (row) =>
        row.valid_until ? <DateText value={row.valid_until} /> : "—",
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader
        title="Price Lists"
        subtitle="Customer-specific and seasonal pricing rules"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportRows}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button
              onClick={() => {
                setForm(createForm(branchId));
                setOpen(true);
              }}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Price List
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Active Price Lists"
          value={summary.active_price_lists || 0}
        />
        <MetricCard
          label="Items with Overrides"
          value={summary.items_with_overrides || 0}
        />
        <MetricCard
          label="Active Promotions"
          value={summary.active_promotions || 0}
        />
        <MetricCard
          label="Expiring This Week"
          value={summary.expiring_this_week || 0}
        />
      </div>

      <SalesDocumentFlow />

      <section className="card-surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-semibold">Price Lists</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Customer-specific and seasonal pricing rules
            </p>
          </div>
          <div className="w-full md:max-w-sm">
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder="Search price list"
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={payload.results || []}
          isLoading={query.isLoading}
          page={page}
          pageSize={12}
          total={payload.count || 0}
          onPageChange={setPage}
        />
      </section>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
          <div className="flex h-full w-full max-w-2xl flex-col bg-background shadow-2xl">
            <div className="flex items-start justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-xl font-semibold">New Price List</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Set up a customer or seasonal pricing rule
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-5">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Basic Details
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Price List Name *</Label>
                    <Input
                      value={form.name}
                      onChange={(event) =>
                        updateForm("name", event.target.value)
                      }
                      className="mt-2"
                      placeholder="e.g. Wholesale Tier 1"
                    />
                    {errors.name && (
                      <p className="mt-1 text-xs text-red-500">{errors.name}</p>
                    )}
                  </div>

                  <div>
                    <Label>Status</Label>
                    <Select
                      value={form.status}
                      onValueChange={(value) => updateForm("status", value)}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DRAFT">Draft</SelectItem>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="border-t pt-5">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Applies To
                </p>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[
                    ["ALL_CUSTOMERS", "All Customers"],
                    ["CUSTOMER_CATEGORY", "Customer Category"],
                    ["SELECTED_ACCOUNTS", "Selected Accounts"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => updateForm("applies_to", value)}
                      className={
                        form.applies_to === value
                          ? "rounded-lg border border-blue-500 bg-blue-50 px-3 py-3 text-sm text-blue-600"
                          : "rounded-lg border px-3 py-3 text-sm"
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t pt-5">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Discount
                </p>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[
                    ["PERCENTAGE", "Percentage Off"],
                    ["FIXED", "Fixed Amount Off"],
                    ["CUSTOM_PRICE", "Custom Item Prices"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => updateForm("discount_type", value)}
                      className={
                        form.discount_type === value
                          ? "rounded-lg border border-blue-500 bg-blue-50 px-3 py-3 text-sm text-blue-600"
                          : "rounded-lg border px-3 py-3 text-sm"
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>
                      {form.discount_type === "PERCENTAGE"
                        ? "Discount Percentage"
                        : "Fixed Discount"}
                    </Label>
                    <Input
                      type="number"
                      value={
                        form.discount_type === "PERCENTAGE"
                          ? form.discount_percentage
                          : form.fixed_discount
                      }
                      onChange={(event) =>
                        updateForm(
                          form.discount_type === "PERCENTAGE"
                            ? "discount_percentage"
                            : "fixed_discount",
                          event.target.value,
                        )
                      }
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label>Applies To</Label>
                    <Select
                      value={form.apply_scope}
                      onValueChange={(value) =>
                        updateForm("apply_scope", value)
                      }
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL_ITEMS">All Items</SelectItem>
                        <SelectItem value="SELECTED_ITEMS">
                          Selected Items
                        </SelectItem>
                        <SelectItem value="CATEGORIES">Categories</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="border-t pt-5">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Validity
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Valid From *</Label>
                    <Input
                      type="date"
                      value={form.valid_from}
                      onChange={(event) =>
                        updateForm("valid_from", event.target.value)
                      }
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Valid Until</Label>
                    <Input
                      type="date"
                      value={form.valid_until}
                      onChange={(event) =>
                        updateForm("valid_until", event.target.value)
                      }
                      className="mt-2"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Leave blank for no expiry
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t px-5 py-4">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => validate() && mutation.mutate()}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                Save Price List
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
