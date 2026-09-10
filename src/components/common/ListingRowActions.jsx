import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";

import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";

function getApiError(error, fallback) {
  return (
    error?.response?.data?.message || error?.response?.data?.detail || fallback
  );
}

export function ListingRowActions({
  viewTo,
  deleteUrl,
  queryKey,
  itemLabel = "record",
  disabled = false,
}) {
  const queryClient = useQueryClient();

  const [confirmOpen, setConfirmOpen] = useState(false);

  const [permanentConfirmOpen, setPermanentConfirmOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(deleteUrl),

    onSuccess: (response) => {
      toast.success(
        response?.data?.message || `${itemLabel} deleted successfully`,
      );

      queryClient.invalidateQueries({
        queryKey: [queryKey],
      });

      setConfirmOpen(false);
    },

    onError: (error) => {
      const responseData = error?.response?.data;

      if (
        error?.response?.status === 409 &&
        responseData?.data?.confirmation_required
      ) {
        setConfirmOpen(false);
        setPermanentConfirmOpen(true);
        return;
      }

      toast.error(getApiError(error, `Unable to delete ${itemLabel}`));
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: () =>
      api.delete(
        `${deleteUrl}${deleteUrl.includes("?") ? "&" : "?"}force=true`,
      ),

    onSuccess: (response) => {
      toast.success(
        response?.data?.message || `${itemLabel} permanently deleted`,
      );

      queryClient.invalidateQueries({
        queryKey: [queryKey],
      });

      setPermanentConfirmOpen(false);
    },

    onError: (error) => {
      toast.error(
        getApiError(error, `Unable to permanently delete ${itemLabel}`),
      );
    },
  });

  return (
    <>
      <div className="flex justify-end gap-1">
        <Button
          variant="ghost"
          size="sm"
          asChild
          aria-label={`View ${itemLabel}`}
        >
          <Link to={viewTo}>
            <Eye className="w-4 h-4" />
          </Link>
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setConfirmOpen(true)}
          disabled={
            disabled ||
            deleteMutation.isPending ||
            permanentDeleteMutation.isPending
          }
          className="
            text-red-400
            hover:text-red-300
            hover:bg-red-500/10
          "
          aria-label={`Delete ${itemLabel}`}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* First confirmation */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete ${itemLabel}?`}
        description="Are you sure you want to delete this record?"
        confirmLabel={deleteMutation.isPending ? "Deleting..." : "Delete"}
        destructive
        onConfirm={() => deleteMutation.mutate()}
      />

      {/* Linked-record permanent delete confirmation */}
      <ConfirmDialog
        open={permanentConfirmOpen}
        onOpenChange={setPermanentConfirmOpen}
        title="Permanent deletion requires confirmation"
        description={
          "This branch contains linked records. " +
          "Permanent deletion requires confirmation."
        }
        confirmLabel={
          permanentDeleteMutation.isPending
            ? "Deleting..."
            : "Delete Permanently"
        }
        destructive
        onConfirm={() => permanentDeleteMutation.mutate()}
      />
    </>
  );
}
