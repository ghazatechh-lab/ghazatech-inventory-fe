import React from "react";
import { useQuery } from "@tanstack/react-query";
import api, { unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { CurrencyText } from "@/components/common/CurrencyText";
import { LoadingState } from "@/components/common/States";
import { Landmark } from "lucide-react";

export default function BankAccountsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["banks"], queryFn: async () => unwrap(await api.get("/finance/bank-accounts/")) });
  if (isLoading) return <LoadingState />;
  const rows = data || [];
  return (
    <div>
      <PageHeader title="Bank Accounts" subtitle="Company bank ledger balances" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rows.map(b => (
          <div key={b.id} className="card-surface p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center"><Landmark className="w-5 h-5 text-blue-400" /></div>
              <div><div className="text-slate-100 font-medium">{b.bank_name}</div><div className="text-[10px] text-slate-500 font-numeric">{b.account_number}</div></div>
            </div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500">Balance</div>
            <CurrencyText value={b.balance} className="text-2xl font-semibold text-white block mt-0.5" />
            <div className="mt-3 text-[10px] uppercase tracking-widest text-slate-500">IBAN</div>
            <div className="font-numeric text-xs text-slate-300 mt-0.5">{b.iban}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
