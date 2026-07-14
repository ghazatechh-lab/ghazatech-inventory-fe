import React from "react";
import { useQuery } from "@tanstack/react-query";
import api, { unwrap } from "@/lib/api";
import { Building2, Check, ChevronDown } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

export function BranchSelector() {
  const { branchOverride, setBranchOverride } = useAuth();
  const { data } = useQuery({
    queryKey: ["branches-select"],
    queryFn: async () => unwrap(await api.get("/branches/")),
  });
  const branches = data?.results || [];
  const current = branches.find(b => b.id === branchOverride);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-white/10 bg-white/[0.02] text-xs text-slate-300 hover:bg-white/5 transition"
          data-testid="branch-selector-btn"
        >
          <Building2 className="w-3.5 h-3.5 text-slate-500" />
          <span className="truncate max-w-[160px]">{current?.branch_name ?? "All branches"}</span>
          <ChevronDown className="w-3 h-3 text-slate-500" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Filter data by branch</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setBranchOverride(null)}>
          <span className="flex-1">All branches</span>
          {!branchOverride && <Check className="w-4 h-4 text-blue-400" />}
        </DropdownMenuItem>
        {branches.map((b) => (
          <DropdownMenuItem key={b.id} onClick={() => setBranchOverride(b.id)}>
            <span className="flex-1 truncate">{b.branch_name}</span>
            {branchOverride === b.id && <Check className="w-4 h-4 text-blue-400" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
