import React from "react";
import { useQuery } from "@tanstack/react-query";
import api, { unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { CurrencyText } from "@/components/common/CurrencyText";
import { LoadingState } from "@/components/common/States";
import { Wallet, ArrowDown, ArrowUp, Vault } from "lucide-react";

export default function CashRegisterPage() {
  const { data, isLoading } = useQuery({ queryKey: ["cash"], queryFn: async () => unwrap(await api.get("/finance/cash-register/")) });
  if (isLoading) return <LoadingState />;
  const c = data || {};
  return (
    <div>
      <PageHeader title="Cash Register" subtitle="Today's cash summary" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Opening balance" value={c.opening} icon={Vault} tint="text-slate-400" />
        <Kpi label="Cash in" value={c.cash_in} icon={ArrowUp} tint="text-emerald-400" />
        <Kpi label="Cash out" value={c.cash_out} icon={ArrowDown} tint="text-red-400" />
        <Kpi label="Closing balance" value={c.closing} icon={Wallet} tint="text-blue-400" />
      </div>
    </div>
  );
}
function Kpi({ label, value, icon: Icon, tint }) {
  return (
    <div className="card-surface p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500"><Icon className={`w-3.5 h-3.5 ${tint}`} /> {label}</div>
      <CurrencyText value={value} className="mt-1 block text-2xl font-semibold text-white" />
    </div>
  );
}
