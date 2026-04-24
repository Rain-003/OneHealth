// resources/js/pages/patients/immunization-card.tsx
import * as React from "react";
import { Head, usePage } from "@inertiajs/react";

// 🖼️ Brand assets
import Logo from "/public/build/assets/LOGO.svg";
import BackIcon from "/public/build/assets/back-outline-svgrepo-com.svg";

/* ───────── Types ───────── */
type Dose = {
  id?: number;
  vaccine: string;
  dose_label: string;
  date_given: string | null;
  remarks?: string | null;
};

type PageProps = {
  patient: {
    id: number | string;
    full_name?: string | null;
    birthdate?: string | null;
    barangay?: string | null;
    address?: string | null;
    sex?: string | null;
    mother_name?: string | null;
    father_name?: string | null;
    phone_number?: string | null;
  };
  matrix: Record<string, string[]>;
  doses: Dose[];
};

/* ───────── Icons ───────── */
const IconPrint = (props: any) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    {...props}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <path d="M6 9V3h12v6" />
    <rect x="6" y="14" width="12" height="7" rx="1" />
    <rect x="2" y="9" width="20" height="8" rx="2" />
  </svg>
);

const IconDownload = (props: any) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    {...props}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <path d="M12 3v12" />
    <path d="M7 10l5 5 5-5" />
    <rect x="3" y="17" width="18" height="4" rx="1" />
  </svg>
);

const IconInfo = (p: any) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    {...p}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8h.01M11 12h2v5h-2" />
  </svg>
);

// Extra icons (kept for possible future UI)
const IconEdit = (p: any) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    {...p}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);
const IconLock = (p: any) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    {...p}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <rect x="3" y="11" width="18" height="10" rx="2" />
    <path d="M7 11V7a5 5 0 1 1 10 0v4" />
  </svg>
);
const IconUser = (p: any) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    {...p}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <circle cx="12" cy="7" r="4" />
    <path d="M5.5 21a7.5 7.5 0 0 1 13 0" />
  </svg>
);
const IconCalendar = (p: any) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    {...p}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);
const IconGender = (p: any) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    {...p}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <circle cx="12" cy="8" r="4" />
    <path d="M5.5 21a7.5 7.5 0 0 1 13 0" />
  </svg>
);
const IconMapPin = (p: any) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    {...p}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <path d="M12 22s7-5.5 7-12a7 7 0 0 0-14 0c0 6.5 7 12 7 12Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);
const IconHome = (p: any) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    {...p}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <path d="M3 11l9-7 9 7" />
    <path d="M9 22V12h6v10" />
  </svg>
);
const IconMother = (p: any) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    {...p}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <circle cx="8" cy="7" r="3" />
    <path d="M2 21a6 6 0 0 1 12 0" />
    <circle cx="18" cy="10" r="2.5" />
    <path d="M14 21a6 6 0 0 1 8 0" />
  </svg>
);
const IconFather = (p: any) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    {...p}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <circle cx="16" cy="7" r="3" />
    <path d="M10 21a6 6 0 0 1 12 0" />
    <circle cx="7" cy="10" r="2.5" />
    <path d="M1 21a6 6 0 0 1 12 0" />
  </svg>
);
const IconPhone = (p: any) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    {...p}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <path d="M22 16.92v2a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h2a2 2 0 0 1 2 1.72c.12.86.33 1.69.62 2.49a2 2 0 0 1-.45 2.11L7.1 9.45a16 16 0 0 0 6 6l1.13-1.13a2 2 0 0 1 2.11-.45c.8.29 1.63.5 2.49.62A2 2 0 0 1 22 16.92z" />
  </svg>
);

/* ───────── Helpers ───────── */
const fmtDate = (v?: string | null) => {
  if (!v) return "—";
  const s = String(v).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime())
    ? s
    : d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
      });
};

