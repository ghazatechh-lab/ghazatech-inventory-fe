import React, { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  BarChart3,
  Boxes,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { user, login, isLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [busy, setBusy] = useState(false);

  if (!isLoading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  const submit = async (event) => {
    event.preventDefault();

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
        remember_me: rememberMe,
      });

      if (!result?.success) {
        toast.error(result?.message || "Invalid credentials");
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.detail ||
          "Invalid credentials",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ghaza-login-page">
      <style>{`
        @keyframes ghazaSpin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes ghazaFloat {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-14px);
          }
        }

        .ghaza-login-page {
          --blue: #2563eb;
          --blue-dark: #1d4ed8;
          --blue-light: #60a5fa;
          --cyan: #22d3ee;
          --white: #ffffff;
          --text: #f8fafc;
          --muted: #cbd5e1;

          position: relative;
          min-height: 100vh;
          overflow: hidden;
          color: var(--text);
          background:
            radial-gradient(
              circle at 12% 18%,
              rgba(34, 211, 238, .18),
              transparent 25%
            ),
            radial-gradient(
              circle at 88% 12%,
              rgba(37, 99, 235, .30),
              transparent 32%
            ),
            linear-gradient(
              135deg,
              #020817 0%,
              #071426 42%,
              #0b2344 72%,
              #123768 100%
            );
        }

        .ghaza-login-page,
        .ghaza-login-page *,
        .ghaza-login-page *::before,
        .ghaza-login-page *::after {
          box-sizing: border-box;
        }

        .ghaza-login-page h1,
        .ghaza-login-page h2,
        .ghaza-login-page p,
        .ghaza-login-page span,
        .ghaza-login-page label,
        .ghaza-login-page strong,
        .ghaza-login-page a,
        .ghaza-login-page button {
          -webkit-text-fill-color: currentColor;
        }

        .ghaza-login-grid {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: .55;
          background-image:
            linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px),
            linear-gradient(
              90deg,
              rgba(255,255,255,.035) 1px,
              transparent 1px
            );
          background-size: 48px 48px;
        }

        .ghaza-glow {
          position: absolute;
          border-radius: 999px;
          filter: blur(30px);
          pointer-events: none;
        }

        .ghaza-glow-one {
          top: 12%;
          left: 6%;
          width: 320px;
          height: 320px;
          background: rgba(37, 99, 235, .16);
        }

        .ghaza-glow-two {
          right: 3%;
          bottom: 9%;
          width: 300px;
          height: 300px;
          background: rgba(34, 211, 238, .10);
        }

        .ghaza-shape {
          position: absolute;
          pointer-events: none;
          animation: ghazaFloat 7s ease-in-out infinite;
        }

        .ghaza-shape-one {
          left: 5%;
          top: 20%;
          width: 220px;
          height: 220px;
          border-radius: 50%;
          border: 28px solid rgba(96, 165, 250, .12);
        }

        .ghaza-shape-two {
          right: 7%;
          top: 10%;
          width: 105px;
          height: 105px;
          border-radius: 26px;
          border: 1px solid rgba(255,255,255,.18);
          background: rgba(255,255,255,.05);
          transform: rotate(22deg);
          backdrop-filter: blur(10px);
          animation-delay: -3s;
        }

        .ghaza-shell {
          position: relative;
          z-index: 5;
          display: flex;
          min-height: 100vh;
          flex-direction: column;
          padding: 30px 44px 22px;
        }

        .ghaza-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .ghaza-brand {
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .ghaza-logo {
          display: grid;
          width: 52px;
          height: 52px;
          place-items: center;
          border-radius: 15px;
          color: white;
          font-size: 22px;
          font-weight: 900;
          background: linear-gradient(
            145deg,
            #60a5fa,
            #2563eb
          );
          box-shadow:
            0 15px 32px rgba(37, 99, 235, .32),
            inset 0 1px 0 rgba(255,255,255,.35);
        }

        .ghaza-brand-name {
          color: white !important;
          font-size: 17px;
          font-weight: 900;
          letter-spacing: .01em;
        }

        .ghaza-brand-subtitle {
          margin-top: 3px;
          color: #b9cbe1 !important;
          font-size: 10px;
        }

        .ghaza-secure {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 9px 14px;
          border: 1px solid rgba(148, 184, 226, .35);
          border-radius: 999px;
          color: #e8f3ff !important;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .05em;
          background: rgba(7, 23, 43, .75);
          backdrop-filter: blur(12px);
        }

        .ghaza-content {
          display: grid;
          width: 100%;
          max-width: 1380px;
          flex: 1;
          grid-template-columns:
            minmax(0, 1.15fr)
            minmax(400px, 470px);
          align-items: center;
          gap: 90px;
          margin: 0 auto;
          padding: 38px 0;
        }

        .ghaza-intro {
          position: relative;
          z-index: 4;
          max-width: 690px;
        }

        .ghaza-eyebrow {
          display: inline-flex;
          align-items: center;
          padding: 8px 13px;
          border: 1px solid rgba(147, 197, 253, .38);
          border-radius: 999px;
          color: #dbeafe !important;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .08em;
          background: rgba(30, 64, 175, .28);
        }

        .ghaza-title {
          max-width: 690px;
          margin: 21px 0 18px;
          color: #ffffff !important;
          font-size: clamp(42px, 4.7vw, 67px);
          font-weight: 900;
          line-height: 1.03;
          letter-spacing: -.04em;
          text-shadow: 0 18px 42px rgba(0,0,0,.28);
        }

        .ghaza-copy {
          max-width: 610px;
          margin: 0;
          color: #d5e2f0 !important;
          font-size: 15px;
          font-weight: 500;
          line-height: 1.8;
        }

        .ghaza-features {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-top: 30px;
        }

        .ghaza-feature {
          border: 1px solid rgba(148, 184, 226, .28);
          border-radius: 16px;
          padding: 16px;
          background: rgba(5, 22, 41, .72);
          backdrop-filter: blur(12px);
          box-shadow: 0 14px 30px rgba(0,0,0,.15);
        }

        .ghaza-feature-icon {
          color: #7fb4ff !important;
        }

        .ghaza-feature-title {
          display: block;
          margin-top: 9px;
          color: white !important;
          font-size: 12px;
          font-weight: 800;
        }

        .ghaza-feature-copy {
          display: block;
          margin-top: 4px;
          color: #aebfd3 !important;
          font-size: 10px;
          line-height: 1.5;
        }

        .ghaza-login-wrap {
          position: relative;
          z-index: 10;
          width: 100%;
        }

        .ghaza-login-card {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(191, 219, 254, .45);
          border-radius: 28px;
          padding: 38px;
          background:
            linear-gradient(
              150deg,
              rgba(15, 36, 61, .98),
              rgba(8, 26, 48, .98)
            );
          box-shadow:
            0 35px 90px rgba(0,0,0,.42),
            inset 0 1px 0 rgba(255,255,255,.08);
        }

        .ghaza-login-card::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(
              135deg,
              rgba(96, 165, 250, .08),
              transparent 40%
            );
        }

        .ghaza-card-content {
          position: relative;
          z-index: 2;
        }

        .ghaza-card-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 18px;
          color: #93c5fd !important;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .05em;
        }

        .ghaza-card-title {
          margin: 0;
          color: #ffffff !important;
          font-size: 30px;
          font-weight: 900;
          letter-spacing: -.03em;
        }

        .ghaza-card-copy {
          margin: 9px 0 29px;
          color: #c7d7e8 !important;
          font-size: 13px;
          line-height: 1.65;
        }

        .ghaza-form-label {
          display: block;
          margin-bottom: 8px;
          color: #f1f5f9 !important;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .035em;
        }

        .ghaza-field {
          position: relative;
          margin-bottom: 19px;
        }

        .ghaza-input {
          width: 100%;
          height: 52px;
          border: 1px solid #526b88 !important;
          border-radius: 13px;
          padding: 0 46px 0 16px;
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
          font-size: 14px;
          font-weight: 500;
          outline: none;
          background: #091b30 !important;
          box-shadow:
            inset 0 1px 2px rgba(0,0,0,.22),
            0 1px 0 rgba(255,255,255,.03);
          transition:
            border-color .2s ease,
            box-shadow .2s ease,
            background .2s ease;
        }

        .ghaza-input:hover:not(:disabled) {
          border-color: #718aa6 !important;
          background: #0b2038 !important;
        }

        .ghaza-input:focus {
          border-color: #60a5fa !important;
          background: #0b2038 !important;
          box-shadow:
            0 0 0 4px rgba(59, 130, 246, .20),
            inset 0 1px 2px rgba(0,0,0,.20);
        }

        .ghaza-input::placeholder {
          color: #7890a9 !important;
          -webkit-text-fill-color: #7890a9 !important;
          opacity: 1;
        }

        .ghaza-input:disabled {
          cursor: not-allowed;
          opacity: .6;
        }

        .ghaza-field-icon,
        .ghaza-eye-button {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #8fa6be !important;
        }

        .ghaza-eye-button {
          display: grid;
          width: 34px;
          height: 34px;
          place-items: center;
          border: 0;
          border-radius: 9px;
          background: transparent;
          cursor: pointer;
        }

        .ghaza-eye-button:hover {
          color: white !important;
          background: rgba(255,255,255,.07);
        }

        .ghaza-form-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin: 1px 0 22px;
        }

        .ghaza-check {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #c9d5e2 !important;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
        }

        .ghaza-check input {
          width: 15px;
          height: 15px;
          accent-color: #3b82f6;
        }

        .ghaza-forgot {
          color: #8dbbff !important;
          font-size: 11px;
          font-weight: 700;
          text-decoration: none;
        }

        .ghaza-forgot:hover {
          color: #bfdbfe !important;
          text-decoration: underline;
        }

        .ghaza-login-button {
          display: flex;
          width: 100%;
          height: 52px;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255,255,255,.13);
          border-radius: 13px;
          color: white !important;
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
          background:
            linear-gradient(
              135deg,
              #4f8df8,
              #2563eb
            );
          box-shadow:
            0 15px 28px rgba(37, 99, 235, .32),
            inset 0 1px 0 rgba(255,255,255,.28);
          transition:
            transform .2s ease,
            box-shadow .2s ease,
            filter .2s ease;
        }

        .ghaza-login-button:hover:not(:disabled) {
          transform: translateY(-1px);
          filter: brightness(1.06);
          box-shadow: 0 18px 34px rgba(37, 99, 235, .42);
        }

        .ghaza-login-button:disabled {
          cursor: not-allowed;
          opacity: .65;
        }

        .ghaza-login-spinner {
          width: 16px;
          height: 16px;
          margin-right: 8px;
          border: 2px solid rgba(255,255,255,.35);
          border-top-color: white;
          border-radius: 999px;
          animation: ghazaSpin .8s linear infinite;
        }

        .ghaza-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 22px;
          padding-top: 18px;
          border-top: 1px solid rgba(148, 184, 226, .18);
          color: #91a7bd !important;
          font-size: 9px;
        }

        .ghaza-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          color: #8da3b9 !important;
          font-size: 9px;
        }

        @media (max-width: 1120px) {
          .ghaza-content {
            gap: 50px;
          }

          .ghaza-features {
            grid-template-columns: 1fr;
            max-width: 370px;
          }
        }

        @media (max-width: 950px) {
          .ghaza-login-page {
            overflow: auto;
          }

          .ghaza-shell {
            padding: 24px;
          }

          .ghaza-content {
            max-width: 560px;
            grid-template-columns: 1fr;
            padding: 48px 0;
          }

          .ghaza-intro {
            display: none;
          }

          .ghaza-shape-one {
            opacity: .3;
          }
        }

        @media (max-width: 560px) {
          .ghaza-shell {
            padding: 18px 15px;
          }

          .ghaza-secure {
            display: none;
          }

          .ghaza-content {
            padding: 30px 0;
          }

          .ghaza-login-card {
            padding: 28px 21px;
            border-radius: 22px;
          }

          .ghaza-card-title {
            font-size: 26px;
          }

          .ghaza-form-row {
            align-items: flex-start;
            flex-direction: column;
            gap: 10px;
          }

          .ghaza-meta,
          .ghaza-footer {
            align-items: flex-start;
            flex-direction: column;
          }

          .ghaza-brand-name {
            font-size: 15px;
          }

          .ghaza-logo {
            width: 47px;
            height: 47px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .ghaza-shape {
            animation: none !important;
          }
        }
      `}</style>

      <div className="ghaza-login-grid" />
      <div className="ghaza-glow ghaza-glow-one" />
      <div className="ghaza-glow ghaza-glow-two" />
      <div className="ghaza-shape ghaza-shape-one" />
      <div className="ghaza-shape ghaza-shape-two" />

      <main className="ghaza-shell">
        <header className="ghaza-header">
          <div className="ghaza-brand">
            <div className="ghaza-logo">G</div>

            <div>
              <div className="ghaza-brand-name">GHAZA COMPUTER</div>

              <div className="ghaza-brand-subtitle">Premium Enterprise ERP</div>
            </div>
          </div>

          <div className="ghaza-secure">
            <ShieldCheck size={14} />
            SECURE ERP ACCESS
          </div>
        </header>

        <section className="ghaza-content">
          <div className="ghaza-intro">
            <div className="ghaza-eyebrow">
              NEXT-GENERATION BUSINESS PLATFORM
            </div>

            <h1 className="ghaza-title">
              One intelligent system for your entire company.
            </h1>

            <p className="ghaza-copy">
              Manage inventory, sales, purchases, accounting, HRMS, service
              operations, reports, and all branches from one secure ERP
              platform.
            </p>

            <div className="ghaza-features">
              <FeatureTile
                icon={Boxes}
                title="Live Inventory"
                subtitle="Track stock and availability across every branch."
              />

              <FeatureTile
                icon={WalletCards}
                title="Finance Control"
                subtitle="Manage accounting and business financial operations."
              />

              <FeatureTile
                icon={BarChart3}
                title="Executive Analytics"
                subtitle="Access clear operational and management insights."
              />
            </div>
          </div>

          <div className="ghaza-login-wrap">
            <div className="ghaza-login-card">
              <div className="ghaza-card-content">
                <div className="ghaza-card-badge">
                  <ShieldCheck size={15} />
                  AUTHORIZED ACCESS
                </div>

                <h2 className="ghaza-card-title">Welcome back</h2>

                <p className="ghaza-card-copy">
                  Enter your account details to access GHAZA COMPUTER ERP.
                </p>

                <form onSubmit={submit}>
                  <label className="ghaza-form-label" htmlFor="email">
                    Email or username
                  </label>

                  <div className="ghaza-field">
                    <input
                      id="email"
                      name="email_or_username"
                      data-testid="login-email-input"
                      className="ghaza-input"
                      type="text"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="Enter email or username"
                      autoComplete="username"
                      disabled={busy}
                      required
                    />

                    <Mail className="ghaza-field-icon" size={17} />
                  </div>

                  <label className="ghaza-form-label" htmlFor="password">
                    Password
                  </label>

                  <div className="ghaza-field">
                    <input
                      id="password"
                      name="password"
                      data-testid="login-password-input"
                      className="ghaza-input"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      disabled={busy}
                      required
                    />

                    <button
                      type="button"
                      className="ghaza-eye-button"
                      onClick={() => setShowPassword((current) => !current)}
                      disabled={busy}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>

                  <div className="ghaza-form-row">
                    <label className="ghaza-check">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(event) =>
                          setRememberMe(event.target.checked)
                        }
                      />
                      <span>Remember me</span>
                    </label>

                    <Link to="/forgot-password" className="ghaza-forgot">
                      Forgot password?
                    </Link>
                  </div>

                  <button
                    type="submit"
                    data-testid="login-submit-btn"
                    className="ghaza-login-button"
                    disabled={busy}
                  >
                    {busy ? (
                      <>
                        <span className="ghaza-login-spinner" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        <LockKeyhole size={17} style={{ marginRight: 8 }} />
                        Sign in to ERP
                      </>
                    )}
                  </button>
                </form>

                <div className="ghaza-meta">
                  <span>Encrypted enterprise login</span>
                  <span>ERP Version 1.0</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="ghaza-footer">
          <span>Â© 2026 GHAZA COMPUTER TR LLC</span>

          <span>Privacy Â· Security Â· Support</span>
        </footer>
      </main>
    </div>
  );
}

function FeatureTile({ icon: Icon, title, subtitle }) {
  return (
    <div className="ghaza-feature">
      <Icon className="ghaza-feature-icon" size={18} />

      <strong className="ghaza-feature-title">{title}</strong>

      <span className="ghaza-feature-copy">{subtitle}</span>
    </div>
  );
}

