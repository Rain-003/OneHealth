import * as React from "react";
import { usePage, router } from "@inertiajs/react";
import type { HBMTabProps } from "./HBMTab";
import { useConfirm } from "../confirm-kit";

/* ---------------------------------------------------------------------------
   HBM — Current Pregnancy (explicit save; no server autosave)
   Changes:
   - Auto-computed next visit date
   - Laboratory results changed to repeatable structured rows
   - Labor and delivery removed from HBM Current
   - ITR-backed fields can auto-fill and become read-only in HBM
--------------------------------------------------------------------------- */

const CURRENT_URL = (id: number | string) =>
  `/center/patients/${id}/prenatal/current-grid`;

const TEAL = "#0F8A99";

/* --------------------------- POST helpers ------------------- */
function csrfToken(): string {
  const el = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null;
  // @ts-ignore
  const fromWindow = (window?.Laravel?.csrfToken as string) || "";
  const fromCookie = (() => {
    const m = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : "";
  })();
  return (el?.content || fromWindow || fromCookie || "").toString();
}

function appendForm(fd: FormData, prefix: string, value: any) {
  const enc = (v: any) => (v === true ? "1" : v === false ? "0" : v ?? "");
  if (Array.isArray(value)) {
    value.forEach((v, i) => appendForm(fd, `${prefix}[${i}]`, v));
  } else if (value && typeof value === "object") {
    Object.entries(value).forEach(([k, v]) => appendForm(fd, `${prefix}[${k}]`, v));
  } else {
    fd.append(prefix, enc(value));
  }
}

async function postForm(url: string, payload: { current: any; token?: string | null }) {
  const fd = new FormData();
  appendForm(fd, "current", payload.current);
  if (payload.token) fd.append("token", payload.token);

  const csrf = csrfToken();

  const res = await fetch(url, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "X-CSRF-TOKEN": csrf,
      "X-XSRF-TOKEN": csrf,
      "X-Requested-With": "XMLHttpRequest",
      Accept: "application/json",
    },
    body: fd,
  });

  if (!res.ok) {
    if (res.status === 419) {
      throw new Error("CSRF token mismatch (or session expired). Please reload this page and try again.");
    }
    let msg = `Save failed (${res.status})`;
    try {
      if (res.status === 422) {
        const j = await res.json();
        const first = j?.errors
          ? String((Object.values(j.errors).flat() as any[])[0] ?? "Validation failed")
          : j?.message || msg;
        throw new Error(first);
      }
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const j = await res.json().catch(() => ({}));
        if (j?.message) msg = j.message;
      } else {
        const t = await res.text().catch(() => "");
        if ((res.redirected && /\/login/i.test(res.url)) || /<form[^>]+login/i.test(t)) {
          msg = "Not authenticated (session expired). Please sign in again.";
        }
      }
    } catch {}
    throw new Error(msg);
  }

  const ct = res.headers.get("content-type") || "";
  if (!ct || (!ct.includes("json") && !ct.includes("octet-stream") && res.status !== 204)) {
    const t = await res.text().catch(() => "");
    if ((res.redirected && /\/login/i.test(res.url)) || /<form[^>]+login/i.test(t)) {
      throw new Error("Not authenticated (session expired). Please sign in again.");
    }
    if (res.status !== 204) throw new Error("Unexpected response from server.");
  }
}

/* ---------------------------------- Types ---------------------------------- */
type LabResultItem = {
  id: string;
  test: string | null;
  date: string | null;
  remarks: string | null;
};

type ItrOwnedFieldMap = Partial<Record<
  | "visit_date"
  | "gestational_weeks"
  | "bp"
  | "weight_kg"
  | "fundal_height_cm"
  | "next_visit_date",
  boolean
>>;

type MonthRow = {
  month_index: number;
  column_index?: number;
  id?: string | number;
  visit_date?: string | null;
  gestational_weeks?: string | null;
  bp?: string | null;
  weight_kg?: number | null;
  fundal_height_cm?: number | null;
  urine_infection?: boolean | null;
  vaginal_bleeding?: boolean | null;
  fever_38_or_more?: boolean | null;
  pallor_anemia?: boolean | null;
  abnormal_abdominal_size?: boolean | null;
  abnormal_presentation?: boolean | null;
  absent_fetal_heartbeat?: boolean | null;
  edema?: boolean | null;
  vaginal_infection?: boolean | null;
  laboratory_results?: string | null;
  iron_folate_rx?: string | null;
  iodine_risk_area?: boolean | null;
  malaria_prophylaxis?: boolean | null;
  plan_breastfeed?: boolean | null;
  counseled_danger_signs?: boolean | null;
  dental_check?: boolean | null;
  birth_plan_prepared?: boolean | null;
  danger_present?: boolean | null;
  next_visit_date?: string | null;
  _from_itr?: ItrOwnedFieldMap;
};

type BoolFieldKey = keyof Pick<
  MonthRow,
  | "urine_infection"
  | "vaginal_bleeding"
  | "fever_38_or_more"
  | "pallor_anemia"
  | "abnormal_abdominal_size"
  | "abnormal_presentation"
  | "absent_fetal_heartbeat"
  | "edema"
  | "vaginal_infection"
>;

type ItrVisitLike = {
  month_index?: number | string | null;
  column_index?: number | string | null;
  visit_date?: string | null;
  gestational_weeks?: string | number | null;
  aog?: string | number | null;
  aog_weeks?: string | number | null;
  bp?: string | null;
  weight_kg?: number | string | null;
  wt?: number | string | null;
  fundal_height_cm?: number | string | null;
  fh?: number | string | null;
  next_visit_date?: string | null;
};

type PageProps = {
  canEdit?: boolean;
  itr?: {
    lmp?: string | null;
    lmp_date?: string | null;
    edc?: string | null;
    edc_date?: string | null;
    edd?: string | null;
    edd_date?: string | null;
    gravida?: string | number | null;
    ob_g?: string | number | null;
  } | null;
  itr_visits?: ItrVisitLike[] | null;
  current?: {
    lmp_date?: string | null;
    edd_date?: string | null;
    pregnancy_number?: string | number | null;
  } | null;
};

/* ------------------------------ Draft + Normalizers ------------------------- */
const DRAFT_KEY = (pid: number | string) => `hbm_current:${pid}`;

const LAB_TEST_OPTIONS = [
  "URINALYSIS",
  "CBC",
  "HGB",
  "URINE",
  "VDRL",
  "HIV",
  "HEPA - B",
  "OGTT (hospital)",
];

function makeLabRow(seed?: Partial<LabResultItem>): LabResultItem {
  return {
    id: seed?.id || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    test: seed?.test ?? null,
    date: seed?.date ?? null,
    remarks: seed?.remarks ?? null,
  };
}

function parseLabResults(value: any): LabResultItem[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((x) => ({
      id: x?.id || makeLabRow().id,
      test: x?.test ?? null,
      date: x?.date ?? null,
      remarks: x?.remarks ?? null,
    }));
  }
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return [];
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) {
        return parsed.map((x) => ({
          id: x?.id || makeLabRow().id,
          test: x?.test ?? null,
          date: x?.date ?? null,
          remarks: x?.remarks ?? null,
        }));
      }
    } catch {}
    return [makeLabRow({ test: null, date: null, remarks: s })];
  }
  return [];
}

