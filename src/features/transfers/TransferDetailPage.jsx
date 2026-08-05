import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  PackageCheck,
  RefreshCcw,
  Send,
  Trash2,
  Warehouse,
  X,
} from "lucide-react";
import { toast } from "sonner";

import api, { getApiErrorMessage, unwrap } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { LoadingState, EmptyState } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CurrencyText, DateText } from "@/components/common/CurrencyText";
import { cn } from "@/lib/utils";

const STEPS = [
  "DRAFT",
  "REQUESTED",
  "APPROVED",
  "DISPATCHED",
  "IN_TRANSIT",
  "RECEIVED",
];

const STEP_LABELS = {
  DRAFT: "Draft",
  REQUESTED: "Requested",
  APPROVED: "Approved",
  DISPATCHED: "Dispatched",
  IN_TRANSIT: "In Transit",
  RECEIVED: "Received",
};

const normalizeStatus = (status) => String(status || "").toUpperCase();

function Timeline({ status }) {
  const normalizedStatus = normalizeStatus(status);

  const currentIndex = STEPS.indexOf(normalizedStatus);

  const isTerminal = normalizedStatus === "CANCELLED";

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max items-center gap-2 py-2">
        {STEPS.map((step, index) => {
          const completed =
            !isTerminal && currentIndex >= 0 && index < currentIndex;

          const current = !isTerminal && index === currentIndex;

          return (
            <React.Fragment key={step}>
              <div
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-2 text-xs font-semibold",
                  completed
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : current
                      ? "border-blue-500/40 bg-blue-500/15 text-blue-700 dark:text-blue-200"
                      : "border-border bg-muted/30 text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    completed
                      ? "bg-emerald-500"
                      : current
                        ? "bg-blue-500"
                        : "bg-slate-400",
                  )}
                />

                {STEP_LABELS[step]}
              </div>

              {index < STEPS.length - 1 ? (
                <div
                  className={cn(
                    "h-px w-8 shrink-0",
                    completed ? "bg-emerald-500/40" : "bg-border",
                  )}
                />
              ) : null}
            </React.Fragment>
          );
        })}

        {isTerminal ? (
          <div className="ml-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-300">
            Cancelled
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DetailRow({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0 dark:border-white/5">
      <span className="text-sm text-muted-foreground">{label}</span>

      <span className="max-w-[65%] text-right text-sm font-medium">
        {children}
      </span>
    </div>
  );
}

export default function TransferDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { hasRole, user } = useAuth();

  const [actionName, setActionName] = React.useState("");

  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const isAdmin =
    Boolean(user?.is_superuser) ||
    hasRole("ADMIN") ||
    String(user?.role?.code || user?.role_code || "").toUpperCase() === "ADMIN";

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["transfer", id],

    queryFn: async () => unwrap(await api.get(`/transfers/${id}/`)),

    enabled: Boolean(id),
    retry: false,
  });

  if (isLoading) {
    return <LoadingState />;
  }

  if (isError || !data) {
    return (
      <EmptyState
        title="Transfer not found"
        description="The requested stock transfer could not be loaded."
      />
    );
  }

  const transfer = data || {};

  const transferItems = Array.isArray(transfer.items)
    ? transfer.items
    : Array.isArray(transfer.items?.results)
      ? transfer.items.results
      : [];

  const status = normalizeStatus(transfer.status);

  const deleteTransfer = async () => {
    try {
      setActionName("delete");

      await api.delete(`/transfers/${id}/`);

      await queryClient.invalidateQueries({
        queryKey: ["transfers"],
      });

      queryClient.removeQueries({
        queryKey: ["transfer", id],
      });

      toast.success("Stock transfer deleted.");

      navigate("/transfers");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to delete the transfer."));
    } finally {
      setActionName("");
      setDeleteOpen(false);
    }
  };

  const runAction = async (path, successMessage) => {
    try {
      setActionName(path);

      await api.post(`/transfers/${id}/${path}/`, {});

      await Promise.all([
        refetch(),
        queryClient.invalidateQueries({
          queryKey: ["transfers"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["stock-overview"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["stock-movements"],
        }),
      ]);

      toast.success(successMessage);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to update the transfer."));
    } finally {
      setActionName("");
    }
  };

  const fromBranch =
    transfer.from_branch_code ||
    transfer.from_branch_name ||
    transfer.from_branch?.branch_code ||
    transfer.from_branch?.branch_name ||
    "—";

  const toBranch =
    transfer.to_branch_code ||
    transfer.to_branch_name ||
    transfer.to_branch?.branch_code ||
    transfer.to_branch?.branch_name ||
    "—";

  const totalQuantity =
    transfer.total_quantity ??
    transferItems.reduce(
      (sum, item) =>
        sum + Number(item.requested_quantity || item.quantity || 0),
      0,
    );

  return (
    <div
      data-stock-module="stock-transfer-detail"
      className="stock-module-page stock-workspace mx-auto max-w-7xl space-y-5 pb-10"
    >
      <section className="relative overflow-hidden rounded-[28px] border border-slate-200/20 bg-gradient-to-r from-slate-950 via-blue-950 to-sky-800 px-6 py-7 text-white shadow-xl sm:px-8 sm:py-9">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-sky-400/20 blur-3xl" />

        <div className="relative flex flex-col gap-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p
                className="text-xs font-extrabold uppercase tracking-[0.2em]"
                style={{ color: "#bae6fd" }}
              >
                Inventory Logistics
              </p>

              <h1
                className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl"
                style={{
                  color: "#ffffff",
                  WebkitTextFillColor: "#ffffff",
                  textShadow: "0 2px 12px rgba(0,0,0,.28)",
                }}
              >
                {transfer.transfer_number || "Transfer Details"}
              </h1>

              <p
                className="mt-2 flex flex-wrap items-center gap-2 text-sm"
                style={{ color: "#f1f5f9" }}
              >
                <span>{fromBranch}</span>
                <span>→</span>
                <span>{toBranch}</span>
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/transfers")}
                className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>

              <Button
                type="button"
                variant="outline"
                disabled={isFetching}
                onClick={() => refetch()}
                className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              >
                <RefreshCcw
                  className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={transfer.status} />

            {status === "REQUESTED" && isAdmin ? (
              <Button
                disabled={Boolean(actionName)}
                onClick={() => runAction("approve", "Transfer approved.")}
                className="bg-white text-blue-950 hover:bg-slate-100"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {actionName === "approve" ? "Approving..." : "Approve"}
              </Button>
            ) : null}

            {status === "APPROVED" ? (
              <Button
                disabled={Boolean(actionName)}
                onClick={() => runAction("dispatch", "Transfer dispatched.")}
                className="bg-white text-blue-950 hover:bg-slate-100"
              >
                <Send className="mr-2 h-4 w-4" />
                {actionName === "dispatch" ? "Dispatching..." : "Dispatch"}
              </Button>
            ) : null}

            {["DISPATCHED", "IN_TRANSIT"].includes(status) ? (
              <Button
                className="bg-emerald-600 text-white hover:bg-emerald-700"
                disabled={Boolean(actionName)}
                onClick={() => runAction("receive", "Transfer received.")}
              >
                <PackageCheck className="mr-2 h-4 w-4" />
                {actionName === "receive" ? "Receiving..." : "Receive"}
              </Button>
            ) : null}

            {!["RECEIVED", "COMPLETED", "CANCELLED"].includes(status) ? (
              <Button
                variant="outline"
                disabled={Boolean(actionName)}
                onClick={() => runAction("cancel", "Transfer cancelled.")}
                className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              >
                <X className="mr-2 h-4 w-4" />
                {actionName === "cancel" ? "Cancelling..." : "Cancel"}
              </Button>
            ) : null}

            {isAdmin &&
            ["DRAFT", "REQUESTED", "APPROVED", "CANCELLED"].includes(status) ? (
              <Button
                variant="outline"
                disabled={Boolean(actionName)}
                onClick={() => setDeleteOpen(true)}
                className="border-red-300/40 bg-red-500/10 text-red-100 hover:bg-red-500/20 hover:text-white"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/70">
        <Timeline status={transfer.status} />
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="card-surface p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Items
          </p>
          <p className="mt-2 text-2xl font-bold">{transferItems.length}</p>
        </div>

        <div className="card-surface p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Total Quantity
          </p>
          <p className="mt-2 text-2xl font-bold">{totalQuantity}</p>
        </div>

        <div className="card-surface p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Transfer Value
          </p>
          <div className="mt-2 text-2xl font-bold">
            <CurrencyText value={transfer.transfer_value || 0} />
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950/70">
          <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-4 dark:border-white/10 dark:bg-white/[0.025]">
            <h2 className="font-semibold">Transfer Items</h2>

            <p className="mt-1 text-xs text-muted-foreground">
              Products and quantities included in this transfer.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Product
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Quantity
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Damaged
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Unit Cost
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Value
                  </th>
                </tr>
              </thead>

              <tbody>
                {transferItems.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-4">
                      <p className="font-medium">
                        {item.product_name || item.product?.product_name || "—"}
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.sku || "—"}

                        {item.variant_label ? ` · ${item.variant_label}` : ""}
                      </p>
                    </td>

                    <td className="px-4 py-4 text-right font-medium">
                      {item.requested_quantity ?? item.quantity ?? 0}
                    </td>

                    <td className="px-4 py-4 text-right text-red-500">
                      {item.damaged_quantity ?? item.damaged ?? 0}
                    </td>

                    <td className="px-4 py-4 text-right">
                      <CurrencyText value={item.transfer_unit_cost || 0} />
                    </td>

                    <td className="px-4 py-4 text-right font-medium">
                      <CurrencyText value={item.line_transfer_value || 0} />
                    </td>
                  </tr>
                ))}

                {!transferItems.length ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-12 text-center text-muted-foreground"
                    >
                      No transfer items were saved.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-5">
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
            <Warehouse className="mr-2 inline h-4 w-4" />
            Internal stock movement is {transfer.tax_scope || "OUT_OF_SCOPE"}.
            Courier charges may create VAT.
          </div>

          <div className="card-surface space-y-3 p-5">
            <h2 className="font-semibold">Transfer Summary</h2>

            <DetailRow label="From">{fromBranch}</DetailRow>

            <DetailRow label="To">{toBranch}</DetailRow>

            <DetailRow label="Transfer value">
              <CurrencyText value={transfer.transfer_value || 0} />
            </DetailRow>

            <DetailRow label="Total transfer cost">
              <CurrencyText value={transfer.total_transfer_cost || 0} />
            </DetailRow>

            <DetailRow label="Reconciliation">
              <StatusBadge
                status={transfer.reconciliation_status || "PENDING"}
              />
            </DetailRow>

            <DetailRow label="Requested by">
              {transfer.requested_by_name || "—"}
            </DetailRow>

            <DetailRow label="Approved by">
              {transfer.approved_by_name || "—"}
            </DetailRow>

            <DetailRow label="Transfer date">
              {transfer.transfer_date ? (
                <DateText value={transfer.transfer_date} />
              ) : (
                "—"
              )}
            </DetailRow>

            <DetailRow label="Dispatch date">
              {transfer.dispatch_date ? (
                <DateText value={transfer.dispatch_date} />
              ) : (
                "—"
              )}
            </DetailRow>

            <DetailRow label="Received on">
              {transfer.received_date ? (
                <DateText value={transfer.received_date} />
              ) : (
                "—"
              )}
            </DetailRow>
          </div>
        </section>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete stock transfer?</AlertDialogTitle>

            <AlertDialogDescription>
              This permanently removes{" "}
              {transfer.transfer_number || "this transfer"}. Transfers that
              already changed stock cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionName === "delete"}>
              Keep Transfer
            </AlertDialogCancel>

            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={actionName === "delete"}
              onClick={(event) => {
                event.preventDefault();
                deleteTransfer();
              }}
            >
              {actionName === "delete" ? "Deleting..." : "Delete Transfer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
