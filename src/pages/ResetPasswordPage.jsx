import React, { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState(params.get("token") || "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { await api.post("/auth/reset-password/", { token, new_password: password }); toast.success("Password reset"); navigate("/login"); }
    catch {} finally { setBusy(false); }
  };
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-6"><ArrowLeft className="w-3.5 h-3.5" /> Back to sign in</Link>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Choose a new password</h1>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label>Reset token</Label>
            <Input required value={token} onChange={e => setToken(e.target.value)} className="h-11 bg-white/[0.02] border-white/10" data-testid="reset-token-input" />
          </div>
          <div className="space-y-1.5">
            <Label>New password</Label>
            <Input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="h-11 bg-white/[0.02] border-white/10" data-testid="reset-password-input" />
          </div>
          <Button type="submit" disabled={busy} className="w-full h-11 bg-blue-600 hover:bg-blue-700" data-testid="reset-submit-btn">Reset password</Button>
        </form>
      </div>
    </div>
  );
}