function stringifyLabResults(items: LabResultItem[]): string {
  return JSON.stringify(
    (items || []).map((x) => ({
      id: x.id,
      test: x.test || null,
      date: x.date || null,
      remarks: x.remarks || null,
    }))
  );
}

function stringifyLabResultsForSave(items: LabResultItem[]): string {
  return JSON.stringify(
    (items || [])
      .map((x) => ({
        id: x.id,
        test: x.test || null,
        date: x.date || null,
        remarks: x.remarks || null,
      }))
      .filter((x) => x.test || x.date || x.remarks)
  );
}

const normBool = (v: any): boolean | null => {
  if (v === true || v === 1 || v === "1" || v === "true" || v === "yes" || v === "oo") return true;
  if (v === false || v === 0 || v === "0" || v === "false" || v === "no" || v === "hindi") return false;
  return v == null || v === "" ? null : null;
};

function normalizeVisitsBooleans<T extends { visits?: any[] }>(src: T): T {
  if (!src || !Array.isArray(src.visits)) return src;
  const keys: (keyof MonthRow)[] = [
    "urine_infection",
    "vaginal_bleeding",
    "fever_38_or_more",
    "pallor_anemia",
    "abnormal_abdominal_size",
    "abnormal_presentation",
    "absent_fetal_heartbeat",
    "edema",
    "vaginal_infection",
    "iodine_risk_area",
    "malaria_prophylaxis",
    "plan_breastfeed",
    "counseled_danger_signs",
    "dental_check",
    "birth_plan_prepared",
    "danger_present",
  ];
  const visits = src.visits.map((r) => {
    const row = { ...(r || {}) };
    keys.forEach((k) => {
      if (k in row) (row as any)[k] = normBool((row as any)[k]);
    });
    return row;
  });
  return { ...src, visits };
}

function hydrateFromDraft(patientId: number | string, server: any) {
  try {
    const raw = localStorage.getItem(DRAFT_KEY(patientId));
    const draft = raw ? JSON.parse(raw) : {};
    const merged = {
      ...server,
      ...draft,
    };
    return normalizeVisitsBooleans(merged);
  } catch {
    return normalizeVisitsBooleans(server || {});
  }
}

function writeDraft(patientId: number | string, partial: any) {
  try {
    const raw = localStorage.getItem(DRAFT_KEY(patientId));
    const curr = raw ? JSON.parse(raw) : {};
    const next = {
      ...curr,
      ...partial,
    };
    localStorage.setItem(DRAFT_KEY(patientId), JSON.stringify(next));
  } catch {}
}

function clearDraft(patientId: number | string) {
  try {
    localStorage.removeItem(DRAFT_KEY(patientId));
  } catch {}
}

/* ------------------------------- UI Tokens --------------------------------- */
const inputBase =
  "w-full rounded-md border bg-white outline-none focus:ring-2 focus:ring-oh-teal/20 focus:border-oh-teal";
const inputMobileText = "text-[16px] sm:text-[14px]";
const inputH = "h-11 sm:h-10 px-3";
const labelXs = "block text-[12px] sm:text-[11px] text-slate-600";
const titleSection =
  "text-[15px] sm:text-[16px] font-semibold text-[#203D7A] tracking-tight uppercase";
const help = "text-[12px] text-slate-500";
const sectionPad = "p-3 sm:p-4";
const invalidInputClass =
  "border-rose-500 ring-2 ring-rose-300 focus:ring-rose-400 focus:border-rose-500";

/* ------------------------------ Tiny SVG icons ------------------------------ */
const IconSave = (p: any) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...p} fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
    <path d="M17 21v-8H7v8M7 3v5h8" />
  </svg>
);
const IconCalendar = (p: any) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...p} fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);
const IconLock = (p: any) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...p} fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="4" y="11" width="16" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);
const IconUnlock = (p: any) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...p} fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M15 11V8a3 3 0 0 0-6 0" />
    <rect x="4" y="11" width="16" height="9" rx="2" />
  </svg>
);
const IconPlus = (p: any) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...p} fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 5v14M5 12h14" />
  </svg>
);
const IconTrash = (p: any) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...p} fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <path d="M19 6l-1 14H6L5 6" />
  </svg>
);
const IconLink = (p: any) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...p} fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07L10 5" />
    <path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 0 0 7.07 7.07L14 19" />
  </svg>
);

