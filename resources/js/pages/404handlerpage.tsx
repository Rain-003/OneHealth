// resources/js/pages/404handlerpage.tsx
/* ============================================================================
   ONE HEALTH — Minimal "Feature Coming Soon" (Light / Teal)
   ---------------------------------------------------------------------------
   - White/light surface with teal accents (no dark theme)
   - Clean, quiet layout; no Tailwind required
============================================================================ */

import * as React from "react";
import { Head, Link } from "@inertiajs/react";
import Logo from "/public/build/assets/LOGO.svg";

export default function FeatureComingSoon() {
  const handleBack: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    e.preventDefault();
    if (window.history.length > 1) window.history.back();
    else window.location.href = "/";
  };

  return (
    <main className="oh" role="main" aria-labelledby="oh-title">
      <Head title="Feature coming soon • ONE HEALTH" />
      <style>{`
        :root {
          --bg: #ffffff;
          --ink: #0f172a;      /* slate-900 */
          --muted: #64748b;    /* slate-500 */
          --line: #e2e8f0;     /* slate-200 */
          --brand: #0F8A99;    /* One Health teal */
          --brand-50: #E6F7F8; /* light teal wash */
          --white: #ffffff;
          --shadow: 0 8px 28px rgba(15, 138, 153, .08);
          --radius: 16px;
        }

        .oh {
          min-height: 100dvh;
          display: grid;
          place-items: center;
          background:
            linear-gradient(180deg, #fff 0%, #f8fbfb 100%);
          padding: 24px;
          font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI",
                       Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
          color: var(--ink);
        }

        .card {
          width: 100%;
          max-width: 620px;
          background: var(--white);
          border: 1px solid var(--line);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          padding: 28px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        /* Slim teal accent on top edge */
        .card::before {
          content: "";
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: var(--brand);
        }

        .logo {
          height: 44px;
          width: auto;
          margin: 2px auto 10px;
          display: block;
          user-select: none;
        }

        .kicker {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 999px;
          background: var(--brand-50);
          color: var(--brand);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: .06em;
          text-transform: uppercase;
          margin-bottom: 8px;
          border: 1px solid #cfeff1;
        }

        .title {
          margin: 0;
          font-size: clamp(22px, 3.1vw, 28px);
          line-height: 1.2;
          font-weight: 700;
        }

        .sub {
          margin: 10px auto 0;
          max-width: 520px;
          color: var(--muted);
          font-size: 14px;
          line-height: 1.6;
        }

        .divider {
          height: 1px;
          background: var(--line);
          margin: 20px 0 18px;
          border: 0;
        }

        .actions {
          display: inline-flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .btn {
          appearance: none;
          border: 1px solid var(--line);
          background: var(--white);
          color: var(--ink);
          padding: 10px 14px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
          transition: transform .06s ease, background .12s ease, border-color .12s ease, box-shadow .12s ease;
        }
        .btn:hover { transform: translateY(-1px); border-color: #cfd8e3; }
        .btn:active { transform: translateY(0); }

        .btn.primary {
          background: var(--brand);
          border-color: var(--brand);
          color: #fff;
        }
        .btn.primary:hover {
          filter: brightness(1.02);
        }

        .btn:focus-visible {
          outline: 3px solid rgba(15, 138, 153, .25);
          outline-offset: 2px;
        }

        .meta {
          margin-top: 16px;
          font-size: 12px;
          color: var(--muted);
        }
      `}</style>

      <section className="card" aria-live="polite">
        <img src={Logo} alt="ONE HEALTH" className="logo" />
        <span className="kicker" aria-hidden="true">One Health</span>

        <h1 id="oh-title" className="title">Feature coming soon</h1>
        <p className="sub">
          This page isn’t ready yet. You can go back to where you were or head to the dashboard.
        </p>

        <hr className="divider" />

        <div className="actions">
          <button className="btn" onClick={handleBack} aria-label="Go back">← Go back</button>
          <Link className="btn primary" href="/" aria-label="Return to dashboard">
            Return to Dashboard
          </Link>
        </div>

        <div className="meta">Status: 404 • Not available</div>
      </section>
    </main>
  );
}
