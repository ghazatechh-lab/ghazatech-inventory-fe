import React from "react";
import { Link } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api, { unwrap } from "@/lib/api";
import { CheckCheck, Circle, ArrowRight } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { toast } from "sonner";

const priorityColor = {
  danger: "text-red-400 bg-red-500/10 border-red-500/20",
  warning: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  info: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  success: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
};

export function NotificationDrawer({ open, onOpenChange }) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications-drawer"],
    queryFn: async () =>
      unwrap(
        await api.get("/notifications/", {
          params: { page_size: 10 },
        }),
      ),
    enabled: open,
  });

  const items = data?.results || [];

  const markAllRead = async () => {
    try {
      await api.post("/notifications/mark-all-read/");
      toast.success("All notifications marked as read.");
      queryClient.invalidateQueries({ queryKey: ["notifications-drawer"] });
      queryClient.invalidateQueries({ queryKey: ["notif-count"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch (error) {
      if (!error?.__apiErrorShown) {
        toast.error("Unable to mark notifications as read.");
      }
    }
  };

  const markRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/mark-read/`);
      queryClient.invalidateQueries({ queryKey: ["notifications-drawer"] });
      queryClient.invalidateQueries({ queryKey: ["notif-count"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch (error) {
      if (!error?.__apiErrorShown) {
        toast.error("Unable to update the notification.");
      }
    }
  };

  const closeDrawer = () => {
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col border-l border-white/5 bg-[#0A0E17] p-0 sm:max-w-md">
        <SheetHeader className="border-b border-white/5 px-6 py-5">
          <div className="flex items-center justify-between gap-3 pr-7">
            <SheetTitle className="text-white">Notifications</SheetTitle>

            <button
              type="button"
              onClick={markAllRead}
              className="flex items-center gap-1 text-xs text-blue-400 transition hover:text-blue-300"
              data-testid="mark-all-read-btn"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all as read
            </button>
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {isLoading ? (
            <div className="py-10 text-center text-sm text-slate-500">
              Loading notifications...
            </div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">
              No notifications
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((notification) => (
                <button
                  type="button"
                  key={notification.id}
                  onClick={() => markRead(notification.id)}
                  className={`w-full rounded-lg border p-3 text-left transition ${
                    notification.is_read
                      ? "border-white/5 bg-white/[0.02]"
                      : "border-blue-500/20 bg-blue-500/5"
                  }`}
                  data-testid={`notification-item-${notification.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${
                        priorityColor[notification.priority] ||
                        priorityColor.info
                      }`}
                    >
                      {notification.priority}
                    </div>

                    {!notification.is_read && (
                      <Circle className="mt-1.5 h-2 w-2 fill-blue-400 text-blue-400" />
                    )}
                  </div>

                  <div className="mt-1.5 text-sm font-medium text-slate-100">
                    {notification.title}
                  </div>

                  <div className="text-xs text-slate-400">
                    {notification.message}
                  </div>

                  <div className="mt-1 text-[10px] font-numeric text-slate-500">
                    {formatDateTime(notification.created_at)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-white/5 bg-[#0A0E17] p-4">
          <Button
            asChild
            variant="outline"
            className="w-full border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
          >
            <Link
              to="/notifications"
              onClick={closeDrawer}
              data-testid="view-more-notifications-btn"
            >
              View more notifications
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
