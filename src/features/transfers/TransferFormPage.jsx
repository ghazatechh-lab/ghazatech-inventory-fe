import React from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import api, { unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
const list = (value) => (Array.isArray(value) ? value : value?.results || []);
export default function TransferFormPage() {
  const navigate = useNavigate();
  const { data: branchData } = useQuery({
    queryKey: ["branches-sel"],
    queryFn: async () =>
      unwrap(await api.get("/branches/", { params: { page_size: 500 } })),
  });
  const { data: productData } = useQuery({
    queryKey: ["products-sel"],
    queryFn: async () =>
      unwrap(
        await api.get("/products/", {
          params: { page_size: 500, is_active: true },
        }),
      ),
  });
  const branches = list(branchData);
  const products = list(productData);
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [items, setItems] = React.useState([
    { product: "", requested_quantity: 1 },
  ]);
  const [notes, setNotes] = React.useState("");
  const mutation = useMutation({
    mutationFn: (payload) => api.post("/transfers/", payload),
    onSuccess: () => {
      toast.success("Transfer request created.");
      navigate("/transfers");
    },
  });
  const updateItem = (index, patch) =>
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  const submit = (event) => {
    event.preventDefault();
    const validItems = items.filter(
      (item) => item.product && Number(item.requested_quantity) > 0,
    );
    if (!from || !to)
      return toast.error("Select source and destination branches.");
    if (from === to)
      return toast.error("Source and destination must be different.");
    if (!validItems.length) return toast.error("Add at least one product.");
    mutation.mutate({
      from_branch: Number(from),
      to_branch: Number(to),
      notes: notes.trim(),
      items: validItems.map((item) => ({
        product: Number(item.product),
        requested_quantity: Number(item.requested_quantity),
        remarks: item.remarks || "",
      })),
    });
  };
  return (
    <div className="space-y-6">
      <PageHeader
        title="Branch transfer"
        subtitle="Transfer stock between branches"
      />
      <form onSubmit={submit} className="space-y-6">
        <section className="card-surface p-5">
          <h2 className="font-semibold">Transfer from/to branches</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <Label>From Branch *</Label>
              <Select value={from} onValueChange={setFrom}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select source branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.branch_code} · {b.branch_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>To Branch *</Label>
              <Select value={to} onValueChange={setTo}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select destination branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches
                    .filter((b) => String(b.id) !== String(from))
                    .map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.branch_code} · {b.branch_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>
        <section className="card-surface overflow-hidden">
          <div className="flex items-center justify-between border-b p-5">
            <div>
              <h2 className="font-semibold">Transfer items</h2>
              <p className="text-sm text-muted-foreground">
                Select the item and requested quantity.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setItems((v) => [...v, { product: "", requested_quantity: 1 }])
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Add item
            </Button>
          </div>
          <div className="divide-y">
            {items.map((item, index) => (
              <div
                key={index}
                className="grid gap-3 p-4 md:grid-cols-[1fr_160px_44px]"
              >
                <Select
                  value={item.product}
                  onValueChange={(value) =>
                    updateItem(index, { product: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {products.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.sku} · {p.product_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min="1"
                  value={item.requested_quantity}
                  onChange={(e) =>
                    updateItem(index, { requested_quantity: e.target.value })
                  }
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="text-red-500"
                  onClick={() =>
                    setItems((v) => v.filter((_, i) => i !== index))
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </section>
        <section className="card-surface p-5">
          <Label>Notes</Label>
          <Textarea
            className="mt-2"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="mt-5 flex gap-2">
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Submitting..." : "Make transfer"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate("/transfers")}
            >
              Cancel
            </Button>
          </div>
        </section>
      </form>
    </div>
  );
}
