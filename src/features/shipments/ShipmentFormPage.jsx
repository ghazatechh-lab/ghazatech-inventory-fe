import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Trash2 } from "lucide-react";
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

const normalizeList = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (Array.isArray(value?.results)) {
    return value.results;
  }

  if (Array.isArray(value?.data)) {
    return value.data;
  }

  if (Array.isArray(value?.data?.results)) {
    return value.data.results;
  }

  return [];
};

const today = () => new Date().toISOString().slice(0, 10);

const money = (value) => {
  const parsed = Number(value || 0);

  return Number.isFinite(parsed) ? parsed : 0;
};

const emptyItem = () => ({
  product: "",
  variant: "",
  product_name: "",
  sku: "",
  brand_name: "",
  condition: "NEW",
  expected_quantity: 0,
  received_quantity: 0,
  accepted_quantity: 0,
  rejected_quantity: 0,
  unit_cost: 0,
  vat_percentage: 5,
  rack: "",
  serial_number: "",
  batch_number: "",
  remarks: "",
});

const optionValue = (value) =>
  value === null || value === undefined ? "" : String(value);

export default function ShipmentFormPage() {
  const { id } = useParams();
  const edit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { branchId } = useActiveBranchFilter();

  const [form, setForm] = React.useState({
    shipment_number: "",
    shipment_type: "PURCHASE",
    purchase_order: "",
    supplier: "",
    branch: branchId ? String(branchId) : "",
    warehouse: "",
    shipment_date: today(),
    received_date: today(),
    received_by: "",
    shipment_method: "Purchase Receipt",
    courier: "",
    tracking_number: "",
    container_number: "",
    expected_date: "",
    supplier_invoice_number: "",
    delivery_note_number: "",
    status: "DRAFT",
    notes: "",
    checked_by_name: "",
    qc_status: "PENDING",
    inspection_remarks: "",
    items: [],
  });

  const [errors, setErrors] = React.useState({});

  React.useEffect(() => {
    if (!edit && branchId) {
      setForm((current) => ({
        ...current,
        branch: String(branchId),
      }));
    }
  }, [branchId, edit]);

  const { data: optionResponse, isLoading: optionsLoading } = useQuery({
    queryKey: ["shipment-form-options", form.branch],

    queryFn: async () =>
      unwrap(
        await api.get("/shipments/form-options/", {
          params: {
            branch: form.branch || undefined,
          },
        }),
      ),

    staleTime: 60 * 1000,
  });

  const options = optionResponse || {};

  const purchaseOrders = normalizeList(options.purchase_orders);

  const suppliers = normalizeList(options.suppliers);

  const allBranches = normalizeList(options.branches);

  const warehouses = normalizeList(options.warehouses).filter(
    (warehouse) =>
      !form.branch ||
      !warehouse.branch_id ||
      String(warehouse.branch_id) === String(form.branch),
  );

  const receivers = normalizeList(options.receivers);

  const products = normalizeList(options.products);

  const racks = normalizeList(options.racks);

  const shipmentTypes = normalizeList(options.shipment_types);

  const shipmentStatuses = normalizeList(options.shipment_statuses);

  const conditions = normalizeList(options.conditions);

  const qcStatuses = normalizeList(options.qc_statuses);

  const branches = React.useMemo(
    () =>
      branchId
        ? allBranches.filter((branch) => String(branch.id) === String(branchId))
        : allBranches,
    [allBranches, branchId],
  );

  const { data: existing, isLoading: existingLoading } = useQuery({
    queryKey: ["shipment", id],

    queryFn: async () => unwrap(await api.get(`/shipments/${id}/`)),

    enabled: edit,
    staleTime: 0,
  });

  React.useEffect(() => {
    if (!existing) {
      return;
    }

    setForm({
      shipment_number: existing.shipment_number || "",

      shipment_type: existing.purchase_order
        ? "PURCHASE"
        : existing.shipment_type || "PURCHASE",

      purchase_order: optionValue(
        existing.purchase_order?.id ?? existing.purchase_order,
      ),

      supplier: optionValue(existing.supplier?.id ?? existing.supplier),

      branch: optionValue(existing.branch?.id ?? existing.branch),

      warehouse: existing.warehouse || "",

      shipment_date: existing.shipment_date || today(),

      received_date: existing.received_date || today(),

      received_by: optionValue(
        existing.received_by?.id ?? existing.received_by,
      ),

      shipment_method: existing.shipment_method || "Purchase Receipt",

      courier: existing.courier || "",

      tracking_number: existing.tracking_number || "",

      container_number: existing.container_number || "",

      expected_date: existing.expected_date || "",

      supplier_invoice_number: existing.supplier_invoice_number || "",

      delivery_note_number: existing.delivery_note_number || "",

      status: existing.status || "DRAFT",

      notes: existing.notes || "",

      checked_by_name: existing.checked_by_name || "",

      qc_status: existing.qc_status || "PENDING",

      inspection_remarks: existing.inspection_remarks || "",

      items: (existing.items || []).map((item) => ({
        id: item.id,

        product: optionValue(item.product?.id ?? item.product),

        variant: optionValue(item.variant?.id ?? item.variant),

        product_name: item.product_name || "",

        sku: item.sku || "",

        brand_name: item.brand_name || "",

        condition: item.condition || "NEW",

        expected_quantity: item.expected_quantity || 0,

        received_quantity: item.received_quantity || 0,

        accepted_quantity: item.accepted_quantity || 0,

        rejected_quantity: item.rejected_quantity || 0,

        unit_cost: item.unit_cost || 0,

        vat_percentage: item.vat_percentage ?? 5,

        rack: optionValue(item.rack?.id ?? item.rack),

        serial_number: item.serial_number || "",

        batch_number: item.batch_number || "",

        remarks: item.remarks || "",
      })),
    });
  }, [existing]);

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
        itemIndex === index
          ? {
              ...item,
              ...patch,
            }
          : item,
      ),
    }));

    setErrors((current) => ({
      ...current,
      items: "",
    }));
  };

  const selectPurchaseOrder = (value) => {
    const order = purchaseOrders.find(
      (item) => String(item.id) === String(value),
    );

    if (!order) {
      return;
    }

    setForm((current) => ({
      ...current,

      purchase_order: String(value),

      supplier: optionValue(
        order.supplier_id ?? order.supplier?.id ?? order.supplier,
      ),

      branch: optionValue(
        order.branch_id ?? order.branch?.id ?? order.branch ?? current.branch,
      ),

      expected_date: order.expected_delivery_date || current.expected_date,

      items: (order.items || []).map((item) => ({
        product: optionValue(
          item.product_id ?? item.product?.id ?? item.product,
        ),

        variant: optionValue(
          item.variant_id ?? item.variant?.id ?? item.variant,
        ),

        product_name: item.product_name || "",

        sku: item.sku || "",

        brand_name: item.brand_name || "",

        condition: "NEW",

        expected_quantity: Number(item.quantity || 0),

        received_quantity: Number(item.quantity || 0),

        accepted_quantity: Number(item.quantity || 0),

        rejected_quantity: 0,

        unit_cost: Number(item.unit_price || 0),

        vat_percentage: Number(item.vat_percentage ?? 5),

        rack: "",
        serial_number: "",
        batch_number: "",
        remarks: "",
      })),
    }));
  };

  const selectSupplier = (value) => {
    updateForm("supplier", value);

    setForm((current) => ({
      ...current,

      purchase_order: purchaseOrders.some(
        (order) =>
          String(order.id) === String(current.purchase_order) &&
          String(order.supplier_id) === String(value),
      )
        ? current.purchase_order
        : "",
    }));
  };

  const selectProduct = (index, productId) => {
    const product = products.find(
      (item) => String(item.id) === String(productId),
    );

    if (!product) {
      return;
    }

    const variants = product.variants || [];

    const defaultVariant =
      variants.find((variant) => variant.is_base) || variants[0];

    updateItem(index, {
      product: String(product.id),

      variant: defaultVariant ? String(defaultVariant.id) : "",

      product_name: product.product_name || "",

      sku: defaultVariant?.sku || product.sku || "",

      brand_name: product.brand_name || "",

      unit_cost: defaultVariant?.purchase_price ?? product.purchase_price ?? 0,
    });
  };

  const selectVariant = (index, variantId) => {
    const product = products.find(
      (item) => String(item.id) === String(form.items[index]?.product),
    );

    const variant = (product?.variants || []).find(
      (item) => String(item.id) === String(variantId),
    );

    if (!variant) {
      updateItem(index, {
        variant: "",
      });

      return;
    }

    updateItem(index, {
      variant: String(variant.id),

      sku: variant.sku || product?.sku || "",

      unit_cost: variant.purchase_price ?? form.items[index]?.unit_cost ?? 0,
    });
  };

  const itemTotals = React.useMemo(
    () =>
      form.items.map((item) => {
        const taxable = money(item.accepted_quantity) * money(item.unit_cost);

        const vat = (taxable * money(item.vat_percentage)) / 100;

        return taxable + vat;
      }),
    [form.items],
  );

  const totalReceived = form.items.reduce(
    (sum, item) => sum + money(item.received_quantity),
    0,
  );

  const totalAccepted = form.items.reduce(
    (sum, item) => sum + money(item.accepted_quantity),
    0,
  );

  const totalRejected = form.items.reduce(
    (sum, item) => sum + money(item.rejected_quantity),
    0,
  );

  const validate = () => {
    const next = {};

    if (!form.shipment_type) {
      next.shipment_type = "Shipment type is required.";
    }

    if (!form.purchase_order) {
      next.purchase_order = "Purchase order is required.";
    }

    if (!form.supplier) {
      next.supplier = "Supplier is required.";
    }

    if (!form.branch) {
      next.branch = "Receiving branch is required.";
    }

    if (!form.warehouse) {
      next.warehouse = "Warehouse is required.";
    }

    if (!form.received_date) {
      next.received_date = "Received date is required.";
    }

    if (!form.received_by) {
      next.received_by = "Received by is required.";
    }

    if (!form.items.length) {
      next.items = "Add at least one received product.";
    }

    const invalidItem = form.items.some((item) => {
      const received = money(item.received_quantity);

      const accepted = money(item.accepted_quantity);

      const rejected = money(item.rejected_quantity);

      return (
        !item.product ||
        received < 0 ||
        accepted < 0 ||
        rejected < 0 ||
        accepted + rejected !== received
      );
    });

    if (invalidItem) {
      next.items =
        "For every product, accepted quantity plus rejected quantity must equal received quantity.";
    }

    setErrors(next);

    return Object.keys(next).length === 0;
  };

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        ...form,

        // This form records supplier purchase receipts.
        shipment_type: "PURCHASE",

        shipment_number: form.shipment_number || undefined,

        purchase_order: Number(form.purchase_order),

        supplier: Number(form.supplier),

        branch: Number(form.branch),

        received_by: Number(form.received_by),

        items: form.items.map((item) => ({
          ...(item.id
            ? {
                id: item.id,
              }
            : {}),

          product: Number(item.product),

          variant: item.variant ? Number(item.variant) : null,

          condition: item.condition,

          expected_quantity: Number(item.expected_quantity),

          received_quantity: Number(item.received_quantity),

          accepted_quantity: Number(item.accepted_quantity),

          rejected_quantity: Number(item.rejected_quantity),

          unit_cost: money(item.unit_cost),

          vat_percentage: money(item.vat_percentage),

          rack: item.rack ? Number(item.rack) : null,

          serial_number: item.serial_number || "",

          batch_number: item.batch_number || "",

          remarks: item.remarks || "",
        })),
      };

      return edit
        ? api.patch(`/shipments/${id}/`, body, {
            skipGlobalErrorToast: true,
          })
        : api.post("/shipments/", body, {
            skipGlobalErrorToast: true,
          });
    },

    onSuccess: async (response) => {
      const saved = unwrap(response);

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["shipments"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["purchase-orders"],
        }),
      ]);

      toast.success(edit ? "Shipment updated." : "Shipment logged.");

      navigate(`/shipments/${saved?.id || id}`);
    },

    onError: (error) => {
      const details = getApiErrorDetails(error);

      const next = {};

      (details.errors || []).forEach(({ field, message }) => {
        const root = field?.split(/[.[]/)[0];

        if (root) {
          next[root] = message;
        }
      });

      setErrors((current) => ({
        ...current,
        ...next,
      }));

      toast.error(details.title || "Unable to save shipment", {
        description:
          details.summary ||
          details.message ||
          "Please correct the highlighted fields.",
      });
    },
  });

  const submit = () => {
    if (!validate()) {
      return;
    }

    save.mutate();
  };

  if (edit && existingLoading) {
    return <div className="card-surface p-6">Loading shipment...</div>;
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 pb-10">
      <PageHeader
        title={edit ? "Edit Shipment" : "New Shipment"}
        subtitle="Receive purchased items and add accepted quantities to branch stock"
        actions={
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
            {form.status.replace(/_/g, " ")}
          </span>
        }
      />

      <section className="card-surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <h2 className="font-semibold">1. Shipment Information</h2>

          <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
            Purchase Receipt
          </span>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <Label>Shipment Number</Label>

            <Input
              value={form.shipment_number}
              placeholder="Generated automatically on save"
              className="mt-2"
              readOnly
              disabled={!edit}
            />
          </div>

          <div>
            <Label>Shipment Type</Label>

            <Select
              value={form.shipment_type}
              onValueChange={(value) => updateForm("shipment_type", value)}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select shipment type" />
              </SelectTrigger>

              <SelectContent>
                {shipmentTypes.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Purchase Order</Label>

            <Select
              value={form.purchase_order}
              onValueChange={selectPurchaseOrder}
              disabled={optionsLoading}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select Purchase Order" />
              </SelectTrigger>

              <SelectContent className="max-h-72">
                {purchaseOrders.map((order) => (
                  <SelectItem key={order.id} value={String(order.id)}>
                    {order.po_number}
                    {" · "}
                    {order.supplier_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {errors.purchase_order && (
              <p className="mt-1 text-xs text-red-500">
                {errors.purchase_order}
              </p>
            )}
          </div>

          <div>
            <Label>Supplier</Label>

            <Select
              value={form.supplier}
              onValueChange={selectSupplier}
              disabled={optionsLoading}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>

              <SelectContent className="max-h-72">
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={String(supplier.id)}>
                    {supplier.supplier_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {errors.supplier && (
              <p className="mt-1 text-xs text-red-500">{errors.supplier}</p>
            )}
          </div>

          <div>
            <Label>Receiving Branch</Label>

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
                    {branch.branch_code}
                    {branch.branch_name ? ` - ${branch.branch_name}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {errors.branch && (
              <p className="mt-1 text-xs text-red-500">{errors.branch}</p>
            )}
          </div>

          <div>
            <Label>Warehouse</Label>

            <Select
              value={form.warehouse}
              onValueChange={(value) => updateForm("warehouse", value)}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select warehouse" />
              </SelectTrigger>

              <SelectContent>
                {warehouses.map((warehouse) => (
                  <SelectItem key={warehouse.value} value={warehouse.value}>
                    {warehouse.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {errors.warehouse && (
              <p className="mt-1 text-xs text-red-500">{errors.warehouse}</p>
            )}
          </div>

          <div>
            <Label>Received Date</Label>

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
            <Label>Received By</Label>

            <Select
              value={form.received_by}
              onValueChange={(value) => updateForm("received_by", value)}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>

              <SelectContent className="max-h-72">
                {receivers.map((receiver) => (
                  <SelectItem key={receiver.id} value={String(receiver.id)}>
                    {receiver.display_name}
                    {receiver.role_name ? ` · ${receiver.role_name}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {errors.received_by && (
              <p className="mt-1 text-xs text-red-500">{errors.received_by}</p>
            )}
          </div>

          <div>
            <Label>Shipment Method</Label>

            <Select
              value={form.shipment_method}
              onValueChange={(value) => updateForm("shipment_method", value)}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                {[
                  "Purchase Receipt",
                  "Air Freight",
                  "Sea Freight",
                  "Road Freight",
                  "Courier",
                  "Local Delivery",
                  "Supplier Delivery",
                  "Customer Pickup",
                  "Other",
                ].map((method) => (
                  <SelectItem key={method} value={method}>
                    {method}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Courier</Label>

            <Input
              value={form.courier}
              onChange={(event) => updateForm("courier", event.target.value)}
              placeholder="Courier name"
              className="mt-2"
            />
          </div>

          <div>
            <Label>Supplier Invoice No.</Label>

            <Input
              value={form.supplier_invoice_number}
              onChange={(event) =>
                updateForm("supplier_invoice_number", event.target.value)
              }
              placeholder="e.g. INV-7854"
              className="mt-2"
            />
          </div>

          <div>
            <Label>Delivery Note No.</Label>

            <Input
              value={form.delivery_note_number}
              onChange={(event) =>
                updateForm("delivery_note_number", event.target.value)
              }
              placeholder="e.g. DN-4568"
              className="mt-2"
            />
          </div>

          <div>
            <Label>Tracking Number</Label>

            <Input
              value={form.tracking_number}
              onChange={(event) =>
                updateForm("tracking_number", event.target.value)
              }
              placeholder="Tracking number"
              className="mt-2"
            />
          </div>

          <div>
            <Label>Container Number</Label>

            <Input
              value={form.container_number}
              onChange={(event) =>
                updateForm("container_number", event.target.value)
              }
              placeholder="Container number"
              className="mt-2"
            />
          </div>

          <div>
            <Label>Expected Date</Label>

            <Input
              type="date"
              value={form.expected_date}
              onChange={(event) =>
                updateForm("expected_date", event.target.value)
              }
              className="mt-2"
            />
          </div>

          <div>
            <Label>Shipment Status</Label>

            <Select
              value={form.status}
              onValueChange={(value) => updateForm("status", value)}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                {shipmentStatuses.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2 xl:col-span-4">
            <Label>General Remarks</Label>

            <Textarea
              value={form.notes}
              onChange={(event) => updateForm("notes", event.target.value)}
              placeholder="Add shipment notes, supplier details, freight or delivery information..."
              className="mt-2"
              rows={3}
            />
          </div>
        </div>
      </section>

      <section className="card-surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <h2 className="font-semibold">2. Received Products</h2>

          <Button
            type="button"
            size="sm"
            onClick={() =>
              setForm((current) => ({
                ...current,
                items: [...current.items, emptyItem()],
              }))
            }
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add Item
          </Button>
        </div>

        <div className="overflow-x-auto p-3">
          <div className="min-w-[1750px]">
            <div className="grid grid-cols-[220px_180px_115px_100px_repeat(4,88px)_110px_82px_120px_130px_38px] gap-2 px-1 pb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              <span>Product</span>
              <span>Variant / SKU</span>
              <span>Brand</span>
              <span>Condition</span>
              <span className="text-right">Ordered</span>
              <span className="text-right">Received</span>
              <span className="text-right">Accepted</span>
              <span className="text-right">Rejected</span>
              <span className="text-right">Unit Cost</span>
              <span className="text-right">VAT %</span>
              <span>Rack</span>
              <span className="text-right">Total</span>
              <span />
            </div>

            <div className="space-y-2">
              {form.items.map((item, index) => {
                const product = products.find(
                  (candidate) => String(candidate.id) === String(item.product),
                );

                const variants = product?.variants || [];

                return (
                  <div
                    key={item.id || index}
                    className="grid grid-cols-[220px_180px_115px_100px_repeat(4,88px)_110px_82px_120px_130px_38px] items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-white/10 dark:bg-white/[0.025]"
                  >
                    <Select
                      value={item.product}
                      onValueChange={(value) => selectProduct(index, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>

                      <SelectContent className="max-h-72">
                        {products.map((product) => (
                          <SelectItem
                            key={product.id}
                            value={String(product.id)}
                          >
                            {product.product_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={item.variant || "__base__"}
                      onValueChange={(value) =>
                        selectVariant(index, value === "__base__" ? "" : value)
                      }
                      disabled={!variants.length}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Variant / SKU" />
                      </SelectTrigger>

                      <SelectContent className="max-h-72">
                        <SelectItem value="__base__">Base product</SelectItem>

                        {variants.map((variant) => (
                          <SelectItem
                            key={variant.id}
                            value={String(variant.id)}
                          >
                            {variant.display_name ||
                              variant.sku ||
                              `Variant ${variant.id}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Input value={item.brand_name} readOnly />

                    <Select
                      value={item.condition}
                      onValueChange={(value) =>
                        updateItem(index, {
                          condition: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        {conditions.map((condition) => (
                          <SelectItem
                            key={condition.value}
                            value={condition.value}
                          >
                            {condition.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Input
                      type="number"
                      min="0"
                      value={item.expected_quantity}
                      onChange={(event) =>
                        updateItem(index, {
                          expected_quantity: event.target.value,
                        })
                      }
                      className="text-right"
                    />

                    <Input
                      type="number"
                      min="0"
                      value={item.received_quantity}
                      onChange={(event) => {
                        const received = Number(event.target.value || 0);

                        updateItem(index, {
                          received_quantity: received,

                          accepted_quantity: received,

                          rejected_quantity: 0,
                        });
                      }}
                      className="text-right"
                    />

                    <Input
                      type="number"
                      min="0"
                      value={item.accepted_quantity}
                      onChange={(event) =>
                        updateItem(index, {
                          accepted_quantity: event.target.value,
                        })
                      }
                      className="text-right"
                    />

                    <Input
                      type="number"
                      min="0"
                      value={item.rejected_quantity}
                      onChange={(event) =>
                        updateItem(index, {
                          rejected_quantity: event.target.value,
                        })
                      }
                      className="text-right"
                    />

                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_cost}
                      onChange={(event) =>
                        updateItem(index, {
                          unit_cost: event.target.value,
                        })
                      }
                      className="text-right"
                    />

                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={item.vat_percentage}
                      onChange={(event) =>
                        updateItem(index, {
                          vat_percentage: event.target.value,
                        })
                      }
                      className="text-right"
                    />

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

                      <SelectContent className="max-h-72">
                        <SelectItem value="__none__">No rack</SelectItem>

                        {racks.map((rack) => (
                          <SelectItem key={rack.id} value={String(rack.id)}>
                            {rack.rack_code}
                            {rack.rack_name ? ` - ${rack.rack_name}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="text-right text-sm font-semibold">
                      <CurrencyText value={itemTotals[index] || 0} />
                    </div>

                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,

                          items: current.items.filter(
                            (_, itemIndex) => itemIndex !== index,
                          ),
                        }))
                      }
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
                );
              })}
            </div>

            {!form.items.length && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Select a purchase order or add a product manually.
              </p>
            )}

            {errors.items && (
              <p className="mt-3 text-sm text-red-500">{errors.items}</p>
            )}
          </div>
        </div>
      </section>

      <section className="card-surface overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <h2 className="font-semibold">3. Quality Check</h2>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-5">
          <div>
            <Label>Total Received Qty</Label>

            <Input
              value={totalReceived}
              readOnly
              className="mt-2 bg-slate-50 dark:bg-white/[0.025]"
            />
          </div>

          <div>
            <Label>Total Accepted Qty</Label>

            <Input
              value={totalAccepted}
              readOnly
              className="mt-2 bg-slate-50 dark:bg-white/[0.025]"
            />
          </div>

          <div>
            <Label>Total Rejected Qty</Label>

            <Input
              value={totalRejected}
              readOnly
              className="mt-2 bg-slate-50 dark:bg-white/[0.025]"
            />
          </div>

          <div>
            <Label>Checked By</Label>

            <Select
              value={form.checked_by_name}
              onValueChange={(value) => {
                const receiver = receivers.find(
                  (item) => String(item.id) === String(value),
                );

                updateForm("checked_by_name", receiver?.display_name || "");
              }}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select checker" />
              </SelectTrigger>

              <SelectContent className="max-h-72">
                {receivers.map((receiver) => (
                  <SelectItem key={receiver.id} value={String(receiver.id)}>
                    {receiver.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>QC Status</Label>

            <Select
              value={form.qc_status}
              onValueChange={(value) => updateForm("qc_status", value)}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                {qcStatuses.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2 xl:col-span-5">
            <Label>Inspection Remarks</Label>

            <Textarea
              value={form.inspection_remarks}
              onChange={(event) =>
                updateForm("inspection_remarks", event.target.value)
              }
              placeholder="Mention damaged, incorrect or missing items..."
              className="mt-2"
              rows={4}
            />
          </div>
        </div>
      </section>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          disabled={save.isPending}
          onClick={() => navigate("/shipments")}
        >
          Cancel
        </Button>

        <Button
          type="button"
          disabled={save.isPending}
          onClick={submit}
          className="bg-blue-600 text-white hover:bg-blue-700"
        >
          <Save className="mr-2 h-4 w-4" />

          {save.isPending
            ? "Saving..."
            : edit
              ? "Save Changes"
              : "Save Shipment"}
        </Button>
      </div>
    </div>
  );
}
