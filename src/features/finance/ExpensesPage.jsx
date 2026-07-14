import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api, { unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { useListQuery, DataTable } from "@/hooks/useListQuery";
import { CurrencyText, DateText } from "@/components/common/CurrencyText";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { Plus } from "lucide-react";
import { toast } from "sonner";

function NewExpense({ onDone }) {
  const [open, setOpen] = React.useState(false);
  const { data: branches } = useQuery({ queryKey: ["branches-sel"], queryFn: async () => unwrap(await api.get("/branches/")) });
  const { register, handleSubmit, setValue, watch, reset } = useForm({ defaultValues: { category: "Rent", payment_method: "Cash", date: new Date().toISOString().slice(0, 10) } });
  const submit = async (v) => { try { await api.post("/finance/expenses/", v); toast.success("Expense added"); reset(); setOpen(false); onDone?.(); } catch {} };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="bg-blue-600 hover:bg-blue-700" data-testid="new-expense-btn"><Plus className="w-4 h-4 mr-1.5" /> New expense</Button></DialogTrigger>
      <DialogContent><DialogHeader><DialogTitle>New expense</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Category</Label><Select value={watch("category")} onValueChange={v => setValue("category", v)}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent>{["Rent","Utilities","Salaries","Transportation","Office Supplies","Marketing","Repairs","Insurance","Fuel"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Branch</Label><Select value={watch("branch_id")} onValueChange={v => setValue("branch_id", v)}><SelectTrigger className="mt-1.5"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{(branches?.results || []).map(b => <SelectItem key={b.id} value={b.id}>{b.branch_name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Date</Label><Input type="date" {...register("date")} className="mt-1.5" /></div>
            <div><Label>Amount</Label><Input type="number" step="0.01" {...register("amount", { valueAsNumber: true })} className="mt-1.5 font-numeric" /></div>
            <div><Label>Payment method</Label><Select value={watch("payment_method")} onValueChange={v => setValue("payment_method", v)}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent>{["Cash","Bank","Card"].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Supplier (optional)</Label><Input {...register("supplier")} className="mt-1.5" /></div>
          </div>
          <div><Label>Notes</Label><Textarea {...register("notes")} rows={2} className="mt-1.5" /></div>
          <DialogFooter><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" className="bg-blue-600 hover:bg-blue-700">Save</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ExpensesPage() {
  const qc = useQueryClient();
  const { query, page, setPage } = useListQuery("expenses", "/finance/expenses/");
  const data = query.data || { results: [], count: 0 };
  return (
    <div>
      <PageHeader title="Expenses" subtitle="Operational and business expenses" actions={<NewExpense onDone={() => qc.invalidateQueries({ queryKey: ["expenses"] })} />} />
      <DataTable
        columns={[
          { key: "expense_number", header: "Expense #", cell: (r) => <span className="font-numeric text-blue-400">{r.expense_number}</span> },
          { key: "date", header: "Date", cell: (r) => <DateText value={r.date} /> },
          { key: "category", header: "Category" },
          { key: "branch", header: "Branch" },
          { key: "payment_method", header: "Method" },
          { key: "notes", header: "Notes" },
          { key: "amount", header: "Amount", align: "right", cell: (r) => <CurrencyText value={r.amount} className="text-red-300" /> },
        ]}
        data={data.results} isLoading={query.isLoading} page={page} total={data.count} onPageChange={setPage}
      />
    </div>
  );
}
