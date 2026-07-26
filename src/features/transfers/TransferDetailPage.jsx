import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, PackageCheck, Send, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import api, { getApiErrorMessage, unwrap } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingState } from "@/components/common/States";
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
import { DateText } from "@/components/common/CurrencyText";
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
  IN_TRANSIT: "In transit",
  RECEIVED: "Received",
};

const normalizeStatus = (status) => String(status || "").toUpperCase();

function Timeline({ status }) {
  const normalizedStatus = normalizeStatus(status);
  const currentIndex = STEPS.indexOf(normalizedStatus);

  return (
    <div className="flex items-center gap-2 overflow-x-auto py-3">
      {STEPS.map((step, index) => (
        <React.Fragment key={step}>
          <div
            className={cn(
              "flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-medium",
              index < currentIndex
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                : index === currentIndex
                  ? "border-blue-500/40 bg-blue-500/15 text-blue-700 dark:text-blue-200"
                  : "border-border bg-muted/30 text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                index < currentIndex
                  ? "bg-emerald-400"
                  : index === currentIndex
                    ? "bg-blue-400"
                    : "bg-slate-500",
              )}
            />
            {STEP_LABELS[step]}
          </div>
          {index < STEPS.length - 1 && (
            <div
              className={cn(
                "h-px w-6 shrink-0",
                index < currentIndex ? "bg-emerald-500/30" : "bg-border",
              )}
            />
          )}
        </React.Fragment>
      ))}
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

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["transfer", id],
    queryFn: async () => unwrap(await api.get(`/transfers/${id}/`)),
  });

  if (isLoading) return <LoadingState />;

  const transfer = data || {};
  const status = normalizeStatus(transfer.status);

  const deleteTransfer = async () => {
    try {
      setActionName("delete");
      await api.delete(`/transfers/${id}/`);
      await queryClient.invalidateQueries({ queryKey: ["transfers"] });
      queryClient.removeQueries({ queryKey: ["transfer", id] });
      toast.success("Stock transfer deleted.");
      setDeleteOpen(false);
      navigate("/transfers");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to delete the transfer."));
    } finally {
      setActionName("");
    }
  };

  const runAction = async (path, successMessage) => {
    try {
      setActionName(path);
      await api.post(`/transfers/${id}/${path}/`, {});
      await Promise.all([
        refetch(),
        queryClient.invalidateQueries({ queryKey: ["transfers"] }),
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

  return (
    <div className="space-y-4">
      <PageHeader
        title={transfer.transfer_number || "Transfer details"}
        subtitle={`${fromBranch} → ${toBranch}`}
        actions={
          <>
            <StatusBadge status={transfer.status} />

            {status === "REQUESTED" && isAdmin && (
              <Button
                variant="outline"
                disabled={Boolean(actionName)}
                onClick={() => runAction("approve", "Transfer approved.")}
              >
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                {actionName === "approve" ? "Approving..." : "Approve"}
              </Button>
            )}

            {status === "APPROVED" && (
              <Button
                variant="outline"
                disabled={Boolean(actionName)}
                onClick={() => runAction("dispatch", "Transfer dispatched.")}
              >
                <Send className="mr-1.5 h-4 w-4" />
                {actionName === "dispatch" ? "Dispatching..." : "Dispatch"}
              </Button>
            )}

            {["DISPATCHED", "IN_TRANSIT"].includes(status) && (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={Boolean(actionName)}
                onClick={() => runAction("receive", "Transfer received.")}
              >
                <PackageCheck className="mr-1.5 h-4 w-4" />
                {actionName === "receive" ? "Receiving..." : "Receive"}
              </Button>
            )}

            {!["RECEIVED", "COMPLETED", "CANCELLED"].includes(status) && (
              <Button
                variant="outline"
                disabled={Boolean(actionName)}
                onClick={() => runAction("cancel", "Transfer cancelled.")}
              >
                <X className="mr-1.5 h-4 w-4" />
                {actionName === "cancel" ? "Cancelling..." : "Cancel"}
              </Button>
            )}

            {isAdmin &&
              ["DRAFT", "REQUESTED", "APPROVED", "CANCELLED"].includes(
                status,
              ) && (
                <Button
                  variant="outline"
                  className="border-red-500/30 text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:text-red-400"
                  disabled={Boolean(actionName)}
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  {actionName === "delete" ? "Deleting..." : "Delete"}
                </Button>
              )}
          </>
        }
      />

      <div className="card-surface p-5">
        <Timeline status={transfer.status} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card-surface p-5 lg:col-span-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-[10px] uppercase tracking-widest text-muted-foreground">
                <th className="py-2 text-left">Product</th>
                <th className="text-right">Quantity</th>
                <th className="text-right">Damaged</th>
              </tr>
            </thead>
            <tbody>
              {(transfer.items || []).map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="py-3">
                    <div className="font-medium">
                      {item.product_name || item.product?.product_name || "—"}
                    </div>
                    {item.sku && (
                      <div className="text-xs text-muted-foreground">
                        {item.sku}
                      </div>
                    )}
                  </td>
                  <td className="text-right font-numeric font-medium">
                    {item.requested_quantity ?? item.quantity ?? 0}
                  </td>
                  <td className="text-right font-numeric text-red-500">
                    {item.damaged_quantity ?? item.damaged ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card-surface space-y-4 p-5 text-sm">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Created / requested by
            </div>
            <div className="mt-1 font-medium">
              {transfer.requested_by_name || "—"}
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Approved by
            </div>
            <div className="mt-1 font-medium">
              {transfer.approved_by_name || "—"}
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Transfer date
            </div>
            <div className="mt-1">
              {transfer.transfer_date ? (
                <DateText value={transfer.transfer_date} />
              ) : (
                "—"
              )}
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Dispatch date
            </div>
            <div className="mt-1">
              {transfer.dispatch_date ? (
                <DateText value={transfer.dispatch_date} />
              ) : (
                "—"
              )}
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Received on
            </div>
            <div className="mt-1">
              {transfer.received_date ? (
                <DateText value={transfer.received_date} />
              ) : (
                "—"
              )}
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete stock transfer?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes{" "}
              {transfer.transfer_number || "this transfer"}. Transfers that have
              already changed stock cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionName === "delete"}>
              Keep transfer
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={actionName === "delete"}
              onClick={(event) => {
                event.preventDefault();
                deleteTransfer();
              }}
            >
              {actionName === "delete" ? "Deleting..." : "Delete transfer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
