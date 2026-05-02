import * as React from "react";
import { Head, router } from "@inertiajs/react";
import { useConfirm } from "@/components/confirm-kit";

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
    family_serial_number?: string | null;
    family_no?: string | null;

    date_of_registration?: string | null;
    date_referred_nb_screening?: string | null;
    date_nbs_done?: string | null;
    place_of_birth?: string | null;
    age?: string | number | null;
    child_height_cm?: string | number | null;
    birth_weight_kg?: string | number | null;
    cpab?: string | null;
    delivery_type?: string | null;

    mother_last_name?: string | null;
    mother_given_name?: string | null;
    mother_middle_name?: string | null;

    tt_status_mother?: string | null;
    tt_status_date?: string | null;
    health_center?: string | null;
  };
  matrix: Record<string, string[]>;
  doses: Dose[];
};

/* ───────── Simple global scroll-lock helpers ───────── */
let scrollLockCount = 0;
let previousOverflow: string | null = null;
let previousPaddingRight: string | null = null;

function lockBodyScroll() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (scrollLockCount === 0) {
    previousOverflow = root.style.overflow;
    previousPaddingRight = root.style.paddingRight;
    const scrollBarWidth = window.innerWidth - root.clientWidth;
    root.style.overflow = "hidden";
    if (scrollBarWidth > 0) root.style.paddingRight = `${scrollBarWidth}px`;
  }
  scrollLockCount++;
}

function unlockBodyScroll() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount === 0) {
    if (previousOverflow !== null) root.style.overflow = previousOverflow;
    if (previousPaddingRight !== null) root.style.paddingRight = previousPaddingRight;
  }
}

function useBodyScrollLock(active: boolean) {
  React.useEffect(() => {
    if (!active) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [active]);
}

/* Close on ESC */
function useEscapeToClose(open: boolean, onClose: () => void) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
}

/* ───────── Icons ───────── */
const IconInfo = (p: any) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...p} fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8h.01M11 12h2v5h-2" />
  </svg>
);
const IconEdit = (p: any) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...p} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);
const IconLock = (p: any) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...p} fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="11" width="18" height="10" rx="2" />
    <path d="M7 11V7a5 5 0 1 1 10 0v4" />
  </svg>
);
const IconUser = (p: any) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...p} fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="7" r="4" />
    <path d="M5.5 21a7.5 7.5 0 0 1 13 0" />
  </svg>
);
const IconCalendar = (p: any) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...p} fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);
const IconGender = (p: any) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...p} fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="8" r="4" />
    <path d="M5.5 21a7.5 7.5 0 0 1 13 0" />
  </svg>
);
const IconMapPin = (p: any) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...p} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 22s7-5.5 7-12a7 7 0 0 0-14 0c0 6.5 7 12 7 12Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);
const IconHome = (p: any) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...p} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M3 11l9-7 9 7" />
    <path d="M9 22V12h6v10" />
  </svg>
);
const IconMother = (p: any) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...p} fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="8" cy="7" r="3" />
    <path d="M2 21a6 6 0 0 1 12 0" />
    <circle cx="18" cy="10" r="2.5" />
    <path d="M14 21a6 6 0 0 1 8 0" />
  </svg>
);
const IconFather = (p: any) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...p} fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="16" cy="7" r="3" />
    <path d="M10 21a6 6 0 0 1 12 0" />
    <circle cx="7" cy="10" r="2.5" />
    <path d="M1 21a6 6 0 0 1 12 0" />
  </svg>
);
const IconPhone = (p: any) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...p} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M22 16.92v2a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h2a2 2 0 0 1 2 1.72c.12.86.33 1.69.62 2.49a2 2 0 0 1-.45 2.11L7.1 9.45a16 16 0 0 0 6 6l1.13-1.13a2 2 0 0 1 2.11-.45c.8.29 1.63.5 2.49.62A2 2 0 0 1 22 16.92z" />
  </svg>
);
const IconBell = (p: any) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...p} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M18 8a6 6 0 0 0-12 0c0 7-2 9-2 9h16s-2-2-2-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);
const IconSpark = (p: any) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...p} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z" />
    <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z" />
  </svg>
);
const IconEye = (p: any) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...p} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M2.2 12s3.6-7 9.8-7 9.8 7 9.8 7-3.6 7-9.8 7-9.8-7-9.8-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const IconChevron = (p: any) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...p} fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconArrowUp = (p: any) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...p} fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 19V5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="m5 12 7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ───────── Helpers ───────── */
const fmtDate = (v?: string | null) => {
  if (!v) return "—";
  const s = String(v).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime())
    ? s
    : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
};

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

function safeText(v?: string | number | null) {
  const s = String(v ?? "").trim();
  return s || "—";
}

function ordinalSuffix(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return "th";
  switch (n % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

function displayScheduleLabel(label?: string | null): string {
  const raw = String(label ?? "").trim();
  if (!raw) return "";

  const lower = raw.toLowerCase();
  if (lower.includes("birth")) return "At Birth";

  const week = lower.match(/^(\d+)\s*(w|wk|wks|week|weeks)\b/);
  if (week) {
    const n = Number(week[1]);
    return `${n}${ordinalSuffix(n)} Week`;
  }

  const month = lower.match(/^(\d+)\s*(m|mo|mos|month|months)\b/);
  if (month) {
    const n = Number(month[1]);
    return `${n}${ordinalSuffix(n)} Month`;
  }

  const year = lower.match(/^(\d+)\s*(y|yr|yrs|year|years)\b/);
  if (year) {
    const n = Number(year[1]);
    return `${n}${ordinalSuffix(n)} Year`;
  }

  return raw;
}

function motherFullName(patient: PageProps["patient"]) {
  const byParts = [
    patient.mother_last_name,
    patient.mother_given_name,
    patient.mother_middle_name,
  ]
    .map((v) => String(v ?? "").trim())
    .filter(Boolean)
    .join(" ");

  return byParts || patient.mother_name || "—";
}

function buildLookup(doses: Dose[]) {
  const map = new Map<string, Dose>();
  for (const d of doses) map.set(`${d.vaccine}__${d.dose_label}`, d);
  return (vaccine: string, label: string): Dose | undefined => map.get(`${vaccine}__${label}`);
}
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
      if ([6, 10, 14].includes(w)) return ({ 6: "1½", 10: "2½", 14: "3½" } as any)[w] + " MONTHS";
      const months = (w / 4.345).toFixed(1).replace(/\.0$/, "");
      return `${months} MONTHS`;
    }
    const mo = s.match(/^(\d+)\s*m/);
    if (mo) return `${mo[1]} MONTHS`;
    const yr = s.match(/^(\d+)\s*y/);
    if (yr) return `${yr[1]} YEAR${yr[1] === "1" ? "" : "S"}`;
    return l.toUpperCase();
  });
  if (norm.join(", ") === "1½ MONTHS, 2½ MONTHS, 3½ MONTHS") return "1½, 2½, 3½ MONTHS";
  return norm.join(", ");
}
function combineRemarks(
  matrix: Record<string, string[]>,
  getDose: (v: string, l: string) => Dose | undefined,
  vaccine: string
) {
  const labels = matrix[vaccine] || [];
  const rems = labels.map((lbl) => (getDose(vaccine, lbl)?.remarks || "").trim()).filter(Boolean);
  return rems.join("; ");
}

