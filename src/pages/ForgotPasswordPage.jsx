import React, { useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { await api.post("/auth/forgot-password/", { email }); toast.success("Reset link sent"); setSent(true); }
    catch { /* handled */ } finally { setBusy(false); }
  };
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-6"><ArrowLeft className="w-3.5 h-3.5" /> Back to sign in</Link>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Reset your password</h1>
        <p className="text-sm text-slate-400 mt-1">Enter your email and we'll send you a reset link.</p>
        {sent ? (
          <div className="mt-6 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-300">
            If an account exists for <span className="font-medium">{email}</span>, a reset email has been sent.
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 bg-white/[0.02] border-white/10" data-testid="forgot-email-input" />
            </div>
            <Button type="submit" disabled={busy} className="w-full h-11 bg-blue-600 hover:bg-blue-700" data-testid="forgot-submit-btn"><Mail className="w-4 h-4 mr-2" /> Send reset link</Button>
          </form>
        )}
      </div>
    </div>
  );
}
