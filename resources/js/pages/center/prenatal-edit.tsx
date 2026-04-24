import React from "react";
import { Head, usePage, router } from "@inertiajs/react";
import { AnimatePresence, motion } from "framer-motion";
import ITRTab from "@/components/prenatal/ITRTab";
import HBMTab from "@/components/prenatal/HBMTab";
import Logo from "/public/build/assets/LOGO.svg";
import BackIcon from "/public/build/assets/back-outline-svgrepo-com.svg";

/* =============================================
   ITR API — central helpers & route builders
   ============================================= */

const BASE_PREFIX = "/center/patients";

export const ITR_URL = (patientId: number | string) => `${BASE_PREFIX}/${patientId}/prenatal/itr-details`;
export const TTVITA_URL = (patientId: number | string) => `${BASE_PREFIX}/${patientId}/prenatal/tt-vitA`;
export const PLAN_URL = (patientId: number | string) => `${BASE_PREFIX}/${patientId}/prenatal/plan`;
export const VISIT_URL = (patientId: number | string) => `${BASE_PREFIX}/${patientId}/prenatal/visit`;
export const DELVISIT_URL = (patientId: number | string, visitId: number | string) =>
  `${BASE_PREFIX}/${patientId}/prenatal/visit/${visitId}`;

/* ───────── Icons (outline) ───────── */
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
const IconClipboard = (p: any) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...p} fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="6" y="3" width="12" height="18" rx="2" />
    <path d="M9 3v3h6V3" />
    <path d="M9 10h6M9 14h6" />
  </svg>
);
const IconHeartPulse = (p: any) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...p} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M20.8 11.2a5.4 5.4 0 0 0-9.1-4.1L12 7.4l.3-.3a5.4 5.4 0 1 0-7.6 7.6L12 22l7.3-7.3a5.3 5.3 0 0 0 1.5-3.5Z" />
    <path d="M7.5 12l2.5 2.5L16 10" />
  </svg>
);
const IconUser = (p: any) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...p} fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="7" r="4" />
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
const IconCalendar = (p: any) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...p} fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);
const IconRuler = (p: any) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...p} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M21 16V7a2 2 0 0 0-2-2H7L3 9v11a2 2 0 0 0 2 2h11l5-6Z" />
    <path d="M7 17h2M10 14h2M13 11h2M16 8h2" />
  </svg>
);
const IconShield = (p: any) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...p} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 2l7 3v6c0 5-3.4 9.6-7 11-3.6-1.4-7-6-7-11V5l7-3Z" />
  </svg>
);
const IconStatus = (p: any) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...p} fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="9" />
    <path d="M8 13l2.5 2.5L16 10" />
  </svg>
);
const IconPhone = (p: any) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...p} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M22 16.92v2a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h2a2 2 0 0 1 2 1.72c.12.86.33 1.69.62 2.49a2 2 0 0 1-.45 2.11L7.1 9.45a16 16 0 0 0 6 6l1.13-1.13a2 2 0 0 1 2.11-.45c.8.29 1.63.5 2.49.62A2 2 0 0 1 22 16.92z" />
  </svg>
);
const IconEdit = (p: any) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...p} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M4 20h4l9.5-9.5a1.5 1.5 0 0 0 0-2.12L15.62 6.5a1.5 1.5 0 0 0-2.12 0L4 16v4z" />
    <path d="M13.5 7.5 16.5 10.5" />
  </svg>
);
const IconCheckCircle = (p: any) => (
  <svg viewBox="0 0 24 24" width="1.25em" height="1.25em" {...p} fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12.5l2.5 2.5L16 9" />
  </svg>
);
const IconShuffle = (p: any) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...p} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M16 3h5v5" />
    <path d="M4 20l7-7" />
    <path d="M21 3l-7 7" />
    <path d="M16 21h5v-5" />
    <path d="M4 4l7 7" />
  </svg>
);
const IconHistory = (p: any) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    {...p}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 4v5h5" />
    <path d="M12 7v6l4 2" />
  </svg>
);

/* ───────── Types ───────── */
export type VisitRow = {
  id?: number;
  visit_date: string | null;
  trimester: "1st" | "2nd" | "3rd" | null;
  bp?: string | null;
  pr?: string | null;
  rr?: string | null;
  wt?: string | null;
  temp?: string | null;
  fundic_height?: string | null;
  fetal_heart_tone?: string | null;
  iron_tablets?: number | null;
  remarks?: string | null;
};

export type Plan = {
  planned_facility: string;
  attending: string;
  philhealth_accredited: boolean;
  distance: string;
  estimated_cost: string;
  payment_mode: string;
  transport: string;
  companion_1_name: string;
  companion_1_contact: string;
  companion_2_name: string;
  companion_2_contact: string;
  blood_type: string;
  blood_donors: string;
  refer_to_name: string;
  refer_to_contact: string;
  refer_to_address: string;
};

type TransferHistoryRow = {
  id: number;
  date: string | null;
  from_barangay: string | null;
  to_barangay: string | null;
  description?: string | null;
  by?: { id: number; name?: string | null; barangay?: string | null } | null;
};

type PageProps = {
  patient: {
    id: number | string;
    full_name?: string;
    barangay?: string;
    address?: string;
    birthdate?: string | null;
    age_years?: number | string;
    height_cm?: number | string;
    civil_status?: string;
    philhealth_no?: string;
    phone_number?: string | null;
    phone?: string | null;
    family_no?: string | null;
    family_serial_number?: string | null;
    sex?: string | null;
    status?: string | null;
    owner_id?: number | string | null;
  };
  itr?: any;
  plan: any;
  visits: any[];
  itr_visits?: any[];
  history: any | null;
  current: any;
  postnatal: any[];
  after?: any;
  tab?: "itr" | "hbm";
  sub?: "history" | "current" | "after";
  owner?: { id: number; name?: string | null; barangay?: string | null } | null;
  canEdit?: boolean;
  pendingOwnershipRequestId?: number | null;
  token?: string | null;
  transferTargets?: { id: number; name?: string | null; barangay?: string | null }[];
  barangayTransferHistory?: TransferHistoryRow[];
  csrf?: string;
  flash?: { status?: string };
};

