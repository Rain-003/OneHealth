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

const IconChevron = (p: any) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    {...p}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
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
  vaccine: string,
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

  /** Download the card as a PDF (A4 portrait) */
  async function downloadCard() {
    const printContainer = document.querySelector(
      ".print-only",
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
    {},
  );
  const toggleRemarks = (k: string) =>
    setOpenRemarks((m) => ({ ...m, [k]: !m[k] }));

  const [detailsOpen, setDetailsOpen] = React.useState(false);

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
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
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

        :root { --teal:#203D7A; --tealDeep:#172f63; --line:#e2e8f0; }

        .pi-screen .item{ padding:.55rem 0; }
        .pi-screen .label{ font-size:.72rem; color:#64748b; letter-spacing:.04em; text-transform:uppercase; }
        .pi-screen .value{ font-weight:600; color:#0f172a; }

        .print-grid { width:100%; border-collapse:separate; border-spacing:0; table-layout:fixed; font-size:9.3pt; border:1.2px solid var(--tealDeep); border-radius:8px; overflow:hidden; }
        .print-grid th, .print-grid td { border-right:1px solid #b7d8dc; border-bottom:1px solid #b7d8dc; padding:5.5px 7px; vertical-align:middle; word-break:break-word; }
        .print-grid tr > *:last-child { border-right:0; }
        .print-grid tbody tr:last-child td { border-bottom:0; }
        .print-grid thead th { background:var(--teal); color:#fff; font-weight:800; text-transform:uppercase; letter-spacing:.03em; }
        .print-grid .subhead th { background:#e8f6f7; color:#172f63; font-weight:800; text-transform:none; }
        .print-grid tbody tr:nth-child(even) td { background:#f8fbfb; }
        .print-grid .vname { font-weight:800; color:#0f172a; }
        .print-grid .doses { white-space:normal; color:#334155; }

        /* A4-ish content box for both PDF and print */
        .print-frame{
          border:1px solid #b7d8dc;
          border-radius:12px;
          padding:6mm;
          background:#fff;
          box-sizing:border-box;
          width: 190mm;           /* A4 width (210mm) - 2 * 10mm margin */
          max-width: 100%;
          margin: 0 auto;
          box-shadow:0 8px 24px rgba(15,138,153,.10);
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
      <header className="sticky top-0 z-30 bg-transparent px-2 py-2 screen-only sm:px-3">
        <div className="mx-auto w-full max-w-[1180px] rounded-2xl border border-slate-200 bg-white/90 px-3 shadow-sm backdrop-blur sm:px-4">
          <div className="grid min-h-14 grid-cols-[auto_1fr_auto] items-center gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={goBack}
                className="inline-flex h-11 min-w-[44px] items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#203D7A]/30"
                aria-label="Back to dashboard"
                title="Back"
              >
                <img src={BackIcon} alt="" className="h-5 w-5 shrink-0" />
                <span className="hidden sm:inline">Back</span>
              </button>
            </div>

            <div className="flex min-w-0 items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex h-11 min-w-[44px] items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#203D7A]/30"
                aria-label="Print immunization card"
                title="Print"
              >
                <IconPrint className="h-5 w-5 shrink-0" />
                <span className="hidden md:inline">Print</span>
              </button>
              <button
                type="button"
                onClick={downloadCard}
                className="inline-flex h-11 min-w-[44px] items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#203D7A]/30"
                title="Download"
                aria-label="Download immunization card as PDF"
              >
                <IconDownload className="h-5 w-5 shrink-0" />
                <span className="hidden md:inline">Download</span>
              </button>
            </div>

            <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
              <img
                src={Logo}
                alt="OneHealth logo"
                className="h-9 w-9 rounded-xl select-none"
                draggable={false}
              />
              <div className="hidden leading-tight sm:block">
                <div className="text-[15px] font-semibold tracking-wide text-[#203D7A] md:text-[17px]">
                  ONE HEALTH
                </div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500">
                  Patient · Records
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ───────── MAIN (screen only) ───────── */}
      <main className="relative z-10 mx-auto w-full max-w-[1180px] px-3 py-4 print-container screen-only sm:px-4 md:px-6 md:py-6">
        {/* Patient info — compressed header with collapsible personal details */}
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
          <div className="p-4 sm:p-5 md:p-6">
            <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[12px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
                  <IconUser className="h-4 w-4 text-[#203D7A]" />
                  Patient
                </div>
                <h1 className="mt-2 break-words text-2xl font-extrabold leading-tight tracking-tight text-[#203D7A] sm:text-3xl md:text-4xl">
                  {patient?.full_name || "—"}
                </h1>
                <div className="mt-4 flex flex-wrap gap-2">
                  <InfoChip
                    icon={<IconCalendar className="h-4 w-4" />}
                    text={fmtDate(patient?.birthdate)}
                  />
                  <InfoChip
                    icon={<IconGender className="h-4 w-4" />}
                    text={patient?.sex || "—"}
                  />
                  <InfoChip
                    icon={<IconMapPin className="h-4 w-4" />}
                    text={patient?.barangay || "—"}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDetailsOpen((v) => !v)}
                aria-expanded={detailsOpen}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#203D7A]/30 md:w-auto md:min-w-[178px]"
              >
                {detailsOpen ? "Hide details" : "Show details"}
                <IconChevron
                  className={[
                    "h-4 w-4 transition-transform",
                    detailsOpen ? "rotate-180" : "",
                  ].join(" ")}
                />
              </button>
            </div>
          </div>

          <div
            className={[
              "grid transition-all duration-300 ease-out",
              detailsOpen
                ? "grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0",
            ].join(" ")}
          >
            <div className="overflow-hidden">
              <div className="border-t border-slate-100 px-4 py-3 sm:px-5 md:px-6 md:py-4">
                <div className="pi-screen grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  <PIItem
                    label="Birthdate"
                    value={fmtDate(patient?.birthdate)}
                    icon={<IconCalendar className="h-4 w-4 text-[#203D7A]" />}
                  />
                  <PIItem
                    label="Sex"
                    value={patient?.sex}
                    icon={<IconGender className="h-4 w-4 text-[#203D7A]" />}
                  />
                  <PIItem
                    label="Phone"
                    value={patient?.phone_number}
                    icon={<IconPhone className="h-4 w-4 text-[#203D7A]" />}
                  />
                  <PIItem
                    label="Barangay"
                    value={patient?.barangay}
                    icon={<IconMapPin className="h-4 w-4 text-[#203D7A]" />}
                  />
                  <PIItem
                    label="Address"
                    value={patient?.address}
                    wrap
                    icon={<IconHome className="h-4 w-4 text-[#203D7A]" />}
                  />
                  <PIItem
                    label="Mother's Name"
                    value={patient?.mother_name}
                    icon={<IconMother className="h-4 w-4 text-[#203D7A]" />}
                  />
                  <PIItem
                    label="Father's Name"
                    value={patient?.father_name}
                    icon={<IconFather className="h-4 w-4 text-[#203D7A]" />}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Controls + progress */}
        <section className="mt-4 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100 sm:p-4 md:mt-5">
          <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)_auto] lg:items-center">
            <div className="min-w-0">
              <div className="text-[15px] font-semibold text-[#203D7A]">
                Immunization
              </div>
              <div className="mt-1 h-1.5 w-full max-w-[360px] bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-1.5 bg-[#203D7A]"
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

            <div className="w-full min-w-0">
              <label htmlFor="vaxSelect" className="sr-only">
                Select vaccine
              </label>
              <select
                id="vaxSelect"
                className="h-11 w-full rounded-xl border-2 border-[#203D7A]/70 bg-[#203D7A]/[0.03] px-3 text-[14px] font-semibold text-[#203D7A] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#203D7A]/25"
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

            <details className="group relative w-full lg:w-auto">
              <summary className="inline-flex h-11 w-full cursor-pointer list-none items-center justify-center gap-2 rounded-xl border border-[#203D7A]/40 bg-white px-3 text-sm font-semibold text-[#203D7A] shadow-sm transition hover:bg-[#203D7A]/5 focus:outline-none focus:ring-2 focus:ring-[#203D7A]/20 lg:w-auto [&::-webkit-details-marker]:hidden">
                <IconInfo className="h-4 w-4" />
                <span>Legend</span>
                <IconChevron className="h-4 w-4 transition-transform group-open:rotate-180" />
              </summary>

              <div className="mt-2 rounded-2xl bg-white p-3 shadow-lg ring-1 ring-[#203D7A]/20 lg:absolute lg:right-0 lg:top-full lg:z-20 lg:w-[min(92vw,560px)]">
                <div className="mb-3 flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
                  <div>
                    <div className="text-[13px] font-bold text-[#203D7A]">
                      Vaccine Legend
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Tap the selector to switch vaccine groups.
                    </div>
                  </div>
                  <span className="rounded-full bg-[#203D7A]/10 px-2.5 py-1 text-[11px] font-semibold text-[#203D7A]">
                    {vaccines.length} items
                  </span>
                </div>

                <div className="grid max-h-[48vh] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                  {vaccines.map((v, i) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        setActiveIndex(i);
                        window.scrollTo({ top: 0, behavior: "instant" as any });
                      }}
                      className={[
                        "flex min-w-0 items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-[13px] transition ring-1",
                        i === activeIndex
                          ? "bg-[#203D7A] text-white ring-[#203D7A]"
                          : "bg-slate-50 text-slate-700 ring-slate-100 hover:bg-[#203D7A]/5 hover:text-[#203D7A] hover:ring-[#203D7A]/20",
                      ].join(" ")}
                    >
                      <span className="truncate font-semibold">{v}</span>
                      <span
                        className={[
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
                          i === activeIndex
                            ? "bg-white/15 text-white"
                            : "bg-white text-slate-500 ring-1 ring-slate-100",
                        ].join(" ")}
                      >
                        {i + 1}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </details>
          </div>
        </section>

        {/* Active vaccine (view-only cards) */}
        <section className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#203D7A]/20">
          <header className="flex items-center justify-between gap-3 bg-gradient-to-r from-[#203D7A]/10 via-slate-50 to-white px-3 py-3 ring-1 ring-[#203D7A]/15 sm:px-4">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#203D7A]">
                Selected vaccine
              </div>
              <div className="truncate text-[15px] font-bold text-[#203D7A] sm:text-[17px]">
                {activeKey}
              </div>
            </div>
            <div className="shrink-0 rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 ring-1 ring-slate-100">
              {activeIndex + 1} of {total}
            </div>
          </header>

          <div className="p-2.5 sm:p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {(matrix[activeKey] || []).map((label) => {
                const d = getDose(activeKey, label);
                const k = `${activeKey}||${label}`;
                const hasRemarks = !!(d?.remarks && d?.remarks.trim());
                const isOpen = !!openRemarks[k];

                return (
                  <article
                    key={label}
                    className="min-w-0 rounded-2xl border-l-4 border-l-[#203D7A] bg-white p-3 shadow-sm ring-1 ring-[#203D7A]/20 transition hover:-translate-y-0.5 hover:shadow-md sm:p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                          Dose
                        </div>
                        <h3 className="truncate text-[15px] font-bold text-[#203D7A]">
                          {label}
                        </h3>
                      </div>
                      <span className="shrink-0 rounded-full bg-[#203D7A]/10 px-2.5 py-1 text-[11px] font-semibold text-[#203D7A]">
                        {d?.date_given ? "Recorded" : "Pending"}
                      </span>
                    </div>

                    <div className="mt-3 rounded-xl bg-slate-50/80 p-3 text-[14px] ring-1 ring-slate-100">
                      <div className="text-[12px] font-medium text-slate-500">
                        Date
                      </div>
                      <div className="mt-0.5 font-semibold text-slate-900">
                        {fmtDate(d?.date_given ?? null)}
                      </div>
                    </div>

                    <div className="mt-3">
                      {hasRemarks ? (
                        <>
                          <button
                            type="button"
                            onClick={() => toggleRemarks(k)}
                            className="text-[12px] font-semibold text-[#203D7A] hover:underline"
                            aria-expanded={isOpen}
                          >
                            {isOpen ? "Hide remarks" : "Show remarks"}
                          </button>
                          {isOpen && (
                            <div className="mt-2 rounded-xl bg-[#203D7A]/5 p-3 text-[14px] text-slate-800 whitespace-pre-wrap break-words ring-1 ring-[#203D7A]/15">
                              {d?.remarks}
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="inline-flex rounded-full bg-slate-50 px-2.5 py-1 text-[12px] text-slate-400 ring-1 ring-slate-100">
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
        <div className="mx-auto mt-10 flex max-w-2xl flex-col items-center justify-between gap-3 border-t border-slate-200 pt-5 sm:flex-row md:mt-14">
          <div className="flex items-center gap-2">
            <img
              src={Logo}
              alt="OneHealth logo"
              className="h-8 w-8 rounded-lg"
            />
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
              borderBottom: "1pt solid #d9edf0",
              paddingBottom: "4mm",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <img
                src={Logo}
                alt="OneHealth logo"
                style={{
                  width: "17mm",
                  height: "17mm",
                  borderRadius: "4.5mm",
                  objectFit: "cover",
                }}
              />
              <div>
                <div
                  style={{
                    fontSize: "15pt",
                    fontWeight: 800,
                    lineHeight: 1.1,
                    color: "#0f172a",
                  }}
                >
                  ONE HEALTH
                </div>
                <div
                  style={{
                    fontSize: "8.5pt",
                    letterSpacing: ".12em",
                    textTransform: "uppercase",
                    color: "#203D7A",
                    fontWeight: 700,
                  }}
                >
                  Immunization Card
                </div>
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  display: "inline-block",
                  borderRadius: "999px",
                  background: "#e8f6f7",
                  color: "#172f63",
                  padding: "2mm 3.5mm",
                  fontSize: "8.5pt",
                  fontWeight: 800,
                  letterSpacing: ".04em",
                  textTransform: "uppercase",
                }}
              >
                Patient Record
              </div>
              <div style={{ marginTop: "1.5mm", fontSize: "8pt", color: "#64748b" }}>
                Printed: {new Date().toLocaleDateString()}
              </div>
            </div>
          </div>

          <div
            style={{
              margin: "5mm 0 4mm",
              borderRadius: "4mm",
              background: "linear-gradient(90deg,#203D7A,#2b4f9a,#dbeafe)",
              padding: "4mm 5mm",
              color: "#fff",
            }}
          >
            <div style={{ fontSize: "8.5pt", letterSpacing: ".12em", textTransform: "uppercase", opacity: 0.92 }}>
              Patient Name
            </div>
            <div style={{ marginTop: "1mm", fontSize: "17pt", fontWeight: 900, lineHeight: 1.05, wordBreak: "break-word" }}>
              {patient.full_name ?? "—"}
            </div>
          </div>

          {/* Patient information */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "2.5mm 4mm",
              marginBottom: "5mm",
            }}
          >
            {[
              ["Birthdate", fmtMDY(patient.birthdate) || "—"],
              ["Sex", patient.sex ?? "—"],
              ["Barangay", patient.barangay ?? "—"],
              ["Phone", patient.phone_number ?? "—"],
              ["Address", patient.address ?? "—"],
              ["Mother's Name", patient.mother_name ?? "—"],
              ["Father's Name", patient.father_name ?? "—"],
              ["Record Type", "Immunization"],
            ].map(([label, value], i) => (
              <div
                key={i}
                style={{
                  border: "1pt solid #d9edf0",
                  borderRadius: "3mm",
                  background: i % 2 === 0 ? "#fbfefe" : "#ffffff",
                  padding: "2.4mm 3mm",
                }}
              >
                <div style={{ fontSize: "7.8pt", color: "#64748b", textTransform: "uppercase", letterSpacing: ".05em" }}>
                  {label}
                </div>
                <div
                  style={{
                    marginTop: ".8mm",
                    fontWeight: 800,
                    fontSize: "9.8pt",
                    color: "#0f172a",
                    wordBreak: "break-word",
                  }}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 0 2.5mm" }}>
            <div style={{ fontSize: "10pt", fontWeight: 900, color: "#203D7A", textTransform: "uppercase", letterSpacing: ".06em" }}>
              Vaccine Schedule Record
            </div>
            <div style={{ fontSize: "8pt", color: "#64748b" }}>
              Dates are shown in MM/DD/YYYY format
            </div>
          </div>

          {/* Table */}
          <table className="print-grid" style={{ marginTop: "0", width: "100%" }}>
            <thead>
              <tr>
                <th style={{ width: "31%" }}>Bakuna</th>
                <th style={{ width: "23%" }}>Doses</th>
                <th colSpan={maxCols} style={{ width: "34%" }}>
                  Petsa ng Bakuna
                </th>
                <th style={{ width: "12%" }}>Remarks</th>
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
                      const dt = lbl ? fmtMDY(getDose(vac, lbl)?.date_given ?? null) : "";
                      return <td key={i}>{dt}</td>;
                    })}
                    <td style={{ whiteSpace: "pre-wrap" }}>{rowRemarks}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8mm",
              marginTop: "8mm",
              fontSize: "8.5pt",
              color: "#475569",
            }}
          >
            <div>
              <div style={{ borderTop: "0.8pt solid #94a3b8", paddingTop: "1.8mm", textAlign: "center" }}>
                Health Worker / Encoder
              </div>
            </div>
            <div>
              <div style={{ borderTop: "0.8pt solid #94a3b8", paddingTop: "1.8mm", textAlign: "center" }}>
                Date Reviewed
              </div>
            </div>
          </div>
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
  icon,
}: {
  label: string;
  value?: string | null;
  wrap?: boolean;
  icon?: React.ReactNode;
}) {
  const show = (value ?? "").toString().trim() || "—";
  return (
    <div className="item">
      <div className="flex items-start gap-3 rounded-xl bg-slate-50/70 p-3 ring-1 ring-slate-100">
        {icon ? (
          <div className="mt-0.5 shrink-0 text-slate-500">{icon}</div>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="label">{label}</div>
          <div
            className={[
              "value text-[14px] sm:text-[15px]",
              wrap ? "whitespace-pre-wrap break-words" : "truncate",
            ].join(" ")}
            title={show}
          >
            {show}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoChip({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex min-h-9 items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-[13px] font-medium text-slate-700 ring-1 ring-slate-100">
      <span className="text-[#203D7A]">{icon}</span>
      <span className="max-w-[180px] truncate sm:max-w-none">{text}</span>
    </span>
  );
}