const UPSERT_URL = (pid: number | string) =>
  typeof (window as any).route === "function"
    ? (window as any).route("center.immunization.upsert", { patient: pid })
    : `/center/patients/${pid}/immunization`;

function toYMD(v?: string | null) {
  if (!v) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}
function dateToYMD(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}
function todayYMD(): string {
  return dateToYMD(new Date());
}
function hundredYearsAgoYMD(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 100);
  return dateToYMD(d);
}
function labelAgeInDays(label: string): number | null {
  const s = label.toLowerCase();
  if (s.includes("birth")) return 0;
  const wk = s.match(/(\d+)\s*w/);
  if (wk) return Number(wk[1]) * 7;
  const mo = s.match(/(\d+)\s*m/);
  if (mo) return Math.round(Number(mo[1]) * 30.4375);
  const yr = s.match(/(\d+)\s*y/);
  if (yr) return Math.round(Number(yr[1]) * 365.25);
  return null;
}
function minDoseDateYMD(label: string, birthdate?: string | null): string | null {
  if (!birthdate) return null;
  const baseYmd = toYMD(birthdate);
  if (!baseYmd) return null;

  const [y, m, d] = baseYmd.split("-").map(Number);
  if (!y || !m || !d) return null;

  const date = new Date(y, m - 1, d);
  const s = label.toLowerCase();
  let changed = false;

  if (s.includes("birth")) return baseYmd;

  const wk = s.match(/(\d+)\s*w/);
  if (wk) {
    date.setDate(date.getDate() + Number(wk[1]) * 7);
    changed = true;
  }
  const mo = s.match(/(\d+)\s*m/);
  if (mo) {
    date.setMonth(date.getMonth() + Number(mo[1]));
    changed = true;
  }
  const yr = s.match(/(\d+)\s*y/);
  if (yr) {
    date.setFullYear(date.getFullYear() + Number(yr[1]));
    changed = true;
  }

  if (!changed) return null;
  return dateToYMD(date);
}

type EditMap = Record<
  string,
  {
    date_given: string | null;
    remarks: string | null;
  }
>;

function sequentialMinDateYMD(
  vaccineKey: string,
  label: string,
  labelsForVaccine: string[],
  index: number,
  edits: EditMap,
  birthdate?: string | null
): string | null {
  const baseFromBirth = minDoseDateYMD(label, birthdate);

  const SERIES: string[] = ["dpt-hepb-hib", "opv", "pcv", "mmr"];
  const vacNorm = toAbbrev(vaccineKey).toLowerCase().trim();
  const isSeries = SERIES.some((s) => vacNorm === s || vacNorm.includes(s));
  if (!isSeries) return baseFromBirth;
  if (index === 0) return baseFromBirth;

  const thisAge = labelAgeInDays(label);
  if (thisAge == null) return baseFromBirth;

  let fromPrev: string | null = null;
  for (let j = index - 1; j >= 0; j--) {
    const prevLabel = labelsForVaccine[j];
    const prevKey = `${vaccineKey}__${prevLabel}`;
    const prevYmd = edits[prevKey]?.date_given || null;
    if (!prevYmd) continue;

    const prevAge = labelAgeInDays(prevLabel);
    if (prevAge == null) continue;

    const diffDays = thisAge - prevAge;
    if (diffDays <= 0) break;

    const d = new Date(prevYmd);
    if (Number.isNaN(d.getTime())) break;
    d.setDate(d.getDate() + diffDays);
    fromPrev = dateToYMD(d);
    break;
  }

  if (!fromPrev) return null;
  if (!baseFromBirth) return fromPrev;
  return fromPrev > baseFromBirth ? fromPrev : baseFromBirth;
}

/* ───────── Abbrev legend ───────── */
const ABBR_MAP: Record<string, string> = {
  BCG: "Bacillus Calmette-Guérin",
  HepB: "Hepatitis B Vaccine",
  OPV: "Oral Polio Vaccine",
  IPV: "Inactivated Polio Vaccine",
  PCV: "Pneumococcal Conjugate Vaccine",
  MMR: "Measles • Mumps • Rubella",
  "DPT-HepB-Hib": "Pentavalent (DPT–HepB–Hib)",
};
function toAbbrev(full: string) {
  const f = full.toLowerCase();
  if (f.includes("pentavalent")) return "DPT-HepB-Hib";
  if (f.includes("pneumococcal")) return "PCV";
  if (f.includes("inactivated polio")) return "IPV";
  if (f.includes("oral polio")) return "OPV";
  if (f.includes("measles") || f.includes("mumps") || f.includes("rubella")) return "MMR";
  if (f.includes("hepatitis b") || f.includes("hep b") || f.includes("hepb")) return "HepB";
  if (f.includes("bcg")) return "BCG";
  return full;
}
function legendMeaning(abbrev: string) {
  return ABBR_MAP[abbrev] ?? "";
}