/* ───────── helpers ───────── */
const TEAL = "#0F8A99";
const EMPTY = "—";
const NAME_SUFFIX_OPTIONS: readonly string[] = ["", "JR", "SR", "II", "III", "IV", "V", "OTHERS"];
const SILANG_BARANGAYS: readonly string[] = [
  "Acacia","Adlas","Anahaw I","Anahaw II","Balite I","Balite II","Balubad","Banaba",
  "Barangay I (Pob.)","Barangay II (Pob.)","Barangay III (Pob.)","Barangay IV (Pob.)","Barangay V (Pob.)",
  "Batas","Biga I","Biga II","Biluso","Bucal","Buho","Bulihan","Cabangaan","Carmen","Hoyo","Hukay","Iba",
  "Inchican","Ipil I","Ipil II","Kalubkob","Kaong","Lalaan I","Lalaan II","Litlit","Lucsuhin","Lumil",
  "Maguyam","Malabag","Malaking Tatyao","Mataas Na Burol","Munting Ilog","Narra I","Narra II","Narra III",
  "Paligawan","Pasong Langka","Pooc I","Pooc II","Pulong Bunga","Pulong Saging","Puting Kahoy","Sabutan",
  "San Miguel I","San Miguel II","San Vicente I","San Vicente II","Santol","Tartaria","Tibig","Toledo",
  "Tubuan I","Tubuan II","Tubuan III","Ulat","Yakal",
];
const BRGY_OTHER = "__BRGY_OTHER__";

export function csrfToken(): string {
  const meta = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null;
  const glb = (window as any)?.Laravel?.csrfToken as string | undefined;
  return (meta?.content || glb || "").toString();
}

export const todayYMD = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};

export function toYMD(v: string | null | undefined): string {
  if (!v) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const t = new Date(v);
  if (Number.isNaN(t.getTime())) return "";
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const d = String(t.getDate()).padStart(2, "0");
  return `${t.getFullYear()}-${m}-${d}`;
}

const fmtDateMDY = (v?: string | null) => {
  if (!v) return EMPTY;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return EMPTY;
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yy = d.getFullYear();
  return `${mm}/${dd}/${yy}`;
};
const fmtMDY = fmtDateMDY;

const fmtDate = (v?: string | null) => {
  if (!v) return EMPTY;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return EMPTY;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
};

const fmtDateTime = (v?: string | null) => {
  if (!v) return EMPTY;
  const s = String(v).trim();
  const safe = s.includes("T") ? s : s.replace(" ", "T");
  const d = new Date(safe);
  if (Number.isNaN(d.getTime())) return s || EMPTY;
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const toStr = (v: any) => (v === null || v === undefined || v === "" ? EMPTY : String(v));

const calcAgeYears = (birthdate?: string | null) => {
  if (!birthdate) return EMPTY;
  const d = new Date(birthdate);
  if (Number.isNaN(d.getTime())) return EMPTY;
  const now = new Date();
  let y = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) y--;
  if (y < 0 || y > 120) return EMPTY;
  return String(y);
};

function dateOnly(v?: string | null): string {
  if (!v) return "";
  const s = String(v).trim();
  if (!s) return "";
  if (s.includes("T")) return s.split("T")[0];
  if (/^\d{4}-\d{2}-\d{2}Z$/.test(s)) return s.slice(0, 10);
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(s)) return s.replaceAll("/", "-");
  return s;
}

function toAllCaps(input: string): string {
  if (!input) return "";
  return input.toUpperCase();
}

function canonicalBarangay(v?: string | null): string {
  const raw = String(v ?? "").trim();
  if (!raw) return "";
  const found = SILANG_BARANGAYS.find((b) => b.toLowerCase() === raw.toLowerCase());
  return found ?? raw;
}

function normalizePhone(v?: string | null): string {
  const digits = String(v ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10 && digits.startsWith("9")) return `0${digits}`;
  return digits;
}

