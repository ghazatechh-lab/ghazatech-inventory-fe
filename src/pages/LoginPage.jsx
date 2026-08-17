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
        @keyframes ghazaRingSpin {
          to {
            transform: rotateX(68deg) rotateZ(380deg);
          }
        }

        @keyframes ghazaSphereFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-18px); }
        }

        @keyframes ghazaCubeFloat {
          0%, 100% {
            transform: rotateX(56deg) rotateY(38deg) rotateZ(16deg)
              translateY(0);
          }
          50% {
            transform: rotateX(62deg) rotateY(44deg) rotateZ(23deg)
              translateY(-18px);
          }
        }

        @keyframes ghazaCardFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-7px); }
        }

        .ghaza-login-page {
          --ghaza-blue: #3b82f6;
          --ghaza-blue-light: #7fb0ff;
          --ghaza-cyan: #46d8f5;
          --ghaza-white: #ffffff;
          --ghaza-text: #f8fbff;
          --ghaza-muted: #c6d5e5;
          --ghaza-muted-soft: #9db2c8;
          --ghaza-border: rgba(255,255,255,.20);

          position: relative;
          min-height: 100vh;
          overflow: hidden;
          color: var(--ghaza-text) !important;
          background:
            radial-gradient(
              circle at 16% 18%,
              rgba(49, 210, 242, .15),
              transparent 23%
            ),
            radial-gradient(
              circle at 84% 18%,
              rgba(47, 111, 237, .28),
              transparent 26%
            ),
            radial-gradient(
              circle at 56% 86%,
              rgba(88, 132, 255, .18),
              transparent 25%
            ),
            linear-gradient(
              135deg,
              #020a12 0%,
              #061522 38%,
              #0a213b 70%,
              #11345f 100%
            );
        }

        .ghaza-login-page,
        .ghaza-login-page *,
        .ghaza-login-page *::before,
        .ghaza-login-page *::after {
          box-sizing: border-box;
        }

        /* Prevent ERP/global theme rules from darkening login typography. */
        .ghaza-login-page h1,
        .ghaza-login-page h2,
        .ghaza-login-page h3,
        .ghaza-login-page strong,
        .ghaza-login-page label,
        .ghaza-login-page p,
        .ghaza-login-page span,
        .ghaza-login-page a,
        .ghaza-login-page button {
          -webkit-text-fill-color: currentColor;
        }

        .ghaza-login-bg-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px);
          background-size: 46px 46px;
          mask-image: linear-gradient(
            to bottom,
            rgba(0,0,0,.95),
            transparent 98%
          );
          pointer-events: none;
        }

        .ghaza-login-overlay {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(
              90deg,
              rgba(1, 7, 12, .18),
              rgba(1, 7, 12, .05),
              rgba(1, 7, 12, .20)
            );
          pointer-events: none;
        }

        .ghaza-ring {
          position: absolute;
          left: 4%;
          top: 16%;
          width: 430px;
          height: 430px;
          border-radius: 999px;
          border: 26px solid rgba(113,169,255,.28);
          box-shadow:
            inset 0 0 34px rgba(104,168,255,.22),
            0 0 40px rgba(47,111,237,.16);
          transform-style: preserve-3d;
          transform: rotateX(68deg) rotateZ(20deg);
          animation: ghazaRingSpin 16s linear infinite;
          pointer-events: none;
        }

        .ghaza-sphere {
          position: absolute;
          left: 12%;
          top: 17%;
          width: 250px;
          height: 250px;
          border-radius: 999px;
          background:
            radial-gradient(
              circle at 28% 22%,
              #e3f4ff 0 7%,
              #99caff 18%,
              #4587f2 46%,
              #16458f 76%,
              #07172f 100%
            );
          filter: drop-shadow(0 32px 50px rgba(0,0,0,.25));
          animation: ghazaSphereFloat 6.5s ease-in-out infinite;
          pointer-events: none;
        }

        .ghaza-sphere::after {
          content: "";
          position: absolute;
          inset: 15%;
          border-radius: inherit;
          background:
            radial-gradient(
              circle at 35% 30%,
              rgba(255,255,255,.46),
              transparent 38%
            );
        }

        .ghaza-cube {
          position: absolute;
          width: 140px;
          height: 140px;
          right: 8%;
          top: 13%;
          border-radius: 24px;
          border: 1px solid rgba(255,255,255,.28);
          background:
            linear-gradient(
              145deg,
              rgba(255,255,255,.19),
              rgba(47,111,237,.08)
            );
          backdrop-filter: blur(12px);
          transform: rotateX(56deg) rotateY(38deg) rotateZ(16deg);
          animation: ghazaCubeFloat 7s ease-in-out infinite;
          filter: drop-shadow(0 32px 50px rgba(0,0,0,.22));
          pointer-events: none;
        }

        .ghaza-cube-small {
          width: 72px;
          height: 72px;
          right: 34%;
          top: 77%;
          animation-delay: -2.2s;
        }

        .ghaza-plane {
          position: absolute;
          left: -4%;
          bottom: 14%;
          width: 650px;
          height: 3px;
          background:
            linear-gradient(
              90deg,
              transparent,
              var(--ghaza-cyan),
              transparent
            );
          box-shadow: 0 0 28px rgba(70,216,245,.75);
          transform: rotate(-12deg);
          pointer-events: none;
        }

        .ghaza-login-shell {
          position: relative;
          z-index: 5;
          display: flex;
          min-height: 100vh;
          flex-direction: column;
          padding: 30px 48px 24px;
        }

        .ghaza-login-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .ghaza-brand {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .ghaza-logo {
          display: grid;
          width: 54px;
          height: 54px;
          place-items: center;
          border-radius: 17px;
          color: #06172d !important;
          font-size: 22px;
          font-weight: 900;
          background:
            linear-gradient(
              145deg,
              var(--ghaza-blue-light),
              var(--ghaza-blue)
            );
          box-shadow:
            inset 0 1px 1px rgba(255,255,255,.45),
            0 18px 38px rgba(47,111,237,.36);
        }

        .ghaza-brand-name {
          color: #ffffff !important;
          font-size: 18px;
          font-weight: 800;
          line-height: 1.2;
          text-shadow: 0 2px 12px rgba(0,0,0,.25);
        }

        .ghaza-brand-subtitle {
          margin-top: 4px;
          color: #b9cbe0 !important;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: .02em;
        }

        .ghaza-secure {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border: 1px solid rgba(210,230,255,.70);
          border-radius: 999px;
          padding: 9px 14px;
          color: #e8f2ff !important;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .06em;
          background: rgba(9, 26, 47, .58);
          backdrop-filter: blur(14px);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.08);
        }

        .ghaza-login-content {
          display: grid;
          width: 100%;
          max-width: 1440px;
          flex: 1;
          grid-template-columns: minmax(0, 1fr) 470px;
          align-items: center;
          gap: 70px;
          margin: 0 auto;
          padding: 28px 0;
        }

        .ghaza-intro {
          max-width: 690px;
          padding-left: 130px;
          position: relative;
          z-index: 3;
        }

        .ghaza-eyebrow {
          display: inline-flex;
          align-items: center;
          border: 1px solid rgba(205,228,255,.48);
          border-radius: 999px;
          padding: 8px 12px;
          color: #e7f1ff !important;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .08em;
          background: rgba(44, 93, 165, .55);
          backdrop-filter: blur(12px);
          box-shadow: 0 8px 24px rgba(0,0,0,.20);
        }

        .ghaza-hero-title {
          max-width: 690px;
          margin: 22px 0 18px;
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
          font-size: clamp(44px, 4.8vw, 68px);
          font-weight: 900;
          line-height: 1.02;
          letter-spacing: -.045em;
          text-shadow:
            0 3px 0 rgba(0,0,0,.10),
            0 18px 40px rgba(0,0,0,.30);
        }

        .ghaza-hero-copy {
          max-width: 610px;
          margin: 0;
          color: #d4e1ee !important;
          -webkit-text-fill-color: #d4e1ee !important;
          font-size: 15px;
          font-weight: 500;
          line-height: 1.85;
          text-shadow: 0 4px 18px rgba(0,0,0,.22);
        }

        .ghaza-features {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 28px;
        }

        .ghaza-feature {
          min-width: 160px;
          border: 1px solid rgba(213,231,255,.70);
          border-radius: 17px;
          padding: 15px 17px;
          background: rgba(16, 35, 54, .74);
          backdrop-filter: blur(14px);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.08),
            0 16px 30px rgba(0,0,0,.16);
        }

        .ghaza-feature-icon {
          color: #8db8ff !important;
        }

        .ghaza-feature-title {
          display: block;
          margin-top: 8px;
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
          font-size: 11px;
          font-weight: 800;
        }

        .ghaza-feature-copy {
          display: block;
          margin-top: 4px;
          color: #b8c9da !important;
          -webkit-text-fill-color: #b8c9da !important;
          font-size: 9px;
          font-weight: 500;
        }

        .ghaza-login-wrap {
          position: relative;
          width: 100%;
          animation: ghazaCardFloat 6s ease-in-out infinite;
        }

        .ghaza-card-shadow {
          position: absolute;
          left: 12%;
          bottom: -23px;
          width: 76%;
          height: 50px;
          border-radius: 999px;
          background: rgba(0,0,0,.48);
          filter: blur(25px);
        }

        .ghaza-login-card {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(221,235,255,.70);
          border-radius: 30px;
          padding: 40px;
          background:
            linear-gradient(
              145deg,
              rgba(72, 101, 139, .78),
              rgba(21, 46, 74, .91)
            );
          backdrop-filter: blur(30px);
          box-shadow:
            0 40px 90px rgba(0,0,0,.40),
            inset 0 1px 0 rgba(255,255,255,.18);
          transform: rotateY(-3deg) rotateX(1deg);
          transition: transform .3s ease;
        }

        .ghaza-login-card:hover {
          transform: rotateY(-1deg) rotateX(0deg) translateY(-3px);
        }

        .ghaza-card-title {
          margin: 0;
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
          font-size: 30px;
          font-weight: 850;
          letter-spacing: -.03em;
          text-shadow: 0 4px 18px rgba(0,0,0,.20);
        }

        .ghaza-card-copy {
          margin: 10px 0 28px;
          color: #d0ddec !important;
          -webkit-text-fill-color: #d0ddec !important;
          font-size: 13px;
          font-weight: 500;
        }

        .ghaza-form-label {
          display: block;
          margin-bottom: 8px;
          color: #e8f1fb !important;
          -webkit-text-fill-color: #e8f1fb !important;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .06em;
        }

        .ghaza-field {
          position: relative;
          margin-bottom: 17px;
        }

        .ghaza-input {
          width: 100%;
          height: 48px;
          border: 1px solid rgba(216,232,255,.78) !important;
          border-radius: 14px;
          padding: 0 44px 0 15px;
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
          font-size: 14px;
          font-weight: 500;
          outline: none;
          background: rgba(4, 18, 33, .76) !important;
          box-shadow: inset 0 2px 10px rgba(0,0,0,.18);
          transition: border-color .2s ease, box-shadow .2s ease;
        }

        .ghaza-input::placeholder {
          color: #9eb2c8 !important;
          -webkit-text-fill-color: #9eb2c8 !important;
          opacity: 1;
        }

        .ghaza-input:focus {
          border-color: #8bb6ff !important;
          box-shadow:
            0 0 0 4px rgba(67,126,232,.20),
            inset 0 2px 10px rgba(0,0,0,.18);
        }

        .ghaza-input:disabled {
          cursor: not-allowed;
          opacity: .62;
        }

        .ghaza-field-icon,
        .ghaza-eye-button {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #a9bdd2 !important;
        }

        .ghaza-eye-button {
          display: grid;
          width: 32px;
          height: 32px;
          place-items: center;
          border: 0;
          border-radius: 8px;
          background: transparent;
          cursor: pointer;
        }

        .ghaza-eye-button:hover {
          color: #ffffff !important;
          background: rgba(255,255,255,.08);
        }

        .ghaza-form-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin: 2px 0 20px;
        }

        .ghaza-check {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #c2d2e2 !important;
          -webkit-text-fill-color: #c2d2e2 !important;
          font-size: 10px;
          font-weight: 600;
          cursor: pointer;
        }

        .ghaza-check input {
          accent-color: var(--ghaza-blue);
        }

        .ghaza-forgot {
          color: #a8c8ff !important;
          -webkit-text-fill-color: #a8c8ff !important;
          font-size: 10px;
          font-weight: 800;
          text-decoration: none;
        }

        .ghaza-forgot:hover {
          color: #d7e7ff !important;
          text-decoration: underline;
        }

        .ghaza-login-button {
          display: flex;
          width: 100%;
          height: 48px;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 14px;
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
          background:
            linear-gradient(
              135deg,
              #6da4ff,
              #2f6fed
            );
          box-shadow:
            0 15px 30px rgba(47,111,237,.35),
            inset 0 1px 0 rgba(255,255,255,.35);
          transition: transform .2s ease, box-shadow .2s ease;
        }

        .ghaza-login-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 19px 38px rgba(47,111,237,.44);
        }

        .ghaza-login-button:disabled {
          cursor: not-allowed;
          opacity: .65;
        }

        .ghaza-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 20px;
          padding-top: 17px;
          border-top: 1px solid rgba(255,255,255,.16);
          color: #afc2d6 !important;
          -webkit-text-fill-color: #afc2d6 !important;
          font-size: 9px;
          font-weight: 500;
        }

        .ghaza-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          color: #9fb4c9 !important;
          -webkit-text-fill-color: #9fb4c9 !important;
          font-size: 9px;
          font-weight: 500;
        }

        @media (max-width: 1180px) {
          .ghaza-intro {
            padding-left: 65px;
          }

          .ghaza-login-content {
            gap: 40px;
          }
        }

        @media (max-width: 1050px) {
          .ghaza-login-page {
            overflow: auto;
          }

          .ghaza-login-shell {
            padding: 24px;
          }

          .ghaza-login-content {
            max-width: 560px;
            grid-template-columns: 1fr;
            padding: 45px 0;
          }

          .ghaza-intro {
            display: none;
          }

          .ghaza-login-wrap {
            animation: none;
          }

          .ghaza-login-card,
          .ghaza-login-card:hover {
            transform: none;
          }

          .ghaza-ring,
          .ghaza-sphere {
            opacity: .42;
          }
        }

        @media (max-width: 560px) {
          .ghaza-login-shell {
            padding: 18px 16px;
          }

          .ghaza-secure {
            display: none;
          }

          .ghaza-brand-name {
            font-size: 16px;
          }

          .ghaza-login-content {
            padding: 30px 0;
          }

          .ghaza-login-card {
            padding: 28px 22px;
            border-radius: 24px;
          }

          .ghaza-card-title {
            font-size: 26px;
          }

          .ghaza-form-row,
          .ghaza-meta,
          .ghaza-footer {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .ghaza-ring,
          .ghaza-sphere,
          .ghaza-cube,
          .ghaza-login-wrap {
            animation: none !important;
          }

          .ghaza-login-card {
            transform: none !important;
          }
        }
      `}</style>

      <div className="ghaza-login-bg-grid" />
      <div className="ghaza-login-overlay" />

      <div className="ghaza-ring" />
      <div className="ghaza-sphere" />
      <div className="ghaza-cube" />
      <div className="ghaza-cube ghaza-cube-small" />
      <div className="ghaza-plane" />

      <main className="ghaza-login-shell">
        <header className="ghaza-login-header">
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

        <section className="ghaza-login-content">
          <div className="ghaza-intro">
            <div className="ghaza-eyebrow">
              NEXT-GENERATION BUSINESS PLATFORM
            </div>

            <h1 className="ghaza-hero-title">
              One intelligent system for your entire company.
            </h1>

            <p className="ghaza-hero-copy">
              Manage inventory, sales, purchases, accounting, HRMS, service
              operations, reports, and all branches from one secure ERP
              platform.
            </p>

            <div className="ghaza-features">
              <FeatureTile
                icon={Boxes}
                title="Live Inventory"
                subtitle="Real-time branch stock"
              />

              <FeatureTile
                icon={WalletCards}
                title="Finance Control"
                subtitle="Accurate business reporting"
              />

              <FeatureTile
                icon={BarChart3}
                title="Executive Analytics"
                subtitle="Instant decision insights"
              />
            </div>
          </div>

          <div className="ghaza-login-wrap">
            <div className="ghaza-card-shadow" />

            <div className="ghaza-login-card">
              <h2 className="ghaza-card-title">Welcome back</h2>

              <p className="ghaza-card-copy">
                Sign in to continue to GHAZA COMPUTER ERP.
              </p>

              <form onSubmit={submit}>
                <label className="ghaza-form-label" htmlFor="email">
                  EMAIL OR USERNAME
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
                    placeholder="Enter your username"
                    autoComplete="username"
                    disabled={busy}
                    required
                  />

                  <Mail className="ghaza-field-icon" size={16} />
                </div>

                <label className="ghaza-form-label" htmlFor="password">
                  PASSWORD
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
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <div className="ghaza-form-row">
                  <label className="ghaza-check">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(event) => setRememberMe(event.target.checked)}
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
                      <span
                        style={{
                          width: 16,
                          height: 16,
                          marginRight: 8,
                          border: "2px solid rgba(255,255,255,.35)",
                          borderTopColor: "#fff",
                          borderRadius: "999px",
                          animation: "spin 0.8s linear infinite",
                        }}
                      />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <LockKeyhole size={16} style={{ marginRight: 8 }} />
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
        </section>

        <footer className="ghaza-footer">
          <span>© 2026 GHAZA COMPUTER TR LLC</span>
          <span>Privacy · Security · Support</span>
        </footer>
      </main>
    </div>
  );
}

function FeatureTile({ icon: Icon, title, subtitle }) {
  return (
    <div className="ghaza-feature">
      <Icon className="ghaza-feature-icon" size={16} />

      <strong className="ghaza-feature-title">{title}</strong>

      <span className="ghaza-feature-copy">{subtitle}</span>
    </div>
  );
}
