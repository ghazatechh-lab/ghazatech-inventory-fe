import React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Save, Send, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";

import api, { getApiErrorDetails, unwrap } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
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
import { CurrencyText } from "@/components/common/CurrencyText";

const list = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.results)) return value.data.results;
  return [];
};

const getPurchaseOrderItems = (order) => {
  const candidates = [
    order?.items,
    order?.data?.items,
    order?.purchase_order_items,
    order?.order_items,
    order?.results,
    order?.data?.results,
  ];

  for (const candidate of candidates) {
    const items = list(candidate);

    if (items.length) {
      return items;
    }
  }

  return [];
};

const today = () => new Date().toISOString().slice(0, 10);
const num = (value) => Number(value || 0);

const getPk = (...values) => {
  for (const value of values) {
    const candidate = value && typeof value === "object" ? value.id : value;

    if (candidate !== undefined && candidate !== null && candidate !== "") {
      const parsed = Number(candidate);

      if (Number.isInteger(parsed) && parsed > 0) {
        return parsed;
      }
    }
  }

  return null;
};

const getText = (...values) => {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value);
    }
  }

  return "";
};

const formatSize = (bytes) => {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 ** 2).toFixed(1)} MB`;
};

export default function GRNFormPage() {
  const { id } = useParams();
  const edit = Boolean(id);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { branchId } = useActiveBranchFilter();
  const requestedPurchaseOrderId = searchParams.get("purchase_order") || "";
  const requestedBranchId = searchParams.get("branch") || "";
  const prefillAppliedRef = React.useRef(false);

  const [files, setFiles] = React.useState([]);
  const [errors, setErrors] = React.useState({});
  const [purchaseOrderSearch, setPurchaseOrderSearch] = React.useState("");
  const [purchaseOrderSearchOpen, setPurchaseOrderSearchOpen] =
    React.useState(false);
  const [form, setForm] = React.useState({
    grn_number: "",
    purchase_order: "",
    supplier: "",
    branch: requestedBranchId || (branchId ? String(branchId) : ""),
    received_date: today(),
    received_by: "",
    warehouse_location: "",
    notes: "",
    status: "DRAFT",
    items: [],
  });

  React.useEffect(() => {
    if (!edit && requestedBranchId) {
      setForm((current) => ({ ...current, branch: String(requestedBranchId) }));
      return;
    }
    if (!edit && branchId) {
      setForm((current) => ({ ...current, branch: String(branchId) }));
    }
  }, [branchId, edit, requestedBranchId]);

  const { data: optionsResponse } = useQuery({
    queryKey: ["grn-form-options", form.branch],
    queryFn: async () =>
      unwrap(
        await api.get("/purchases/grn/form-options/", {
          params: {
            branch: form.branch || undefined,
          },
        }),
      ),
  });

  const options = optionsResponse || {};
  const optionOrders = list(options.purchase_orders);
  const branches = list(options.branches);
  const optionReceivers = list(options.receivers);
  const racks = list(options.racks);
  const qualityStatuses = list(options.quality_statuses);

  // The backend GRN form-options endpoint is the source of truth for PO
  // eligibility. It intentionally returns only POs whose shipment has been
  // received/confirmed, so do not merge the generic PO list here (that would
  // re-introduce unconfirmed shipments into this selector).
  const orders = optionOrders;

  const receivers = React.useMemo(
    () =>
      optionReceivers
        .map((receiver) => ({
          ...receiver,
          id: getPk(receiver.id, receiver.user_id, receiver.user?.id),
          display_name: getText(
            receiver.display_name,
            receiver.full_name,
            receiver.name,
            receiver.user?.full_name,
            receiver.user?.name,
            receiver.user?.email,
            receiver.email,
          ),
        }))
        .filter((receiver) => receiver.id),
    [optionReceivers],
  );

  const { data: existing, isLoading } = useQuery({
    queryKey: ["grn", id],
    queryFn: async () => unwrap(await api.get(`/purchases/grn/${id}/`)),
    enabled: edit,
    staleTime: 0,
  });

  React.useEffect(() => {
    if (!existing) return;

    setForm({
      grn_number: existing.grn_number || "",
      purchase_order: String(
        existing.purchase_order?.id || existing.purchase_order || "",
      ),
      supplier: String(existing.supplier?.id || existing.supplier || ""),
      branch: String(existing.branch?.id || existing.branch || ""),
      received_date: existing.received_date || today(),
      received_by: String(
        existing.received_by?.id || existing.received_by || "",
      ),
      warehouse_location: existing.warehouse_location || "",
      notes: existing.notes || "",
      status: existing.status || "DRAFT",
      items: (existing.items || []).map((item) => {
        const productId = getPk(
          item.product_id,
          item.product?.id,
          item.product,
        );

        const variantId = getPk(
          item.variant_id,
          item.variant?.id,
          item.variant,
        );

        return {
          id: item.id,
          product: productId ? String(productId) : "",
          variant: variantId ? String(variantId) : "",
          product_name: getText(
            item.product_name,
            item.product?.product_name,
            item.product?.name,
          ),
          sku: getText(item.sku, item.variant?.sku, item.product?.sku),
          ordered_quantity: num(item.ordered_quantity ?? item.quantity),
          previously_received_quantity: num(item.previously_received_quantity),
          received_quantity: num(item.received_quantity),
          damaged_quantity: num(item.damaged_quantity),
          accepted_quantity: num(item.accepted_quantity),
          quality_status: item.quality_status || "QC_PASSED",
          rack: item.rack
            ? String(getPk(item.rack_id, item.rack, item.rack?.id) || "")
            : "",
          remarks: item.remarks || "",
        };
      }),
    });
  }, [existing]);

  const selectedOrder = React.useMemo(
    () =>
      orders.find((order) => String(order.id) === String(form.purchase_order)),
    [orders, form.purchase_order],
  );

  const filteredOrders = React.useMemo(() => {
    const search = purchaseOrderSearch.trim().toLowerCase();

    if (!search) return orders;

    return orders.filter((order) =>
      [
        order.po_number,
        order.supplier_name,
        order.branch_name,
        order.branch_code,
        order.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search),
    );
  }, [orders, purchaseOrderSearch]);

  React.useEffect(() => {
    if (selectedOrder) {
      setPurchaseOrderSearch(selectedOrder.po_number || "");
    } else if (!form.purchase_order) {
      setPurchaseOrderSearch("");
    }
  }, [selectedOrder, form.purchase_order]);

  const selectedReceiver = React.useMemo(() => {
    const fromOptions = receivers.find(
      (item) => String(item.id) === String(form.received_by),
    );

    if (fromOptions) {
      return fromOptions;
    }

    if (
      selectedOrder &&
      String(selectedOrder.shipment_received_by_id) === String(form.received_by)
    ) {
      return {
        id: selectedOrder.shipment_received_by_id,
        display_name:
          selectedOrder.shipment_received_by_name || "Shipment receiver",
      };
    }

    return null;
  }, [receivers, form.received_by, selectedOrder]);

  const updateForm = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
    setErrors((current) => ({
      ...current,
      [field]: "",
    }));
  };

  const updateItem = (index, patch) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }));
    setErrors((current) => ({
      ...current,
      items: "",
    }));
  };

  const selectPO = React.useCallback(
    async (value) => {
      let order = orders.find((item) => String(item.id) === String(value));

      if (!order) {
        toast.error("Selected purchase order could not be loaded.");
        return;
      }

      let rawItems = getPurchaseOrderItems(order);

      if (!rawItems.length) {
        try {
          const detailResponse = unwrap(
            await api.get(`/purchases/orders/${value}/`),
          );

          order = detailResponse?.data || detailResponse || order;
          rawItems = getPurchaseOrderItems(order);
        } catch (error) {
          console.error("[GRN PO item diagnostic] Detail request failed", {
            purchaseOrderId: value,
            error,
          });
          toast.error("Unable to load purchase-order items.");
          return;
        }
      }

      setPurchaseOrderSearch(order.po_number || "");
      setPurchaseOrderSearchOpen(false);

      const supplierId = getPk(
        order.supplier_id,
        order.supplier,
        order.supplier?.id,
      );

      const branchValue = getPk(
        order.branch_id,
        order.branch,
        order.branch?.id,
      );

      const shipmentReceiverId = getPk(
        order.shipment_received_by_id,
        order.shipment_received_by?.id,
      );

      if (!shipmentReceiverId) {
        toast.error("Shipment receiver is missing.", {
          description:
            "Open the linked Shipment Log, select Received By, then confirm the shipment before creating the GRN.",
        });
        return;
      }

      const itemDiagnostics = [];

      const normalizedItems = rawItems
        .map((item, itemIndex) => {
          const productId = getPk(
            item.product_id,
            item.product?.id,
            item.product,
          );

          const variantId = getPk(
            item.variant_id,
            item.variant?.id,
            item.variant,
          );

          const orderedQuantity = num(
            item.quantity ?? item.ordered_quantity ?? 0,
          );

          const previouslyReceived = num(
            item.previously_received_quantity ??
              item.received_grn_quantity ??
              0,
          );

          const remaining = Math.max(
            0,
            num(
              item.remaining_quantity ?? orderedQuantity - previouslyReceived,
            ),
          );

          const normalized = {
            po_item_id: getPk(item.po_item_id, item.id),
            product: productId ? String(productId) : "",
            variant: variantId ? String(variantId) : "",
            product_name: getText(
              item.product_name,
              item.product?.product_name,
              item.product?.name,
            ),
            sku: getText(item.sku, item.variant?.sku, item.product?.sku),
            ordered_quantity: orderedQuantity,
            previously_received_quantity: previouslyReceived,
            received_quantity: remaining,
            damaged_quantity: 0,
            accepted_quantity: remaining,
            quality_status: "QC_PASSED",
            rack: "",
            remarks: "",
          };

          itemDiagnostics.push({
            index: itemIndex,
            raw: item,
            normalized,
            excludedReason: !productId
              ? "Missing product ID"
              : orderedQuantity <= 0
                ? "Ordered quantity is zero"
                : remaining <= 0
                  ? "No remaining quantity"
                  : "Included",
          });

          return normalized;
        })
        .filter(
          (item) =>
            getPk(item.product) &&
            num(item.ordered_quantity) > 0 &&
            num(item.received_quantity) > 0,
        );

      console.groupCollapsed(
        `[GRN PO item diagnostic] ${order.po_number || value}`,
      );
      console.log("Purchase order", order);
      console.log("Raw item count", rawItems.length, rawItems);
      console.table(
        itemDiagnostics.map((entry) => ({
          index: entry.index,
          product: entry.normalized.product,
          product_name: entry.normalized.product_name,
          ordered: entry.normalized.ordered_quantity,
          previous: entry.normalized.previously_received_quantity,
          remaining: entry.normalized.received_quantity,
          result: entry.excludedReason,
        })),
      );
      console.log("Items loaded into GRN", normalizedItems);
      console.groupEnd();

      if (!rawItems.length) {
        toast.error("The selected purchase order has no item lines.", {
          description:
            "Open the browser console and check the GRN PO item diagnostic.",
        });
        return;
      }

      if (!normalizedItems.length) {
        toast.error("No receivable PO items were found.", {
          description:
            "The console diagnostic shows whether product IDs, quantities, or remaining balances are missing.",
        });
        return;
      }

      setForm((current) => ({
        ...current,
        purchase_order: String(order.id),
        supplier: supplierId ? String(supplierId) : "",
        branch: branchValue ? String(branchValue) : "",
        received_by: String(shipmentReceiverId),
        received_date:
          order.shipment_received_date || current.received_date || today(),
        items: normalizedItems,
      }));

      setErrors({});
    },
    [orders],
  );

  const totalOrdered = form.items.reduce(
    (sum, item) => sum + num(item.ordered_quantity),
    0,
  );
  const totalReceived = form.items.reduce(
    (sum, item) => sum + num(item.received_quantity),
    0,
  );
  const totalAccepted = form.items.reduce(
    (sum, item) => sum + num(item.accepted_quantity),
    0,
  );
  const totalRejected = form.items.reduce(
    (sum, item) => sum + num(item.damaged_quantity),
    0,
  );

  const receiptStatus = !form.items.length
    ? "DRAFT"
    : form.items.every(
          (item) =>
            num(item.received_quantity) >=
            Math.max(
              0,
              num(item.ordered_quantity) -
                num(item.previously_received_quantity),
            ),
        )
      ? "FULL_RECEIPT"
      : "PARTIAL_RECEIPT";

  React.useEffect(() => {
    if (
      edit ||
      prefillAppliedRef.current ||
      !requestedPurchaseOrderId ||
      !orders.length
    ) {
      return;
    }

    if (
      !orders.some(
        (order) => String(order.id) === String(requestedPurchaseOrderId),
      )
    ) {
      return;
    }

    prefillAppliedRef.current = true;
    selectPO(String(requestedPurchaseOrderId));
  }, [edit, requestedPurchaseOrderId, orders, selectPO]);

  const validate = () => {
    const next = {};

    if (!form.purchase_order)
      next.purchase_order = "Purchase order is required.";
    if (!form.branch) next.branch = "Receiving branch is required.";
    if (!form.received_by) next.received_by = "Received by is required.";
    if (!form.received_date) next.received_date = "Received date is required.";
    if (!form.items.length)
      next.items = "No purchase-order items are available.";

    const invalidProduct = form.items.some((item) => !getPk(item.product));

    if (invalidProduct) {
      next.items =
        "One or more purchase-order lines do not contain a valid product ID.";
    }

    const invalid = form.items.some((item) => {
      const received = num(item.received_quantity);
      const accepted = num(item.accepted_quantity);
      const damaged = num(item.damaged_quantity);
      const remaining = Math.max(
        0,
        num(item.ordered_quantity) - num(item.previously_received_quantity),
      );

      return (
        received < 0 ||
        accepted < 0 ||
        damaged < 0 ||
        accepted + damaged !== received ||
        received > remaining
      );
    });

    if (invalid) {
      next.items =
        "Received quantity cannot exceed the remaining PO quantity, and accepted plus rejected must equal received.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = useMutation({
    mutationFn: async ({ confirm }) => {
      const data = new FormData();

      const payload = {
        ...form,
        grn_number: form.grn_number || undefined,
        purchase_order: Number(form.purchase_order),
        supplier: Number(form.supplier),
        branch: Number(form.branch),
        received_by: Number(form.received_by),
        status: confirm ? "CONFIRMED" : "DRAFT",
        items: form.items.map((item) => {
          const productId = getPk(item.product);
          const variantId = getPk(item.variant);
          const rackId = getPk(item.rack);

          return {
            ...(item.id ? { id: item.id } : {}),
            ...(item.po_item_id
              ? {
                  po_item_id: Number(item.po_item_id),
                }
              : {}),
            product: productId,
            variant: variantId,
            ordered_quantity: num(item.ordered_quantity),
            received_quantity: num(item.received_quantity),
            damaged_quantity: num(item.damaged_quantity),
            accepted_quantity: num(item.accepted_quantity),
            quality_status: item.quality_status,
            rack: rackId,
            remarks: item.remarks || "",
          };
        }),
      };

      data.append("payload", JSON.stringify(payload));
      files.forEach((file) => data.append("attachments", file));

      const config = {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        skipGlobalErrorToast: true,
      };

      if (edit) {
        await api.patch(`/purchases/grn/${id}/`, data, config);
        if (confirm) {
          return api.post(`/purchases/grn/${id}/confirm/`, {}, config);
        }
        return api.get(`/purchases/grn/${id}/`);
      }

      const response = await api.post("/purchases/grn/", data, config);
      const created = unwrap(response);

      if (confirm) {
        return api.post(`/purchases/grn/${created.id}/confirm/`, {}, config);
      }

      return response;
    },

    onSuccess: async (response) => {
      const saved = unwrap(response);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["grns"] }),
        queryClient.invalidateQueries({ queryKey: ["purchase-orders"] }),
        queryClient.invalidateQueries({ queryKey: ["stock-overview"] }),
      ]);

      toast.success(
        saved.is_confirmed
          ? "GRN confirmed and stock updated."
          : "GRN saved as draft.",
      );

      navigate(`/purchases/grn/${saved.id || id}`);
    },

    onError: (error) => {
      const details = getApiErrorDetails(error);
      toast.error(details.title || "Unable to save GRN", {
        description:
          details.summary ||
          details.message ||
          "Please correct the highlighted fields.",
      });
    },
  });

  const submit = (confirm) => {
    if (!validate()) return;
    save.mutate({ confirm });
  };

  const addFiles = (event) => {
    const incoming = Array.from(event.target.files || []);
    const valid = incoming.filter(
      (file) =>
        file.size <= 10 * 1024 * 1024 &&
        [".pdf", ".jpg", ".jpeg", ".png"].some((ext) =>
          file.name.toLowerCase().endsWith(ext),
        ),
    );

    if (valid.length !== incoming.length) {
      toast.error("Only PDF, JPG and PNG files up to 10 MB are allowed.");
    }

    setFiles((current) => [...current, ...valid]);
    event.target.value = "";
  };

  if (edit && isLoading) {
    return <div className="card-surface p-6">Loading GRN...</div>;
  }

  return (
    <div className="purchase-module-page purchase-workspace mx-auto max-w-7xl space-y-5 pb-10">
      <PageHeader
        title={edit ? "Edit GRN" : "New GRN"}
        subtitle="Confirm physical receipt of stock against a purchase order"
        actions={
          <span className="rounded-md bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-600 dark:bg-violet-500/10 dark:text-violet-300">
            {form.grn_number || "Auto GRN"} ·{" "}
            {form.is_confirmed ? "Confirmed" : "Draft"}
          </span>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_290px]">
        <div className="space-y-5">
          <section className="card-surface p-5">
            <h2 className="font-semibold">Linked purchase order</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Ordered quantities and supplier are pulled from the PO.
            </p>

            <div className="mt-4">
              <Label>PO reference *</Label>

              <div className="relative mt-2">
                <Input
                  value={purchaseOrderSearch}
                  autoComplete="off"
                  onFocus={() => setPurchaseOrderSearchOpen(true)}
                  onChange={(event) => {
                    const value = event.target.value;

                    setPurchaseOrderSearch(value);
                    setPurchaseOrderSearchOpen(true);

                    if (selectedOrder && value !== selectedOrder.po_number) {
                      updateForm("purchase_order", "");
                      updateForm("supplier", "");
                      updateForm("received_by", "");
                      setForm((current) => ({
                        ...current,
                        items: [],
                      }));
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      setPurchaseOrderSearchOpen(false);
                    }
                  }}
                  placeholder="Search and select purchase order"
                />

                {purchaseOrderSearchOpen ? (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-background p-1 shadow-xl dark:border-white/10">
                    {filteredOrders.length ? (
                      filteredOrders.map((order) => (
                        <button
                          key={order.id}
                          type="button"
                          className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-slate-100 dark:hover:bg-white/5"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => selectPO(String(order.id))}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                              {order.po_number}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              {[
                                order.supplier_name,
                                order.branch_code || order.branch_name,
                                order.status,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </div>

                          <span className="shrink-0 text-xs font-medium">
                            <CurrencyText
                              value={order.total_amount || 0}
                              currency={order.currency || "AED"}
                            />
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                        No eligible purchase orders found.
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              {errors.purchase_order && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.purchase_order}
                </p>
              )}

              {selectedOrder && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs dark:border-white/10 dark:bg-white/[0.025]">
                  <span className="font-medium">
                    {selectedOrder.po_number} · {selectedOrder.supplier_name}
                  </span>
                  <span className="text-blue-600 dark:text-blue-400">
                    Linked shipment:{" "}
                    {selectedOrder.shipment_number || "Not linked"}
                  </span>
                </div>
              )}
            </div>
          </section>

          <section className="card-surface p-5">
            <h2 className="font-semibold">Receipt details</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Where and when the goods physically arrived.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <Label>Date received *</Label>
                <Input
                  type="date"
                  value={form.received_date}
                  onChange={(event) =>
                    updateForm("received_date", event.target.value)
                  }
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Receiving branch *</Label>
                <Select
                  value={form.branch}
                  onValueChange={(value) => updateForm("branch", value)}
                  disabled={Boolean(branchId)}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={String(branch.id)}>
                        {branch.branch_code} - {branch.branch_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Warehouse location</Label>
                <Input
                  value={form.warehouse_location}
                  onChange={(event) =>
                    updateForm("warehouse_location", event.target.value)
                  }
                  placeholder="Enter warehouse location"
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Received by *</Label>
                <Input
                  className="mt-2"
                  value={selectedReceiver?.display_name || ""}
                  placeholder="Select a purchase order first"
                  disabled
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Automatically copied from the confirmed Shipment Log.
                </p>
                {errors.received_by ? (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.received_by}
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          <section className="card-surface overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4 dark:border-white/10">
              <h2 className="font-semibold">Items received</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Enter received quantity and quality-check result per line.
              </p>
            </div>

            <div className="overflow-x-auto p-5">
              <div className="min-w-[900px]">
                <div className="grid grid-cols-[minmax(260px,1fr)_110px_110px_150px_150px] gap-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <span>Item</span>
                  <span className="text-right">Ordered</span>
                  <span className="text-right">Received</span>
                  <span>QC Result</span>
                  <span>Rack</span>
                </div>

                <div className="space-y-2">
                  {form.items.map((item, index) => (
                    <div
                      key={item.id || index}
                      className="grid grid-cols-[minmax(260px,1fr)_110px_110px_150px_150px] items-center gap-3 border-b border-slate-100 py-2 last:border-b-0 dark:border-white/5"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {item.product_name || item.sku}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.sku || "No SKU"}
                          {item.previously_received_quantity
                            ? ` · Previously received ${item.previously_received_quantity}`
                            : ""}
                        </p>
                      </div>

                      <div className="text-right text-sm">
                        {item.ordered_quantity}
                      </div>

                      <Input
                        type="number"
                        min="0"
                        max={Math.max(
                          0,
                          num(item.ordered_quantity) -
                            num(item.previously_received_quantity),
                        )}
                        value={item.received_quantity}
                        onChange={(event) => {
                          const received = Math.max(
                            0,
                            Math.min(
                              num(event.target.value),
                              Math.max(
                                0,
                                num(item.ordered_quantity) -
                                  num(item.previously_received_quantity),
                              ),
                            ),
                          );

                          updateItem(index, {
                            received_quantity: received,
                            accepted_quantity: received,
                            damaged_quantity: 0,
                          });
                        }}
                        className="text-right"
                      />
                      <Select
                        value={item.quality_status}
                        onValueChange={(value) =>
                          updateItem(index, {
                            quality_status: value,
                            damaged_quantity:
                              value === "QC_REJECTED"
                                ? num(item.received_quantity)
                                : value === "QC_PASSED"
                                  ? 0
                                  : num(item.damaged_quantity),
                            accepted_quantity:
                              value === "QC_REJECTED"
                                ? 0
                                : value === "QC_PASSED"
                                  ? num(item.received_quantity)
                                  : num(item.accepted_quantity),
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {qualityStatuses.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={item.rack || "__none__"}
                        onValueChange={(value) =>
                          updateItem(index, {
                            rack: value === "__none__" ? "" : value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select rack" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">No rack</SelectItem>
                          {racks.map((rack) => (
                            <SelectItem key={rack.id} value={String(rack.id)}>
                              {rack.rack_code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>

                {errors.items && (
                  <p className="mt-3 text-sm text-red-500">{errors.items}</p>
                )}

                {receiptStatus === "PARTIAL_RECEIPT" &&
                  form.items.length > 0 && (
                    <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
                      Some lines are below the remaining ordered quantity. This
                      GRN will be marked as a partial receipt.
                    </p>
                  )}
              </div>
            </div>
          </section>

          <section className="card-surface p-5">
            <Label>Notes</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Damage, shortage or QC remarks for this receipt.
            </p>
            <Textarea
              rows={4}
              value={form.notes}
              onChange={(event) => updateForm("notes", event.target.value)}
              placeholder="e.g. 2 units arrived scratched and were flagged for supplier credit note"
              className="mt-3"
            />
          </section>

          <section className="card-surface p-5">
            <Label>Attachments</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Delivery note, photos of goods or damage, signed receipt.
            </p>

            <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-7 text-center transition hover:border-blue-400 dark:border-white/15 dark:bg-white/[0.025]">
              <UploadCloud className="h-7 w-7 text-blue-500" />
              <span className="mt-2 text-sm font-medium">
                Drag files here or browse to upload
              </span>
              <span className="mt-1 text-xs text-muted-foreground">
                PDF, JPG, PNG up to 10 MB
              </span>
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                className="sr-only"
                onChange={addFiles}
              />
            </label>

            {files.length > 0 && (
              <div className="mt-3 space-y-2">
                {files.map((file, index) => (
                  <div
                    key={`${file.name}-${file.size}`}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <FileText className="h-5 w-5 text-blue-500" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatSize(file.size)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setFiles((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate("/purchases/grn")}
              disabled={save.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => submit(false)}
              disabled={save.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              Save Draft
            </Button>
            <Button
              type="button"
              className="bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => submit(true)}
              disabled={save.isPending}
            >
              <Send className="mr-2 h-4 w-4" />
              Confirm GRN
            </Button>
          </div>
        </div>

        <aside className="space-y-5">
          <section className="card-surface p-5">
            <h2 className="font-semibold">GRN summary</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {form.grn_number || "Auto GRN"} · Draft
            </p>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Linked PO</span>
                <span className="font-medium">
                  {selectedOrder?.po_number || "—"}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Supplier</span>
                <span className="text-right font-medium">
                  {selectedOrder?.supplier_name || "—"}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Branch</span>
                <span className="font-medium">
                  {branches.find(
                    (item) => String(item.id) === String(form.branch),
                  )?.branch_name || "—"}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Received by</span>
                <span className="font-medium">
                  {selectedReceiver?.display_name || "—"}
                </span>
              </div>

              <div className="border-t pt-3">
                <div className="flex justify-between text-xs">
                  <span>
                    {totalAccepted} / {totalOrdered} units received
                  </span>
                  <span>
                    {totalOrdered
                      ? Math.round((totalAccepted / totalOrdered) * 100)
                      : 0}
                    %
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{
                      width: `${Math.min(
                        100,
                        totalOrdered ? (totalAccepted / totalOrdered) * 100 : 0,
                      )}%`,
                    }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {totalRejected} rejected unit(s)
                </p>
              </div>
            </div>
          </section>

          <section className="card-surface p-5">
            <h2 className="font-semibold">What happens next</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Triggered automatically on confirmation.
            </p>

            <div className="mt-4 space-y-3">
              <div className="rounded-lg border p-3">
                <p className="text-sm font-medium">Stock IN movement</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Accepted quantities update branch stock using the chosen rack.
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-sm font-medium">PO receipt progress</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  The linked PO becomes partially received or fully received.
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-sm font-medium">Supplier bill readiness</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Confirmed accepted quantities are available for supplier
                  billing.
                </p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
