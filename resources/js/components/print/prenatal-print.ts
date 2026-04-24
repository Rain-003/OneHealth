// resources/js/components/print/prenatal-print.ts

export type PrenatalPrintPatient = {
  full_name?: string | null;
  birthdate?: string | null;
  barangay?: string | null;
  address?: string | null;
  civil_status?: string | null;
  phone_number?: string | null;
  philhealth_number?: string | null;
};

const esc = (v: any): string =>
  String(v ?? "—").replace(/[&<>"']/g, (ch) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[ch] ?? ch;
  });

const fmtMDY = (iso?: string | null): string => {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return esc(iso);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return esc(iso);
  }
};

type MakePrenatalPrintHTMLArgs = {
  patient: PrenatalPrintPatient;
  /** Main body markup: tables, sections, etc. */
  bodyHTML: string;
  title?: string;
};

export function makePrenatalPrintHTML({
  patient,
  bodyHTML,
  title = "Prenatal Record",
}: MakePrenatalPrintHTMLArgs): string {
  const now = new Date().toISOString();

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(title)}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    :root {
      --bg: #ffffff;
      --ink: #111827;
      --muted: #6b7280;
      --teal: #0f8a99;
      --border: #d1d5db;
    }

    * {
      box-sizing: border-box;
    }

    html, body {
      margin: 0;
      padding: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: system-ui, -apple-system, BlinkMacSystemFont,
        "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 11px;
      line-height: 1.35;
    }

    .page {
      max-width: 900px;
      margin: 0 auto;
      padding: 12mm;
    }

    .header {
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
      margin-bottom: 12px;
    }

    .logo {
      width: 52px;
      height: 52px;
      border-radius: 12px;
      background: var(--teal);
      color: #fff;
      display: grid;
      place-items: center;
      font-weight: 800;
      font-size: 18px;
    }

    .title-wrap h1 {
      margin: 0;
      font-size: 18px;
    }

    .title-wrap p {
      margin: 2px 0 0;
      color: var(--muted);
    }

    .meta {
      margin-top: 12px;
      margin-bottom: 14px;
      display: grid;
      grid-template-columns: 120px 1fr;
      gap: 6px 14px;
    }

    .meta-label {
      font-weight: 600;
      color: #111827;
    }

    .meta-value {
      color: #111827;
      word-break: break-word;
    }

    .meta-value.muted {
      color: var(--muted);
    }

    .body {
      margin-top: 10px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }

    th, td {
      border: 1px solid #4b5563;
      padding: 4px 6px;
      font-size: 10px;
      vertical-align: top;
    }

    thead th {
      background: #0f8a99;
      color: #fff;
      font-weight: 700;
      text-transform: uppercase;
    }

    .section-title {
      font-size: 13px;
      font-weight: 700;
      margin: 10px 0 6px;
      color: #111827;
    }

    .footer-note {
      margin-top: 12px;
      padding-top: 6px;
      font-size: 10px;
      color: var(--muted);
      border-top: 1px solid var(--border);
    }

    @page {
      size: A4 portrait;
      margin: 12mm;
    }

    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <header class="header">
      <div class="logo">OH</div>
      <div class="title-wrap">
        <h1>${esc(title)}</h1>
        <p>OneHealth • Prenatal Record</p>
      </div>
    </header>

    <section class="meta">
      <div class="meta-label">Name</div>
      <div class="meta-value">${esc(patient.full_name ?? "—")}</div>

      <div class="meta-label">Birthdate</div>
      <div class="meta-value">${fmtMDY(patient.birthdate ?? null)}</div>

      <div class="meta-label">Civil status</div>
      <div class="meta-value">${esc(patient.civil_status ?? "—")}</div>

      <div class="meta-label">Barangay</div>
      <div class="meta-value">${esc(patient.barangay ?? "—")}</div>

      <div class="meta-label">Address</div>
      <div class="meta-value">${esc(patient.address ?? "—")}</div>

      <div class="meta-label">Phone</div>
      <div class="meta-value">${esc(patient.phone_number ?? "—")}</div>

      <div class="meta-label">PhilHealth #</div>
      <div class="meta-value">${esc(patient.philhealth_number ?? "—")}</div>
    </section>

    <main class="body">
      ${bodyHTML}
    </main>

    <div class="footer-note">
      Generated via OneHealth • ${fmtMDY(now)}
    </div>
  </div>

  <script>
    // Auto-print when opened directly
    window.addEventListener('load', () => {
      setTimeout(() => {
        try { window.print(); } catch (e) { console.error(e); }
      }, 0);
    });
  </script>
</body>
</html>`;
}
