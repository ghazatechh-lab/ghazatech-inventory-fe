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
    error?.response?.data?.message ||
    error?.response?.data?.detail ||
    error?.response?.data?.errors?.non_field_errors?.[0] ||
    fallback
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

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(deleteUrl),
    onSuccess: () => {
      toast.success(`${itemLabel} deleted successfully`);
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      setConfirmOpen(false);
    },
    onError: (error) => {
      toast.error(
        getApiError(error, `Unable to delete ${itemLabel.toLowerCase()}`),
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
          disabled={disabled || deleteMutation.isPending}
          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
          aria-label={`Delete ${itemLabel}`}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete ${itemLabel}?`}
        description="This action cannot be undone. Related records may prevent deletion."
        confirmLabel={deleteMutation.isPending ? "Deleting..." : "Delete"}
        destructive
        onConfirm={() => deleteMutation.mutate()}
      />
    </>
  );
}