/** Strict MM/DD/YYYY (for print cells) */
function fmtMDY(v?: string | null): string {
  if (!v) return "";
  const s = String(v).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[2]}/${m[3]}/${m[1]}`;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  return `${mm}/${dd}/${yyyy}`;
}

function buildLookup(doses: Dose[]) {
  const map = new Map<string, Dose>();
  for (const d of doses) map.set(`${d.vaccine}__${d.dose_label}`, d);
  return (vaccine: string, label: string): Dose | undefined =>
    map.get(`${vaccine}__${label}`);
}

/* === PRINT TABLE HELPERS === */
function maxDoseCols(matrix: Record<string, string[]>) {
  return Math.max(1, ...Object.values(matrix).map((a) => a?.length ?? 0));
}

function labelsToDoseText(labels: string[]) {
  if (!labels || labels.length === 0) return "";
  const norm = labels.map((l) => {
    const s = String(l).trim().toLowerCase();
    if (s.includes("birth")) return "AT BIRTH";
    const wk = s.match(/^(\d+)\s*w/);
    if (wk) {
      const w = Number(wk[1]);
      if ([6, 10, 14].includes(w))
        return ({ 6: "1½", 10: "2½", 14: "3½" } as any)[w];
      const months = (w / 4.345).toFixed(1).replace(/\.0$/, "");
      return `${months} mo`;
    }
    const mo = s.match(/^(\d+)\s*m/);
    if (mo) return `${mo[1]} months`;
    const yr = s.match(/^(\d+)\s*y/);
    if (yr) return `${yr[1]} year${yr[1] === "1" ? "" : "s"}`;
    return l.toUpperCase();
  });
  const allHalf = norm.every((v) => ["1½", "2½", "3½"].includes(v));
  if (allHalf) return `${norm.join(" , ")} MONTHS`;
  if (norm.includes("9 months") && norm.includes("1 years"))
    return "9 MONTHS & 1 YEAR";
  return norm.join(" , ");
}

function combineRemarks(
  matrix: Record<string, string[]>,
  getDose: (v: string, l: string) => Dose | undefined,
  vaccine: string
) {
  const labels = matrix[vaccine] || [];
  const rems = labels
    .map((lbl) => (getDose(vaccine, lbl)?.remarks || "").trim())
    .filter(Boolean);
  return rems.join("; ");
}

/* ───────── html2pdf loader for Download button ───────── */
function ensureHtml2Pdf(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).html2pdf) return resolve((window as any).html2pdf);

    const s = document.createElement("script");
    s.src =
      "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
    s.onload = () => resolve((window as any).html2pdf);
    s.onerror = () => reject(new Error("Failed to load html2pdf.js"));
    document.head.appendChild(s);
  });
}

/* ───────── Page ───────── */
export default function PatientImmunizationCard() {
  const { patient, matrix, doses } = usePage<PageProps>().props;

  const vaccines = React.useMemo(() => Object.keys(matrix), [matrix]);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const activeKey = vaccines[activeIndex] ?? vaccines[0];
  const total = vaccines.length;

  const getDose = React.useMemo(() => buildLookup(doses), [doses]);
  const maxCols = maxDoseCols(matrix);

 const goBack = () => {
  window.location.href = "/patient/dashboard";
};
;

  /** Download the card as a PDF (A4 portrait) */
  async function downloadCard() {
    const printContainer = document.querySelector(
      ".print-only"
    ) as HTMLElement | null;
    const el = document.querySelector(".print-frame") as HTMLElement | null;

    if (!el) {
      console.error("print-frame element not found.");
      return;
    }

    let html2pdf: any;
    try {
      html2pdf = await ensureHtml2Pdf();
    } catch (err) {
      console.error("Failed to load html2pdf.js", err);
      window.print();
      return;
    }

    const previousDisplay = printContainer?.style.display ?? "";
    if (printContainer) {
      printContainer.style.display = "block";
    }

    const safeName =
      (patient.full_name || "Patient")
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, " ")
        .trim() || "Patient";

    const opt = {
      margin: 10, // mm (matches @page margin)
      filename: `Immunization Card - ${safeName}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
      pagebreak: { mode: ["css", "legacy"] as any },
    };

    try {
      await html2pdf().set(opt).from(el).save();
    } catch (err) {
      console.error("PDF generation failed", err);
    } finally {
      if (printContainer) {
        printContainer.style.display = previousDisplay;
      }
    }
  }

  // per-row remarks toggles (read-only, screen)
  const [openRemarks, setOpenRemarks] = React.useState<Record<string, boolean>>(
    {}
  );
  const toggleRemarks = (k: string) =>
    setOpenRemarks((m) => ({ ...m, [k]: !m[k] }));

  return (
    <div
      className="relative min-h-dvh bg-white text-slate-900"
      style={{
        fontFamily:
          "'Poppins', ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
      }}
    >
      <Head title="My Immunization Card">
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </Head>

      {/* Ambient accents (screen only) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden screen-only"
      >
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-teal-200/15 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-cyan-200/15 blur-3xl" />
      </div>

      <style>{`
        .print-only{display:none}
        .screen-only{display:block}

        :root { --teal:#0F8A99; --tealDeep:#0a6f7c; --line:#e2e8f0; }

        .pi-screen .item{ padding:.55rem 0; border-bottom:1px solid var(--line); }
        .pi-screen .label{ font-size:.78rem; color:#64748b; }
        .pi-screen .value{ font-weight:600; color:#0f172a; }

        .print-grid { width:100%; border-collapse:separate; border-spacing:0; table-layout:fixed; font-size:9.8pt; }
        .print-grid th, .print-grid td { border:1.2px solid var(--tealDeep); padding:6px 8px; vertical-align:middle; word-break:break-word; }
        .print-grid thead th { background:var(--teal); color:#fff; font-weight:800; text-transform:uppercase; }
        .print-grid .subhead th { background:#e6f5f6; color:#0b3d48; font-weight:700; text-transform:none; }
        .print-grid tbody tr:nth-child(even) td { background:#f8fbfb; }
        .print-grid .vname { font-weight:800; }
        .print-grid .doses { white-space:nowrap; }

        /* A4-ish content box for both PDF and print */
        .print-frame{
          border:1px solid #cbd5e1;
          border-radius:6px;
          padding:6mm;
          background:#fff;
          box-sizing:border-box;
          width: 190mm;           /* A4 width (210mm) - 2 * 10mm margin */
          max-width: 100%;
          margin: 0 auto;
        }

        @page { size: A4 portrait; margin: 10mm; }

        @media print {
          :root, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          header{ position:static !important; top:auto !important; box-shadow:none !important; }
          .print-only{display:block !important;}
          .screen-only, .print-hide{display:none !important;}
          .print-container{ padding:0 !important; }
          .print-grid thead{ display: table-header-group; }
          .print-grid tr{ page-break-inside: avoid; }
          .print-frame{
            border:none;          /* printer already has page border from margins */
            border-radius:0;
            padding:0;
            width: auto;          /* let it fill the printable area */
            margin: 0;
          }
        }
      `}</style>

      {/* ───────── Sticky header ───────── */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur screen-only">
        <div className="mx-auto max-w-7xl h-14 px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex h-full items-center justify-between gap-2">

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <img src={BackIcon} alt="" className="h-5 w-5 -ml-0.5" />
                <span className="hidden sm:inline">Back</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <IconPrint className="h-5 w-5" />
                <span className="hidden sm:inline">Print</span>
              </button>
              <button
                type="button"
                onClick={downloadCard}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                title="Download (Save as PDF)"
              >
                <IconDownload className="h-5 w-5" />
                <span className="hidden sm:inline">Download</span>
              </button>
            </div>
            

            <h1 className="hidden sm:block text-base md:text-lg font-semibold tracking-tight text-slate-900">
              My Immunization Card
            </h1>

            <div className="flex items-center gap-3">
              <img
                src={Logo}
                alt="OneHealth logo"
                className="h-9 w-9 rounded-xl select-none"
              />
              <div className="leading-tight">
                <div className="text-[16px] md:text-[18px] font-semibold tracking-wide text-[#203D7A]">
                  ONE HEALTH
                </div>
                <div className="text-[11px] uppercase tracking-wider text-slate-500">
                  Patient · Records
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </header>

      {/* ───────── MAIN (screen only) ───────── */}
      <main className="relative z-10 mx-auto max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8 py-6 print-container screen-only">
        {/* Patient info — two-column, light underlines */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="pi-screen grid grid-cols-1 md:grid-cols-2 gap-x-10">
            <PIItem label="Name" value={patient?.full_name} />
            <PIItem label="Birthdate" value={fmtDate(patient?.birthdate)} />

            <PIItem label="Sex" value={patient?.sex} />
            <PIItem label="Phone" value={patient?.phone_number} />

            {/* Barangay | Address on the same row */}
            <PIItem label="Barangay" value={patient?.barangay} />
            <PIItem label="Address" value={patient?.address} wrap />

            <PIItem label="Mother's Name" value={patient?.mother_name} />
            <PIItem label="Father's Name" value={patient?.father_name} last />
          </div>
        </section>

        {/* Controls + progress */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="min-w-0">
              <div className="text-[15px] font-semibold text-[#203D7A]">
                Immunization
              </div>
              <div className="mt-1 h-1.5 w-full max-w-[360px] bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-1.5 bg-[#0F8A99]"
                  style={{
                    width: `${(
                      ((activeIndex + 1) / Math.max(vaccines.length, 1)) *
                      100
                    ).toFixed(0)}%`,
                  }}
                />
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                {activeIndex + 1} / {vaccines.length}
              </div>
            </div>

            <div className="w-full sm:w-auto">
              <label htmlFor="vaxSelect" className="sr-only">
                Select vaccine
              </label>
              <select
                id="vaxSelect"
                className="w-full sm:w-[340px] h-10 rounded-xl border border-slate-300 px-3 text-[14px] bg-white"
                value={activeIndex}
                onChange={(e) => {
                  setActiveIndex(Number(e.target.value));
                  window.scrollTo({ top: 0, behavior: "instant" as any });
                }}
                title="Choose vaccine"
              >
                {vaccines.map((v, i) => (
                  <option key={v} value={i}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <details className="ml-auto group w-full sm:w-auto">
              <summary className="inline-flex items-center gap-2 cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
                <IconInfo className="h-4 w-4" /> Legend
              </summary>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[13px] text-slate-700">
                {vaccines.map((v) => (
                  <div key={v} className="flex items-baseline gap-2">
                    <span className="inline-flex items-center rounded-md bg-teal-50 border border-teal-200 text-teal-900 px-2 py-0.5 text-[11px]">
                      {v}
                    </span>
                    <span />
                  </div>
                ))}
              </div>
            </details>
          </div>
        </section>

        {/* Active vaccine (view-only cards) */}
        <section className="mt-4 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <header className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="font-semibold text-slate-800 text-[15px] sm:text-[16px] truncate">
              {activeKey}
            </div>
            <div className="text-[11px] text-slate-500 uppercase tracking-wide">
              {activeIndex + 1} of {total}
            </div>
          </header>

          <div className="p-3 sm:p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {(matrix[activeKey] || []).map((label) => {
                const d = getDose(activeKey, label);
                const k = `${activeKey}||${label}`;
                const hasRemarks = !!(d?.remarks && d?.remarks.trim());
                const isOpen = !!openRemarks[k];

                return (
                  <article
                    key={label}
                    className="rounded-lg border border-slate-200 bg-white p-3 min-w-0"
                  >
                    <h3 className="font-medium text-slate-800 text-[14px] truncate">
                      {label}
                    </h3>

                    <div className="mt-2 text-[14px]">
                      <div className="text-slate-600">Date</div>
                      <div className="font-medium text-slate-900">
                        {fmtDate(d?.date_given ?? null)}
                      </div>
                    </div>

                    <div className="mt-2">
                      {hasRemarks ? (
                        <>
                          <button
                            type="button"
                            onClick={() => toggleRemarks(k)}
                            className="text-[12px] font-semibold text-[#0F8A99] hover:underline"
                            aria-expanded={isOpen}
                          >
                            {isOpen ? "Hide remarks" : "Show remarks"}
                          </button>
                          {isOpen && (
                            <div className="mt-2 text-[14px] text-slate-800 whitespace-pre-wrap break-words">
                              {d?.remarks}
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-[12px] text-slate-400">
                          No remarks
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="mx-auto mt-12 flex max-w-2xl items-center justify-between border-t border-slate-200 pt-6">
          <div className="flex items-center gap-2">
            <img src={Logo} alt="OneHealth logo" className="h-8 w-8 rounded-lg" />
            <span className="text-sm font-semibold tracking-wide text-[#203D7A]">
              ONE HEALTH
            </span>
          </div>
          <span className="text-xs text-slate-500">
            © {new Date().getFullYear()} OneHealth. All rights reserved.
          </span>
        </div>
      </main>

      {/* ───────── PRINT-ONLY SHEET (used by browser print & pdf) ───────── */}
      <section className="print-only" style={{ marginTop: "0" }}>
        <div className="print-frame">
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "18mm",
                height: "18mm",
                borderRadius: "5mm",
                background: "#0F8A99",
                color: "#fff",
                fontWeight: 800,
                display: "grid",
                placeItems: "center",
                fontSize: "12pt",
              }}
            >
              OH
            </div>
            <div>
              <div
                style={{
                  fontSize: "14pt",
                  fontWeight: 800,
                  lineHeight: 1.1,
                }}
              >
                ONE HEALTH — Immunization Card
              </div>
              <div
                style={{
                  fontSize: "8.5pt",
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                  color: "#475569",
                }}
              >
                Patient Records
              </div>
            </div>
          </div>
          <div
            style={{
              height: "3mm",
              background: "linear-gradient(90deg,#0F8A99,#12a4a8,#2bc8d8)",
              borderRadius: "10mm",
              margin: "6mm 0 4mm",
            }}
          />

          {/* SAME two-column underlined patient info */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              columnGap: "10mm",
            }}
          >
            {[
              ["Name", patient.full_name ?? "—"],
              ["Birthdate", fmtMDY(patient.birthdate) || "—"],
              ["Sex", patient.sex ?? "—"],
              ["—", ""],
              ["Barangay", patient.barangay ?? "—"],
              ["Address", patient.address ?? "—"],
              ["Mother's Name", patient.mother_name ?? "—"],
              ["Father's Name", patient.father_name ?? "—"],
            ].map(([label, value], i) => (
              <div
                key={i}
                style={{
                  padding: "2.5mm 0",
                  borderBottom: "0.6pt solid #e2e8f0",
                }}
              >
                <div style={{ fontSize: "9pt", color: "#475569" }}>{label}</div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "10.5pt",
                    wordBreak: "break-word",
                  }}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* Table */}
          <table
            className="print-grid"
            style={{ marginTop: "7mm", width: "100%" }}
          >
            <thead>
              <tr>
                <th style={{ width: "32%" }}>BAKUNA</th>
                <th style={{ width: "24%" }}>DOSES</th>
                <th colSpan={maxCols} style={{ width: "34%" }}>
                  PETSA NG BAKUNA (MM/DD/YYYY)
                </th>
                <th style={{ width: "10%" }}>REMARKS</th>
              </tr>
              <tr className="subhead">
                <th></th>
                <th></th>
                {Array.from({ length: maxCols }).map((_, i) => (
                  <th key={i}>{i + 1}</th>
                ))}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(matrix).map((vac) => {
                const labels = matrix[vac] || [];
                const rowRemarks = combineRemarks(matrix, getDose, vac);
                return (
                  <tr key={vac}>
                    <td className="vname">{vac}</td>
                    <td className="doses">{labelsToDoseText(labels)}</td>
                    {Array.from({ length: maxCols }).map((_, i) => {
                      const lbl = labels[i];
                      const dt = lbl
                        ? fmtMDY(getDose(vac, lbl)?.date_given ?? null)
                        : "";
                      return <td key={i}>{dt}</td>;
                    })}
                    <td style={{ whiteSpace: "pre-wrap" }}>{rowRemarks}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/* ───────── Screen PI item (two-column with underline) ───────── */
function PIItem({
  label,
  value,
  wrap = false,
  last = false,
}: {
  label: string;
  value?: string | null;
  wrap?: boolean;
  last?: boolean;
}) {
  const show = (value ?? "").toString().trim() || "—";
  return (
    <div className={["item", last ? "" : ""].join(" ")}>
      <div className="label">{label}</div>
      <div
        className={[
          "value",
          wrap ? "whitespace-pre-wrap break-words" : "truncate",
        ].join(" ")}
        title={show}
      >
        {show}
      </div>
    </div>
  );
}