/* ───────── Result popup ───────── */
type ResultKind = "success" | "error";
function ResultDialog({
  open,
  onClose,
  kind,
  title,
  message,
  autoHideMs = 2200,
}: {
  open: boolean;
  onClose: () => void;
  kind: ResultKind;
  title: string;
  message?: string;
  autoHideMs?: number;
}) {
  useBodyScrollLock(open);
  useEscapeToClose(open, onClose);

  React.useEffect(() => {
    if (!open) return;
    const id = setTimeout(onClose, autoHideMs);
    return () => clearTimeout(id);
  }, [open, autoHideMs, onClose]);

  const iconClass = kind === "success" ? "text-emerald-600" : "text-rose-600";
  const ringClass = kind === "success" ? "ring-emerald-200" : "ring-rose-200";

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[320]">
      <div className="absolute inset-0 bg-black/40" />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          className="w-full max-w-lg max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/10 outline-none transition-all duration-200"
        >
          <div className={`p-4 sm:p-5 rounded-2xl ring-1 ${ringClass}`}>
            <div className="flex items-start gap-3">
              <div className={`mt-1 shrink-0 ${iconClass}`}>
                {kind === "success" ? (
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M15 9 9 15M9 9l6 6" />
                  </svg>
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-slate-900">{title}</h2>
                {message ? (
                  <p className="mt-1 text-sm text-slate-600 whitespace-pre-wrap max-h-[40vh] overflow-y-auto">
                    {message}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                onClick={onClose}
                className="h-10 rounded-md border border-slate-300 bg-white px-4 text-[15px] text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────── Legend modal ───────── */
function LegendModal({
  open,
  onClose,
  vaccines,
}: {
  open: boolean;
  onClose: () => void;
  vaccines: string[];
}) {
  useBodyScrollLock(open);
  useEscapeToClose(open, onClose);

  if (!open) return null;

  const entries = vaccines
    .map((v) => {
      const ab = toAbbrev(v);
      const full = legendMeaning(ab);
      if (!full || ab === v) return null;
      return { key: v, ab, full };
    })
    .filter(Boolean) as { key: string; ab: string; full: string }[];

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center pointer-events-none">
      <div onClick={onClose} className="absolute inset-0 bg-black/40 pointer-events-auto" aria-hidden="true" />
      <div className="pointer-events-auto w-full px-3 sm:max-w-md sm:px-4">
        <div className="relative rounded-2xl bg-white shadow-xl ring-1 ring-slate-200 p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-center">
            <h2 className="text-sm font-semibold text-slate-800 text-center">Vaccine Legend</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-1 text-slate-500 hover:bg-slate-100"
          >
            <span className="sr-only">Close</span>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M15 9 9 15M9 9l6 6" />
            </svg>
          </button>

          {entries.length === 0 ? (
            <p className="text-xs text-slate-500 text-center">No abbreviations to show.</p>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto space-y-2">
              {entries.map((e) => (
                <div
                  key={e.key}
                  className="flex items-center justify-between gap-3 border border-slate-100 rounded-lg px-3 py-2"
                >
                  <span className="inline-flex items-center rounded-md bg-teal-50 border border-teal-200 text-teal-900 px-2 py-0.5 text-[11px]">
                    {e.ab}
                  </span>
                  <span className="flex-1 text-[13px] text-right text-slate-800">{e.full}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────── Schedule alerts panel ───────── */
type AnnItem = { vaccine: string; label: string; target: string };

function ScheduleAlertsPanel({
  open,
  onClose,
  nearestUpcoming,
  missed,
}: {
  open: boolean;
  onClose: () => void;
  nearestUpcoming: AnnItem | null;
  missed: AnnItem[];
}) {
  useBodyScrollLock(open);
  useEscapeToClose(open, onClose);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center pointer-events-none">
      <div onClick={onClose} className="absolute inset-0 bg-black/40 pointer-events-auto" aria-hidden="true" />
      <div className="pointer-events-auto w-full px-3 sm:max-w-md sm:px-4">
        <div className="relative flex max-h-[80vh] flex-col rounded-2xl bg-white text-xs shadow-xl ring-1 ring-slate-200 sm:max-h-[70vh] sm:text-[13px]">
          <div className="flex items-center justify-center border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-800 text-center">Schedule Alerts</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-3 rounded-full p-1 text-slate-500 hover:bg-slate-100"
          >
            <span className="sr-only">Close</span>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M15 9 9 15M9 9l6 6" />
            </svg>
          </button>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
            <section>
              <div className="flex items-center justify-center gap-2 mb-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <h3 className="text-[11px] font-semibold tracking-wide uppercase text-slate-500">
                  Nearest upcoming dose
                </h3>
              </div>
              {nearestUpcoming ? (
                <div className="rounded-md bg-emerald-50 border border-emerald-100 px-3 py-2">
                  <div className="font-medium text-slate-900">
                    {toAbbrev(nearestUpcoming.vaccine)} — {displayScheduleLabel(nearestUpcoming.label)}
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-600">
                    Target date: {fmtMDY(nearestUpcoming.target)}
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 text-center">No upcoming doses based on the schedule.</p>
              )}
            </section>

            <section>
              <div className="flex items-center justify-center gap-2 mb-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <h3 className="text-[11px] font-semibold tracking-wide uppercase text-slate-500">Missed doses</h3>
              </div>
              {missed.length === 0 ? (
                <p className="text-[11px] text-slate-500 text-center">No missed doses based on the schedule.</p>
              ) : (
                <ul className="space-y-1.5">
                  {missed.map((it, idx) => (
                    <li
                      key={`m-${idx}-${it.vaccine}-${it.label}`}
                      className="rounded-md bg-rose-50 border border-rose-100 px-3 py-2"
                    >
                      <div className="font-medium text-slate-900">
                        {toAbbrev(it.vaccine)} — {displayScheduleLabel(it.label)}
                      </div>
                      <div className="mt-0.5 text-[11px] text-rose-700">
                        Should be on or after {fmtMDY(it.target)}.
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <div className="border-t border-slate-200 px-4 py-2 text-[10px] sm:text-[11px] text-slate-500 text-center">
            Dates are computed from the child&apos;s birthdate and entered doses.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────── Preview modal (RESPONSIVE, full-width, NO PRINT) ───────── */
function PreviewInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="preview-info">
      <div className="preview-info-label">{label}</div>
      <div className="preview-info-value">{value}</div>
    </div>
  );
}

function PreviewModal({
  open,
  onClose,
  patient,
  matrix,
  getDose,
  maxCols,
}: {
  open: boolean;
  onClose: () => void;
  patient: PageProps["patient"];
  matrix: Record<string, string[]>;
  getDose: (v: string, l: string) => Dose | undefined;
  maxCols: number;
}) {
  useBodyScrollLock(open);
  useEscapeToClose(open, onClose);
  if (!open) return null;

  const rows = Object.keys(matrix).map((vac) => {
    const labels = matrix[vac] || [];
    return {
      vac,
      labels,
      remarks: combineRemarks(matrix, getDose, vac),
    };
  });

  return (
    <div className="fixed inset-0 z-[350] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />

      <div className="relative mx-auto h-[96vh] w-[96vw] max-w-[1200px] sm:h-auto sm:max-h-[92vh]">
        <div className="flex h-full max-h-[96vh] flex-col overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200 sm:max-h-[92vh]">
          <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 sm:px-5 py-3 flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900 truncate">Preview</div>
              <div className="text-[11px] text-slate-500 truncate">Immunization Card (screen preview)</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              aria-label="Close preview"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-3 sm:p-5">
              <div className="preview-frame">
                <div className="flex items-center gap-3">
                  <div className="preview-badge">OH</div>
                  <div className="min-w-0">
                    <div className="text-[16px] sm:text-[18px] font-extrabold leading-tight text-slate-900">
                      ONE HEALTH — Immunization Card
                    </div>
                    <div className="text-[11px] tracking-[.10em] uppercase text-slate-500">Patient Records</div>
                  </div>
                </div>

                <div className="preview-accent" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-2">
                  <PreviewInfo label="Patient Name" value={safeText(patient.full_name)} />
                  <PreviewInfo label="Birthday" value={fmtMDY(patient.birthdate) || "—"} />

                  <PreviewInfo label="Age" value={safeText(patient.age)} />
                  <PreviewInfo label="Sex" value={safeText(patient.sex)} />

                  <PreviewInfo label="Place of Birth" value={safeText(patient.place_of_birth)} />
                  <PreviewInfo label="Contact Number" value={safeText(patient.phone_number)} />

                  <PreviewInfo label="Barangay" value={safeText(patient.barangay)} />
                  <PreviewInfo label="Address" value={safeText(patient.address)} />

                  <PreviewInfo label="Mother's Name" value={motherFullName(patient)} />
                  <PreviewInfo label="Father's Name" value={safeText(patient.father_name)} />

                  <PreviewInfo label="Height (CM)" value={safeText(patient.child_height_cm)} />
                  <PreviewInfo label="Birth Weight (KG)" value={safeText(patient.birth_weight_kg)} />

                  <PreviewInfo label="CPAB" value={safeText(patient.cpab)} />
                  <PreviewInfo label="Delivery Type" value={safeText(patient.delivery_type)} />

                  <PreviewInfo label="Health Center / Facility" value={safeText(patient.health_center)} />
                  <PreviewInfo label="Family Serial Number" value={safeText(patient.family_no ?? patient.family_serial_number)} />

                  <PreviewInfo label="Date of Registration" value={fmtMDY(patient.date_of_registration) || "—"} />
                  <PreviewInfo
                    label="Date referred to NB screening"
                    value={fmtMDY(patient.date_referred_nb_screening) || "—"}
                  />

                  <PreviewInfo label="Date NBS Done" value={fmtMDY(patient.date_nbs_done) || "—"} />
                  <PreviewInfo label="TT Status of Mother" value={safeText(patient.tt_status_mother)} />

                  <PreviewInfo label="TT Status Date" value={fmtMDY(patient.tt_status_date) || "—"} />
                </div>

                <div className="mt-4 preview-table-wrap" role="region" aria-label="Immunization table">
                  <table className="preview-grid">
                    <thead>
                      <tr>
                        <th className="th-vac">BAKUNA</th>
                        <th className="th-dose">DOSES</th>
                        <th className="th-dates" colSpan={maxCols}>
                          PETSA NG BAKUNA (MM/DD/YYYY)
                        </th>
                        <th className="th-rem">REMARKS</th>
                      </tr>
                      <tr className="subhead">
                        <th />
                        <th />
                        {Array.from({ length: maxCols }).map((_, i) => (
                          <th key={i} className="th-num">
                            {i + 1}
                          </th>
                        ))}
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.vac}>
                          <td className="td-vac">{r.vac}</td>
                          <td className="td-dose">{labelsToDoseText(r.labels)}</td>
                          {Array.from({ length: maxCols }).map((_, i) => {
                            const lbl = r.labels[i];
                            const dt = lbl ? fmtMDY(getDose(r.vac, lbl)?.date_given ?? null) : "";
                            return (
                              <td key={i} className="td-date">
                                {dt}
                              </td>
                            );
                          })}
                          <td className="td-rem">{r.remarks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-3 text-center text-[11px] text-slate-500">
                Tip: On small screens, swipe sideways on the table to view all dose columns.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────── Collapsible patient header ───────── */
function PatientHeader({
  patient,
}: {
  patient: PageProps["patient"];
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
      <div className="p-3 sm:p-4 md:p-5">
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[12px] font-medium tracking-wide text-slate-500 uppercase">
              <IconUser className="h-4 w-4 text-[#0F8A99]" />
              Patient
            </div>
            <h1 className="mt-1 break-words text-lg font-bold leading-tight text-slate-900 sm:text-xl md:text-2xl">
              {safeText(patient?.full_name)}
            </h1>
            <div className="mt-2 flex flex-wrap gap-2">
              <HeaderChip icon={<IconCalendar className="h-3.5 w-3.5" />} text={fmtDate(patient?.birthdate)} />
              <HeaderChip icon={<IconGender className="h-3.5 w-3.5" />} text={safeText(patient?.sex)} />
              <HeaderChip icon={<IconMapPin className="h-3.5 w-3.5" />} text={safeText(patient?.barangay)} />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto"
          >
            {open ? "Hide details" : "Show details"}
            <IconChevron className={["h-4 w-4 transition-transform", open ? "rotate-180" : ""].join(" ")} />
          </button>
        </div>
      </div>

      <div
        className={[
          "grid transition-all duration-300 ease-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        ].join(" ")}
      >
        <div className="overflow-hidden">
          <div className="border-t border-slate-100 px-3 py-3 sm:px-4 sm:py-4 md:px-5">
            <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2 xl:grid-cols-3 xl:gap-x-10">
              <InfoRow
                icon={<IconCalendar className="h-4 w-4 text-[#0F8A99]" />}
                label="Birthday"
                value={fmtDate(patient?.birthdate)}
              />

              <InfoRow
                icon={<IconInfo className="h-4 w-4 text-[#0F8A99]" />}
                label="Age"
                value={patient?.age ? String(patient.age) : "—"}
              />

              <InfoRow
                icon={<IconGender className="h-4 w-4 text-[#0F8A99]" />}
                label="Sex"
                value={patient?.sex}
              />

              <InfoRow
                icon={<IconMapPin className="h-4 w-4 text-[#0F8A99]" />}
                label="Place of Birth"
                value={patient?.place_of_birth}
              />

              <InfoRow
                icon={<IconPhone className="h-4 w-4 text-[#0F8A99]" />}
                label="Contact Number"
                value={patient?.phone_number}
              />

              <InfoRow
                icon={<IconMapPin className="h-4 w-4 text-[#0F8A99]" />}
                label="Barangay"
                value={patient?.barangay}
              />

              <InfoRow
                icon={<IconHome className="h-4 w-4 text-[#0F8A99]" />}
                label="Address"
                value={patient?.address}
                wrap
              />

              <InfoRow
                icon={<IconMother className="h-4 w-4 text-[#0F8A99]" />}
                label="Mother's Name"
                value={motherFullName(patient)}
              />

              <InfoRow
                icon={<IconFather className="h-4 w-4 text-[#0F8A99]" />}
                label="Father's Name"
                value={patient?.father_name}
              />

              <InfoRow
                icon={<IconInfo className="h-4 w-4 text-[#0F8A99]" />}
                label="Height (CM)"
                value={patient?.child_height_cm ? String(patient.child_height_cm) : "—"}
              />

              <InfoRow
                icon={<IconInfo className="h-4 w-4 text-[#0F8A99]" />}
                label="Birth Weight (KG)"
                value={patient?.birth_weight_kg ? String(patient.birth_weight_kg) : "—"}
              />

              <InfoRow
                icon={<IconInfo className="h-4 w-4 text-[#0F8A99]" />}
                label="CPAB"
                value={patient?.cpab}
              />

              <InfoRow
                icon={<IconInfo className="h-4 w-4 text-[#0F8A99]" />}
                label="Delivery Type"
                value={patient?.delivery_type}
              />

              <InfoRow
                icon={<IconHome className="h-4 w-4 text-[#0F8A99]" />}
                label="Health Center / Facility"
                value={patient?.health_center}
              />

              <InfoRow
                icon={<IconInfo className="h-4 w-4 text-[#0F8A99]" />}
                label="Family Serial Number"
                value={patient?.family_no ?? patient?.family_serial_number}
              />

              <InfoRow
                icon={<IconCalendar className="h-4 w-4 text-[#0F8A99]" />}
                label="Date of Registration"
                value={fmtDate(patient?.date_of_registration)}
              />

              <InfoRow
                icon={<IconCalendar className="h-4 w-4 text-[#0F8A99]" />}
                label="Date referred to NB screening"
                value={fmtDate(patient?.date_referred_nb_screening)}
              />

              <InfoRow
                icon={<IconCalendar className="h-4 w-4 text-[#0F8A99]" />}
                label="Date NBS Done"
                value={fmtDate(patient?.date_nbs_done)}
              />

              <InfoRow
                icon={<IconInfo className="h-4 w-4 text-[#0F8A99]" />}
                label="TT Status of Mother"
                value={patient?.tt_status_mother}
              />

              <InfoRow
                icon={<IconCalendar className="h-4 w-4 text-[#0F8A99]" />}
                label="TT Status Date"
                value={fmtDate(patient?.tt_status_date)}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeaderChip({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 ring-1 ring-slate-100 sm:px-3 sm:text-[12px]">
      <span className="text-[#0F8A99]">{icon}</span>
      <span>{text}</span>
    </span>
  );
}

function BackToTopButton() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 280);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Back to top"
      title="Back to top"
      className={[
        "fixed z-[250] transition-all duration-300 ease-out",
        "bottom-4 right-4 sm:bottom-6 sm:right-6",
        "h-11 w-11 sm:h-12 sm:w-auto sm:min-w-[48px] sm:px-4",
        "rounded-full sm:rounded-xl",
        "border border-[#0F8A99] bg-[#0F8A99] text-white shadow-lg",
        "hover:bg-[#0e7c8a]",
        "focus:outline-none focus:ring-2 focus:ring-[#0F8A99] focus:ring-offset-2",
        "flex items-center justify-center gap-2",
        visible ? "translate-y-0 opacity-100 pointer-events-auto" : "translate-y-3 opacity-0 pointer-events-none",
      ].join(" ")}
    >
      <IconArrowUp className="h-5 w-5 shrink-0" />
      <span className="hidden sm:inline text-sm font-semibold whitespace-nowrap">Back to top</span>
    </button>
  );
}

/* ───────── Presentational component ───────── */
type FocusTarget = { vaccine: string; label: string } | null;

export function ImmunizationCard({
  patient,
  matrix,
  doses,
  editable = false,
  focus = null,
  withHead = false,
}: {
  patient: PageProps["patient"];
  matrix: PageProps["matrix"];
  doses: Dose[];
  editable?: boolean;
  focus?: FocusTarget;
  withHead?: boolean;
}) {
  const confirm = useConfirm();

  const vaccines = React.useMemo(() => Object.keys(matrix), [matrix]);

  const schedules = React.useMemo(() => {
    const seen = new Set<string>();
    const ordered: string[] = [];

    for (const vac of vaccines) {
      for (const lbl of matrix[vac] || []) {
        if (!seen.has(lbl)) {
          seen.add(lbl);
          ordered.push(lbl);
        }
      }
    }

    const score = (lbl: string) => {
      const s = String(lbl).toLowerCase();
      if (s.includes("birth")) return 0;
      const m = s.match(/(\d+)\s*(week|weeks|wk|wks|month|months|mo|mos|year|years|yr|yrs)/);
      if (!m) return Number.MAX_SAFE_INTEGER;
      const n = Number(m[1] || 0);
      const unit = m[2] || "";
      if (unit.startsWith("week") || unit.startsWith("wk")) return n;
      if (unit.startsWith("month") || unit.startsWith("mo")) return 100 + n;
      if (unit.startsWith("year") || unit.startsWith("yr")) return 1000 + n;
      return Number.MAX_SAFE_INTEGER;
    };

    return [...ordered].sort((a, b) => {
      const sa = score(a);
      const sb = score(b);
      if (sa !== sb) return sa - sb;
      return ordered.indexOf(a) - ordered.indexOf(b);
    });
  }, [matrix, vaccines]);

  const getDose = React.useMemo(() => buildLookup(doses), [doses]);
  const maxCols = React.useMemo(() => maxDoseCols(matrix), [matrix]);

  const firstIncompleteIndex = React.useMemo(() => {
    for (let i = 0; i < schedules.length; i++) {
      const sched = schedules[i];
      const anyMissing = vaccines.some((vac) => {
        const labels = matrix[vac] || [];
        if (!labels.includes(sched)) return false;
        const d = getDose(vac, sched);
        const hasValue = (d?.date_given && String(d.date_given).trim()) || (d?.remarks && String(d.remarks).trim());
        return !hasValue;
      });
      if (anyMissing) return i;
    }
    return 0;
  }, [schedules, vaccines, matrix, getDose]);

  const [activeIndex, setActiveIndex] = React.useState(0);
  const activeSchedule = schedules[activeIndex] ?? schedules[0];
  const total = schedules.length;

  const [isEditing, setIsEditing] = React.useState<boolean>(!!editable);

  React.useEffect(() => {
    setActiveIndex(firstIncompleteIndex);
    setIsEditing((prev) => (editable ? true : prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [openRemarks, setOpenRemarks] = React.useState<Record<string, boolean>>({});

  const initialEdits = React.useMemo(() => {
    const map: EditMap = {};

    for (const d of doses) {
      const key = `${d.vaccine}__${d.dose_label}`;
      map[key] = { date_given: d.date_given ?? null, remarks: d.remarks ?? null };
    }

    const birthYmd = patient.birthdate ? toYMD(patient.birthdate) : "";
    for (const vac of vaccines) {
      const labels = matrix[vac] || [];
      for (const lbl of labels) {
        const key = `${vac}__${lbl}`;
        if (!map[key]) {
          let date_given: string | null = null;
          if (birthYmd) {
            const vLower = vac.toLowerCase();
            const lLower = lbl.toLowerCase();
            const isAtBirth = lLower.includes("birth");
            const isBCG = vLower.includes("bcg");
            const isHepB = vLower.includes("hepb") || vLower.includes("hep b") || vLower.includes("hepatitis b");
            if (isAtBirth && (isBCG || isHepB)) date_given = birthYmd;
          }
          map[key] = { date_given, remarks: null };
        }
      }
    }

    return map;
  }, [doses, matrix, vaccines, patient.birthdate]);

  const [edits, setEdits] = React.useState<EditMap>(initialEdits);
  React.useEffect(() => setEdits(initialEdits), [initialEdits]);

  const setEdit = (key: string, patch: Partial<{ date_given: string | null; remarks: string | null }>) =>
    setEdits((e) => ({
      ...e,
      [key]: { ...(e[key] || { date_given: null, remarks: null }), ...patch },
    }));

  const todayYmd = todayYMD();
  const earliestYmd = hundredYearsAgoYMD();

  const [saving, setSaving] = React.useState(false);

  const [resultOpen, setResultOpen] = React.useState(false);
  const [resultKind, setResultKind] = React.useState<ResultKind>("success");
  const [resultTitle, setResultTitle] = React.useState("");
  const [resultMsg, setResultMsg] = React.useState<string | undefined>();

  const [lastEditedKey, setLastEditedKey] = React.useState<string | null>(null);

  const [alertsOpen, setAlertsOpen] = React.useState(false);
  const [legendOpen, setLegendOpen] = React.useState(false);
  const [previewOpen, setPreviewOpen] = React.useState(false);

  const dueVaccines = React.useMemo(() => {
    const sched = activeSchedule;
    return vaccines.filter((v) => (matrix[v] || []).includes(sched));
  }, [activeSchedule, vaccines, matrix]);

  const [batchDate, setBatchDate] = React.useState<string>("");

  React.useEffect(() => {
    const dates = dueVaccines
      .map((vac) => {
        const k = `${vac}__${activeSchedule}`;
        const v = edits[k]?.date_given ? toYMD(edits[k]!.date_given) : "";
        return v;
      })
      .filter(Boolean);

    const unique = Array.from(new Set(dates));
    setBatchDate(unique.length === 1 ? unique[0] : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSchedule]);

  const handleSelectChange = (v: number) => {
    setActiveIndex(v);
    setIsEditing(editable ? true : false);
  };

  const onSaveClick = async () => {
    const sched = activeSchedule;

    const rows = dueVaccines.map((vac) => {
      const key = `${vac}__${sched}`;
      const e = edits[key] || { date_given: null, remarks: null };
      return {
        vaccine: vac,
        dose_label: sched,
        date_given: toYMD(e.date_given) || null,
        remarks: (e.remarks ?? "").trim() || null,
      };
    });

    const violations: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const vac = row.vaccine;
      const lbl = row.dose_label;
      if (!row.date_given) continue;

      const givenYmd = row.date_given;

      if (givenYmd < earliestYmd) violations.push(`${displayScheduleLabel(lbl)}: date must not be earlier than ${fmtMDY(earliestYmd)}`);

      if (patient.birthdate) {
        const labels = matrix[vac] || [];
        const labelIdx = Math.max(labels.indexOf(lbl), 0);

        const seqMin =
          sequentialMinDateYMD(vac, lbl, labels, labelIdx, edits, patient.birthdate) ??
          minDoseDateYMD(lbl, patient.birthdate);

        if (seqMin && givenYmd < seqMin) violations.push(`${displayScheduleLabel(lbl)}: date must be on or after ${fmtMDY(seqMin)}`);
      }
    }

    if (violations.length > 0) {
      setResultKind("error");
      setResultTitle("Invalid vaccination dates");
      setResultMsg("Please fix these doses before saving:\n" + violations.join("\n"));
      setResultOpen(true);
      return;
    }

    const allDosesFilled = rows.every((r) => !!r.date_given);
    const shouldAutoAdvance = allDosesFilled && !!lastEditedKey && lastEditedKey.endsWith(`__${activeSchedule}`);

    const ok = await confirm({
      title: "Save changes?",
      message: "Save changes for this visit?",
      confirmText: "Save",
      cancelText: "Cancel",
    });
    if (!ok) return;

    setSaving(true);
    router.post(
      UPSERT_URL(patient.id),
      { rows },
      {
        preserveScroll: true,
        onSuccess: () => {
          router.reload({
            only: ["doses"],
            onSuccess: () => {
              setResultKind("success");
              setResultTitle("Saved successfully");
              setResultMsg("Immunization record updated.");
              setResultOpen(true);
              setLastEditedKey(null);

              if (!shouldAutoAdvance) {
                setIsEditing(false);
                return;
              }

              const next = Math.min(activeIndex + 1, Math.max(total - 1, 0));
              if (next !== activeIndex) setActiveIndex(next);
              setIsEditing(false);
            },
          });
        },
        onError: (errs) => {
          console.error("Immunization save failed:", errs);
          setResultKind("error");
          setResultTitle("Save failed");
          setResultMsg("Please check your entries and try again.");
          setResultOpen(true);
        },
        onFinish: () => setSaving(false),
      }
    );
  };

  const cancelActive = () => {
    const sched = activeSchedule;
    setEdits((e) => {
      const copy: EditMap = { ...e };
      for (const vac of dueVaccines) {
        const key = `${vac}__${sched}`;
        const orig = initialEdits[key];
        copy[key] = orig ? { ...orig } : { date_given: null, remarks: null };
      }
      return copy;
    });
    setIsEditing(false);
    setLastEditedKey(null);
  };

  const alertsSummary = React.useMemo(() => {
    const upcoming: AnnItem[] = [];
    const missed: AnnItem[] = [];

    for (const vac of vaccines) {
      const labels = matrix[vac] || [];
      for (let i = 0; i < labels.length; i++) {
        const lbl = labels[i];
        const key = `${vac}__${lbl}`;
        const edit = edits[key];
        const givenYmd = edit?.date_given ? toYMD(edit.date_given) : "";

        const minYmd = sequentialMinDateYMD(vac, lbl, labels, i, edits, patient.birthdate);
        if (!minYmd) continue;
        if (givenYmd) continue;

        if (minYmd <= todayYmd) missed.push({ vaccine: vac, label: lbl, target: minYmd });
        else upcoming.push({ vaccine: vac, label: lbl, target: minYmd });
      }
    }

    const sortByDate = (a: AnnItem, b: AnnItem) => a.target.localeCompare(b.target);
    upcoming.sort(sortByDate);
    missed.sort(sortByDate);

    return { nearestUpcoming: upcoming.length ? upcoming[0] : null, missed };
  }, [vaccines, matrix, edits, patient.birthdate, todayYmd]);

  React.useEffect(() => {
    if (!focus) return;
    const idx = schedules.findIndex((s) => String(s).trim() === String(focus.label).trim());
    if (idx >= 0) setActiveIndex(idx);
    if (editable) setIsEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [focus, schedules, editable]);

  return (
    <div
      className="relative min-h-dvh bg-white text-slate-900"
      style={{
        fontFamily:
          "'Poppins', ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
      }}
    >
      {withHead ? (
        <Head title="Immunization Card">
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          <link
            href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap"
            rel="stylesheet"
          />
        </Head>
      ) : null}

      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-teal-200/15 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-cyan-200/15 blur-3xl" />
      </div>

      <style>{`
        :root { --teal:#0F8A99; --tealDeep:#0a6f7c; --line:#e2e8f0; }
        input[type="date"] { accent-color: var(--teal); }
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(43%) sepia(27%) saturate(1098%) hue-rotate(137deg) brightness(88%) contrast(92%);
          opacity: 0.95; cursor: pointer;
        }

        .preview-frame{
          border:1px solid #cbd5e1;
          border-radius:14px;
          padding:14px;
          background:#fff;
          width: 100%;
        }
        @media (min-width: 640px){
          .preview-frame{ padding: 18px; }
        }
        .preview-badge{
          width:44px;
          height:44px;
          border-radius:14px;
          background:#0F8A99;
          color:#fff;
          font-weight:800;
          display:grid;
          place-items:center;
          font-size:14px;
          flex: 0 0 auto;
        }
        .preview-accent{
          height: 10px;
          background: linear-gradient(90deg,#0F8A99,#12a4a8,#2bc8d8);
          border-radius:999px;
          margin: 14px 0 12px;
        }
        .preview-info{
          padding: 8px 0;
          border-bottom: 1px solid #e2e8f0;
        }
        .preview-info-label{
          font-size: 11px;
          color:#64748b;
        }
        .preview-info-value{
          font-size: 14px;
          font-weight: 700;
          color:#0f172a;
          word-break: break-word;
        }

        .preview-table-wrap{
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
        }
        .preview-grid{
          width:100%;
          border-collapse: separate;
          border-spacing: 0;
          table-layout: fixed;
          font-size: 12px;
          min-width: 900px;
        }
        .preview-grid th,
        .preview-grid td{
          border-right: 1.2px solid var(--tealDeep);
          border-bottom: 1.2px solid var(--tealDeep);
          padding: 10px 10px;
          vertical-align: middle;
          word-break: break-word;
        }
        .preview-grid thead th{
          background: var(--teal);
          color:#fff;
          font-weight:800;
          text-transform: uppercase;
          position: sticky;
          top: 0;
          z-index: 2;
        }
        .preview-grid thead .subhead th{
          background:#e6f5f6;
          color:#0b3d48;
          font-weight:700;
          text-transform:none;
          position: sticky;
          top: 38px;
          z-index: 2;
        }
        .preview-grid tbody tr:nth-child(even) td{
          background:#f8fbfb;
        }
        .preview-grid tr > *:first-child{ border-left: 1.2px solid var(--tealDeep); }
        .preview-grid thead tr:first-child th{ border-top: 1.2px solid var(--tealDeep); }

        .th-vac{ width: 260px; }
        .th-dose{ width: 210px; }
        .th-rem{ width: 260px; }
        .th-num{ width: 90px; text-align:center; }

        .td-vac{ font-weight: 800; }
        .td-dose{ white-space: nowrap; }
        .td-date{ text-align: center; white-space: nowrap; }
        .td-rem{ white-space: pre-wrap; }
      `}</style>

      <main className="relative z-10 mx-auto w-full max-w-none px-2 py-3 sm:px-3 sm:py-4 md:px-4 lg:px-6">
        <PatientHeader patient={patient} />

        <section className="mt-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100 sm:mt-4 sm:p-4">
          <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)_auto] lg:items-center">
            <div className="min-w-0">
              <div className="text-[15px] font-semibold text-[#203D7A]">Immunization</div>
              <div className="mt-1 h-1.5 w-full max-w-[360px] bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-1.5 bg-[#0F8A99]"
                  style={{ width: `${(((activeIndex + 1) / Math.max(schedules.length, 1)) * 100).toFixed(0)}%` }}
                />
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                {activeIndex + 1} / {schedules.length}
              </div>
            </div>

            <div className="w-full min-w-0">
              <label htmlFor="schedSelect" className="sr-only">
                Select schedule
              </label>
              <select
                id="schedSelect"
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0F8A99]/30"
                value={activeIndex}
                onChange={(e) => handleSelectChange(Number(e.target.value))}
                title="Choose schedule"
              >
                {schedules.map((lbl, i) => (
                  <option key={lbl} value={i}>
                    {displayScheduleLabel(lbl)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4 lg:flex lg:w-auto lg:flex-wrap lg:justify-end">
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <IconEye className="h-4 w-4" />
                Preview
              </button>

              <button
                type="button"
                onClick={() => setLegendOpen(true)}
                className="inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <IconInfo className="h-4 w-4" />
                Legend
              </button>

              {editable && (
                <button
                  type="button"
                  onClick={() => setAlertsOpen(true)}
                  className="inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  <IconBell className="h-4 w-4" />
                  Schedule alerts
                </button>
              )}

              {editable && (
                <button
                  type="button"
                  onClick={() => setIsEditing((v) => !v)}
                  aria-pressed={isEditing}
                  className={[
                    "inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium shadow-sm transition",
                    isEditing
                      ? "border-[#0F8A99] bg-white text-[#0F8A99] hover:bg-[#0F8A99]/5"
                      : "border-[#0F8A99] bg-[#0F8A99] text-white hover:bg-[#0e7c8a]",
                  ].join(" ")}
                  title={isEditing ? "Currently editing — click to lock" : "Currently locked — click to edit"}
                >
                  {isEditing ? <IconEdit className="h-4 w-4" /> : <IconLock className="h-4 w-4" />}
                  {isEditing ? "Editing" : "Locked"}
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="mt-3 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 sm:mt-4">
          <header className="flex items-center justify-between gap-3 bg-slate-50 px-3 py-3 ring-1 ring-slate-200 sm:px-4">
            <div className="font-semibold text-slate-800 text-[15px] sm:text-[16px] truncate">{displayScheduleLabel(activeSchedule)}</div>
            <div className="text-[11px] text-slate-500 uppercase tracking-wide">
              {activeIndex + 1} of {total}
            </div>
          </header>

          <div className="p-2.5 sm:p-4">
            {isEditing && (
              <div className="mb-4 overflow-hidden rounded-2xl bg-[#0F8A99]/5 shadow-sm ring-1 ring-[#0F8A99]/25">
                <div className="flex items-center gap-2 border-b border-[#0F8A99]/10 bg-[#0F8A99]/10 px-3 py-2 text-[#0F8A99]">
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-[#0F8A99] shadow-sm ring-1 ring-[#0F8A99]/15">
                    <IconSpark className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[12px] font-semibold uppercase tracking-wide">Quick apply date</div>
                    <div className="text-[11px] leading-snug text-slate-600">Use one visit date for all vaccines in this schedule.</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-[minmax(180px,1fr)_auto_auto] sm:items-end lg:grid-cols-[minmax(220px,300px)_auto_auto_minmax(0,1fr)]">
                  <div className="min-w-0">
                    <div className="text-[12px] font-semibold text-slate-700">Visit date (apply to all)</div>
                    <input
                      type="date"
                      value={batchDate}
                      onChange={(e) => setBatchDate(e.target.value)}
                      className="mt-1 h-11 w-full rounded-lg border border-[#0F8A99]/25 bg-white px-3 text-[13px] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0F8A99]/30"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setBatchDate(todayYmd)}
                    className="h-11 rounded-lg border border-[#0F8A99]/30 bg-[#0F8A99]/10 px-3 text-[12px] font-semibold text-[#0F8A99] shadow-sm hover:bg-[#0F8A99]/15"
                  >
                    Today
                  </button>

                  <button
                    type="button"
                    disabled={!batchDate}
                    onClick={() => {
                      const ymd = toYMD(batchDate);
                      if (!ymd) return;
                      for (const vac of dueVaccines) {
                        const label = activeSchedule;
                        const allLabels = matrix[vac] || [];
                        const index = Math.max(allLabels.indexOf(label), 0);

                        const SERIES: string[] = ["dpt-hepb-hib", "opv", "pcv", "mmr"];
                        const vacNorm = toAbbrev(vac).toLowerCase().trim();
                        const isSeries = SERIES.some((s) => vacNorm === s || vacNorm.includes(s));
                        const isSeriesNext = isSeries && index > 0;

                        const minSeq = sequentialMinDateYMD(vac, label, allLabels, index, edits, patient?.birthdate);
                        if (isSeriesNext && !minSeq) continue;

                        const k = `${vac}__${activeSchedule}`;
                        setEdit(k, { date_given: ymd });
                      }
                      if (dueVaccines[0]) setLastEditedKey(`${dueVaccines[0]}__${activeSchedule}`);
                    }}
                    className="h-11 rounded-lg bg-[#0F8A99] px-3 text-[12px] font-semibold text-white shadow-sm hover:bg-[#0e7c8a] disabled:opacity-60"
                    title={!batchDate ? "Pick a date first" : "Apply this date to all vaccines in this visit"}
                  >
                    Apply to all
                  </button>

                  <div className="self-center rounded-lg bg-white/70 px-3 py-2 text-[12px] text-slate-600 ring-1 ring-[#0F8A99]/10 lg:text-right">
                    Tip: set one date, then just add remarks per vaccine if needed.
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {dueVaccines.map((vac) => {
                const label = activeSchedule;
                const allLabels = matrix[vac] || [];
                const index = Math.max(allLabels.indexOf(label), 0);

                const SERIES: string[] = ["dpt-hepb-hib", "opv", "pcv", "mmr"];
                const vacNorm = toAbbrev(vac).toLowerCase().trim();
                const isSeries = SERIES.some((s) => vacNorm === s || vacNorm.includes(s));
                const isSeriesNext = isSeries && index > 0;

                const d = getDose(vac, label);
                const toggleKey = `${vac}||${label}`;
                const key = `${vac}__${label}`;
                const edit = edits[key];
                const hasRemarks = !!(d?.remarks && d?.remarks.trim());

                const hardMinYmd = minDoseDateYMD(label, patient?.birthdate);
                const minSeqYmd = sequentialMinDateYMD(vac, label, allLabels, index, edits, patient?.birthdate);

                const prereqMissing = isSeriesNext && !minSeqYmd;
                const effectiveMinYmd = prereqMissing ? null : minSeqYmd ?? hardMinYmd;

                const currentYmd = edit?.date_given ? toYMD(edit.date_given) : "";
                const tooEarly = !!currentYmd && !!effectiveMinYmd && currentYmd < effectiveMinYmd;
                const tooOld = !!currentYmd && currentYmd < earliestYmd && !!currentYmd;
                const invalid = tooEarly || tooOld;

                const hintYmd = !currentYmd && !prereqMissing && effectiveMinYmd ? fmtMDY(effectiveMinYmd) : "";
                const minInputYmd = effectiveMinYmd && effectiveMinYmd > earliestYmd ? effectiveMinYmd : earliestYmd;

                const inputClass = [
                  "h-11 min-h-[44px] w-full flex-1 rounded-lg border px-3 text-[13px] leading-tight focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 sm:h-10 sm:text-[14px]",
                  invalid ? "border-rose-400 bg-rose-50/40 focus:ring-rose-300" : "border-slate-200 focus:ring-teal-200",
                ].join(" ");

                return (
                  <article key={`${vac}__${label}`} className="min-w-0 rounded-xl border-l-4 border-l-[#0F8A99]/30 bg-white p-3 shadow-sm ring-1 ring-slate-200 sm:p-4">
                    <h3 className="font-medium text-slate-800 text-[14px] truncate">{toAbbrev(vac)}</h3>
                    <div className="mt-0.5 text-[11px] text-slate-500">{displayScheduleLabel(label)}</div>

                    <div className="mt-2 text-[14px]">
                      <div className="text-slate-600">Date</div>
                      {isEditing ? (
                        <>
                          <div className="mt-1 flex flex-col gap-2 min-[430px]:flex-row min-[430px]:items-center">
                            <input
                              type="date"
                              min={minInputYmd}
                              value={edit?.date_given ?? ""}
                              placeholder={hintYmd || undefined}
                              disabled={prereqMissing}
                              onChange={(e) => {
                                const value = e.target.value || null;
                                setEdit(key, { date_given: value });
                                setLastEditedKey(key);
                              }}
                              className={inputClass}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setEdit(key, { date_given: todayYmd });
                                setLastEditedKey(key);
                              }}
                              className="h-11 shrink-0 rounded-lg border border-[#0F8A99]/30 bg-[#0F8A99]/10 px-3 text-[12px] font-semibold text-[#0F8A99] shadow-sm hover:bg-[#0F8A99]/15 disabled:cursor-not-allowed disabled:opacity-60 min-[430px]:h-10"
                              disabled={prereqMissing}
                            >
                              Today
                            </button>
                          </div>

                          {minSeqYmd ? (
                            <p className="mt-1 text-[11px] text-slate-400">
                              Must be on or after {fmtMDY(minSeqYmd)} and not more than 100 years ago.
                            </p>
                          ) : isSeriesNext ? (
                            <p className="mt-1 text-[11px] text-slate-400">
                              Enter the previous dose date to auto-calculate the next schedule.
                            </p>
                          ) : hardMinYmd ? (
                            <p className="mt-1 text-[11px] text-slate-400">
                              Must be on or after {fmtMDY(hardMinYmd)} and not more than 100 years ago.
                            </p>
                          ) : null}

                          {invalid && (
                            <p className="mt-0.5 text-[11px] text-rose-600 font-medium">
                              {tooEarly
                                ? "Entered date is earlier than the allowed schedule."
                                : "Entered date is too far in the past (beyond 100 years)."}
                            </p>
                          )}
                        </>
                      ) : (
                        <div className="font-medium text-slate-900">{fmtDate(d?.date_given ?? edit?.date_given ?? null)}</div>
                      )}
                    </div>

                    <div className="mt-2">
                      {isEditing ? (
                        <textarea
                          value={edit?.remarks ?? ""}
                          onChange={(e) => setEdit(key, { remarks: e.target.value || null })}
                          placeholder="Remarks (optional)"
                          className="mt-2 min-h-[88px] w-full rounded-lg border border-slate-200 bg-slate-50/40 px-3 py-2 text-[14px] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F8A99]/25"
                        />
                      ) : hasRemarks ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setOpenRemarks((m) => ({ ...m, [toggleKey]: !m[toggleKey] }))}
                            className="text-[12px] font-semibold text-[#0F8A99] hover:underline"
                            aria-expanded={!!openRemarks[toggleKey]}
                          >
                            {openRemarks[toggleKey] ? "Hide remarks" : "Show remarks"}
                          </button>
                          {openRemarks[toggleKey] && (
                            <div className="mt-2 text-[14px] text-slate-800 whitespace-pre-wrap break-words">{d?.remarks}</div>
                          )}
                        </>
                      ) : (
                        <span className="text-[12px] text-slate-400">No remarks</span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            {isEditing && (
              <div className="mt-4 grid grid-cols-1 gap-2 border-t border-slate-100 pt-4 sm:flex sm:flex-wrap sm:items-center">
                <button
                  type="button"
                  onClick={onSaveClick}
                  disabled={saving}
                  className="h-11 rounded-lg bg-[#0F8A99] px-4 font-semibold text-white disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                <button type="button" onClick={cancelActive} className="h-11 rounded-lg border border-slate-200 px-4 font-medium text-slate-700">
                  Cancel
                </button>
              </div>
            )}
          </div>
        </section>
      </main>

      <BackToTopButton />

      <PreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        patient={patient}
        matrix={matrix}
        getDose={getDose}
        maxCols={maxCols}
      />

      <LegendModal open={legendOpen} onClose={() => setLegendOpen(false)} vaccines={vaccines} />

      <ScheduleAlertsPanel
        open={alertsOpen}
        onClose={() => setAlertsOpen(false)}
        nearestUpcoming={alertsSummary.nearestUpcoming}
        missed={alertsSummary.missed}
      />

      <ResultDialog
        open={resultOpen}
        onClose={() => setResultOpen(false)}
        kind={resultKind}
        title={resultTitle}
        message={resultMsg}
      />
    </div>
  );
}

/* ───────── Info row ───────── */
function InfoRow({
  icon,
  label,
  value,
  className = "",
  wrap = false,
}: {
  icon?: React.ReactNode;
  label: string;
  value?: string | null;
  className?: string;
  wrap?: boolean;
}) {
  const show = (value ?? "").toString().trim() || "—";
  return (
    <div className={["py-1.5", className].join(" ")}>
      <div className="flex items-start gap-3 rounded-xl bg-slate-50/60 p-2 ring-1 ring-slate-100">
        <div className="mt-0.5 text-slate-500">{icon ?? null}</div>
        <div className="min-w-0 w-full">
          <div className="text-[12px] font-medium tracking-wide text-slate-600">{label}</div>
          <div
            className={[
              "text-[14px] sm:text-[15px] font-semibold text-slate-900",
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