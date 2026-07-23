import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, BadgeDollarSign } from "lucide-react";
import { toast } from "sonner";
import api, { unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, SearchInput, useListQuery } from "@/hooks/useListQuery";
import { CurrencyText, DateText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const list = (value) =>
  value?.results || value?.data?.results || (Array.isArray(value) ? value : []);
const today = () => new Date().toISOString().slice(0, 10);

export default function VendorCreditsPage() {
  const qc = useQueryClient();
  const { query, q, setQ, page, setPage } = useListQuery(
    "vendor-credits",
    "/purchases/vendor-credits/",
  );
  const payload = query.data || { results: [], count: 0 };
  const rows = React.useMemo(() => payload.results || [], [payload.results]);
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({
    supplier: "",
    credit_date: today(),
    reason: "",
    reference_number: "",
    total_amount: "",
    status: "OPEN",
    notes: "",
  });
  const { data: suppliers } = useQuery({
    queryKey: ["supplier-options"],
    queryFn: async () =>
      unwrap(
        await api.get("/suppliers/", {
          params: { page_size: 500, is_active: true },
        }),
      ),
  });
  const create = useMutation({
    mutationFn: () =>
      api.post("/purchases/vendor-credits/", {
        ...form,
        supplier: Number(form.supplier),
        total_amount: Number(form.total_amount),
        remaining_amount: Number(form.total_amount),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["vendor-credits"] });
      toast.success("Vendor credit created.");
      setOpen(false);
    },
  });
  const columns = React.useMemo(
    () => [
      { key: "credit_number", header: "Credit #", sortType: "text" },
      {
        key: "supplier_name",
        header: "Vendor",
        sortKey: "supplier__supplier_name",
        sortType: "text",
      },
      {
        key: "credit_date",
        header: "Date",
        sortType: "date",
        cell: (r) => <DateText value={r.credit_date} />,
      },
      { key: "reason", header: "Reason", sortType: "text" },
      {
        key: "total_amount",
        header: "Total",
        sortType: "currency",
        align: "right",
        cell: (r) => <CurrencyText value={r.total_amount} />,
      },
      {
        key: "applied_amount",
        header: "Applied",
        sortType: "currency",
        align: "right",
        cell: (r) => <CurrencyText value={r.applied_amount} />,
      },
      {
        key: "remaining_amount",
        header: "Remaining",
        sortType: "currency",
        align: "right",
        cell: (r) => <CurrencyText value={r.remaining_amount} />,
      },
      {
        key: "status",
        header: "Status",
        sortType: "status",
        cell: (r) => <StatusBadge status={r.status} />,
      },
    ],
    [],
  );
  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendor Credits"
        subtitle="Credits received from suppliers and applied against future bills"
        actions={
          <Button
            onClick={() => setOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            New vendor credit
          </Button>
        }
      />
      <SearchInput
        value={q}
        onChange={setQ}
        placeholder="Search credit, vendor or reason"
      />
      <DataTable
        columns={columns}
        data={rows}
        isLoading={query.isLoading}
        page={page}
        pageSize={12}
        total={payload.count || 0}
        onPageChange={setPage}
        emptyTitle="No vendor credits"
        emptyDescription="Create a vendor credit for returns, rebates or price adjustments."
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BadgeDollarSign className="h-5 w-5 text-emerald-500" />
              New vendor credit
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Supplier *</Label>
              <Select
                value={form.supplier}
                onValueChange={(v) => setForm((s) => ({ ...s, supplier: v }))}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {list(suppliers).map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.supplier_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Credit date *</Label>
              <Input
                type="date"
                className="mt-2"
                value={form.credit_date}
                onChange={(e) =>
                  setForm((s) => ({ ...s, credit_date: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Reason *</Label>
              <Input
                className="mt-2"
                value={form.reason}
                onChange={(e) =>
                  setForm((s) => ({ ...s, reason: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Reference</Label>
              <Input
                className="mt-2"
                value={form.reference_number}
                onChange={(e) =>
                  setForm((s) => ({ ...s, reference_number: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Credit amount (AED) *</Label>
              <Input
                type="number"
                step="0.01"
                className="mt-2"
                value={form.total_amount}
                onChange={(e) =>
                  setForm((s) => ({ ...s, total_amount: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((s) => ({ ...s, status: v }))}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="OPEN">Open</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Internal memo</Label>
              <Textarea
                className="mt-2"
                value={form.notes}
                onChange={(e) =>
                  setForm((s) => ({ ...s, notes: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                create.isPending ||
                !form.supplier ||
                !form.reason ||
                !form.total_amount
              }
              onClick={() => create.mutate()}
            >
              {create.isPending ? "Saving..." : "Post credit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
