import React from "react";
import { Plus, Save, Trash2, Truck, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import api, { getApiErrorDetails, unwrap } from "@/lib/api";
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
import { DateText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";

const normalizeList = (value) => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value.results)) return value.results;
  if (Array.isArray(value.data)) return value.data;
  if (value.data && typeof value.data === "object")
    return normalizeList(value.data);
  return [];
};

const normalizePaginatedResponse = (value) => {
  if (Array.isArray(value)) return { results: value, count: value.length };
  if (!value || typeof value !== "object") return { results: [], count: 0 };

  if (Array.isArray(value.results)) {
    return {
      ...value,
      results: value.results,
      count: Number(value.count ?? value.results.length),
    };
  }

  if (Array.isArray(value.data)) {
    return { results: value.data, count: value.data.length };
  }

  if (value.data && typeof value.data === "object") {
    return normalizePaginatedResponse(value.data);
  }

  return { results: [], count: 0 };
};

const today = () => new Date().toISOString().slice(0, 10);
const number = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const createForm = (branchId) => ({
  branch: branchId ? String(branchId) : "",
  sales_order: "",
  customer: "",
  invoice: "",
  delivery_date: today(),
  courier: "",
  driver_name: "",
  vehicle: "",
  dispatch_datetime: "",
  expected_delivery_datetime: "",
  received_by: "",
  actual_delivery_datetime: "",
  signature_stamp: "",
  tracking_number: "",
  delivery_address: "",
  status: "PENDING",
  notes: "",
  remarks: "",
  items: [],
});