function trimPhone(v?: string) {
  if (!v) return "";
  let digits = v.replace(/\D/g, "");
  if (digits.startsWith("63")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  digits = digits.slice(-10);
  return digits;
}

function validatePersonName(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  if (v === "N/A") return null;
  if (/\d/.test(v)) return "Name must not contain numbers.";
  const re = /^[\p{L}\s\-\.'’]*$/u;
  if (!re.test(v)) return "Name can only contain letters, spaces, - ' . and accented letters.";
  return null;
}

function validateFamilyNo(raw: string): string | null {
  const v = String(raw || "").trim();
  if (!v) return null;
  if (!/^\d+$/.test(v)) return "Family no. must contain digits only.";
  if (Number(v) > 10000) return "Family no. must not exceed 10000.";
  return null;
}

function splitWizardStyleFullName(fullName?: string | null) {
  const raw = String(fullName ?? "").trim();
  if (!raw) {
    return { first_name: "", middle_name: "", last_name: "", suffix: "", suffix_other: "" };
  }

  const suffixSet = new Set(["JR", "SR", "II", "III", "IV", "V"]);
  const parts = raw.split(/\s+/).filter(Boolean);

  let suffix = "";
  if (parts.length > 1) {
    const candidate = parts[parts.length - 1].replace(/\./g, "").toUpperCase();
    if (suffixSet.has(candidate)) {
      suffix = candidate;
      parts.pop();
    }
  }

  if (parts.length === 1) {
    return { first_name: parts[0] ?? "", middle_name: "", last_name: "", suffix, suffix_other: "" };
  }
  if (parts.length === 2) {
    return { first_name: parts[0] ?? "", middle_name: "", last_name: parts[1] ?? "", suffix, suffix_other: "" };
  }

  return {
    first_name: parts[0] ?? "",
    middle_name: parts.slice(1, -1).join(" "),
    last_name: parts[parts.length - 1] ?? "",
    suffix,
    suffix_other: "",
  };
}

function buildWizardStyleFullName(form: {
  first_name: string;
  middle_name: string;
  last_name: string;
  suffix: string;
  suffix_other: string;
}) {
  const first = toAllCaps((form.first_name || "").trim());
  const middle = toAllCaps((form.middle_name || "").trim());
  const last = toAllCaps((form.last_name || "").trim());
  const suffixSelect = toAllCaps((form.suffix || "").trim());
  const suffixOther = toAllCaps((form.suffix_other || "").trim());

  let finalSuffix = "";
  if (suffixSelect === "OTHERS") finalSuffix = suffixOther;
  else finalSuffix = suffixSelect;

  return [first, middle, last, finalSuffix].filter(Boolean).join(" ");
}

function getPrenatalFocusFromUrl(): { openVisits: boolean; hash: string } {
  if (typeof window === "undefined") return { openVisits: false, hash: "" };

  try {
    const url = new URL(window.location.href);
    const section = String(url.searchParams.get("section") ?? "").toLowerCase();
    const itrSub = String(url.searchParams.get("itr_sub") ?? "").toLowerCase();
    const hash = String(url.hash ?? "");
    const openVisits = section === "visits" || itrSub === "visits" || hash === "#visits";
    return { openVisits, hash };
  } catch {
    return { openVisits: false, hash: "" };
  }
}

function syncUrlForPrenatalVisits() {
  if (typeof window === "undefined") return;

  try {
    const url = new URL(window.location.href);
    let changed = false;

    if (url.searchParams.get("section") !== "visits") {
      url.searchParams.set("section", "visits");
      changed = true;
    }
    if (url.searchParams.get("itr_sub") !== "visits") {
      url.searchParams.set("itr_sub", "visits");
      changed = true;
    }
    if (url.searchParams.get("tab") !== "itr") {
      url.searchParams.set("tab", "itr");
      changed = true;
    }
    if (url.searchParams.has("sub")) {
      url.searchParams.delete("sub");
      changed = true;
    }
    if (url.hash !== "#visits") {
      url.hash = "visits";
      changed = true;
    }

    if (changed) window.history.replaceState({}, "", url.toString());
  } catch {}
}

const ui = {
  shell: "mx-auto max-w-[1400px] px-3 sm:px-4 md:px-6 lg:px-8",
};

const mobileField =
  "mt-1 w-full rounded-xl h-12 min-h-[48px] border px-3 text-[15px] focus:outline-none focus:ring-2";
const modalSection = "rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5";
const modalButtonBase =
  "inline-flex items-center justify-center rounded-xl h-12 min-h-[48px] px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0F8A99]";

/* ───────── Small UI atoms ───────── */
function KV({ icon, label, value }: { icon?: React.ReactNode; label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[22px_170px_1fr] items-baseline gap-x-3 py-2 border-b border-slate-200 last:border-b-0 text-[14px] leading-6">
      <div className="text-[color:var(--teal,_#0F8A99)]">{icon}</div>
      <div className="text-slate-600">{label}</div>
      <div className="font-medium text-slate-900 break-words">{value ?? EMPTY}</div>
    </div>
  );
}

function Section({ title, icon, children }: React.PropsWithChildren<{ title: string; icon?: React.ReactNode }>) {
  return (
    <section className="rounded-md border border-slate-300 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-slate-600">{icon}</span>
          <h2 className="text-[15px] md:text-[16px] font-semibold text-slate-900">{title}</h2>
        </div>
      </div>
      <div className="px-4 py-4">{children}</div>
    </section>
  );
}

function SegTabs({
  items,
  value,
  onChange,
}: {
  items: { key: "itr" | "hbm"; label: string; icon: React.ReactNode }[];
  value: "itr" | "hbm";
  onChange: (k: "itr" | "hbm") => void;
}) {
  return (
    <div className="relative inline-flex gap-1 rounded-md bg-slate-100 p-1">
      {items.map((it) => {
        const active = value === it.key;
        return (
          <button
            key={it.key}
            onClick={() => onChange(it.key)}
            className="relative px-3 py-1.5 text-sm font-semibold rounded-[6px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal,_#0F8A99)]/40"
            aria-pressed={active}
          >
            {active && (
              <motion.span
                layoutId="topTabPill"
                className="absolute inset-0 rounded-[6px] shadow-sm"
                style={{ backgroundColor: TEAL }}
                transition={{ type: "spring", bounce: 0.25, duration: 0.35 }}
              />
            )}
            <span className={`relative inline-flex items-center gap-1 ${active ? "text-white" : "text-slate-700 hover:text-slate-900"}`}>
              <span className={active ? "text-white" : "text-slate-500"}>{it.icon}</span>
              {it.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function StatusBadge({ status }: { status?: string | null }) {
  if (!status) return null;

  const normalized = String(status).toLowerCase();

  let label = "ACTIVE";
  let classes =
    "inline-flex items-center rounded-full border px-2.5 py-[3px] text-[11px] font-semibold uppercase tracking-wide " +
    "border-emerald-200 bg-emerald-50 text-emerald-800";

  if (normalized === "deceased") {
    label = "DECEASED";
    classes =
      "inline-flex items-center rounded-full border px-2.5 py-[3px] text-[11px] font-semibold uppercase tracking-wide " +
      "border-rose-200 bg-rose-50 text-rose-800";
  } else if (normalized === "transferred") {
    label = "TRANSFERRED";
    classes =
      "inline-flex items-center rounded-full border px-2.5 py-[3px] text-[11px] font-semibold uppercase tracking-wide " +
      "border-amber-200 bg-amber-50 text-amber-800";
  } else if (normalized === "left_without_notice") {
    label = "LEFT WITHOUT NOTICE";
    classes =
      "inline-flex items-center rounded-full border px-2.5 py-[3px] text-[11px] font-semibold uppercase tracking-wide " +
      "border-slate-200 bg-slate-100 text-slate-800";
  }

  return <span className={classes}>{label}</span>;
}

function ActionButton({
  icon,
  label,
  mobileLabel,
  onClick,
  className = "",
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  mobileLabel?: string;
  onClick: () => void;
  className?: string;
  badge?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={[
        "group inline-flex h-11 min-h-[44px] min-w-0 items-center justify-center sm:justify-start gap-2 rounded-xl border px-3",
        "text-xs md:text-sm font-medium shadow-sm transition",
        "focus:outline-none focus:ring-2 focus:ring-[#0F8A99]",
        className,
      ].join(" ")}
    >
      <span className="shrink-0">{icon}</span>
      <span className="hidden sm:inline truncate">{label}</span>
      <span className="sm:hidden sr-only">{mobileLabel ?? label}</span>
      {badge ? <span className="shrink-0">{badge}</span> : null}
    </button>
  );
}

/* ───────── Modal base ───────── */
function useLockBodyScroll(open: boolean) {
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);
}

function useEscToClose(open: boolean, onClose: () => void) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
}

function ModalShell({
  open,
  titleId,
  title,
  subtitle,
  onClose,
  children,
}: {
  open: boolean;
  titleId: string;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useLockBodyScroll(open);
  useEscToClose(open, onClose);

  const closeBtnRef = React.useRef<HTMLButtonElement | null>(null);
  React.useEffect(() => {
    if (open) closeBtnRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button type="button" aria-label="Close modal" onClick={onClose} className="absolute inset-0 cursor-default" />

      <div className="relative w-full sm:max-w-2xl bg-white shadow-2xl border border-slate-200 rounded-t-2xl sm:rounded-2xl max-h-[88vh] sm:max-h-[90vh] flex flex-col">
        <div className="sticky top-0 z-10 bg-white rounded-t-2xl sm:rounded-t-2xl border-b border-slate-200">
          <div className="px-4 sm:px-6 py-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id={titleId} className="text-base sm:text-lg font-semibold text-slate-900">{title}</h2>
              {subtitle ? <p className="mt-1 text-xs sm:text-sm text-slate-600">{subtitle}</p> : null}
            </div>
            <button
              ref={closeBtnRef}
              type="button"
              onClick={onClose}
              className="shrink-0 inline-flex items-center justify-center rounded-xl h-10 px-3 border border-slate-300 bg-white shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0F8A99]"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

/* ───────── History list ───────── */
function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
      <div className="mx-auto mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200">
        <IconHistory className="h-5 w-5 text-slate-600" />
      </div>
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      {hint ? <div className="mt-1 text-xs text-slate-600">{hint}</div> : null}
    </div>
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
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[12px] font-medium text-slate-700">
      <span className="text-[#0F8A99]">{icon}</span>
      <span>{text}</span>
    </span>
  );
}

function BackToTopButton() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 280);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      title="Back to top"
      className={[
        "fixed z-[250] transition-all duration-300 ease-out",
        "bottom-20 right-4 sm:bottom-24 sm:right-6 lg:bottom-28",
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

function TransferHistoryList({
  rows,
  currentBarangay,
}: {
  rows: TransferHistoryRow[];
  currentBarangay: string;
}) {
  const items = Array.isArray(rows) ? rows : [];

  if (items.length === 0) {
    return <EmptyState title="No transfer history yet" hint="This patient hasn’t been transferred between barangays." />;
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4">
        <div className="text-xs font-semibold text-teal-800 uppercase tracking-wide">Current barangay</div>
        <div className="mt-1 text-sm sm:text-base font-semibold text-teal-900">{currentBarangay || EMPTY}</div>
      </div>

      <ol className="space-y-3">
        {items.map((r, idx) => {
          const from = r.from_barangay || EMPTY;
          const to = r.to_barangay || EMPTY;
          const who = r.by?.name ? String(r.by.name) : null;
          const whoBrgy = r.by?.barangay ? String(r.by.barangay) : null;

          return (
            <li key={r.id ?? idx} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#0F8A99]/10 text-[#0F8A99] shrink-0">
                  <IconShuffle className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-semibold text-slate-900">
                      {from} <span className="text-slate-400 font-medium mx-1">→</span> {to}
                    </span>
                    <span className="text-[11px] text-slate-500">•</span>
                    <span className="text-[11px] text-slate-600">{fmtDateTime(r.date)}</span>
                  </div>

                  {who ? (
                    <div className="mt-1 text-xs text-slate-600">
                      Transferred by <span className="font-medium text-slate-800">{who}</span>
                      {whoBrgy ? <span className="text-slate-500"> ({whoBrgy})</span> : null}
                    </div>
                  ) : (
                    <div className="mt-1 text-xs text-slate-600">Transferred by —</div>
                  )}

                  {r.description ? <div className="mt-2 text-xs text-slate-600">{r.description}</div> : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* Shared form fields for modal */
function DateFieldWithToday({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  const today = React.useMemo(() => new Date().toISOString().slice(0, 10), []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const v = dateOnly(raw);
    const finalVal = v && v > today ? today : v;
    onChange(finalVal);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="date"
          value={dateOnly(value)}
          onChange={handleChange}
          max={today}
          className={`flex-1 rounded-xl h-12 min-h-[48px] px-3 text-[15px] focus:outline-none border ${
            error ? "border-red-500 focus:ring-red-500" : "border-slate-300 focus:ring-[#0F8A99]"
          }`}
        />
        <button
          type="button"
          onClick={() => onChange(today)}
          className="h-12 min-h-[48px] px-3 rounded-xl border border-slate-300 text-[13px] font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 hover:border-[#0F8A99]/70 focus:outline-none focus:ring-2 focus:ring-[#0F8A99]"
        >
          TODAY
        </button>
      </div>
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  );
}

function PhoneField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const digits = (value || "").replace(/\D/g, "").slice(0, 10);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let next = e.target.value.replace(/\D/g, "");
    if (next.startsWith("0")) next = next.slice(1);
    next = next.slice(0, 10);
    onChange(next);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <div className="mt-1 flex items-center gap-2">
        <div className="h-12 min-h-[48px] px-3 rounded-xl border border-slate-300 bg-slate-50 text-[15px] flex items-center">
          +63
        </div>
        <input
          type="tel"
          inputMode="numeric"
          maxLength={10}
          value={digits}
          onChange={handleChange}
          placeholder="9123456789"
          className="flex-1 rounded-xl h-12 min-h-[48px] px-3 text-[15px] tracking-[0.08em] focus:outline-none border border-slate-300 focus:ring-2 focus:ring-[#0F8A99]"
        />
      </div>
    </div>
  );
}

function SexToggleField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const options = [
    { value: "Female", label: "FEMALE" },
    { value: "Male", label: "MALE" },
  ];

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">Sex</label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`w-full h-12 min-h-[48px] rounded-xl border text-sm font-semibold flex items-center justify-center transition ${
                active
                  ? "bg-[#0F8A99] text-white border-[#0F8A99]"
                  : "bg-white text-slate-700 border-slate-300 hover:border-[#0F8A99]/70"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BarangayField({
  value,
  options,
  onChange,
}: {
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  const [useOther, setUseOther] = React.useState<boolean>(() => (value ? !options.includes(value) : false));

  React.useEffect(() => {
    if (value) setUseOther(!options.includes(value));
    else setUseOther(false);
  }, [value, options]);

  const selectValue = useOther ? BRGY_OTHER : value || "";

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">Barangay</label>
      <select
        value={selectValue}
        onChange={(e) => {
          const v = e.target.value;
          if (v === BRGY_OTHER) {
            setUseOther(true);
            onChange("");
          } else {
            setUseOther(false);
            onChange(v);
          }
        }}
        className="mt-1 w-full rounded-xl h-12 min-h-[48px] px-3 text-[15px] focus:outline-none border border-slate-300 focus:ring-2 focus:ring-[#0F8A99] bg-white"
      >
        <option value="">— SELECT BARANGAY —</option>
        {options.map((b) => (
          <option key={b} value={b}>
            {b.toUpperCase()}
          </option>
        ))}
        <option value={BRGY_OTHER}>OTHER (TYPE MANUALLY)</option>
      </select>

      {useOther && (
        <div className="mt-2">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(toAllCaps(e.target.value))}
            placeholder="TYPE BARANGAY NAME"
            maxLength={80}
            className="w-full rounded-xl h-12 min-h-[48px] px-3 text-[15px] uppercase placeholder:uppercase focus:outline-none border border-slate-300 focus:ring-2 focus:ring-[#0F8A99]"
            aria-label="Barangay (Other)"
          />
        </div>
      )}
    </div>
  );
}

/* ───────── Header ───────── */
function HeaderBar({
  onBack,
  patient,
  onOpenHistory,
  historyCount,
}: {
  onBack: () => void;
  patient: PageProps["patient"];
  onOpenHistory: () => void;
  historyCount: number;
}) {
  return (
    <header className="relative z-20 border-b border-slate-200 bg-white/90 backdrop-blur oh-no-x">
      <div className={[ui.shell, "flex h-16 items-center justify-between gap-3", "max-[360px]:oh-stack-xs"].join(" ")}>
        <div className="flex items-center gap-3 max-[360px]:oh-stack-xs">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0F8A99]"
          >
            <img src={BackIcon} alt="" className="h-4 w-4" draggable={false} />
            <span className="xs:inline">Back</span>
          </button>

          <div className="min-w-0 leading-tight">
            <div className="text-sm font-semibold text-slate-800 truncate max-w-[180px] sm:max-w-xs">
              {patient?.full_name || "Unnamed patient"}
            </div>
            <div className="text-[11px] text-slate-500">
              {(() => {
                const bday = patient?.birthdate ? fmtMDY(patient.birthdate) : "—";
                if (bday && bday !== "—") {
                  return (
                    <>
                      {bday}
                      {patient?.barangay ? ` · ${patient.barangay}` : null}
                    </>
                  );
                }
                return patient?.barangay || null;
              })()}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-2">
              {patient?.status ? <StatusBadge status={patient.status} /> : null}

              <button
                type="button"
                onClick={onOpenHistory}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-[3px] text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0F8A99]"
                title="View barangay transfer history"
              >
                <IconHistory className="h-3.5 w-3.5" />
                <span>History</span>
                <span className="ml-1 inline-flex min-w-[18px] justify-center rounded-full bg-slate-100 px-1.5 py-[1px] text-[10px] font-bold text-slate-700">
                  {historyCount}
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className={["flex items-center gap-3 max-[360px]:oh-brand-xs"].join(" ")}>
          <img
            src={Logo}
            alt="OneHealth logo"
            className="h-10 w-10 rounded-xl select-none max-[360px]:h-9 max-[360px]:w-9"
            draggable={false}
          />
          <div className="leading-tight max-[420px]:hidden">
            <div className="text-base md:text-lg font-semibold tracking-wide text-[#203D7A] max-[380px]:text-[15px]">
              ONE HEALTH
            </div>
            <div className="text-[11px] uppercase tracking-wider text-slate-500 max-[420px]:hidden">
              Records · Patient
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

/* ───────── Page Component ───────── */
export default function PrenatalEdit() {
  const { props } = usePage<PageProps>() as any;
  const {
    patient,
    itr,
    plan,
    visits,
    itr_visits,
    history: hist,
    current,
    postnatal,
    after,
    tab,
    sub,
    canEdit,
    pendingOwnershipRequestId,
    token,
    transferTargets = [],
    barangayTransferHistory = [],
    csrf: sharedCsrf,
    flash,
  } = props as PageProps;

  const csrf = sharedCsrf ?? csrfToken();
  const canEditSafe = Boolean(canEdit);

  const prenatalBase = `${BASE_PREFIX}/${patient.id}/prenatal`;
  const backHref = `/center/records`;

  const serverTab: "itr" | "hbm" = (tab as any) ?? "itr";
  const activeSub: "history" | "current" | "after" = (sub as any) ?? "history";

  const [clientTab, setClientTab] = React.useState<"itr" | "hbm">(serverTab);
  const [patientInfoOpen, setPatientInfoOpen] = React.useState(false);

  React.useEffect(() => {
    setClientTab(serverTab);
  }, [serverTab]);

  React.useEffect(() => {
    const { openVisits } = getPrenatalFocusFromUrl();
    if (!openVisits) return;
    setClientTab("itr");
    syncUrlForPrenatalVisits();
  }, [patient.id]);

  const [itrDirty, setItrDirty] = React.useState(false);
  const itrDirtyRef = React.useRef(itrDirty);
  itrDirtyRef.current = itrDirty;

  React.useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (clientTab === "itr" && itrDirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [clientTab]);

  const headerAddress =
    (patient.address && String(patient.address).trim()) ||
    (patient.barangay ? `${patient.barangay}, Silang, Cavite` : null);

  const confirmLeaveITR = React.useCallback(() => {
    if (!itrDirtyRef.current) return true;
    return window.confirm("You have unsaved changes in ITR. Leave this section anyway?");
  }, []);

  const gotoTab = (t: "itr" | "hbm") => {
    if (t === clientTab) return;
    if (clientTab === "itr" && t !== "itr") {
      if (!confirmLeaveITR()) return;
    }

    setClientTab(t);

    const url = new URL(window.location.href);

    if (t === "itr") {
      url.searchParams.set("tab", "itr");
      url.searchParams.delete("sub");
    } else {
      url.searchParams.set("tab", "hbm");
      url.searchParams.set("sub", activeSub || "history");
      url.searchParams.delete("itr_sub");
      url.searchParams.delete("section");
      if (url.hash === "#visits") url.hash = "";
    }

    router.visit(url.toString(), {
      preserveScroll: true,
      preserveState: true,
      replace: true,
    });
  };

  const goBack = () => {
    if (clientTab === "itr" && !confirmLeaveITR()) return;
    if (window.history.length > 1) window.history.back();
    else window.location.href = backHref;
  };

  const [transferOpen, setTransferOpen] = React.useState(false);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [newOwnerId, setNewOwnerId] = React.useState<string>("");

  const historyCount = Array.isArray(barangayTransferHistory) ? barangayTransferHistory.length : 0;

  const requestOwnership = React.useCallback(() => {
    if (pendingOwnershipRequestId) return;
    router.post(
      `${BASE_PREFIX}/${patient.id}/ownership-requests`,
      { _token: csrf },
      { preserveScroll: true, replace: true } as any
    );
  }, [pendingOwnershipRequestId, patient.id, csrf]);

  const [editOpen, setEditOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [showToast, setShowToast] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string | null>>({});

  const initialSplitName = splitWizardStyleFullName(patient.full_name);

  const [form, setForm] = React.useState({
    first_name: initialSplitName.first_name,
    middle_name: initialSplitName.middle_name,
    last_name: initialSplitName.last_name,
    suffix: initialSplitName.suffix,
    suffix_other: initialSplitName.suffix_other,

    birthdate: dateOnly(patient.birthdate),
    sex: patient.sex ?? "",
    phone: trimPhone(patient.phone ?? patient.phone_number ?? ""),
    barangay: canonicalBarangay(patient.barangay ?? ""),
    address: patient.address ?? "",
    civil_status: patient.civil_status ?? "",
    philhealth_no: patient.philhealth_no ?? "",
    height_cm: patient.height_cm ? String(patient.height_cm) : "",
    family_serial_number: patient.family_serial_number ?? "",
    family_no: patient.family_no ?? "",
    status: patient.status ?? "active",
  });

  React.useEffect(() => {
    if (!editOpen) return;
    const splitName = splitWizardStyleFullName(patient.full_name);

    setForm({
      first_name: splitName.first_name,
      middle_name: splitName.middle_name,
      last_name: splitName.last_name,
      suffix: splitName.suffix,
      suffix_other: splitName.suffix_other,
      birthdate: dateOnly(patient.birthdate),
      sex: patient.sex ?? "",
      phone: trimPhone(patient.phone ?? patient.phone_number ?? ""),
      barangay: canonicalBarangay(patient.barangay ?? ""),
      address: patient.address ?? "",
      civil_status: patient.civil_status ?? "",
      philhealth_no: patient.philhealth_no ?? "",
      height_cm: patient.height_cm ? String(patient.height_cm) : "",
      family_serial_number: patient.family_serial_number ?? "",
      family_no: patient.family_no ?? "",
      status: patient.status ?? "active",
    });
    setFieldErrors({});
  }, [editOpen, patient]);

  function updateField<K extends keyof typeof form>(key: K, raw: string) {
    const upperKeys: (keyof typeof form)[] = [
      "first_name",
      "middle_name",
      "last_name",
      "suffix_other",
      "barangay",
      "address",
      "civil_status",
      "philhealth_no",
      "family_serial_number",
      "family_no",
    ];
    const value = upperKeys.includes(key) ? toAllCaps(raw) : raw;

    setForm((prev) => ({
      ...prev,
      [key]: value,
      ...(key === "suffix" && value !== "OTHERS" ? { suffix_other: "" } : {}),
    }));

    setFieldErrors((prev) => {
      let msg: string | null = null;
      if (key === "first_name") msg = validatePersonName(value);
      if (key === "middle_name") msg = validatePersonName(value);
      if (key === "last_name") msg = validatePersonName(value);
      if (key === "family_no") msg = validateFamilyNo(value);
      if (key === "suffix_other" && form.suffix === "OTHERS") msg = validatePersonName(value);
      return { ...prev, [key]: msg };
    });
  }

  function validateEditForm() {
    const errors: Record<string, string | null> = {};

    errors.first_name = !form.first_name.trim()
      ? "First name is required."
      : validatePersonName(form.first_name);

    errors.middle_name = validatePersonName(form.middle_name);

    errors.last_name = !form.last_name.trim()
      ? "Last name is required."
      : validatePersonName(form.last_name);

    errors.suffix_other =
      String(form.suffix).toUpperCase() === "OTHERS"
        ? !form.suffix_other.trim()
          ? "Other suffix is required."
          : validatePersonName(form.suffix_other)
        : null;

    errors.family_no = validateFamilyNo(form.family_no);

    const today = new Date().toISOString().slice(0, 10);
    if (form.birthdate && dateOnly(form.birthdate) > today) {
      errors.birthdate = "Birthdate cannot be later than today.";
    } else {
      errors.birthdate = null;
    }

    setFieldErrors(errors);
    return Object.values(errors).every((v) => !v);
  }

  function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (!validateEditForm()) return;

    setSaving(true);

    const full_name = buildWizardStyleFullName(form);

    router.post(
      `/center/records/${patient.id}`,
      {
        full_name,
        birthdate: dateOnly(form.birthdate),
        sex: form.sex,
        phone: normalizePhone(form.phone),
        barangay: canonicalBarangay(form.barangay),
        address: form.address,
        civil_status: form.civil_status,
        philhealth_no: form.philhealth_no,
        height_cm: form.height_cm,
        family_serial_number: form.family_serial_number,
        family_no: form.family_no,
        status: form.status,
        _method: "PUT",
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          setSaving(false);
          setEditOpen(false);
          setShowToast(true);
        },
        onError: () => setSaving(false),
      }
    );
  }

  React.useEffect(() => {
    if (!showToast) return;
    const id = setTimeout(() => setShowToast(false), 2200);
    return () => clearTimeout(id);
  }, [showToast]);

  React.useEffect(() => {
    if (flash?.status) {
      setShowToast(true);
      const id = setTimeout(() => setShowToast(false), 2200);
      return () => clearTimeout(id);
    }
  }, [flash?.status]);

  const statusLabel = (() => {
    const s = (patient.status || "active").toLowerCase();
    if (s === "deceased") return "Deceased";
    if (s === "transferred") return "Transferred";
    if (s === "left_without_notice") return "Left without notice";
    return "Active";
  })();

  const hasClientErrors = Object.values(fieldErrors).some(Boolean);

  return (
    <div className="min-h-screen bg-[#f6fbfb]" style={{ ["--teal" as any]: TEAL, fontFamily: "'Poppins', ui-sans-serif, system-ui" }}>
      <Head title={`Prenatal — ${patient.full_name ?? ""}`} />

      <HeaderBar
        onBack={goBack}
        patient={patient}
        onOpenHistory={() => setHistoryOpen(true)}
        historyCount={historyCount}
      />

      <main className={ui.shell + " py-6"}>
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <h1 className="min-w-0 text-xl md:text-2xl font-semibold text-[#203D7A] tracking-tight flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md" style={{ backgroundColor: `${TEAL}1A` }}>
              <IconClipboard className="h-4 w-4" style={{ color: TEAL }} />
            </span>
            <span className="truncate">Prenatal</span>
          </h1>

          {canEditSafe ? (
            <div className="w-full lg:w-auto">
              <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:items-center">
                <ActionButton
                  icon={<IconHistory className="h-4 w-4" />}
                  label="Barangay history"
                  mobileLabel="History"
                  onClick={() => setHistoryOpen(true)}
                  className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  badge={
                    <span className="hidden sm:inline-flex min-w-[20px] justify-center rounded-full bg-slate-100 px-2 py-[2px] text-[11px] font-bold text-slate-700">
                      {historyCount}
                    </span>
                  }
                />

                <ActionButton
                  icon={<IconShuffle className="h-4 w-4" />}
                  label="Assign health worker"
                  mobileLabel="Assign"
                  onClick={() => setTransferOpen(true)}
                  className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                />

                <ActionButton
                  icon={<IconEdit className="h-4 w-4" />}
                  label="Edit info"
                  mobileLabel="Edit"
                  onClick={() => setEditOpen(true)}
                  className="border-teal-300 bg-[#0F8A99] text-white hover:opacity-95"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={requestOwnership}
                disabled={!!pendingOwnershipRequestId}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs md:text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0F8A99] disabled:opacity-60"
                title={pendingOwnershipRequestId ? "Ownership request already pending" : "Request to edit this patient"}
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-slate-700 text-xs">
                  ↔
                </span>
                <span>{pendingOwnershipRequestId ? "Request pending" : "Request ownership"}</span>
              </button>
            </div>
          )}
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[12px] font-medium tracking-wide text-slate-500 uppercase">
                  <IconUser className="h-4 w-4 text-[#0F8A99]" />
                  Patient
                </div>

                <h2 className="mt-1 text-xl sm:text-2xl font-bold text-slate-900 break-words">
                  {patient.full_name || "Unnamed patient"}
                </h2>

                <div className="mt-2 flex flex-wrap gap-2">
                  <HeaderChip icon={<IconCalendar className="h-3.5 w-3.5" />} text={fmtDate(patient.birthdate ?? null)} />
                  <HeaderChip icon={<IconUser className="h-3.5 w-3.5" />} text={toStr(patient.sex)} />
                  <HeaderChip icon={<IconMapPin className="h-3.5 w-3.5" />} text={toStr(patient.barangay)} />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPatientInfoOpen((prev) => !prev)}
                aria-expanded={patientInfoOpen}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 h-11 text-sm font-medium text-slate-700 hover:bg-slate-50 shrink-0 focus:outline-none focus:ring-2 focus:ring-[#0F8A99]"
              >
                {patientInfoOpen ? "Hide details" : "Show details"}
                <IconChevron className={["h-4 w-4 transition-transform", patientInfoOpen ? "rotate-180" : ""].join(" ")} />
              </button>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {patientInfoOpen && (
              <motion.div
                key="patient-info-body"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="border-t border-slate-200 px-4 sm:px-5 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
                    <div className="divide-y divide-slate-200">
                      <KV icon={<IconUser className="h-4 w-4" />} label="Full name" value={patient.full_name} />
                      <KV icon={<IconHome className="h-4 w-4" />} label="Address" value={headerAddress} />
                      <KV icon={<IconStatus className="h-4 w-4" />} label="Age" value={calcAgeYears(patient.birthdate)} />
                      <KV icon={<IconStatus className="h-4 w-4" />} label="Civil Status" value={patient.civil_status} />
                      <KV icon={<IconPhone className="h-4 w-4" />} label="Phone" value={toStr(patient.phone ?? patient.phone_number)} />
                    </div>
                    <div className="divide-y divide-slate-200">
                      <KV icon={<IconMapPin className="h-4 w-4" />} label="Barangay" value={patient.barangay} />
                      <KV icon={<IconCalendar className="h-4 w-4" />} label="Birthday" value={fmtDate(patient.birthdate ?? null)} />
                      <KV icon={<IconRuler className="h-4 w-4" />} label="Height (cm)" value={toStr(patient.height_cm)} />
                      <KV icon={<IconShield className="h-4 w-4" />} label="PhilHealth #" value={toStr(patient.philhealth_no)} />
                      <KV icon={<IconStatus className="h-4 w-4" />} label="Family No." value={toStr(patient.family_serial_number ?? patient.family_no)} />
                      <KV icon={<IconStatus className="h-4 w-4" />} label="Status" value={statusLabel} />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <div className="mb-4 mt-5 flex items-center justify-between gap-3 flex-nowrap">
          <div className="min-w-0 overflow-x-auto">
            <div className="inline-block whitespace-nowrap">
              <SegTabs
                items={[
                  { key: "itr", label: "ITR", icon: <IconClipboard className="h-4 w-4" /> },
                  { key: "hbm", label: "HBM", icon: <IconHeartPulse className="h-4 w-4" /> },
                ]}
                value={clientTab}
                onChange={gotoTab}
              />
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {clientTab === "itr" ? (
            <motion.div
              key="itr"
              id="visits"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              <Section title="ITR - Individual Treatment Record" icon={<IconClipboard className="h-5 w-5" />}>
                <ITRTab
                  key="itr-panel"
                  patientId={Number(patient.id)}
                  itr={itr}
                  plan={plan}
                  visits={visits}
                  token={token}
                  onDirtyChange={setItrDirty}
                />
              </Section>
            </motion.div>
          ) : (
            <motion.div
              key="hbm"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              <Section title="HBMR - Home Based Mothers Record" icon={<IconHeartPulse className="h-5 w-5" />}>
                <HBMTab
                  key={`hbm-${activeSub}`}
                  patient={patient}
                  baseUrl={prenatalBase}
                  sub={activeSub}
                  token={token}
                  history={hist}
                  current={current}
                  plan={plan}
                  visits={visits}
                  itr={itr}
                  itr_visits={itr_visits}
                  postnatal={postnatal}
                  after={after}
                />
              </Section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <ModalShell
        open={transferOpen}
        titleId="transfer-title"
        title="Assign health worker"
        subtitle="Moves the patient record to another health worker."
        onClose={() => setTransferOpen(false)}
      >
        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
            Tip: Use <span className="font-semibold">Barangay history</span> to confirm where the patient originally came from.
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">Assign to</label>
            <select
              value={newOwnerId}
              onChange={(e) => setNewOwnerId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm h-12 min-h-[48px] focus:outline-none focus:ring-2 focus:ring-[#0F8A99]"
            >
              <option value="">Select user…</option>
              {(transferTargets ?? []).map((u) => (
                <option key={u.id} value={String(u.id)}>
                  {u.name ?? `User #${u.id}`}
                  {u.barangay ? ` — ${u.barangay}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button
              type="button"
              onClick={() => setTransferOpen(false)}
              className={`w-full sm:w-auto ${modalButtonBase} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!newOwnerId}
              onClick={() => {
                router.post(
                  `${BASE_PREFIX}/${patient.id}/ownership-transfer`,
                  { new_owner_id: Number(newOwnerId), _token: csrf },
                  { preserveScroll: true }
                );
                setTransferOpen(false);
              }}
              className={`w-full sm:w-auto ${modalButtonBase} bg-[#0F8A99] text-white disabled:opacity-50`}
            >
              Assign
            </button>
          </div>
        </div>
      </ModalShell>

      <ModalShell
        open={historyOpen}
        titleId="history-title"
        title="Barangay transfer history"
        subtitle="Shows the barangays where this patient was previously transferred."
        onClose={() => setHistoryOpen(false)}
      >
        <TransferHistoryList rows={barangayTransferHistory} currentBarangay={patient.barangay ?? ""} />
        <div className="mt-4 flex flex-col sm:flex-row sm:justify-end gap-2">
          <button
            type="button"
            onClick={() => setHistoryOpen(false)}
            className={`w-full sm:w-auto ${modalButtonBase} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
          >
            Close
          </button>
        </div>
      </ModalShell>

      {editOpen && (
        <div
          className="fixed inset-0 z-[90]"
          style={{
            fontFamily:
              "'Poppins', ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
          }}
        >
          <div className="absolute inset-0 bg-black/50" onClick={() => !saving && setEditOpen(false)} />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-patient-title"
            className="absolute left-1/2 top-1/2 w-[98vw] sm:w-[96vw] max-w-5xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] sm:max-h-[90vh] overflow-hidden"
          >
            <div className="sticky top-0 z-10 bg-white rounded-t-2xl border-b border-slate-200">
              <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 id="edit-patient-title" className="text-lg sm:text-xl md:text-2xl font-semibold text-slate-800">
                    Edit patient information
                  </h2>
                  <p className="text-slate-600 text-sm md:text-[15px] mt-1">
                    Update the pregnancy patient details. Changes apply to this record.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => !saving && setEditOpen(false)}
                  className="inline-flex items-center justify-center rounded-xl h-12 min-h-[48px] w-12 border border-slate-300 bg-white shadow-sm hover:shadow-md active:translate-y-[1px] focus:outline-none focus:ring-2 focus:ring-[#0F8A99] shrink-0"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 pb-24">
              <form onSubmit={submitEdit} className="space-y-6">
                <section className={modalSection}>
                  <h3 className="text-sm font-semibold text-slate-900 mb-4">Patient identity</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">First name</label>
                      <input
                        type="text"
                        value={form.first_name}
                        onChange={(e) => updateField("first_name", e.target.value)}
                        className={`${mobileField} uppercase placeholder:uppercase ${
                          fieldErrors.first_name ? "border-red-500 focus:ring-red-500" : "border-slate-300 focus:ring-[#0F8A99]"
                        }`}
                        required
                      />
                      {fieldErrors.first_name && <p className="text-sm text-red-600 mt-1">{fieldErrors.first_name}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700">Middle name</label>
                      <input
                        type="text"
                        value={form.middle_name}
                        onChange={(e) => updateField("middle_name", e.target.value)}
                        className={`${mobileField} uppercase placeholder:uppercase ${
                          fieldErrors.middle_name ? "border-red-500 focus:ring-red-500" : "border-slate-300 focus:ring-[#0F8A99]"
                        }`}
                      />
                      {fieldErrors.middle_name && <p className="text-sm text-red-600 mt-1">{fieldErrors.middle_name}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700">Last name</label>
                      <input
                        type="text"
                        value={form.last_name}
                        onChange={(e) => updateField("last_name", e.target.value)}
                        className={`${mobileField} uppercase placeholder:uppercase ${
                          fieldErrors.last_name ? "border-red-500 focus:ring-red-500" : "border-slate-300 focus:ring-[#0F8A99]"
                        }`}
                        required
                      />
                      {fieldErrors.last_name && <p className="text-sm text-red-600 mt-1">{fieldErrors.last_name}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700">Suffix</label>
                      <select
                        value={form.suffix}
                        onChange={(e) => updateField("suffix", e.target.value)}
                        className={`${mobileField} border-slate-300 bg-white focus:ring-[#0F8A99]`}
                      >
                        {NAME_SUFFIX_OPTIONS.map((opt) => (
                          <option key={opt || "__blank"} value={opt}>
                            {opt || "—"}
                          </option>
                        ))}
                      </select>
                    </div>

                    {String(form.suffix).toUpperCase() === "OTHERS" && (
                      <div className="sm:col-span-2 lg:col-span-4">
                        <label className="block text-sm font-medium text-slate-700">Other suffix</label>
                        <input
                          type="text"
                          value={form.suffix_other}
                          onChange={(e) => updateField("suffix_other", e.target.value)}
                          className={`${mobileField} uppercase placeholder:uppercase ${
                            fieldErrors.suffix_other ? "border-red-500 focus:ring-red-500" : "border-slate-300 focus:ring-[#0F8A99]"
                          }`}
                        />
                        {fieldErrors.suffix_other && <p className="text-sm text-red-600 mt-1">{fieldErrors.suffix_other}</p>}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <DateFieldWithToday
                      label="Date of Birth"
                      value={form.birthdate}
                      onChange={(v) => updateField("birthdate", v)}
                      error={fieldErrors.birthdate ?? undefined}
                    />
                    <SexToggleField value={form.sex ?? ""} onChange={(v) => updateField("sex", v)} />
                  </div>
                </section>

                <section className={modalSection}>
                  <h3 className="text-sm font-semibold text-slate-900 mb-4">Contact and location</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <PhoneField label="Contact Number" value={form.phone} onChange={(v) => updateField("phone", v)} />
                    <BarangayField value={form.barangay} options={SILANG_BARANGAYS} onChange={(v) => updateField("barangay", v)} />

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-slate-700">Address</label>
                      <textarea
                        value={form.address}
                        onChange={(e) => updateField("address", e.target.value)}
                        className="mt-1 w-full rounded-xl min-h-[96px] border border-slate-300 px-3 py-3 text-[15px] uppercase placeholder:uppercase focus:outline-none focus:ring-2 focus:ring-[#0F8A99] resize-y"
                        placeholder="HOUSE / STREET, CITY, PROVINCE"
                      />
                    </div>
                  </div>
                </section>

                <section className={modalSection}>
                  <h3 className="text-sm font-semibold text-slate-900 mb-4">Additional details</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">PhilHealth Number</label>
                      <input
                        type="text"
                        value={form.philhealth_no}
                        onChange={(e) => updateField("philhealth_no", e.target.value)}
                        className={`${mobileField} uppercase placeholder:uppercase tracking-[0.08em] border-slate-300 focus:ring-[#0F8A99]`}
                        placeholder="XX-XXXXXXXXX-X"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700">Height (CM)</label>
                      <input
                        type="number"
                        value={form.height_cm}
                        onChange={(e) => updateField("height_cm", e.target.value)}
                        className={`${mobileField} border-slate-300 focus:ring-[#0F8A99]`}
                        placeholder="152"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700">Civil Status</label>
                      <input
                        type="text"
                        value={form.civil_status}
                        onChange={(e) => updateField("civil_status", e.target.value)}
                        className={`${mobileField} uppercase placeholder:uppercase border-slate-300 focus:ring-[#0F8A99]`}
                        placeholder="SINGLE / MARRIED / ..."
                      />
                    </div>


                    <div>
                      <label className="block text-sm font-medium text-slate-700">Family No.</label>
                      <input
                        type="text"
                        value={form.family_no}
                        onChange={(e) => updateField("family_no", e.target.value.replace(/\D/g, ""))}
                        className={`${mobileField} ${
                          fieldErrors.family_no ? "border-red-500 focus:ring-red-500" : "border-slate-300 focus:ring-[#0F8A99]"
                        }`}
                      />
                      {fieldErrors.family_no && <p className="text-sm text-red-600 mt-1">{fieldErrors.family_no}</p>}
                    </div>
                  </div>
                </section>

                <section className={modalSection}>
                  <h3 className="text-sm font-semibold text-slate-900 mb-4">Record status</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Status</label>
                      <select
                        value={form.status}
                        onChange={(e) => updateField("status", e.target.value)}
                        className={`${mobileField} border-slate-300 bg-white text-[13px] font-semibold tracking-wide focus:ring-[#0F8A99]`}
                      >
                        <option value="active">ACTIVE</option>
                        <option value="left_without_notice">LEFT WITHOUT NOTICE</option>
                        <option value="deceased">DECEASED</option>
                      </select>
                    </div>
                  </div>
                </section>

                <div className="pt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => !saving && setEditOpen(false)}
                    className={`w-full sm:w-auto ${modalButtonBase} border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || hasClientErrors}
                    className={`w-full sm:w-auto ${modalButtonBase} border border-teal-300 bg-[#0F8A99] text-white shadow-sm hover:opacity-95 disabled:opacity-60`}
                  >
                    {saving ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ duration: 0.18 }}
            className="pointer-events-none fixed inset-0 z-[96] flex items-center justify-center"
          >
            <div className="pointer-events-auto rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-lg flex items-center gap-2 text-sm text-emerald-900">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/70 border border-emerald-200">
                <IconCheckCircle className="h-4 w-4" />
              </span>
              <span className="font-medium">Patient information updated.</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <BackToTopButton />
    </div>
  );
}