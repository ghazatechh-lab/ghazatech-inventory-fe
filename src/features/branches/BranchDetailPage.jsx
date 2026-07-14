import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api, { unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingState } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";

export default function BranchDetailPage() {
  const { id } = useParams();
  const { data, isLoading } = useQuery({ queryKey: ["branch", id], queryFn: async () => unwrap(await api.get(`/branches/${id}/`)) });
  if (isLoading) return <LoadingState />;
  const b = data || {};
  return (
    <div>
      <PageHeader title={b.branch_name} subtitle={`Branch ${b.branch_code}`} actions={<Button asChild variant="outline"><Link to={`/branches/${id}/edit`}>Edit</Link></Button>} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card-surface p-5 lg:col-span-2 space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              ["Type", b.branch_type],
              ["Address", b.address],
              ["City", b.city],
              ["Emirate", b.emirate],
              ["Country", b.country],
              ["Phone", b.phone],
              ["Email", b.email],
              ["Manager", b.manager],
            ].map(([k, v]) => (
              <div key={k}>
                <div className="text-[10px] uppercase tracking-widest text-slate-500">{k}</div>
                <div className="text-slate-200 mt-0.5">{v || "-"}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card-surface p-5">
          <div className="text-sm text-slate-500 mb-2">Status</div>
          <StatusBadge status={b.is_active ? "active" : "closed"} label={b.is_active ? "Active" : "Inactive"} />
        </div>
      </div>
    </div>
  );
}