export default function DeliveryNotesPage() {
  const queryClient = useQueryClient();
  const { branchId, branchParams } = useActiveBranchFilter();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(() => createForm(branchId));
  const [errors, setErrors] = React.useState({});

  const { query, q, setQ, page, setPage } = useListQuery(
    "delivery-notes",
    "/sales/delivery-notes/",
    branchParams,
  );

  const { data: optionsResponse } = useQuery({
    queryKey: ["delivery-note-form-options", branchId],
    queryFn: async () =>
      unwrap(
        await api.get("/sales/delivery-notes/form-options/", {
          params: branchParams,
        }),
      ),
    enabled: open,
  });

  const { data: orderDetail } = useQuery({
    queryKey: ["delivery-note-order-options", form.sales_order, branchId],
    queryFn: async () =>
      unwrap(
        await api.get(
          `/sales/delivery-notes/order-options/${form.sales_order}/`,
          { params: branchParams },
        ),
      ),
    enabled: open && Boolean(form.sales_order),
    staleTime: 0,
  });

  const orders = normalizeList(optionsResponse?.sales_orders);
  const payload = React.useMemo(
    () => normalizePaginatedResponse(query.data),
    [query.data],
  );

  React.useEffect(() => {
    // console.log("Delivery Notes raw API response:", query.data);
    // console.log("Delivery Notes normalized rows:", payload.results);
    if (query.error) {
      //   console.error("Delivery Notes API error:", query.error);
      //   console.error(
      //     "Delivery Notes API error response:",
      //     query.error?.response?.data,
      //   );
    }
  }, [query.data, query.error, payload.results]);

  React.useEffect(() => {
    setForm((current) => ({
      ...current,
      branch: branchId ? String(branchId) : "",
      sales_order: "",
      customer: "",
      invoice: "",
      items: [],
    }));
  }, [branchId]);

  React.useEffect(() => {
    if (!orderDetail) return;
    setForm((current) => ({
      ...current,
      branch: orderDetail.branch_id
        ? String(orderDetail.branch_id)
        : current.branch,
      customer: orderDetail.customer_id ? String(orderDetail.customer_id) : "",
      delivery_date: orderDetail.delivery_date || current.delivery_date,
      delivery_address: orderDetail.delivery_address || "",
      items: (orderDetail.items || []).map((item) => ({
        ...item,
        delivered_quantity: number(item.delivered_quantity),
        serial_imei: item.serial_imei || "",
      })),
    }));
  }, [orderDetail]);

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  const updateItem = (index, patch) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }));
  };

  const close = () => {
    setOpen(false);
    setForm(createForm(branchId));
    setErrors({});
  };

  const validate = () => {
    const next = {};
    if (!form.sales_order) next.sales_order = "Sales order is required.";
    if (!form.delivery_date) next.delivery_date = "Delivery date is required.";
    if (!form.delivery_address.trim())
      next.delivery_address = "Delivery address is required.";
    if (!form.items.length)
      next.items = "The selected order has no pending items.";
    if (form.items.some((item) => number(item.delivered_quantity) <= 0))
      next.items = "Each delivered quantity must be greater than zero.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const createMutation = useMutation({
    mutationFn: async () =>
      api.post(
        "/sales/delivery-notes/",
        {
          branch: form.branch ? Number(form.branch) : null,
          sales_order: Number(form.sales_order),
          customer: form.customer ? Number(form.customer) : null,
          invoice: form.invoice ? Number(form.invoice) : null,
          delivery_date: form.delivery_date,
          driver_name: form.driver_name || null,
          vehicle: form.vehicle || null,
          dispatch_datetime: form.dispatch_datetime || null,
          expected_delivery_datetime: form.expected_delivery_datetime || null,
          received_by: form.received_by || null,
          actual_delivery_datetime: form.actual_delivery_datetime || null,
          signature_stamp: form.signature_stamp || null,
          courier: form.courier || null,
          tracking_number: form.tracking_number || null,
          delivery_address: form.delivery_address,
          status: form.status,
          notes: form.notes,
          remarks: form.remarks,
          items: form.items.map((item) => ({
            sales_order_item: item.sales_order_item,
            product: item.product,
            variant: item.variant || null,
            description: item.description || item.product_name,
            ordered_quantity: number(item.ordered_quantity),
            delivered_quantity: number(item.delivered_quantity),
            serial_imei: item.serial_imei || null,
          })),
        },
        { skipGlobalErrorToast: true },
      ),
    onSuccess: async () => {
      // Return to the first page, refresh every Delivery Note list query and
      // wait for the latest server response before closing the form. This
      // guarantees that the newly created record is visible immediately.
      setPage(1);
      await queryClient.invalidateQueries({
        queryKey: ["delivery-notes"],
        exact: false,
        refetchType: "active",
      });
      await query.refetch();
      toast.success("Delivery note created and added to the list.");
      close();
    },
    onError: (error) => {
      const details = getApiErrorDetails(error);
      toast.error(details.title || "Unable to create delivery note", {
        description: details.summary || details.message,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) =>
      api.delete(`/sales/delivery-notes/${id}/`, {
        skipGlobalErrorToast: true,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["delivery-notes"],
        exact: false,
        refetchType: "active",
      });
      await query.refetch();
      toast.success("Delivery note deleted successfully.");
    },
    onError: (error) => {
      const details = getApiErrorDetails(error);
      toast.error(details.title || "Unable to delete delivery note", {
        description: details.summary || details.message,
      });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, action }) =>
      api.post(`/sales/delivery-notes/${id}/${action}/`),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["delivery-notes"] });
      toast.success(
        variables.action === "deliver"
          ? "Delivery marked as completed."
          : "Delivery marked as dispatched.",
      );
    },
  });

  const columns = [
    { key: "delivery_note_number", header: "Delivery Note" },
    { key: "sales_order_number", header: "Sales Order" },
    { key: "customer_name", header: "Customer" },
    {
      key: "delivery_date",
      header: "Delivery Date",
      cell: (row) => <DateText value={row.delivery_date} />,
    },
    { key: "courier", header: "Courier" },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => (
        <div className="flex gap-2">
          {["DRAFT", "READY", "PENDING"].includes(row.status) ? (
            <Button
              size="sm"
              variant="outline"
              onClick={(event) => {
                event.stopPropagation();
                statusMutation.mutate({ id: row.id, action: "dispatch" });
              }}
              disabled={statusMutation.isPending}
            >
              Dispatch
            </Button>
          ) : null}
          {["DISPATCHED", "IN_TRANSIT", "PARTIALLY_DELIVERED"].includes(
            row.status,
          ) ? (
            <Button
              size="sm"
              onClick={(event) => {
                event.stopPropagation();
                statusMutation.mutate({ id: row.id, action: "deliver" });
              }}
              disabled={statusMutation.isPending}
            >
              Delivered
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="destructive"
            onClick={(event) => {
              event.stopPropagation();
              const confirmed = window.confirm(
                `Delete delivery note ${row.delivery_note_number}? This action cannot be undone.`,
              );
              if (confirmed) deleteMutation.mutate(row.id);
            }}
            disabled={deleteMutation.isPending}
            title="Delete delivery note"
          >
            <Trash2 className="mr-1 h-4 w-4" /> Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="sales-module-page sales-workspace mx-auto max-w-7xl space-y-5">
      <PageHeader
        title="Delivery Notes"
        subtitle="Create and track deliveries against sales orders"
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Delivery Note
          </Button>
        }
      />

      <section className="card-surface p-5">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Search delivery note, sales order, customer"
        />
        {query.isError ? (
          <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            Unable to load delivery notes. Check the browser console and backend
            logs.
          </div>
        ) : null}
        <div className="mt-4">
          <DataTable
            columns={columns}
            data={payload.results || []}
            isLoading={query.isLoading}
            page={page}
            pageSize={12}
            total={payload.count || 0}
            onPageChange={setPage}
          />
        </div>
      </section>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-background shadow-xl">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <Truck className="h-5 w-5" /> New Delivery Note
                </h2>
                <p className="text-sm text-muted-foreground">
                  The delivery note number is generated automatically.
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={close}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-6 p-5">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label>Sales Order *</Label>
                  <Select
                    value={form.sales_order}
                    onValueChange={(value) => updateForm("sales_order", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select sales order" />
                    </SelectTrigger>
                    <SelectContent>
                      {orders.map((order) => (
                        <SelectItem key={order.id} value={String(order.id)}>
                          {order.order_number} — {order.customer_name} (
                          {order.branch_name || "Branch"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.sales_order ? (
                    <p className="text-xs text-destructive">
                      {errors.sales_order}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label>Delivery Date *</Label>
                  <Input
                    type="date"
                    value={form.delivery_date}
                    onChange={(event) =>
                      updateForm("delivery_date", event.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(value) => updateForm("status", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                      <SelectItem value="DELIVERED">Delivered</SelectItem>
                      <SelectItem value="PARTIALLY_DELIVERED">
                        Partially Delivered
                      </SelectItem>
                      <SelectItem value="FAILED">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Courier</Label>
                  <Input
                    value={form.courier}
                    onChange={(event) =>
                      updateForm("courier", event.target.value)
                    }
                    placeholder="Courier company or driver"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tracking Number</Label>
                  <Input
                    value={form.tracking_number}
                    onChange={(event) =>
                      updateForm("tracking_number", event.target.value)
                    }
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label>Driver / Delivery Staff</Label>
                  <Input
                    value={form.driver_name}
                    onChange={(e) => updateForm("driver_name", e.target.value)}
                    placeholder="Driver or staff name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Vehicle</Label>
                  <Input
                    value={form.vehicle}
                    onChange={(e) => updateForm("vehicle", e.target.value)}
                    placeholder="Vehicle / plate number"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dispatch Date & Time</Label>
                  <Input
                    type="datetime-local"
                    value={form.dispatch_datetime}
                    onChange={(e) =>
                      updateForm("dispatch_datetime", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Expected Delivery Time</Label>
                  <Input
                    type="datetime-local"
                    value={form.expected_delivery_datetime}
                    onChange={(e) =>
                      updateForm("expected_delivery_datetime", e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Delivery Address *</Label>
                <Textarea
                  value={form.delivery_address}
                  onChange={(event) =>
                    updateForm("delivery_address", event.target.value)
                  }
                />
                {errors.delivery_address ? (
                  <p className="text-xs text-destructive">
                    {errors.delivery_address}
                  </p>
                ) : null}
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold">Items to Deliver</h3>
                {errors.items ? (
                  <p className="text-sm text-destructive">{errors.items}</p>
                ) : null}
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-3 text-left">Product</th>
                        <th className="p-3 text-right">Pending Qty</th>
                        <th className="p-3 text-right">Deliver Qty</th>
                        <th className="p-3 text-left">Serial / IMEI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.items.map((item, index) => (
                        <tr key={item.sales_order_item} className="border-t">
                          <td className="p-3">
                            <div className="font-medium">
                              {item.product_name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {item.product_sku}
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            {number(item.ordered_quantity)}
                          </td>
                          <td className="p-3">
                            <Input
                              type="number"
                              min="0.01"
                              step="0.01"
                              max={number(item.ordered_quantity)}
                              className="ml-auto w-32 text-right"
                              value={item.delivered_quantity}
                              onChange={(event) =>
                                updateItem(index, {
                                  delivered_quantity: number(
                                    event.target.value,
                                  ),
                                })
                              }
                            />
                          </td>
                          <td className="p-3">
                            <Input
                              value={item.serial_imei || ""}
                              onChange={(event) =>
                                updateItem(index, {
                                  serial_imei: event.target.value,
                                })
                              }
                              placeholder="Optional"
                            />
                          </td>
                        </tr>
                      ))}
                      {!form.items.length ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="p-8 text-center text-muted-foreground"
                          >
                            Select a sales order to load its pending items.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Received By</Label>
                  <Input
                    value={form.received_by}
                    onChange={(e) => updateForm("received_by", e.target.value)}
                    placeholder="Customer / receiver name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Actual Delivery Date & Time</Label>
                  <Input
                    type="datetime-local"
                    value={form.actual_delivery_datetime}
                    onChange={(e) =>
                      updateForm("actual_delivery_datetime", e.target.value)
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Signature / Stamp</Label>
                <Textarea
                  value={form.signature_stamp}
                  onChange={(e) =>
                    updateForm("signature_stamp", e.target.value)
                  }
                  placeholder="Signature or stamp reference"
                />
              </div>
              <div className="space-y-2">
                <Label>Remarks</Label>
                <Textarea
                  value={form.remarks}
                  onChange={(e) => updateForm("remarks", e.target.value)}
                  placeholder="Reschedule reason, gate pass number, special instructions"
                />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(event) => updateForm("notes", event.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t p-5">
              <Button variant="outline" onClick={close}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (validate()) createMutation.mutate();
                }}
                disabled={createMutation.isPending}
              >
                <Save className="mr-2 h-4 w-4" /> Save Delivery Note
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
