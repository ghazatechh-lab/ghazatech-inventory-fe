import React from "react";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import api, { getApiErrorDetails, unwrap } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function InlineCustomerDialog({ onCreated }) {
  const { branchId } = useActiveBranchFilter();
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    customer_name: "",
    phone: "",
    email: "",
    customer_type: "BUSINESS",
    category: "RETAIL",
  });

  const save = async () => {
    if (!form.customer_name.trim())
      return toast.error("Customer name is required.");
    setSaving(true);
    try {
      const customer = unwrap(
        await api.post("/customers/", { ...form, branch: Number(branchId) }),
      );
      onCreated?.(customer);
      toast.success("Customer added successfully.");
      setOpen(false);
      setForm({
        customer_name: "",
        phone: "",
        email: "",
        customer_type: "BUSINESS",
        category: "RETAIL",
      });
    } catch (error) {
      toast.error(
        getApiErrorDetails(error).message || "Unable to add customer.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2 gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Add Customer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Customer Name *</Label>
            <Input
              className="mt-2"
              value={form.customer_name}
              onChange={(e) =>
                setForm({ ...form, customer_name: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Phone</Label>
            <Input
              className="mt-2"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              className="mt-2"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <Label>Type</Label>
            <Select
              value={form.customer_type}
              onValueChange={(v) => setForm({ ...form, customer_type: v })}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BUSINESS">Business</SelectItem>
                <SelectItem value="INDIVIDUAL">Individual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Category</Label>
            <Select
              value={form.category}
              onValueChange={(v) => setForm({ ...form, category: v })}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RETAIL">Retail</SelectItem>
                <SelectItem value="WHOLESALE">Wholesale</SelectItem>
                <SelectItem value="CORPORATE">Corporate</SelectItem>
                <SelectItem value="LEAD">Lead</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Add Customer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
