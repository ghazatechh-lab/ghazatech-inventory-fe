import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api, { unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingState } from "@/components/common/States";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDateTime } from "@/lib/utils";
import { CheckCheck } from "lucide-react";
import { toast } from "sonner";

export default function NotificationsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["notifs-page"], queryFn: async () => unwrap(await api.get("/notifications/", { params: { page_size: 60 } })) });
  const markAll = async () => { await api.post("/notifications/mark-all-read/"); toast.success("Marked all as read"); qc.invalidateQueries({ queryKey: ["notifs-page"] }); qc.invalidateQueries({ queryKey: ["notif-count"] }); };
  if (isLoading) return <LoadingState />;
  const items = data?.results || [];
  return (
    <div>
      <PageHeader title="Notifications" subtitle="All system events, alerts and reminders" actions={<Button variant="outline" onClick={markAll}><CheckCheck className="w-4 h-4 mr-1.5" /> Mark all as read</Button>} />
      {items.length === 0 ? <div className="card-surface p-6"><EmptyState /></div> : (
        <div className="space-y-2">
          {items.map(n => (
            <div key={n.id} className={`card-surface p-4 flex items-center justify-between ${n.is_read ? "opacity-70" : ""}`}>
              <div className="min-w-0 pr-4">
                <div className="flex items-center gap-2 mb-1"><StatusBadge status={n.priority} /><div className="text-sm font-medium text-slate-100">{n.title}</div></div>
                <div className="text-xs text-slate-400 truncate">{n.message}</div>
              </div>
              <div className="text-[10px] text-slate-500 font-numeric whitespace-nowrap">{formatDateTime(n.created_at)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