/* ------------------------------ Date helpers ------------------------------- */
function todayYMD(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function toYMD(v?: string | null) {
  if (!v) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function addDaysYMD(dateYmd: string, days: number): string | null {
  if (!dateYmd) return null;
  const d = new Date(`${dateYmd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + days);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function isFutureDate(v?: string | null): boolean {
  if (!v) return false;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date(todayYMD());
  return d.getTime() > today.getTime();
}

function computeNextVisitDate(visitDate?: string | null, gestationalWeeks?: string | null): string | null {
  const vd = toYMD(visitDate);
  if (!vd) return null;

  const ga = Number(String(gestationalWeeks ?? "").trim());
  if (!Number.isFinite(ga) || ga <= 0) return null;

  if (ga < 28) return addDaysYMD(vd, 28);
  if (ga < 36) return addDaysYMD(vd, 14);
  return addDaysYMD(vd, 7);
}

/* --------------------- top-field autofill helpers -------------------------- */
function firstNonEmpty(...values: any[]): string | null {
  for (const v of values) {
    if (v === null || v === undefined) continue;
    const s = String(v).trim();
    if (s !== "") return s;
  }
  return null;
}

function normalizePregnancyNumber(value: any): string {
  if (value === null || value === undefined) return "";
  const s = String(value).trim();
  if (!s) return "";
  const digits = s.replace(/[^\d]/g, "");
  return digits || s;
}

function buildTopSeed(
  seed: any,
  fallbacks: { lmp_date?: string | null; edd_date?: string | null; pregnancy_number?: string | number | null }
) {
  return {
    lmp_date: firstNonEmpty(seed?.lmp_date, fallbacks.lmp_date),
    edd_date: firstNonEmpty(seed?.edd_date, fallbacks.edd_date),
    pregnancy_number: normalizePregnancyNumber(
      firstNonEmpty(seed?.pregnancy_number, fallbacks.pregnancy_number)
    ),
  };
}

function numOrNull(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toGestationalWeeks(raw: any): string | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return String(raw);
  return String(Math.round(n));
}

function normalizeItrVisit(v: ItrVisitLike): Partial<MonthRow> {
  const gw = firstNonEmpty(v?.gestational_weeks, v?.aog_weeks, v?.aog);
  const weight = firstNonEmpty(v?.weight_kg, v?.wt);
  const fundal = firstNonEmpty(v?.fundal_height_cm, v?.fh);

  return {
    visit_date: toYMD(v?.visit_date || null) || null,
    gestational_weeks: toGestationalWeeks(gw),
    bp: v?.bp ?? null,
    weight_kg: numOrNull(weight),
    fundal_height_cm: numOrNull(fundal),
    next_visit_date:
      toYMD(v?.next_visit_date || null) ||
      computeNextVisitDate(toYMD(v?.visit_date || null), toGestationalWeeks(gw)),
    _from_itr: {
      visit_date: !!v?.visit_date,
      gestational_weeks: gw !== null && gw !== undefined && gw !== "",
      bp: !!(v?.bp ?? ""),
      weight_kg: weight !== null && weight !== undefined && weight !== "",
      fundal_height_cm: fundal !== null && fundal !== undefined && fundal !== "",
      next_visit_date: true,
    },
  };
}

function mergeItrIntoRows(rows: MonthRow[], itrVisits?: ItrVisitLike[] | null): MonthRow[] {
  if (!Array.isArray(itrVisits) || itrVisits.length === 0) return rows;

  const map = new Map<number, Partial<MonthRow>>();
  for (const visit of itrVisits) {
    const month = Number(visit?.month_index ?? visit?.column_index);
    if (!Number.isFinite(month) || month < 1 || month > 9) continue;
    map.set(month, normalizeItrVisit(visit));
  }

  return rows.map((row) => {
    const incoming = map.get(Number(row.month_index));
    if (!incoming) {
      return {
        ...row,
        next_visit_date: row.next_visit_date || computeNextVisitDate(row.visit_date, row.gestational_weeks),
      };
    }

    return {
      ...row,
      visit_date: incoming.visit_date ?? row.visit_date ?? null,
      gestational_weeks: incoming.gestational_weeks ?? row.gestational_weeks ?? null,
      bp: incoming.bp ?? row.bp ?? null,
      weight_kg: incoming.weight_kg ?? row.weight_kg ?? null,
      fundal_height_cm: incoming.fundal_height_cm ?? row.fundal_height_cm ?? null,
      next_visit_date:
        incoming.next_visit_date ??
        row.next_visit_date ??
        computeNextVisitDate(incoming.visit_date ?? row.visit_date, incoming.gestational_weeks ?? row.gestational_weeks),
      _from_itr: {
        ...(row._from_itr || {}),
        ...(incoming._from_itr || {}),
      },
    };
  });
}

function isItrOwned(row: MonthRow, field: keyof ItrOwnedFieldMap): boolean {
  return !!row?._from_itr?.[field];
}

function lockableInputClass(locked: boolean, itrOwned: boolean) {
  if (locked || itrOwned) return "bg-slate-100 cursor-not-allowed";
  return "";
}

/* ----------------------- BP + danger helper functions ---------------------- */
function parseBP(bp?: string | null): { sys: number; dia: number } | null {
  if (!bp) return null;
  const m = bp.trim().match(/^(\d{1,3})\s*\/\s*(\d{1,3})$/);
  if (!m) return null;
  const sys = Number(m[1]);
  const dia = Number(m[2]);
  if (!Number.isFinite(sys) || !Number.isFinite(dia)) return null;
  return { sys, dia };
}

function isBPInvalid(bp?: string | null): boolean {
  if (!bp) return false;
  const parsed = parseBP(bp);
  if (!parsed) return true;
  if (parsed.sys > 255 || parsed.dia > 255) return true;
  return false;
}

function isHighBP(bp?: string | null): boolean {
  const parsed = parseBP(bp);
  if (!parsed) return false;
  return parsed.sys >= 140 || parsed.dia >= 90;
}

function isFundalAbnormal(month: number, fundal?: number | null): boolean {
  if (fundal == null || Number.isNaN(fundal)) return false;
  const ranges: Record<number, { min: number; max: number }> = {
    5: { min: 20, max: 20 },
    6: { min: 21, max: 24 },
    7: { min: 25, max: 28 },
    8: { min: 28, max: 30 },
    9: { min: 30, max: 34 },
  };
  const r = ranges[month];
  if (!r) return false;
  return fundal < r.min || fundal > r.max;
}

function fundalExpectedRangeText(month: number): string | null {
  switch (month) {
    case 5:
      return "Expected fundal height: 20 cm";
    case 6:
      return "Expected fundal height: 21–24 cm";
    case 7:
      return "Expected fundal height: 25–28 cm";
    case 8:
      return "Expected fundal height: 28–30 cm";
    case 9:
      return "Expected fundal height: 30–34 cm";
    default:
      return null;
  }
}

/* ----------- Yes/No segmented control -------------- */
function SegYN({
  value,
  onChange,
  labels,
  danger,
  disabled,
}: {
  value: boolean | null | undefined;
  onChange: (v: boolean) => void;
  labels?: { no?: string; yes?: string };
  danger?: boolean;
  disabled?: boolean;
}) {
  const Lno = labels?.no ?? "No";
  const Lyes = labels?.yes ?? "Yes";

  const base =
    "px-3 h-9 sm:h-8 inline-flex items-center justify-center text-[14px] sm:text-[12px] border rounded-md transition focus:outline-none focus-visible:ring-2";
  const idle =
    "bg-white text-slate-900 border-slate-300 hover:bg-slate-50 focus-visible:ring-slate-300";
  const activeSafe =
    "bg-[var(--oh-teal,_#0F8A99)] text-white border-[var(--oh-teal,_#0F8A99)] focus-visible:ring-[var(--oh-teal,_#0F8A99)]/40";
  const activeDanger =
    "bg-rose-600 text-white border-rose-600 focus-visible:ring-rose-500/50";

  const yesActiveClass = danger ? activeDanger : activeSafe;
  const disabledClass = disabled ? "opacity-60 cursor-not-allowed pointer-events-none" : "";

  return (
    <div className={`inline-flex gap-1 ${disabledClass}`} role="group" aria-label="Yes/No">
      <button
        type="button"
        className={`${base} ${value === false ? activeSafe : idle}`}
        onClick={() => !disabled && onChange(false)}
        aria-pressed={value === false}
      >
        {Lno}
      </button>
      <button
        type="button"
        className={`${base} ${value === true ? yesActiveClass : idle}`}
        onClick={() => !disabled && onChange(true)}
        aria-pressed={value === true}
      >
        {Lyes}
      </button>
    </div>
  );
}

/* ------------------------------ Row utilities ------------------------------ */
function normalizeRows(src: any): MonthRow[] {
  const seeded = normalizeVisitsBooleans(src);
  const arr: any[] = Array.isArray(seeded)
    ? seeded
    : Array.isArray(seeded?.visits)
    ? seeded.visits
    : [];
  const byMonth = new Map<number, MonthRow>();
  for (const r of arr) {
    if (!r) continue;
    const m = Number(r.month_index ?? r.column_index);
    if (!Number.isFinite(m)) continue;
    byMonth.set(m, {
      ...r,
      month_index: m,
      column_index: m,
      laboratory_results: stringifyLabResults(parseLabResults(r?.laboratory_results)),
      _from_itr: { ...(r?._from_itr || {}) },
    });
  }
  const out: MonthRow[] = [];
  for (let m = 1; m <= 9; m++) {
    out.push(
      byMonth.get(m) ?? {
        month_index: m,
        column_index: m,
        visit_date: null,
        gestational_weeks: null,
        bp: null,
        weight_kg: null,
        fundal_height_cm: null,
        urine_infection: null,
        vaginal_bleeding: null,
        fever_38_or_more: null,
        pallor_anemia: null,
        abnormal_abdominal_size: null,
        abnormal_presentation: null,
        absent_fetal_heartbeat: null,
        edema: null,
        vaginal_infection: null,
        laboratory_results: "[]",
        iron_folate_rx: "",
        iodine_risk_area: null,
        malaria_prophylaxis: null,
        plan_breastfeed: null,
        counseled_danger_signs: null,
        dental_check: null,
        birth_plan_prepared: null,
        danger_present: null,
        next_visit_date: null,
        _from_itr: {},
      }
    );
  }
  return out;
}

/* ───────── Centered result popup ───────── */
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
  React.useEffect(() => {
    if (!open) return;
    const id = setTimeout(onClose, autoHideMs);
    return () => clearTimeout(id);
  }, [open, autoHideMs, onClose]);

  const iconClass = kind === "success" ? "text-emerald-600" : "text-rose-600";
  const ringClass = kind === "success" ? "ring-emerald-200" : "ring-rose-200";

  return (
    <div
      aria-hidden={open ? "false" : "true"}
      className={[
        "fixed inset-0 z-[200]",
        open ? "pointer-events-auto" : "pointer-events-none",
      ].join(" ")}
    >
      <div
        className={[
          "absolute inset-0 bg-black/40 transition-opacity",
          open ? "opacity-100" : "opacity-0",
        ].join(" ")}
      />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="hbm-current-result-title"
          className={[
            "w-full max-w-lg rounded-2xl bg-white shadow-xl ring-1 ring-black/10 outline-none",
            "transition-all duration-200",
            open ? "scale-100 opacity-100" : "scale-95 opacity-0",
          ].join(" ")}
        >
          <div className={["p-4 sm:p-5 rounded-2xl ring-1", ringClass].join(" ")}>
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
                <h2 id="hbm-current-result-title" className="text-base font-semibold text-slate-900">
                  {title}
                </h2>
                {message ? <p className="mt-1 text-sm text-slate-600">{message}</p> : null}
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

/* -------------------------------- Component -------------------------------- */
export default function HBMCurrent({ patient, current, token }: HBMTabProps) {
  const { props } = usePage<PageProps>();
  const { canEdit = false } = props;
  const confirm = useConfirm();

  const fallbackTop = React.useMemo(
    () => ({
      lmp_date: firstNonEmpty(props?.current?.lmp_date, props?.itr?.lmp, props?.itr?.lmp_date),
      edd_date: firstNonEmpty(
        props?.current?.edd_date,
        props?.itr?.edc,
        props?.itr?.edc_date,
        props?.itr?.edd,
        props?.itr?.edd_date
      ),
      pregnancy_number: firstNonEmpty(
        props?.current?.pregnancy_number,
        props?.itr?.gravida,
        props?.itr?.ob_g
      ),
    }),
    [
      props?.current?.lmp_date,
      props?.current?.edd_date,
      props?.current?.pregnancy_number,
      props?.itr?.lmp,
      props?.itr?.lmp_date,
      props?.itr?.edc,
      props?.itr?.edc_date,
      props?.itr?.edd,
      props?.itr?.edd_date,
      props?.itr?.gravida,
      props?.itr?.ob_g,
    ]
  );

  const initial = React.useMemo(() => hydrateFromDraft(patient.id, current), [patient.id, current]);

  const [locked, setLocked] = React.useState<boolean>(true);
  const toggleLock = () => setLocked((v) => !v);
  const [dirty, setDirty] = React.useState(false);

  const [top, setTop] = React.useState(() => buildTopSeed(initial, fallbackTop));
  const [rows, setRows] = React.useState<MonthRow[]>(() => {
    const base = normalizeRows(initial);
    const merged = mergeItrIntoRows(base, props?.itr_visits);
    return merged.map((r) => ({
      ...r,
      next_visit_date:
        r.next_visit_date || computeNextVisitDate(r.visit_date, r.gestational_weeks),
    }));
  });

  const [activeMonth, setActiveMonth] = React.useState<number>(1);
  const [firstTriMode, setFirstTriMode] = React.useState<boolean>(true);

  const [saving, setSaving] = React.useState<"idle" | "saving" | "saved" | "failed" | "draft">("idle");
  const isSaving = saving === "saving";
  const statusRef = React.useRef<HTMLSpanElement>(null);
  const errorRef = React.useRef<HTMLDivElement>(null);

  const setStatus = (t: string) => {
    if (statusRef.current) statusRef.current.textContent = t;
  };
  const setError = (t: string | null) => {
    if (!errorRef.current) return;
    errorRef.current.textContent = t || "";
    errorRef.current.style.display = t ? "block" : "none";
  };

  const [resultOpen, setResultOpen] = React.useState(false);
  const [resultKind, setResultKind] = React.useState<ResultKind>("success");
  const [resultTitle, setResultTitle] = React.useState("");
  const [resultMsg, setResultMsg] = React.useState<string | undefined>();

  React.useEffect(() => {
    const seed = hydrateFromDraft(patient.id, current);
    setTop(buildTopSeed(seed, fallbackTop));
    const base = normalizeRows(seed);
    const merged = mergeItrIntoRows(base, props?.itr_visits);
    setRows(
      merged.map((r) => ({
        ...r,
        next_visit_date:
          r.next_visit_date || computeNextVisitDate(r.visit_date, r.gestational_weeks),
      }))
    );
    setActiveMonth(1);
    setFirstTriMode(true);
    setSaving("idle");
    setError(null);
    setStatus("");
    setDirty(false);
  }, [patient.id, current, fallbackTop, props?.itr_visits]);

  React.useEffect(() => {
    setTop((prev) => {
      if (dirty) return prev;
      const next = {
        lmp_date: prev.lmp_date || fallbackTop.lmp_date || null,
        edd_date: prev.edd_date || fallbackTop.edd_date || null,
        pregnancy_number:
          normalizePregnancyNumber(prev.pregnancy_number) ||
          normalizePregnancyNumber(fallbackTop.pregnancy_number) ||
          "",
      };
      const changed =
        next.lmp_date !== prev.lmp_date ||
        next.edd_date !== prev.edd_date ||
        String(next.pregnancy_number ?? "") !== String(prev.pregnancy_number ?? "");
      return changed ? next : prev;
    });
  }, [fallbackTop, dirty]);

  React.useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);

    const unbind = router.on("before", (evt: any) => {
      if (!dirty) return;
      const ok = window.confirm("You have unsaved changes. Leave this page?");
      if (!ok) evt.preventDefault();
    });

    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      try {
        unbind?.();
      } catch {}
    };
  }, [dirty]);

  const draftTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const markDraft = React.useCallback(() => {
    setDirty(true);
    setSaving("draft");
    setStatus("Draft ✓");
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      if ((statusRef.current?.textContent || "") === "Draft ✓") setStatus("");
    }, 900);
  }, []);

  const saveTopLocal = React.useCallback(
    (field: keyof typeof top, value: any) => {
      if (locked) return;
      setTop((t) => ({ ...t, [field]: value }));
      writeDraft(patient.id, { [field]: value });
      markDraft();
    },
    [patient.id, markDraft, locked]
  );

  const updateMonthLocal = (month: number, field: keyof MonthRow, value: any) => {
    if (locked) return;
    const idx = Math.max(0, Math.min(8, month - 1));

    setRows((prev) => {
      const next = prev.slice();

      const apply = (i: number) => {
        if (!next[i]) return;
        if (isItrOwned(next[i], field as keyof ItrOwnedFieldMap)) return;

        const curr = { ...next[i], [field]: value };
        curr.next_visit_date = isItrOwned(curr, "next_visit_date")
          ? curr.next_visit_date || computeNextVisitDate(curr.visit_date, curr.gestational_weeks)
          : computeNextVisitDate(curr.visit_date, curr.gestational_weeks);
        next[i] = curr;
      };

      if (firstTriMode) {
        apply(0);
        if (next[1]) apply(1);
        if (next[2]) apply(2);
      } else {
        apply(idx);
      }

      writeDraft(patient.id, { visits: next });
      markDraft();
      return next;
    });
  };

  const updateLabResultsLocal = (month: number, items: LabResultItem[]) => {
    updateMonthLocal(month, "laboratory_results", stringifyLabResults(items));
  };

  const doSaveAll = React.useCallback(async () => {
    try {
      setSaving("saving");
      setStatus("Saving…");
      setError(null);

      const visitsToSend = rows
        .filter((r) => !!r.visit_date || !!r.laboratory_results || !!r.iron_folate_rx)
        .map((r) => ({
          ...r,
          month_index: r.month_index,
          column_index: r.column_index ?? r.month_index,
          next_visit_date:
            r.next_visit_date || computeNextVisitDate(r.visit_date, r.gestational_weeks),
          laboratory_results: stringifyLabResultsForSave(parseLabResults(r.laboratory_results)),
        }));

      const full = {
        lmp_date: top.lmp_date,
        edd_date: top.edd_date,
        pregnancy_number: top.pregnancy_number,
        visits: visitsToSend,
      };

      await postForm(CURRENT_URL(patient.id), token ? { current: full, token } : { current: full });

      clearDraft(patient.id);
      setSaving("saved");
      setStatus("Saved ✓");
      setDirty(false);
      setTimeout(() => {
        setSaving("idle");
        setStatus("");
      }, 900);

      setResultKind("success");
      setResultTitle("Saved successfully");
      setResultMsg("Current pregnancy record has been updated.");
      setResultOpen(true);
    } catch (e: any) {
      setSaving("failed");
      setStatus("");
      setError(e?.message || "Save failed");
      setTimeout(() => setError(null), 1800);

      setResultKind("error");
      setResultTitle("Save failed");
      setResultMsg(e?.message || "Please try again.");
      setResultOpen(true);
    }
  }, [patient.id, token, top, rows]);

  const keepWindowScroll = (mutate: () => void) => {
    const y = window.scrollY;
    mutate();
    requestAnimationFrame(() => window.scrollTo(0, y));
  };

  const activeCluster: "1-3" | "4" | "5" | "6" | "7" | "8" | "9" = firstTriMode
    ? "1-3"
    : (String(activeMonth) as any);

  const gotoCluster = (key: "1-3" | "4" | "5" | "6" | "7" | "8" | "9") => {
    keepWindowScroll(() => {
      if (key === "1-3") {
        setFirstTriMode(true);
        setActiveMonth(1);
      } else {
        setFirstTriMode(false);
        setActiveMonth(Number(key));
      }
    });
  };

  const gotoPrev = () => {
    keepWindowScroll(() => {
      if (firstTriMode) return;
      if (activeMonth === 4) {
        setFirstTriMode(true);
        setActiveMonth(1);
      } else {
        setActiveMonth((v) => Math.max(4, v - 1));
      }
    });
  };

  const gotoNext = () => {
    keepWindowScroll(() => {
      if (firstTriMode) {
        setFirstTriMode(false);
        setActiveMonth(4);
      } else {
        setActiveMonth((v) => Math.min(9, v + 1));
      }
    });
  };

  const m = rows[Math.max(0, Math.min(8, activeMonth - 1))];
  const monthNum = firstTriMode ? 1 : activeMonth;
  const highBP = isHighBP(m.bp ?? "");
  const fundalAbnormal = isFundalAbnormal(monthNum, m.fundal_height_cm ?? undefined);
  const labItems = React.useMemo(() => parseLabResults(m.laboratory_results), [m.laboratory_results]);

  const weightInvalid = m.weight_kg != null && (m.weight_kg <= 0 || m.weight_kg > 500);
  const gaInvalid =
    m.gestational_weeks != null &&
    m.gestational_weeks !== "" &&
    (!/^\d+$/.test(m.gestational_weeks) || Number(m.gestational_weeks) > 150);
  const fundalInvalid =
    m.fundal_height_cm != null && (m.fundal_height_cm < 0 || m.fundal_height_cm > 100);
  const ironRxInvalid =
    m.iron_folate_rx != null &&
    m.iron_folate_rx !== "" &&
    (!/^\d+$/.test(m.iron_folate_rx) || Number(m.iron_folate_rx) > 50);

  const absentFHBIsDanger =
    monthNum >= 6 && monthNum <= 9 && m.absent_fetal_heartbeat === true;
  const abnormalPresentationDanger =
    monthNum >= 8 && monthNum <= 9 && m.abnormal_presentation === true;

  const hasHospitalDangerFlag = [
    m.vaginal_bleeding === true,
    m.fever_38_or_more === true,
    m.pallor_anemia === true,
    highBP === true,
    m.edema === true,
    abnormalPresentationDanger === true,
    absentFHBIsDanger === true,
    m.danger_present === true,
  ].some(Boolean);

  const hasItrBackedField =
    isItrOwned(m, "visit_date") ||
    isItrOwned(m, "gestational_weeks") ||
    isItrOwned(m, "bp") ||
    isItrOwned(m, "weight_kg") ||
    isItrOwned(m, "fundal_height_cm");

  const TabBtn: React.FC<{
    active?: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }> = ({ active, onClick, children }) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={!!active}
      className={[
        "min-w-[56px] h-9 sm:h-8 rounded-lg border px-3 text-[13px] font-medium inline-flex items-center justify-center",
        active
          ? "bg-[var(--oh-teal,_#0F8A99)] text-white border-[var(--oh-teal,_#0F8A99)]"
          : "bg-white text-slate-900 border-slate-300 hover:bg-slate-50",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--oh-teal,_#0F8A99)]/40",
      ].join(" ")}
    >
      {children}
    </button>
  );

  const SourceBadge = ({ show }: { show: boolean }) =>
    show ? (
      <span className="inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[11px] text-cyan-800">
        <IconLink className="h-3 w-3" />
        From ITR
      </span>
    ) : null;

  return (
    <div className="min-h-[100dvh] flex flex-col w-full max-w-full">
      <style>{`
        :root { --oh-teal: ${TEAL}; }
        input[type="date"] {
          accent-color: var(--oh-teal);
          caret-color: var(--oh-teal);
        }
      `}</style>

      <div className="mx-auto w-full max-w-screen-2xl px-2 sm:px-3 lg:px-6 flex-1 overflow-x-hidden">
        <div className="mt-1 mb-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[18px] sm:text-[20px] font-semibold text-[#203D7A] tracking-tight">
              Home-Based Mother’s Record — Current Pregnancy
            </h2>

            <div className="flex items-center gap-2">
              {dirty && (
                <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs text-amber-800">
                  • Unsaved changes
                </span>
              )}
              <span ref={statusRef} className="text-[12px] sm:text-[13px] text-slate-600" aria-live="polite" />
              <button
                type="button"
                onClick={toggleLock}
                className={[
                  "inline-flex h-9 w-9 items-center justify-center border rounded-md text-xs font-medium transition-colors",
                  locked
                    ? "bg-slate-100 border-slate-200 text-slate-600 bg-white shadow-sm"
                    : "text-white",
                ].join(" ")}
                style={locked ? undefined : { backgroundColor: TEAL, borderColor: TEAL }}
                title={locked ? "Locked (Tap to edit)" : "Editing (Tap to lock)"}
                aria-pressed={locked ? "false" : "true"}
              >
                {locked ? <IconLock className="h-4 w-4" /> : <IconUnlock className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {locked && (
            <div className="mt-2 flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] sm:text-[13px] text-slate-700">
              <IconLock className="h-4 w-4 text-slate-600" />
              <span className="font-medium">
                Record is currently <span className="text-slate-900">LOCKED</span>. Tap the square on the right to enable editing.
              </span>
            </div>
          )}

          {!locked && hasItrBackedField && (
            <div className="mt-2 rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2 text-[12px] sm:text-[13px] text-cyan-900">
              Some visit fields are auto-filled from ITR and cannot be edited here.
            </div>
          )}

          <div
            ref={errorRef}
            style={{ display: "none" }}
            className="mt-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700"
            role="alert"
          />
          <div className="mt-2 h-px w-full bg-slate-200" />
        </div>

        <div className={locked ? "opacity-60 transition-opacity duration-150" : "transition-opacity duration-150"}>
          <div>
            <div
              className={[
                "rounded-md shadow-sm divide-y divide-slate-200 overflow-hidden",
                locked ? "bg-slate-50 ring-2 ring-slate-200" : "bg-white",
              ].join(" ")}
            >
              <section className={sectionPad}>
                <h3 className={titleSection}>Summary</h3>
                <p className={`${help} mt-0.5`}>
                  Last menstrual period (LMP), expected date of confinement (EDC), and pregnancy number.
                </p>

                <div className="mt-2 grid gap-3 md:grid-cols-3">
                  <div>
                    <label className={labelXs}>Last menstrual period (LMP)</label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        className={[
                          inputBase,
                          inputH,
                          inputMobileText,
                          isFutureDate(top.lmp_date) ? invalidInputClass : "",
                          lockableInputClass(locked, false),
                        ].join(" ")}
                        max={todayYMD()}
                        value={toYMD(top.lmp_date)}
                        onChange={(e) => saveTopLocal("lmp_date", e.currentTarget.value || null)}
                        disabled={locked}
                      />
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() => saveTopLocal("lmp_date", todayYMD())}
                        className="h-11 sm:h-10 px-2 rounded-md border border-slate-300 bg-slate-50 text-[11px] sm:text-[12px] flex items-center gap-1 disabled:opacity-60"
                      >
                        <IconCalendar className="h-4 w-4" />
                        Today
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className={labelXs}>Expected date of confinement (EDC)</label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        className={[
                          inputBase,
                          inputH,
                          inputMobileText,
                          lockableInputClass(locked, false),
                        ].join(" ")}
                        value={toYMD(top.edd_date)}
                        onChange={(e) => saveTopLocal("edd_date", e.currentTarget.value || null)}
                        disabled={locked}
                      />
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() => saveTopLocal("edd_date", todayYMD())}
                        className="h-11 sm:h-10 px-2 rounded-md border border-slate-300 bg-slate-50 text-[11px] sm:text-[12px] flex items-center gap-1 disabled:opacity-60"
                      >
                        <IconCalendar className="h-4 w-4" />
                        Today
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className={labelXs}>Pregnancy number</label>
                    <select
                      className={[
                        inputBase,
                        inputH,
                        inputMobileText,
                        lockableInputClass(locked, false),
                      ].join(" ")}
                      value={String(top.pregnancy_number ?? "")}
                      onChange={(e) => saveTopLocal("pregnancy_number", e.currentTarget.value || "")}
                      disabled={locked}
                    >
                      <option value="">—</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              <section className={sectionPad}>
                <h3 className={titleSection}>Months</h3>

                <div className="mt-2 flex items-center justify-between gap-2">
                  <TabBtn onClick={gotoPrev}>Prev</TabBtn>

                  <div className="w-full overflow-x-auto">
                    <div className="min-w-max mx-auto flex items-center justify-center gap-1.5">
                      <TabBtn active={activeCluster === "1-3"} onClick={() => gotoCluster("1-3")}>
                        1–3
                      </TabBtn>
                      {(["4", "5", "6", "7", "8", "9"] as const).map((k) => (
                        <TabBtn key={k} active={activeCluster === k} onClick={() => gotoCluster(k)}>
                          {k}
                        </TabBtn>
                      ))}
                    </div>
                  </div>

                  <TabBtn onClick={gotoNext}>Next</TabBtn>
                </div>
              </section>

              <section className={sectionPad}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className={titleSection}>
                    {firstTriMode ? "Months 1–3" : `${["4th", "5th", "6th", "7th", "8th", "9th"][activeMonth - 4]} Month`}
                  </h3>
                  <SourceBadge show={hasItrBackedField} />
                </div>

                <div className="mb-4">
                  <div className="mb-1 text-[13px] sm:text-[14px] font-semibold text-[#203D7A]">
                    Vitals
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <label className={labelXs}>Date of consultation</label>
                        <SourceBadge show={isItrOwned(m, "visit_date")} />
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="date"
                          className={[
                            inputBase,
                            inputH,
                            inputMobileText,
                            isFutureDate(m.visit_date) ? invalidInputClass : "",
                            lockableInputClass(locked, isItrOwned(m, "visit_date")),
                          ].join(" ")}
                          max={todayYMD()}
                          value={toYMD(m.visit_date)}
                          onChange={(e) => updateMonthLocal(activeMonth, "visit_date", e.currentTarget.value || null)}
                          disabled={locked || isItrOwned(m, "visit_date")}
                        />
                        <button
                          type="button"
                          disabled={locked || isItrOwned(m, "visit_date")}
                          onClick={() => updateMonthLocal(activeMonth, "visit_date", todayYMD())}
                          className="h-11 sm:h-10 px-2 rounded-md border border-slate-300 bg-slate-50 text-[11px] sm:text-[12px] flex items-center gap-1 disabled:opacity-60"
                        >
                          <IconCalendar className="h-4 w-4" />
                          Today
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <label className={labelXs}>Weight (kg)</label>
                        <SourceBadge show={isItrOwned(m, "weight_kg")} />
                      </div>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        className={[
                          inputBase,
                          inputH,
                          inputMobileText,
                          weightInvalid ? invalidInputClass : "",
                          lockableInputClass(locked, isItrOwned(m, "weight_kg")),
                        ].join(" ")}
                        value={(m.weight_kg ?? "") as any}
                        onChange={(e) => {
                          const v = e.currentTarget.value;
                          const num = v === "" ? null : Number(v);
                          updateMonthLocal(activeMonth, "weight_kg", v === "" || Number.isNaN(num) ? null : num);
                        }}
                        disabled={locked || isItrOwned(m, "weight_kg")}
                      />
                      <p className={`${help} mt-0.5`}>Cannot exceed 500 kg.</p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <label className={labelXs}>Blood pressure (mmHg)</label>
                        <SourceBadge show={isItrOwned(m, "bp")} />
                      </div>
                      <input
                        className={[
                          inputBase,
                          inputH,
                          inputMobileText,
                          isBPInvalid(m.bp) ? invalidInputClass : "",
                          lockableInputClass(locked, isItrOwned(m, "bp")),
                        ].join(" ")}
                        placeholder="e.g. 110/70"
                        value={m.bp ?? ""}
                        onChange={(e) => {
                          let v = e.currentTarget.value.replace(/\s+/g, "");
                          if (/^\d{3,6}$/.test(v) && !v.includes("/")) {
                            const first = v.slice(0, 3);
                            const rest = v.slice(3);
                            v = rest ? `${first}/${rest}` : first;
                          }
                          updateMonthLocal(activeMonth, "bp", v);
                        }}
                        disabled={locked || isItrOwned(m, "bp")}
                      />
                      <p className={`${help} mt-0.5`}>Format: XXX/XX, values cannot exceed 255.</p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <label className={labelXs}>Gestational age (weeks)</label>
                        <SourceBadge show={isItrOwned(m, "gestational_weeks")} />
                      </div>
                      <input
                        className={[
                          inputBase,
                          inputH,
                          inputMobileText,
                          gaInvalid ? invalidInputClass : "",
                          lockableInputClass(locked, isItrOwned(m, "gestational_weeks")),
                        ].join(" ")}
                        value={m.gestational_weeks ?? ""}
                        inputMode="numeric"
                        onChange={(e) => updateMonthLocal(activeMonth, "gestational_weeks", e.currentTarget.value)}
                        disabled={locked || isItrOwned(m, "gestational_weeks")}
                      />
                      <p className={`${help} mt-0.5`}>Numbers only, cannot exceed 150.</p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <label className={labelXs}>Fundic height (cm)</label>
                        <SourceBadge show={isItrOwned(m, "fundal_height_cm")} />
                      </div>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        className={[
                          inputBase,
                          inputH,
                          inputMobileText,
                          fundalInvalid ? invalidInputClass : "",
                          lockableInputClass(locked, isItrOwned(m, "fundal_height_cm")),
                        ].join(" ")}
                        value={(m.fundal_height_cm ?? "") as any}
                        onChange={(e) => {
                          const v = e.currentTarget.value;
                          const num = v === "" ? null : Number(v);
                          updateMonthLocal(activeMonth, "fundal_height_cm", v === "" || Number.isNaN(num) ? null : num);
                        }}
                        disabled={locked || isItrOwned(m, "fundal_height_cm")}
                      />
                      <p className={`${help} mt-0.5`}>
                        Cannot exceed 100 cm.
                        {fundalExpectedRangeText(monthNum) ? <> {fundalExpectedRangeText(monthNum)}.</> : null}
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <label className={labelXs}>Next visit date</label>
                        <SourceBadge show={true} />
                      </div>
                      <input
                        type="date"
                        className={[
                          inputBase,
                          inputH,
                          inputMobileText,
                          "bg-slate-50 text-slate-700",
                        ].join(" ")}
                        value={toYMD(m.next_visit_date)}
                        readOnly
                        disabled
                      />
                      <p className={`${help} mt-0.5`}>
                        Auto-filled based on consultation date and gestational age.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-1 text-[13px] sm:text-[14px] font-semibold text-[#203D7A]">
                    Conditions
                  </div>
                  <div className="rounded-md bg-slate-50/40 divide-y divide-slate-200">
                    {(
                      [
                        ["vaginal_bleeding", "Vaginal bleeding", true],
                        ["urine_infection", "Urine infection", false],
                        ["fever_38_or_more", "Fever of 38°C or over", true],
                        ["pallor_anemia", "Pallor / anemia", true],
                      ] as const
                    ).map(([key, label, dangerFlag]) => (
                      <div key={key} className="flex items-center justify-between px-3 py-2">
                        <div className="text-[14px] text-slate-900">{label}</div>
                        <SegYN
                          value={m[key]}
                          onChange={(v) => updateMonthLocal(activeMonth, key as BoolFieldKey, v)}
                          danger={dangerFlag && m[key] === true}
                          disabled={locked}
                        />
                      </div>
                    ))}

                    <div className="flex items-center justify-between px-3 py-2">
                      <div className="text-[14px] text-slate-900">Blood pressure of 140/90 or over</div>
                      <SegYN value={highBP} onChange={() => {}} danger={highBP} disabled />
                    </div>

                    <div className="flex flex-col gap-1 px-3 py-2">
                      <div className="flex items-center justify-between">
                        <div className="text-[14px] text-slate-900">Abnormal abdominal tummy size</div>
                        <SegYN
                          value={m.abnormal_abdominal_size}
                          onChange={(v) => updateMonthLocal(activeMonth, "abnormal_abdominal_size", v)}
                          danger={false}
                          disabled={locked}
                        />
                      </div>
                      {fundalExpectedRangeText(monthNum) && (
                        <p className={`${help} pl-0.5`}>
                          For this month, {fundalExpectedRangeText(monthNum)}.
                          {fundalAbnormal ? " Current value is outside the expected range." : ""}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between px-3 py-2">
                      <div className="text-[14px] text-slate-900">Abnormal presentation</div>
                      <SegYN
                        value={m.abnormal_presentation}
                        onChange={(v) => updateMonthLocal(activeMonth, "abnormal_presentation", v)}
                        danger={abnormalPresentationDanger}
                        disabled={locked}
                      />
                    </div>

                    <div className="flex items-center justify-between px-3 py-2">
                      <div className="text-[14px] text-slate-900">Absent fetal heartbeat</div>
                      <SegYN
                        value={m.absent_fetal_heartbeat}
                        onChange={(v) => updateMonthLocal(activeMonth, "absent_fetal_heartbeat", v)}
                        danger={absentFHBIsDanger}
                        disabled={locked}
                      />
                    </div>

                    <div className="flex items-center justify-between px-3 py-2">
                      <div className="text-[14px] text-slate-900">Edema</div>
                      <SegYN
                        value={m.edema}
                        onChange={(v) => updateMonthLocal(activeMonth, "edema", v)}
                        danger={m.edema === true}
                        disabled={locked}
                      />
                    </div>

                    <div className="flex items-center justify-between px-3 py-2">
                      <div className="text-[14px] text-slate-900">Vaginal infection / discharge</div>
                      <SegYN
                        value={m.vaginal_infection}
                        onChange={(v) => updateMonthLocal(activeMonth, "vaginal_infection", v)}
                        danger={false}
                        disabled={locked}
                      />
                    </div>
                  </div>

                  {hasHospitalDangerFlag && (
                    <div className="mt-4 rounded-xl border-2 border-rose-500 bg-rose-50 px-4 py-3">
                      <p className="text-[15px] sm:text-[17px] font-semibold text-rose-700">
                        WARNING: This pregnancy is at risk. Advise the patient to deliver their pregnancy
                        in a hospital or higher-level health facility.
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <div className="mb-1 text-[13px] sm:text-[14px] font-semibold text-[#203D7A]">
                    Laboratory results
                  </div>
                  <p className={help}>
                    Select the test, enter the date done, then add remarks. Use Add result for more items.
                  </p>

                  <div className="mt-2 space-y-3">
                    {labItems.length === 0 ? (
                      <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-[13px] text-slate-500">
                        No laboratory results added yet.
                      </div>
                    ) : null}

                    {labItems.map((item, idx) => (
                      <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                        <div className="grid gap-3 md:grid-cols-3">
                          <div>
                            <label className={labelXs}>Lab test</label>
                            <select
                              className={[inputBase, inputH, inputMobileText, lockableInputClass(locked, false)].join(" ")}
                              value={item.test ?? ""}
                              onChange={(e) => {
                                const next = labItems.slice();
                                next[idx] = { ...next[idx], test: e.currentTarget.value || null };
                                updateLabResultsLocal(activeMonth, next);
                              }}
                              disabled={locked}
                            >
                              <option value="">Select test…</option>
                              {LAB_TEST_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className={labelXs}>Date</label>
                            <input
                              type="date"
                              max={todayYMD()}
                              className={[
                                inputBase,
                                inputH,
                                inputMobileText,
                                isFutureDate(item.date) ? invalidInputClass : "",
                                lockableInputClass(locked, false),
                              ].join(" ")}
                              value={toYMD(item.date)}
                              onChange={(e) => {
                                const next = labItems.slice();
                                next[idx] = { ...next[idx], date: e.currentTarget.value || null };
                                updateLabResultsLocal(activeMonth, next);
                              }}
                              disabled={locked}
                            />
                          </div>

                          <div>
                            <label className={labelXs}>Remarks</label>
                            <input
                              className={[inputBase, inputH, inputMobileText, lockableInputClass(locked, false)].join(" ")}
                              value={item.remarks ?? ""}
                              maxLength={255}
                              placeholder="Remarks / result"
                              onChange={(e) => {
                                const next = labItems.slice();
                                next[idx] = { ...next[idx], remarks: e.currentTarget.value || null };
                                updateLabResultsLocal(activeMonth, next);
                              }}
                              disabled={locked}
                            />
                          </div>
                        </div>

                        <div className="mt-3 flex justify-end">
                          <button
                            type="button"
                            disabled={locked}
                            onClick={() => {
                              const next = labItems.filter((x) => x.id !== item.id);
                              updateLabResultsLocal(activeMonth, next);
                            }}
                            className="inline-flex h-9 items-center gap-1 rounded-md border border-rose-200 bg-white px-3 text-[13px] text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                          >
                            <IconTrash className="h-4 w-4" />
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => updateLabResultsLocal(activeMonth, [...labItems, makeLabRow()])}
                      className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-[13px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    >
                      <IconPlus className="h-4 w-4" />
                      Add result
                    </button>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="mb-1 text-[13px] sm:text-[14px] font-semibold text-[#203D7A]">
                    Actions / Treatments this month
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className={labelXs}>Iron foliate — RX #</label>
                      <input
                        className={[
                          inputBase,
                          inputH,
                          inputMobileText,
                          ironRxInvalid ? invalidInputClass : "",
                          lockableInputClass(locked, false),
                        ].join(" ")}
                        placeholder="Number of tablets"
                        value={m.iron_folate_rx ?? ""}
                        inputMode="numeric"
                        onChange={(e) => {
                          let v = e.currentTarget.value.replace(/[^\d]/g, "");
                          if (v) {
                            const num = Number(v);
                            if (!Number.isNaN(num) && num > 50) v = "50";
                          }
                          updateMonthLocal(activeMonth, "iron_folate_rx", v);
                        }}
                        disabled={locked}
                      />
                      <p className={`${help} mt-0.5`}>Cannot exceed number 50.</p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-md bg-slate-50/40 divide-y divide-slate-200">
                    {(
                      [
                        ["iodine_risk_area", "Added iodine supplement in risk areas", false],
                        ["malaria_prophylaxis", "Malaria prophylaxis", false],
                        ["plan_breastfeed", "Plans to breastfeed", false],
                        ["counseled_danger_signs", "Counseled on 4 danger signs", false],
                        ["dental_check", "Dental checked", false],
                        ["birth_plan_prepared", "Birth plan prepared", false],
                        ["danger_present", "Any danger noted", true],
                      ] as const
                    ).map(([k, label, dangerFlag]) => (
                      <div key={k} className="flex items-center justify-between px-3 py-2">
                        <div className="text-[14px]">{label}</div>
                        <SegYN
                          value={(m as any)[k]}
                          onChange={(v) => updateMonthLocal(activeMonth, k as keyof MonthRow, v)}
                          danger={dangerFlag && (m as any)[k] === true}
                          disabled={locked}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>

            <div className="h-16 sm:h-4" />
          </div>
        </div>
      </div>

      <footer className="fixed bottom-0 inset-x-0 z-[30] pointer-events-none">
        <div className="mx-auto w-full max-w-screen-2xl px-0 sm:px-4 lg:px-8 flex justify-end">
          <div className="mb-0.5 inline-flex w-full sm:w-auto rounded-t-md border border-slate-200 bg-white/95 backdrop-blur shadow-sm px-3 sm:px-4 py-2 pointer-events-auto">
            <button
              type="button"
              onClick={async () => {
                if (locked || isSaving) return;
                const ok = await confirm({
                  title: "Save current pregnancy record?",
                  message: "Please confirm you want to save all changes.",
                  confirmText: "Yes, save",
                  cancelText: "Cancel",
                });
                if (!ok) return;
                await doSaveAll();
              }}
              className="w-full sm:w-auto h-10 rounded-md bg-oh-teal px-5 text-[14px] text-white hover:bg-oh-tealDark disabled:opacity-60 inline-flex items-center justify-center gap-1.5"
              disabled={isSaving || locked || !canEdit}
            >
              <IconSave className="h-4 w-4" />
              {locked ? "Locked" : isSaving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </footer>

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