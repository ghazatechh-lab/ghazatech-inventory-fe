import React, { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Cpu, Eye, EyeOff, Lock, Loader2 } from "lucide-react";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { toast } from "sonner";

export default function LoginPage() {
  const { user, login, isLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!isLoading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  const submit = async (e) => {
    e.preventDefault();

    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      toast.error("Email/username and password are required.");
      return;
    }

    setBusy(true);

    try {
      const result = await login({
        email_or_username: cleanEmail,
        password,
      });

      if (!result?.success) {
        toast.error(result?.message || "Invalid credentials");
      }
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.detail ||
          "Invalid credentials",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2">
      <div className="hidden lg:flex relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1490381541006-5611e864dfc0?crop=entropy&cs=srgb&fm=jpg&q=85')] bg-cover bg-center" />

        <div className="absolute inset-0 bg-gradient-to-br from-[#020617]/95 via-[#020617]/85 to-blue-950/75" />

        <div className="absolute inset-0 grain opacity-30" />

        <div className="relative z-10 flex flex-col justify-between p-10 w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-2xl shadow-blue-900/40">
              <Cpu className="w-5 h-5 text-white" />
            </div>

            <div>
              <div className="text-white font-semibold tracking-wide">
                {APP_NAME}
              </div>

              <div className="text-xs text-slate-400">{APP_TAGLINE}</div>
            </div>
          </div>

          <div className="max-w-md">
            <div className="text-[11px] tracking-[0.2em] uppercase text-blue-400 font-semibold mb-3">
              Enterprise ERP
            </div>

            <h2 className="text-4xl font-semibold tracking-tight text-white leading-tight">
              Manage your laptop spare-parts business, end to end.
            </h2>

            <p className="text-slate-400 mt-4 text-sm leading-relaxed">
              Inventory across branches, POS, HRMS with UAE document expiry
              alerts, finance and compliance—all in one command center.
            </p>
          </div>

          <div className="text-[11px] text-slate-500">
            © 2026 GHAZA COMPUTER LLC · Dubai, UAE
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-white" />
            </div>

            <div>
              <div className="text-white font-semibold">{APP_NAME}</div>

              <div className="text-xs text-slate-500">{APP_TAGLINE}</div>
            </div>
          </div>

          <h1 className="text-2xl font-semibold text-white tracking-tight">
            Sign in
          </h1>

          <p className="text-sm text-slate-400 mt-1">
            Welcome back. Enter your credentials to continue.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email or username</Label>

              <Input
                id="email"
                name="email_or_username"
                data-testid="login-email-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@ghazatech.com"
                autoComplete="username"
                className="h-11 bg-white/[0.02] border-white/10"
                disabled={busy}
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>

                <Link
                  to="/forgot-password"
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Forgot password?
                </Link>
              </div>

              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  data-testid="login-password-input"
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="h-11 bg-white/[0.02] border-white/10 pr-10"
                  disabled={busy}
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPwd((current) => !current)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  aria-label={showPwd ? "Hide password" : "Show password"}
                >
                  {showPwd ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={busy}
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="login-submit-btn"
            >
              {busy ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Sign in securely
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
