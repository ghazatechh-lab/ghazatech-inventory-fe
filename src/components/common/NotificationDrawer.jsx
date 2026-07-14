import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api, { unwrap } from "@/lib/api";
import { CheckCheck, Circle } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { toast } from "sonner";

const priorityColor = {
  danger: "text-red-400 bg-red-500/10 border-red-500/20",
  warning: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  info: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  success: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
};

export function NotificationDrawer({ open, onOpenChange }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["notifications-drawer"],
    queryFn: async () => unwrap(await api.get("/notifications/", { params: { page_size: 30 } })),
    enabled: open,
  });

  const items = data?.results || [];

  const markAllRead = async () => {
    await api.post("/notifications/mark-all-read/");
    toast.success("All notifications marked as read");
    qc.invalidateQueries({ queryKey: ["notifications-drawer"] });
    qc.invalidateQueries({ queryKey: ["notif-count"] });
  };

  const markRead = async (id) => {
    await api.post(`/notifications/${id}/mark-read/`);
    qc.invalidateQueries({ queryKey: ["notifications-drawer"] });
    qc.invalidateQueries({ queryKey: ["notif-count"] });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md bg-[#0A0E17] border-l border-white/5">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="text-white">Notifications</SheetTitle>
            <button onClick={markAllRead} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1" data-testid="mark-all-read-btn">
              <CheckCheck className="w-3.5 h-3.5" /> Mark all as read
            </button>
          </div>
        </SheetHeader>
        <div className="mt-5 space-y-2 overflow-y-auto max-h-[calc(100vh-100px)] pr-1">
          {items.length === 0 && <div className="text-sm text-slate-500 py-8 text-center">No notifications</div>}
          {items.map(n => (
            <button
              key={n.id}
              onClick={() => markRead(n.id)}
              className={`w-full text-left p-3 rounded-lg border transition ${n.is_read ? "border-white/5 bg-white/[0.02]" : "border-blue-500/20 bg-blue-500/5"}`}
              data-testid={`notification-item-${n.id}`}
            >
              <div className="flex items-start gap-3">
                <div className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${priorityColor[n.priority] || priorityColor.info}`}>{n.priority}</div>
                {!n.is_read && <Circle className="w-2 h-2 fill-blue-400 text-blue-400 mt-1.5" />}
              </div>
              <div className="mt-1.5 text-sm text-slate-100 font-medium">{n.title}</div>
              <div className="text-xs text-slate-400">{n.message}</div>
              <div className="mt-1 text-[10px] text-slate-500 font-numeric">{formatDateTime(n.created_at)}</div>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
