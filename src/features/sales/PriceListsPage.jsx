import React from "react";
import { Download, Plus, Save, Trash2, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import api, { getApiErrorDetails, unwrap } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { DataTable, SearchInput, useListQuery } from "@/hooks/useListQuery";
import { PageHeader } from "@/components/common/PageHeader";
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
import { DateText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";

const normalizeList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.results)) return value.data.results;
  return [];
};

const today = () => new Date().toISOString().slice(0, 10);
const toNumber = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const emptyRule = () => ({
  product: "",
  variant: null,
  custom_price: "",
  discount_percentage: 0,
  minimum_quantity: 1,
});

const createForm = (branchId) => ({
  branch: branchId ? String(branchId) : "",
  name: "",
  currency: "AED",
  price_list_type: "CUSTOMER_TIER",
  status: "DRAFT",
  applies_to: "ALL_CUSTOMERS",
  customer_category: "",
  discount_type: "CUSTOM_PRICE",
  discount_percentage: 0,
  fixed_discount: 0,
  valid_from: today(),
  valid_until: "",
  auto_apply: true,
  stackable: false,
  usage_limit_per_customer: "",
  customer_ids: [],
  items: [emptyRule()],
});

const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`relative h-6 w-11 rounded-full transition ${
      checked ? "bg-blue-600" : "bg-slate-600"
    }`}
  >
    <span
      className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
        checked ? "left-6" : "left-1"
      }`}
    />
  </button>
);

export default function PriceListsPage() {
  const queryClient = useQueryClient();
  const { branchId, branchParams } = useActiveBranchFilter();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(() => createForm(branchId));
  const [errors, setErrors] = React.useState({});
  const [typeFilter, setTypeFilter] = React.useState("ALL");
  const [statusFilter, setStatusFilter] = React.useState("ALL");

  const { query, q, setQ, page, setPage } = useListQuery(
    "price-lists",
    "/sales/price-lists/",
    branchParams,
  );

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

  const options = optionsResponse || {};
  const products = normalizeList(options.products);
  const customers = normalizeList(options.customers);
  const branches = normalizeList(options.branches);
  const customerCategories = normalizeList(options.customer_categories);
  const rawPayload = query.data || { results: [], count: 0 };
  const rawRows = normalizeList(rawPayload);

  const filteredRows = rawRows.filter((row) => {
    const typeMatches =
      typeFilter === "ALL" || row.price_list_type === typeFilter;
    const statusMatches = statusFilter === "ALL" || row.status === statusFilter;
    return typeMatches && statusMatches;
  });

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  const updateRule = (index, field, value) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const productById = React.useMemo(
    () => new Map(products.map((product) => [String(product.id), product])),
    [products],
  );

  const getBasePrice = (rule) =>
    toNumber(productById.get(String(rule.product))?.selling_price);

  const getFinalPrice = (rule) => {
    const base = getBasePrice(rule);
    if (rule.custom_price !== "" && rule.custom_price !== null) {
      return toNumber(rule.custom_price);
    }
    return base - (base * toNumber(rule.discount_percentage)) / 100;
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = "Price list name is required.";
    if (!form.valid_from) next.valid_from = "Valid-from date is required.";
    if (form.valid_until && form.valid_until < form.valid_from) {
      next.valid_until = "Valid-until date cannot be before valid-from date.";
    }
    if (form.price_list_type === "BRANCH_SPECIFIC" && !form.branch) {
      next.branch = "Branch is required for a branch-specific price list.";
    }
    if (!form.items.some((item) => item.product)) {
      next.items = "Add at least one product pricing rule.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const saveMutation = useMutation({
    mutationFn: async (status) => {
      const payload = {
        branch: form.branch ? Number(form.branch) : null,
        name: form.name.trim(),
        currency: form.currency,
        price_list_type: form.price_list_type,
        status,
        applies_to:
          form.price_list_type === "CUSTOMER_TIER"
            ? form.applies_to
            : "ALL_CUSTOMERS",
        customer_category:
          form.price_list_type === "CUSTOMER_TIER" && form.customer_category
            ? form.customer_category
            : null,
        discount_type: form.discount_type,
        discount_percentage: toNumber(form.discount_percentage),
        fixed_discount: toNumber(form.fixed_discount),
        valid_from: form.valid_from,
        valid_until: form.valid_until || null,
        auto_apply: form.auto_apply,
        stackable: form.stackable,
        usage_limit_per_customer: form.usage_limit_per_customer
          ? Number(form.usage_limit_per_customer)
          : null,
        customer_ids: form.customer_ids.map(Number),
        items: form.items
          .filter((item) => item.product)
          .map((item) => ({
            product: Number(item.product),
            variant: item.variant ? Number(item.variant) : null,
            custom_price:
              item.custom_price === "" ? null : toNumber(item.custom_price),
            discount_percentage: toNumber(item.discount_percentage),
            minimum_quantity: Math.max(1, Number(item.minimum_quantity || 1)),
          })),
      };
      return api.post("/sales/price-lists/", payload, {
        skipGlobalErrorToast: true,
      });
    },
    onSuccess: async (_, status) => {
      await queryClient.invalidateQueries({ queryKey: ["price-lists"] });
      toast.success(
        status === "ACTIVE"
          ? "Price list activated."
          : "Price list saved as draft.",
      );
      setOpen(false);
    },
    onError: (error) => {
      const details = getApiErrorDetails(error);
      toast.error(details.title || "Unable to save price list", {
        description: details.summary || details.message,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/sales/price-lists/${id}/`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["price-lists"] });
      toast.success("Price list deleted.");
    },
    onError: (error) => {
      const details = getApiErrorDetails(error);
      toast.error(details.title || "Unable to delete price list", {
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
    { key: "name", header: "List Name" },
    { key: "type_display", header: "Type" },
    {
      key: "applies_to_display",
      header: "Applies To",
      cell: (row) =>
        row.price_list_type === "BRANCH_SPECIFIC"
          ? row.branch_name || "—"
          : row.customer_category || row.applies_to_display || "All Customers",
    },
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
    {
      key: "actions",
      header: "Actions",
      cell: (row) => (
        <Button
          size="icon"
          variant="ghost"
          onClick={() => {
            if (window.confirm(`Delete price list ${row.name}?`)) {
              deleteMutation.mutate(row.id);
            }
          }}
        >
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      ),
    },
  ];

  return (
    <div className="sales-module-page sales-workspace mx-auto max-w-7xl space-y-5">
      <PageHeader
        title="Price Lists & Discounts"
        subtitle="Branch-specific or customer-tier pricing, bulk discount rules, and promotional periods."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportRows}>
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
            <Button
              onClick={() => {
                setForm(createForm(branchId));
                setErrors({});
                setOpen(true);
              }}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" /> New Price List
            </Button>
          </div>
        }
      />

      <section className="card-surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b px-5 py-4 lg:flex-row lg:items-center">
          <div className="flex-1">
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder="Search by list name..."
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full lg:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="CUSTOMER_TIER">Customer-Tier</SelectItem>
              <SelectItem value="BRANCH_SPECIFIC">Branch-Specific</SelectItem>
              <SelectItem value="PROMOTIONAL">Promotional</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full lg:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="SCHEDULED">Scheduled</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="EXPIRED">Expired</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DataTable
          columns={columns}
          data={filteredRows}
          isLoading={query.isLoading}
          page={page}
          pageSize={12}
          total={filteredRows.length}
          onPageChange={setPage}
        />
      </section>

      {open && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4">
          <div className="mx-auto max-w-5xl rounded-xl bg-background shadow-2xl">
            <div className="flex items-start justify-between border-b px-6 py-5">
              <div>
                <h2 className="text-2xl font-bold">New Price List</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {form.status === "DRAFT"
                    ? "Draft — not yet active"
                    : "Configure pricing and promotion rules"}
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-5 p-6">
              <section className="card-surface p-5">
                <h3 className="font-semibold">1 · Price List Details</h3>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <div className="md:col-span-2">
                    <Label>Price List Name *</Label>
                    <Input
                      className="mt-2"
                      value={form.name}
                      onChange={(e) => updateForm("name", e.target.value)}
                      placeholder="e.g. Wholesale Tier"
                    />
                    {errors.name && (
                      <p className="mt-1 text-xs text-red-500">{errors.name}</p>
                    )}
                  </div>
                  <div>
                    <Label>Currency</Label>
                    <Select
                      value={form.currency}
                      onValueChange={(v) => updateForm("currency", v)}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AED">AED</SelectItem>
                        <SelectItem value="SAR">SAR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Valid From *</Label>
                    <Input
                      className="mt-2"
                      type="date"
                      value={form.valid_from}
                      onChange={(e) => updateForm("valid_from", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Valid Until (blank = no expiry)</Label>
                    <Input
                      className="mt-2"
                      type="date"
                      value={form.valid_until}
                      onChange={(e) =>
                        updateForm("valid_until", e.target.value)
                      }
                    />
                    {errors.valid_until && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors.valid_until}
                      </p>
                    )}
                  </div>
                </div>
              </section>

              <section className="card-surface p-5">
                <h3 className="font-semibold">2 · Type</h3>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {[
                    [
                      "CUSTOMER_TIER",
                      "👤",
                      "Customer-Tier",
                      "Applies to a customer or customer group",
                    ],
                    [
                      "BRANCH_SPECIFIC",
                      "🏢",
                      "Branch-Specific",
                      "Applies to one branch",
                    ],
                    [
                      "PROMOTIONAL",
                      "🎉",
                      "Promotional",
                      "Time-based, applies to selected customers",
                    ],
                  ].map(([value, icon, title, description]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => updateForm("price_list_type", value)}
                      className={`rounded-xl border p-5 text-center ${form.price_list_type === value ? "border-blue-500 bg-blue-500/10" : "border-border"}`}
                    >
                      <div className="text-2xl">{icon}</div>
                      <div className="mt-2 font-semibold">{title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {description}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {form.price_list_type === "BRANCH_SPECIFIC" ? (
                    <div>
                      <Label>Applicable Branch *</Label>
                      <Select
                        value={form.branch}
                        onValueChange={(v) => updateForm("branch", v)}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Select branch" />
                        </SelectTrigger>
                        <SelectContent>
                          {branches.map((branch) => (
                            <SelectItem
                              key={branch.id}
                              value={String(branch.id)}
                            >
                              {branch.branch_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.branch && (
                        <p className="mt-1 text-xs text-red-500">
                          {errors.branch}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <Label>Applicable Customer / Group</Label>
                      <Select
                        value={form.customer_category || "ALL"}
                        onValueChange={(v) => {
                          updateForm("customer_category", v === "ALL" ? "" : v);
                          updateForm(
                            "applies_to",
                            v === "ALL" ? "ALL_CUSTOMERS" : "CUSTOMER_CATEGORY",
                          );
                        }}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All Customers</SelectItem>
                          {customerCategories.map((category) => (
                            <SelectItem key={category} value={String(category)}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </section>

              <section className="card-surface p-5">
                <h3 className="font-semibold">3 · Item Pricing Rules</h3>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[820px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                        <th className="p-2">Product</th>
                        <th className="p-2">Base Price</th>
                        <th className="p-2">Override Price</th>
                        <th className="p-2">Discount %</th>
                        <th className="p-2">Min Qty</th>
                        <th className="p-2">Final Price</th>
                        <th className="p-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {form.items.map((rule, index) => {
                        const base = getBasePrice(rule);
                        const finalPrice = getFinalPrice(rule);
                        return (
                          <tr key={index} className="border-b">
                            <td className="p-2">
                              <Select
                                value={String(rule.product || "")}
                                onValueChange={(v) =>
                                  updateRule(index, "product", v)
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select product" />
                                </SelectTrigger>
                                <SelectContent>
                                  {products.map((product) => (
                                    <SelectItem
                                      key={product.id}
                                      value={String(product.id)}
                                    >
                                      {product.product_name ||
                                        product.name ||
                                        product.sku}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-2">
                              <Input value={base.toFixed(2)} readOnly />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                min="0"
                                value={rule.custom_price}
                                onChange={(e) =>
                                  updateRule(
                                    index,
                                    "custom_price",
                                    e.target.value,
                                  )
                                }
                                placeholder="Optional"
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={rule.discount_percentage}
                                onChange={(e) =>
                                  updateRule(
                                    index,
                                    "discount_percentage",
                                    e.target.value,
                                  )
                                }
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                min="1"
                                value={rule.minimum_quantity}
                                onChange={(e) =>
                                  updateRule(
                                    index,
                                    "minimum_quantity",
                                    e.target.value,
                                  )
                                }
                              />
                            </td>
                            <td className="p-2 font-semibold text-green-500">
                              {form.currency} {finalPrice.toFixed(2)}
                            </td>
                            <td className="p-2">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() =>
                                  setForm((current) => ({
                                    ...current,
                                    items: current.items.filter(
                                      (_, i) => i !== index,
                                    ),
                                  }))
                                }
                              >
                                <X className="h-4 w-4 text-red-500" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {errors.items && (
                  <p className="mt-2 text-xs text-red-500">{errors.items}</p>
                )}
                <Button
                  variant="outline"
                  className="mt-3"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      items: [...current.items, emptyRule()],
                    }))
                  }
                >
                  <Plus className="mr-2 h-4 w-4" /> Add Product Rule
                </Button>
              </section>

              <section className="card-surface p-5">
                <h3 className="font-semibold">4 · Promotion Controls</h3>
                <div className="mt-4 divide-y">
                  <div className="flex items-center justify-between py-4">
                    <div>
                      <p className="font-medium">Auto-Apply</p>
                      <p className="text-xs text-muted-foreground">
                        Applies automatically at checkout, no code needed
                      </p>
                    </div>
                    <Toggle
                      checked={form.auto_apply}
                      onChange={(v) => updateForm("auto_apply", v)}
                    />
                  </div>
                  <div className="flex items-center justify-between py-4">
                    <div>
                      <p className="font-medium">Stackable</p>
                      <p className="text-xs text-muted-foreground">
                        Can be combined with other active discounts
                      </p>
                    </div>
                    <Toggle
                      checked={form.stackable}
                      onChange={(v) => updateForm("stackable", v)}
                    />
                  </div>
                  <div className="max-w-sm py-4">
                    <Label>Usage Limit per Customer (optional)</Label>
                    <Input
                      className="mt-2"
                      type="number"
                      min="1"
                      value={form.usage_limit_per_customer}
                      onChange={(e) =>
                        updateForm("usage_limit_per_customer", e.target.value)
                      }
                      placeholder="e.g. 1"
                    />
                  </div>
                </div>
              </section>

              <section className="card-surface p-5">
                <h3 className="font-semibold">5 · Status</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {["DRAFT", "SCHEDULED", "ACTIVE", "EXPIRED"].map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => updateForm("status", status)}
                      className={`rounded-lg border px-4 py-2 text-sm ${form.status === status ? "border-blue-500 bg-blue-600 text-white" : "border-border"}`}
                    >
                      {status.charAt(0) + status.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <div className="sticky bottom-0 flex justify-end gap-2 border-t bg-background px-6 py-4">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="outline"
                disabled={saveMutation.isPending}
                onClick={() => validate() && saveMutation.mutate("DRAFT")}
              >
                <Save className="mr-2 h-4 w-4" /> Save as Draft
              </Button>
              <Button
                className="bg-blue-600 text-white hover:bg-blue-700"
                disabled={saveMutation.isPending}
                onClick={() =>
                  validate() &&
                  saveMutation.mutate(
                    form.status === "DRAFT" ? "ACTIVE" : form.status,
                  )
                }
              >
                Activate Price List
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
