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
  const { data, isLoading } = useQuery({
    queryKey: ["branch", id],
    queryFn: async () => unwrap(await api.get(`/branches/${id}/`)),
  });
  if (isLoading) return <LoadingState />;
  const b = data || {};
  return (
    <div className="branch-module-page branch-workspace w-full space-y-5 pb-10">
      <PageHeader
        variant="hero"
        eyebrow="Branch Management"
        title={b.branch_name || "Branch"}
        subtitle={`Branch ${b.branch_code || id}`}
        actions={
          <Button
            asChild
            className="bg-amber-400 font-bold !text-slate-950 hover:bg-amber-300 hover:!text-slate-950"
          >
            <Link to={`/branches/${id}/edit`}>Edit Branch</Link>
          </Button>
        }
      />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="card-surface space-y-3 rounded-[22px] p-6 lg:col-span-2">
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
                <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                  {k}
                </div>
                <div className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                  {v || "—"}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card-surface rounded-[22px] p-6">
          <div className="mb-3 text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">
            Status
          </div>
          <StatusBadge
            status={b.is_active ? "active" : "closed"}
            label={b.is_active ? "Active" : "Inactive"}
          />
        </div>
      </div>
    </div>
  );
}
