// resources/js/pages/patients/prenatal-card.tsx
/* ============================================================================
   ONE HEALTH — Patient Prenatal Card (Read-only)
   ----------------------------------------------------------------------------
   - Print button: directly downloads a PDF (html2pdf.js, loaded via CDN).
   - Download button: opens a printable view inside a hidden iframe (no new tab).
   - Patient info layout padded + details above tables.
============================================================================ */

import * as React from "react";
import { Head } from "@inertiajs/react";

/* ────────────────────────────────────────────────────────────────────────────
   Brand assets (same as other pages)
──────────────────────────────────────────────────────────────────────────── */
import Logo from "/public/build/assets/LOGO.svg";
import BackIcon from "/public/build/assets/back-outline-svgrepo-com.svg";

/* ────────────────────────────────────────────────────────────────────────────
   Types
──────────────────────────────────────────────────────────────────────────── */
type Nullable<T> = T | null | undefined;

type Patient = {
  id: number | string;
  full_name?: Nullable<string>;
  birthdate?: Nullable<string>;
  barangay?: Nullable<string>;
  address?: Nullable<string>;
  philhealth_number?: Nullable<string>;
  civil_status?: Nullable<string>;
  height_cm?: Nullable<number>;
  phone_number?: Nullable<string>;
  family_no?: Nullable<string | number>;
};

type PageProps = {
  patient: Patient;
  itr?: any;
  plan?: any;
  visits?: any[];
  history?: any;
  current?: any;
  postnatal?: any; // legacy visit-only data
  after?: any;     // full postnatal (after) object: visits, supplements, fp, referral, checks
};

/* ────────────────────────────────────────────────────────────────────────────
   Utilities & Formatters
──────────────────────────────────────────────────────────────────────────── */
const EMPTY = "—";

const fmtDate = (v?: string | null) => {
  if (!v) return EMPTY;
  const s = String(v).trim();
  const m = s.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);
  if (m) {
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
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

const toStr = (v: any) =>
  v === null || v === undefined || v === "" ? EMPTY : String(v);

const boolish = (v: any) => {
  if (v === true || v === 1) return true;
  if (v === false || v === 0) return false;

  if (typeof v === "string") {
    const t = v.trim().toLowerCase();
    if (["1", "true", "yes", "y", "oo", "o"].includes(t)) return true;
    if (["0", "false", "no", "n", "hindi"].includes(t)) return false;
  }

  return !!v;
};

/** Yes/No display that keeps unanswered items as "—" instead of "No". */
const yesNoDisplay = (v: any) => {
  if (v === null || v === undefined || v === "") return EMPTY;
  return boolish(v) ? "Yes" : "No";
};

const calcAgeYears = (birthdate?: string | null) => {
  if (!birthdate) return EMPTY;
  const d = new Date(birthdate);
  if (Number.isNaN(d.getTime())) return EMPTY;
  const now = new Date();
  let years = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) years--;
  if (years < 0 || years > 120) return EMPTY;
  return String(years);
};

/** tolerant getter by candidate keys (case/underscore/spacing tolerant) */
function pick(obj: any, ...cands: string[]) {
  if (!obj) return undefined as any;
  const keys = Object.keys(obj);
  for (const wantRaw of cands) {
    const want = wantRaw.replace(/[\s-]/g, "_");
    const k = keys.find(
      (kk) =>
        String(kk).replace(/[\s-]/g, "_").toLowerCase() === want.toLowerCase()
    );
    if (k) return (obj as any)[k];
  }
  for (const wantRaw of cands) {
    const re = new RegExp(
      wantRaw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i"
    );
    const k = keys.find((kk) => re.test(String(kk)));
    if (k) return (obj as any)[k];
  }
  return undefined as any;
}

function normalizePrintableSignatureSrc(plan: any): string {
  const signaturePath = pick(plan, "signature_path") ?? "";
  const signatureData = pick(plan, "signature_data") ?? "";

  const pathValue = String(signaturePath || "").trim();
  if (pathValue) {
    if (/^https?:\/\//i.test(pathValue)) return pathValue;
    if (/^data:image\//i.test(pathValue)) return pathValue;
    if (/^blob:/i.test(pathValue)) return "";

    const cleaned = pathValue
      .replace(/^https?:\/\/[^/]+/i, "")
      .replace(/^\/+/, "")
      .replace(/^storage\//i, "");

    return cleaned ? `${window.location.origin}/storage/${cleaned}` : "";
  }

  const dataValue = String(signatureData || "").trim();
  if (/^data:image\//i.test(dataValue)) return dataValue;

  return "";
}

/* ────────────────────────────────────────────────────────────────────────────
   Normalizers
──────────────────────────────────────────────────────────────────────────── */
function normalizeCurrent(src: any) {
  // Nothing? Return clean empty structure
  if (!src) {
    return {
      top: {
        lmp_date: null,
        edd_date: null,
        pregnancy_number: null,
      },
      months: [] as any[],
    };
  }

  // Unwrap common containers that controllers often use:
  // e.g. { current: {...} } or { data: {...} }
  let base: any = src;
  if (base.current && typeof base.current === "object") {
    base = base.current;
  }
  if (base.data && typeof base.data === "object" && !Array.isArray(base.data)) {
    base = base.data;
  }

  // If we have a nested "top" object, merge it into the base,
  // so we can always read top-level keys as well.
  if (
    base.top &&
    typeof base.top === "object" &&
    !Array.isArray(base.top) &&
    !base.lmp_date &&
    !base.edd_date &&
    !base.pregnancy_number
  ) {
    base = { ...base, ...base.top };
  }

  // Final "top summary" values (LMP, EDD, pregnancy number)
  const top = {
    lmp_date:
      base.lmp_date ??
      base.lmp ??
      base.top?.lmp_date ??
      base.top?.lmp ??
      null,
    edd_date:
      base.edd_date ??
      base.edc ??
      base.edc_date ??
      base.top?.edd_date ??
      base.top?.edc ??
      null,
    pregnancy_number:
      base.pregnancy_number ??
      base.pregnancy_no ??
      base.top?.pregnancy_number ??
      base.top?.pregnancy_no ??
      null,
  };

  // Month rows (the HBM "months" cards)
  let rows: any[] = [];

  if (Array.isArray(base)) {
    rows = base;
  } else if (Array.isArray(base.visits) && base.visits.length > 0) {
    // ✅ Prefer the new "visits" array that HBMCurrent saves
    rows = base.visits;
  } else if (Array.isArray(base.rows)) {
    // Fallback for legacy shapes that only had rows[]
    rows = base.rows;
  } else if (base.rows && typeof base.rows === "object") {
    // Fallback for legacy shapes with rows as an object map
    rows = Object.values(base.rows);
  }

  const by = new Map<number, any>();
  rows.forEach((r) => {
    const m = Number(r?.month_index ?? r?.column_index);
    if (Number.isFinite(m)) {
      by.set(m, { ...r, month_index: m, column_index: m });
    }
  });

  const def = (m: number) => ({
    month_index: m,
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
    laboratory_results: "",
    iron_folate_rx: "",
    iodine_risk_area: null,
    malaria_prophylaxis: null,
    plan_breastfeed: null,
    counseled_danger_signs: null,
    dental_check: null,
    birth_plan_prepared: null,
    danger_present: null,
    next_visit_date: null,
  });

  const months: any[] = [];
  for (let m = 1; m <= 9; m++) {
    months.push({ ...def(m), ...(by.get(m) || {}) });
  }

  return { top, months };
}

/**
 * Normalize HBM After / Postnatal JSON.
 * Works with both legacy shape and NEW controller snapshot:
 * - base.visits (array of visit rows, each with column_index 1..4 + flags)
 * - base.supplements, base.referral, base.fp, plus flat vitamin_* aliases
 */
function normalizeAfter(src: any) {
  const base = src?.after ? src.after : src || {};

  const rawVisits = base?.visits || base?.after_cols || base?.cols || {};
  const rawChecks = base?.checks || {};
  const supplements = base?.supplements || {};
  const referral = base?.referral || {};
  const fp = base?.fp || base?.family_planning || {};
  const fp_rows = Array.isArray(base?.fp_rows) ? base.fp_rows : [];

  type ColKey = "c1" | "c2" | "c3" | "c4";
  const colKeys: ColKey[] = ["c1", "c2", "c3", "c4"];

  // Map visit rows → c1/c2/c3/c4 using column_index when available
  const visitsByCol: Record<ColKey, any> = {
    c1: {},
    c2: {},
    c3: {},
    c4: {},
  };

  if (Array.isArray(rawVisits)) {
    (rawVisits as any[]).forEach((row, index) => {
      const idx =
        Number(
          row?.column_index ??
          row?.col_index ??
          row?.col ??
          row?.column ??
          index + 1
        ) || index + 1;

      const key: ColKey | null =
        idx === 1 ? "c1" : idx === 2 ? "c2" : idx === 3 ? "c3" : idx === 4 ? "c4" : null;

      if (key) {
        visitsByCol[key] = row || {};
      }
    });
  } else if (rawVisits && typeof rawVisits === "object") {
    const obj = rawVisits as any;
    visitsByCol.c1 = obj.c1 ?? obj.C1 ?? obj[0] ?? {};
    visitsByCol.c2 = obj.c2 ?? obj.C2 ?? obj[1] ?? {};
    visitsByCol.c3 = obj.c3 ?? obj.C3 ?? obj[2] ?? {};
    visitsByCol.c4 = obj.c4 ?? obj.C4 ?? obj[3] ?? {};
  }

  const pickVisit = (key: ColKey) => {
    const v = visitsByCol[key] || {};
    return {
      date:
        v.date ??
        v.visit_date ??
        v.followup_date ??
        v.follow_up_date ??
        null,
      time: v.time ?? v.followup_time ?? null,
      place: v.place ?? v.location ?? null,
    };
  };

  // For each check, prefer base.checks[rowKey][cX], but fall back to the visit row’s field
  const chk = (rowKey: string, col: ColKey) => {
    const fromChecks =
      (rawChecks as any)?.[rowKey]?.[col] ??
      (rawChecks as any)?.[rowKey]?.[col.toUpperCase()];

    if (fromChecks !== undefined && fromChecks !== null) {
      return fromChecks;
    }

    const visitRow = visitsByCol[col] || {};
    if (Object.prototype.hasOwnProperty.call(visitRow, rowKey)) {
      return (visitRow as any)[rowKey];
    }

    return null;
  };

  // Supplements: prefer nested block, then flat aliases, then per-visit values
  const normSupp = {
    vitamin_a_date:
      (supplements as any)?.vitamin_a_date ??
      base?.vitamin_a_date ??
      (visitsByCol.c4?.vitamin_a_date ??
        visitsByCol.c1?.vitamin_a_date ??
        null),
    iron_folate_date:
      (supplements as any)?.iron_folate_date ??
      base?.iron_folate_date ??
      (visitsByCol.c4?.iron_folate_date ??
        visitsByCol.c1?.iron_folate_date ??
        null),
    iron_folate_count:
      (supplements as any)?.iron_folate_count ??
      base?.iron_folate_count ??
      (typeof base?.iron_folate_qty === "number"
        ? base.iron_folate_qty
        : visitsByCol.c4?.iron_folate_count ??
        visitsByCol.c1?.iron_folate_count ??
        null),
  };

  const normReferral = {
    referred:
      (referral as any)?.referred ??
      base?.refer_hospital ??
      base?.refer_rhu ??
      null,
    reason: (referral as any)?.reason ?? base?.referral_reason ?? "",
    institution:
      (referral as any)?.institution ?? base?.referral_institution ?? "",
  };

  const normFp = {
    followup_date: (fp as any)?.followup_date ?? null,
    consult_date: (fp as any)?.consult_date ?? null,
    method: (fp as any)?.method ?? null,
    given_qty: (fp as any)?.given_qty ?? null,
    notes: (fp as any)?.notes ?? "",
  };

  return {
    visits: {
      c1: pickVisit("c1"),
      c2: pickVisit("c2"),
      c3: pickVisit("c3"),
      c4: pickVisit("c4"),
    },
    checks: {
      exclusive_breastfeeding: {
        c1: chk("exclusive_breastfeeding", "c1"),
        c2: chk("exclusive_breastfeeding", "c2"),
        c3: chk("exclusive_breastfeeding", "c3"),
        c4: chk("exclusive_breastfeeding", "c4"),
      },
      family_planning_intent: {
        c1: chk("family_planning_intent", "c1"),
        c2: chk("family_planning_intent", "c2"),
        c3: chk("family_planning_intent", "c3"),
        c4: chk("family_planning_intent", "c4"),
      },
      fever_38_up: {
        c1: chk("fever_38_up", "c1"),
        c2: chk("fever_38_up", "c2"),
        c3: chk("fever_38_up", "c3"),
        c4: chk("fever_38_up", "c4"),
      },
      foul_lochia: {
        c1: chk("foul_lochia", "c1"),
        c2: chk("foul_lochia", "c2"),
        c3: chk("foul_lochia", "c3"),
        c4: chk("foul_lochia", "c4"),
      },
      heavy_bleeding: {
        c1: chk("heavy_bleeding", "c1"),
        c2: chk("heavy_bleeding", "c2"),
        c3: chk("heavy_bleeding", "c3"),
        c4: chk("heavy_bleeding", "c4"),
      },
      red_breast: {
        c1: chk("red_breast", "c1"),
        c2: chk("red_breast", "c2"),
        c3: chk("red_breast", "c3"),
        c4: chk("red_breast", "c4"),
      },
      navel_ok: {
        c1: chk("navel_ok", "c1"),
        c2: chk("navel_ok", "c2"),
        c3: chk("navel_ok", "c3"),
        c4: chk("navel_ok", "c4"),
      },
    },
    supplements: normSupp,
    referral: normReferral,
    fp: normFp,
    fp_rows,
  };
}

/* ────────────────────────────────────────────────────────────────────────────
   HBM After view helpers (same periods/checks as health-worker side)
──────────────────────────────────────────────────────────────────────────── */
type AfterColKey = "c1" | "c2" | "c3" | "c4";
const AFTER_COLS: AfterColKey[] = ["c1", "c2", "c3", "c4"];
const AFTER_COL_TITLES: Record<AfterColKey, string> = {
  c1: "24 hours",
  c2: "Day 3",
  c3: "1 Week",
  c4: "2–4 Weeks / Clinic",
};

type AfterCheckKey =
  | "exclusive_breastfeeding"
  | "family_planning_intent"
  | "fever_38_up"
  | "foul_lochia"
  | "heavy_bleeding"
  | "red_breast"
  | "navel_ok";

const AFTER_CHECK_ROWS: { key: AfterCheckKey; label: string }[] = [
  { key: "exclusive_breastfeeding", label: "Exclusive breastfeeding" },
  { key: "family_planning_intent", label: "Intends family planning" },
  { key: "fever_38_up", label: "Fever ≥ 38°C" },
  { key: "foul_lochia", label: "Foul-smelling lochia" },
  { key: "heavy_bleeding", label: "Heavy bleeding" },
  { key: "red_breast", label: "Red breast" },
  { key: "navel_ok", label: "Umbilical stump OK" },
];

function normalizeITR(src: any, currentTop: any, history: any, postnatal: any) {
  const itr = src || {};

  // OB history: prefer ITR, then fall back to history
  const ob_g =
    pick(
      itr,
      "ob_g",
      "gravida",
      "g",
      "pregnancy_no",
      "pregnancy_number"
    ) ??
    pick(
      history,
      "ob_g",
      "gravida",
      "g",
      "pregnancy_no",
      "pregnancy_number"
    ) ??
    null;

  const ob_p =
    pick(itr, "ob_p", "para", "p") ??
    pick(history, "ob_p", "para", "p") ??
    null;

  const ob_gtpal =
    pick(itr, "gtpal", "gtp", "gtpal_text", "ob_gtpal") ??
    pick(history, "gtpal", "gtp", "gtpal_text", "ob_gtpal") ??
    null;

  // LMP / EDD (EDC) – now also read `edc` / `edc_date`
  const lmp_date =
    pick(itr, "lmp_date", "lmp") ??
    currentTop?.lmp_date ??
    pick(history, "lmp_date", "lmp") ??
    null;

  const edd_date =
    pick(itr, "edd_date", "edc", "edc_date") ??
    currentTop?.edd_date ??
    pick(history, "edd_date", "edc", "edc_date") ??
    null;

  const TT = (n: 1 | 2 | 3 | 4 | 5) =>
    pick(itr, `tt${n}_date`, `tt_${n}_date`, `tt${n}`, `tt_${n}`) ??
    pick(history, `tt${n}_date`, `tt_${n}_date`, `tt${n}`) ??
    null;

  // Post-partum Vitamin A – also read `vitamin_a_date` from ITR TT & Vit A tab
  const vitamin_a_pp =
    pick(
      itr,
      "vitamin_a_postpartum_date",
      "postpartum_vitamin_a_date",
      "vit_a_postpartum_date",
      "vit_a_pp_date",
      "vitamin_a_date"
    ) ??
    pick(
      history,
      "vitamin_a_postpartum_date",
      "postpartum_vitamin_a_date",
      "vit_a_postpartum_date",
      "vit_a_pp_date"
    ) ??
    pick(postnatal?.after || postnatal, "vitamin_a_date") ??
    null;

  const fromNested = itr?.risk || itr?.risk_codes || {};
  const risk = {
    A: {
      flag: boolish(
        pick(fromNested.A || fromNested.a || {}, "flag", "marked") ??
        pick(itr, "risk_a_flag", "riskA_flag", "risk_a", "riskA")
      ),
      date:
        pick(fromNested.A || fromNested.a || {}, "date", "noted_at") ??
        pick(itr, "risk_a_date", "riskA_date", "risk_a_noted_at") ??
        null,
    },
    B: {
      flag: boolish(
        pick(fromNested.B || fromNested.b || {}, "flag", "marked") ??
        pick(itr, "risk_b_flag", "riskB_flag", "risk_b", "riskB")
      ),
      date:
        pick(fromNested.B || fromNested.b || {}, "date", "noted_at") ??
        pick(itr, "risk_b_date", "riskB_date", "risk_b_noted_at") ??
        null,
    },
    C: {
      flag: boolish(
        pick(fromNested.C || fromNested.c || {}, "flag", "marked") ??
        pick(itr, "risk_c_flag", "riskC_flag", "risk_c", "riskC")
      ),
      date:
        pick(fromNested.C || fromNested.c || {}, "date", "noted_at") ??
        pick(itr, "risk_c_date", "riskCDate", "risk_c_noted_at") ??
        null,
    },
    D: {
      flag: boolish(
        pick(fromNested.D || fromNested.d || {}, "flag", "marked") ??
        pick(itr, "risk_d_flag", "riskD_flag", "risk_d", "riskD")
      ),
      date:
        pick(fromNested.D || fromNested.d || {}, "date", "noted_at") ??
        pick(itr, "risk_d_date", "riskD_date", "risk_d_noted_at") ??
        null,
    },
    E: {
      flag: boolish(
        pick(fromNested.E || fromNested.e || {}, "flag", "marked") ??
        pick(itr, "risk_e_flag", "riskE_flag", "risk_e", "riskE")
      ),
      date:
        pick(fromNested.E || fromNested.e || {}, "date", "noted_at") ??
        pick(itr, "risk_e_date", "riskE_date", "risk_e_noted_at") ??
        null,
    },
  };

  return {
    ob_g,
    ob_p,
    ob_gtpal,
    lmp_date,
    edd_date,
    tt1_date: TT(1),
    tt2_date: TT(2),
    tt3_date: TT(3),
    tt4_date: TT(4),
    tt5_date: TT(5),
    vitamin_a_postpartum_date: vitamin_a_pp,
    risk,
  };
}

/* ────────────────────────────────────────────────────────────────────────────
   PDF helpers (loads html2pdf and builds/saves PDF) — TOP LEVEL
──────────────────────────────────────────────────────────────────────────── */
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

export function printCardPDF() {
  (async () => {
    try {
      const html2pdf = await ensureHtml2Pdf();

      const payloadEl = document.getElementById("prenatal-data");
      const data = JSON.parse(payloadEl?.textContent || "{}");

      const esc = (v: any) =>
        String(v ?? "—")
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;");
      const S = (v: any) =>
        v === null || v === undefined || v === "" ? "—" : String(v);

      const fmt = (v: any) => {
        if (!v) return "—";
        const s = String(v).trim();
        const m = s.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);
        if (m) {
          const d = new Date(+m[1], +m[2] - 1, +m[3]);
          return isNaN(d.getTime())
            ? esc(s)
            : d.toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "2-digit",
            });
        }
        const d = new Date(s);
        return isNaN(d.getTime())
          ? esc(s)
          : d.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "2-digit",
          });
      };

      const truthy = (v: any) => {
        if (v === true || v === 1) return true;
        if (v === false || v === 0) return false;
        if (typeof v === "string") {
          const t = v.trim().toLowerCase();
          if (["1", "true", "yes", "y", "oo", "o"].includes(t)) return true;
          if (["0", "false", "no", "n", "hindi"].includes(t)) return false;
        }
        return !!v;
      };
      const YN = (v: any) => (truthy(v) ? "Yes" : "No");

      const {
        patient = {},
        itrNorm = {},
        cur = {},
        aft = {},
        plan = {},
        plan_signature_src = "",
        history = {},
        visits = [],
        age_years,
      } = data;

      const logoSrc =
        (document.querySelector('img[alt="OneHealth logo"]') as HTMLImageElement)
          ?.src || "";

      const riskRow = (code: "A" | "B" | "C" | "D" | "E") => {
        const r = (itrNorm as any).risk?.[code] || {};
        return `<tr><td>${code}</td><td>${YN(r.flag)}</td><td>${fmt(
          r.date
        )}</td></tr>`;
      };

      const ttDates = [
        ["TT1", (itrNorm as any).tt1_date],
        ["TT2", (itrNorm as any).tt2_date],
        ["TT3", (itrNorm as any).tt3_date],
        ["TT4", (itrNorm as any).tt4_date],
        [
          "TT5",
          (itrNorm as any).tt5_date,
        ],
        [
          "Post-partum Vitamin A",
          (itrNorm as any).vitamin_a_postpartum_date ??
          (aft as any)?.supplements?.vitamin_a_date,
        ],
      ]
        .map(([k, v]) => `<tr><td>${esc(k)}</td><td>${fmt(v)}</td></tr>`)
        .join("");

      const visitRows = (Array.isArray(visits) ? visits : [])
        .map((v: any) => {
          const visit_date = v?.visit_date ?? v?.date ?? v?.checked_at ?? null;
          return `<tr>
            <td>${fmt(visit_date)}</td>
            <td>${esc(S(v?.bp ?? v?.blood_pressure))}</td>
            <td>${esc(S(v?.pr ?? v?.pulse_rate))}</td>
            <td>${esc(S(v?.rr ?? v?.respiratory_rate))}</td>
            <td>${esc(S(v?.temp ?? v?.temperature_c ?? v?.temperature))}</td>
            <td>${esc(S(v?.wt ?? v?.weight))}</td>
            <td>${esc(S(v?.fh ?? v?.fundic_height ?? v?.fundal_height))}</td>
            <td>${esc(
            S(v?.fhr ?? v?.fetal_heart_tone ?? v?.fetal_heart_rate)
          )}</td>
            <td>${esc(
            S(v?.iron_tablets ?? v?.iron_tabs ?? v?.feso4_caps ?? v?.feso4)
          )}</td>
            <td>${esc(S(v?.trimester))}</td>
            <td>${esc(S(v?.remarks ?? v?.notes))}</td>
          </tr>`;
        })
        .join("");

      /* ───────── HBM CURRENT MONTHLY CARDS (PRINT) ─────────
         - Months 1–3 merged into 1 card ("Months 1–3")
         - Months 4–9 → separate cards
         - Compact table layout: each row has up to 3 label/value pairs
      -------------------------------------------------------------------- */

      const monthsRaw: any[] = Array.isArray((cur as any)?.months)
        ? (cur as any).months
        : [];

      const hasMonthData = (m: any) => {
        if (!m) return false;
        const keys = [
          "visit_date",
          "gestational_weeks",
          "bp",
          "weight_kg",
          "fundal_height_cm",
          "urine_infection",
          "vaginal_bleeding",
          "fever_38_or_more",
          "pallor_anemia",
          "abnormal_abdominal_size",
          "abnormal_presentation",
          "absent_fetal_heartbeat",
          "edema",
          "vaginal_infection",
          "laboratory_results",
          "iron_folate_rx",
          "iodine_risk_area",
          "malaria_prophylaxis",
          "plan_breastfeed",
          "counseled_danger_signs",
          "dental_check",
          "birth_plan_prepared",
          "danger_present",
          "next_visit_date",
        ];
        return keys.some((k) => {
          const v = (m as any)[k];
          if (v === null || v === undefined) return false;
          return String(v).trim() !== "";
        });
      };

      // index → month object (only if it has data)
      const byIndex = new Map<number, any>();
      monthsRaw.forEach((m: any) => {
        if (!hasMonthData(m)) return;
        const idx = Number(m?.month_index ?? m?.column_index);
        if (Number.isFinite(idx)) byIndex.set(idx, m);
      });

      // Merge months 1–3 into one synthetic "trimester" object
      const mergeTrimester = (indexes: number[]) => {
        const srcs = indexes.map((i) => byIndex.get(i)).filter(Boolean);
        if (!srcs.length) return null;
        const merged: any = { month_index: indexes[0] };
        srcs.forEach((src: any) => {
          Object.keys(src).forEach((k) => {
            const v = src[k];
            if (v !== null && v !== undefined && String(v).trim() !== "") {
              merged[k] = v; // last non-empty wins
            }
          });
        });
        return merged;
      };

      const monthGroups: { label: string; note?: string; data: any }[] = [];
      const m123 = mergeTrimester([1, 2, 3]);
      if (m123) {
        monthGroups.push({
          label: "Months 1–3",
          note: "First trimester",
          data: m123,
        });
      }
      for (let i = 4; i <= 9; i++) {
        const src = byIndex.get(i);
        if (src) {
          monthGroups.push({
            label: `Month ${i}`,
            note: "",
            data: src,
          });
        }
      }

      const hasMonthGroups = monthGroups.length > 0;

      const monthCards = monthGroups
        .map(({ label, note, data }) => {
          const m = data || {};
          const fields: [string, string][] = [
            ["Check-up date", fmt(m?.visit_date)],
            ["GA (wks)", esc(S(m?.gestational_weeks))],
            ["BP", esc(S(m?.bp))],
            ["Weight (kg)", esc(S(m?.weight_kg))],
            ["Fundal ht (cm)", esc(S(m?.fundal_height_cm))],
            ["Urine infection", YN(m?.urine_infection)],
            ["Vaginal bleeding", YN(m?.vaginal_bleeding)],
            ["Fever ≥ 38°C", YN(m?.fever_38_or_more)],
            ["Pallor/anemia", YN(m?.pallor_anemia)],
            ["Abn. tummy size", YN(m?.abnormal_abdominal_size)],
            ["Abn. presentation", YN(m?.abnormal_presentation)],
            ["Absent FHB", YN(m?.absent_fetal_heartbeat)],
            ["Edema", YN(m?.edema)],
            ["Vaginal infect.", YN(m?.vaginal_infection)],
            ["Lab results", esc(S(m?.laboratory_results))],
            ["Iron/Folate Rx (#)", esc(S(m?.iron_folate_rx))],
            ["Iodine supplement", YN(m?.iodine_risk_area)],
            ["Malaria prophylaxis", YN(m?.malaria_prophylaxis)],
            ["Plans to breastfeed", YN(m?.plan_breastfeed)],
            ["Counseled danger", YN(m?.counseled_danger_signs)],
            ["Dental check", YN(m?.dental_check)],
            ["Birth plan prepared", YN(m?.birth_plan_prepared)],
            ["Any danger noted", YN(m?.danger_present)],
            ["Next visit date", fmt(m?.next_visit_date)],
          ];

          let rowsHtml = "";
          for (let i = 0; i < fields.length; i += 3) {
            const slice = fields.slice(i, i + 3);
            rowsHtml += "<tr>";
            slice.forEach(([lbl, val]) => {
              rowsHtml += `<td class="lbl">${esc(
                lbl
              )}</td><td class="val">${val}</td>`;
            });
            if (slice.length < 3) {
              for (let k = 0; k < 3 - slice.length; k++) {
                rowsHtml += `<td class="lbl"></td><td class="val"></td>`;
              }
            }
            rowsHtml += "</tr>";
          }

          const subtitle = note
            ? `<div class="sub">${esc(note)}</div>`
            : "";

          return `<article class="block mini month-card">
            <div class="h mini">${esc(label)}</div>
            ${subtitle}
            <table class="month-table">${rowsHtml}</table>
          </article>`;
        })
        .join("");

      const hasAfterData = (key: "c1" | "c2" | "c3" | "c4") => {
        const v = (aft as any)?.visits?.[key] || {};
        const checks = (aft as any)?.checks || {};
        const fields = [
          v?.date,
          v?.time,
          v?.place,
          checks?.exclusive_breastfeeding?.[key],
          checks?.family_planning_intent?.[key],
          checks?.fever_38_up?.[key],
          checks?.foul_lochia?.[key],
          checks?.heavy_bleeding?.[key],
          checks?.red_breast?.[key],
          checks?.navel_ok?.[key],
        ];
        return fields.some((val) => {
          if (val === null || val === undefined) return false;
          return String(val).trim() !== "";
        });
      };

      const afterBox = (key: "c1" | "c2" | "c3" | "c4", title: string) => {
        if (!hasAfterData(key)) return "";
        const v = (aft as any)?.visits?.[key] || {};
        const checks = (aft as any)?.checks || {};
        const items: [string, string][] = [
          ["Visit date", fmt(v?.date)],
          ["Visit time", esc(S(v?.time))],
          ["Place", esc(S(v?.place))],
          ["Exclusive breastfeeding", YN(checks?.exclusive_breastfeeding?.[key])],
          ["Family planning intent", YN(checks?.family_planning_intent?.[key])],
          ["Fever ≥ 38°C", YN(checks?.fever_38_up?.[key])],
          ["Foul-smelling discharge", YN(checks?.foul_lochia?.[key])],
          ["Heavy vaginal bleeding", YN(checks?.heavy_bleeding?.[key])],
          ["Red breast / mastitis", YN(checks?.red_breast?.[key])],
          ["Umbilical area ok", YN(checks?.navel_ok?.[key])],
        ];
        const body = items
          .map(
            ([lbl, val]) =>
              `<div class="card-item"><span class="card-item-label">${esc(
                lbl
              )}</span><span class="card-item-value">${val}</span></div>`
          )
          .join("");
        return `<article class="block mini">
          <div class="h mini">${esc(title)}</div>
          <div class="card-grid triple">${body}</div>
        </article>`;
      };

      // ---------- Normalize Birth Plan (same as before) ----------
      const planAny: any = plan || {};
      const planHasAnyContent = Object.values(planAny || {}).some(
        (v) => v !== null && v !== undefined && String(v).trim() !== ""
      );

      const plan_attending_personnel =
        pick(planAny, "attending_personnel", "attending") ?? "";
      const plan_planned_facility = pick(planAny, "planned_facility") ?? "";
      const plan_philhealth_raw = pick(
        planAny,
        "planned_facility_is_philhealth",
        "philhealth_accredited"
      );
      let plan_philhealth = "";
      if (
        plan_philhealth_raw !== null &&
        plan_philhealth_raw !== undefined &&
        plan_philhealth_raw !== ""
      ) {
        plan_philhealth = truthy(plan_philhealth_raw) ? "YES" : "NO";
      }

      const plan_estimated_cost = pick(planAny, "estimated_cost") ?? "";
      const plan_mode_of_payment = pick(planAny, "mode_of_payment") ?? "";
      const plan_transport =
        pick(planAny, "available_transport", "transport") ?? "";

      const plan_companion_name =
        pick(planAny, "companion_name", "companion1_name") ?? "";
      const plan_companion_address = pick(planAny, "companion_address") ?? "";
      const plan_companion_contact =
        pick(planAny, "companion_contact", "companion1_contact") ?? "";

      const plan_family_companion_name =
        pick(planAny, "family_companion_name") ?? "";
      const plan_family_companion_relationship =
        pick(planAny, "family_companion_relationship") ?? "";
      const plan_family_companion_address =
        pick(planAny, "family_companion_address") ?? "";
      const plan_family_companion_contact =
        pick(planAny, "family_companion_contact", "companion2_contact") ?? "";

      const plan_caretaker_name = pick(planAny, "caretaker_name") ?? "";
      const plan_caretaker_relationship =
        pick(planAny, "caretaker_relationship") ?? "";

      const plan_blood_type =
        pick(planAny, "blood_type") ?? pick(history || {}, "blood_type") ?? "";

      const plan_blood_donor1_name = pick(planAny, "blood_donor_1_name") ?? "";
      const plan_blood_donor1_address =
        pick(planAny, "blood_donor_1_address") ?? "";
      const plan_blood_donor2_name = pick(planAny, "blood_donor_2_name") ?? "";
      const plan_blood_donor2_address =
        pick(planAny, "blood_donor_2_address") ?? "";

      const plan_emergency_contact_name =
        pick(planAny, "emergency_contact_name") ?? "";
      const plan_emergency_contact_address =
        pick(planAny, "emergency_contact_address") ?? "";
      const plan_emergency_contact_contact =
        pick(planAny, "emergency_contact_contact") ?? "";

      const plan_maternal_hospital1_name =
        pick(planAny, "maternal_hospital_1_name") ?? "";
      const plan_maternal_hospital1_address =
        pick(planAny, "maternal_hospital_1_address") ?? "";
      const plan_maternal_hospital2_name =
        pick(planAny, "maternal_hospital_2_name") ?? "";
      const plan_maternal_hospital2_address =
        pick(planAny, "maternal_hospital_2_address") ?? "";

      const plan_signature_name = pick(planAny, "signature_name") ?? "";
      const plan_date = pick(planAny, "plan_date") ?? "";

      const planBlank = (v: any) =>
        `<span class="blank">${esc(S(v))}</span>`;

      const fpRowsHtml =
        Array.isArray((aft as any)?.fp_rows) && (aft as any).fp_rows.length
          ? (aft as any).fp_rows
            .map((r: any, i: number) => {
              const rows = [
                [
                  "Follow-up date",
                  fmt(r?.follow_up_date ?? r?.followup_date),
                ],
                ["Visit date", fmt(r?.visit_date)],
                ["Method", esc(S(r?.method))],
                ["Qty given", esc(S(r?.qty_given))],
                ["Remarks", esc(S(r?.remarks))],
              ]
                .map(
                  (x) =>
                    `<tr><td>${esc(x[0])}</td><td>${x[1]}</td></tr>`
                )
                .join("");
              return `<article class="block mini"><div class="h mini">Family Planning Entry #${i + 1
                }</div><table class="kv">${rows}</table></article>`;
            })
            .join("")
          : "";

      const css = `
@page {
  size: A4 portrait;
  margin: 6mm;
}

:root {
  --ink:#0f172a;
  --muted:#64748b;
  --line:#d7e3ea;
  --teal:#0F8A99;
  --tealDeep:#0a6f7c;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: #ffffff;
  color: var(--ink);
  font-family: 'Poppins', system-ui, -apple-system, Segoe UI, Roboto, Arial;
  font-size: 11pt;
  line-height: 1.35;
}

.sheet {
  border: 1px solid var(--tealDeep);
  border-radius: 6px;
  padding: 6mm;
  background: #fff;
  page-break-after: always;
  margin-bottom: 6mm;
}

.sheet:last-child {
  page-break-after: avoid;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.brand .logo {
  height: 24px;
  width: 24px;
  border-radius: 6px;
  overflow: hidden;
  display: grid;
  place-items: center;
  background: var(--teal);
  color: #fff;
  font-weight: 800;
  font-size: 11pt;
}

.brand .logo img {
  height: 100%;
  width: 100%;
  object-fit: cover;
}

.brand .title {
  font-weight: 800;
  letter-spacing: .02em;
  font-size: 13pt;
}

.brand .sub {
  font-size: 11pt;
  color: var(--muted);
  letter-spacing: .14em;
  text-transform: uppercase;
}

.rule {
  height: 3px;
  background: linear-gradient(90deg,var(--teal),#16a39a,#22d3ee);
  border-radius: 2px;
  margin: 6px 0 10px;
}

.h {
  font-weight: 800;
  color: #0b3d48;
  margin: 0 0 6px;
  font-size: 13pt;
}

.h.mini {
  font-size: 13pt;
  margin-bottom: 4px;
}

.grid2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.grid3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 6px;
}

.block {
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 6px 8px;
  background: #fff;
  margin: 6px 0;
  page-break-inside: avoid;
}

.block.mini {
  margin: 4px 0;
  padding: 4px 6px;
  border-radius: 4px;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 2px 6px;
}

.card-grid.triple {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.card-item {
  font-size: 11pt;
}

.card-item-label {
  display: block;
  color: var(--muted);
}

.card-item-value {
  display: block;
  font-weight: 600;
}
  

.no-rec {
  font-style: italic;
  color: var(--muted);
  font-size: 11pt;
}

table {
  width: 100%;
  border-collapse: collapse;
}

table.kv td:first-child {
  width: 40%;
  color: var(--muted);
}

table.kv td {
  border-bottom: 1px dashed #e6eef2;
  padding: 2px 4px;
  vertical-align: top;
  font-size: 11pt;
}

table.kv tr:last-child td {
  border-bottom: 0;
}

table.grid {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

table.grid th,
table.grid td {
  border: 1px solid var(--tealDeep);
  padding: 3px 4px;
  vertical-align: top;
  font-size: 11pt;
}

table.grid thead th {
  background: var(--teal);
  color: #fff;
  font-weight: 800;
  text-transform: uppercase;
}

table.grid .subhead th {
  background: #e6f5f6;
  color: #0b3d48;
  text-transform: none;
  font-weight: 700;
}

.blank {
  display:inline-block;
  min-width:40px;
  border-bottom:1px solid #94a3b8;
  padding:0 2px;
  font-weight:700;
}

.plan-body p {
  margin: 3px 0;
  font-size: 11pt;
}

/* Compact monthly tables (HBM current) */
.month-card .h.mini { margin-bottom: 2px; }
.month-card .sub {
  font-size: 10pt;
  color: var(--muted);
  margin-bottom: 2px;
}
.month-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 9.5pt;
}
.month-table td {
  padding: 1px 3px;
  vertical-align: top;
}
.month-table td.lbl {
  color: var(--muted);
  white-space: nowrap;
}
.month-table td.val {
  font-weight: 600;
}

/* Optional two-column K/V layout */
.kv2 {
  display:grid;
  grid-template-columns: 34mm 1fr 34mm 1fr;
  gap:4px 10px;
}
.k {
  color:var(--muted);
  font-size:11pt;
}
.v {
  font-weight:700;
  font-size:11pt;
}
`;

      // ---------- PAGE 1: ITR ----------
      const itrSheet = `
<div class="sheet sheet-itr">
  <div class="brand">
    <div class="logo">${logoSrc ? `<img src="${logoSrc}" alt=""/>` : "OH"
        }</div>
    <div>
      <div class="title">ONE HEALTH — Prenatal Card</div>
      <div class="sub">ITR · Pregnancy &amp; Visits</div>
    </div>
  </div>
  <div class="rule"></div>

  <section class="block">
    <div class="h">Patient Information</div>
    <table class="kv">
      <tr><td>Full name</td><td>${esc(S((patient as any).full_name))}</td></tr>
      <tr><td>Barangay</td><td>${esc(S((patient as any).barangay))}</td></tr>
      <tr><td>Address</td><td>${esc(S((patient as any).address))}</td></tr>
      <tr><td>Birthday</td><td>${fmt((patient as any).birthdate)}</td></tr>
      <tr><td>Age</td><td>${esc(S(age_years))}</td></tr>
      <tr><td>Height (cm)</td><td>${esc(S((patient as any).height_cm))}</td></tr>
      <tr><td>Civil Status</td><td>${esc(S((patient as any).civil_status))}</td></tr>
      <tr><td>PhilHealth #</td><td>${esc(
          S(
            (patient as any).philhealth_number ??
            (patient as any).philhealth ??
            (patient as any).philhealth_no
          )
        )}</td></tr>
    </table>
  </section>

  <section class="block">
    <div class="h">ITR — Pregnancy Details</div>
    <table class="kv">
      <tr><td>OB: G</td><td>${esc(S((itrNorm as any).ob_g))}</td></tr>
      <tr><td>OB: P</td><td>${esc(S((itrNorm as any).ob_p))}</td></tr>
      <tr><td>OB: GTPAL</td><td>${esc(S((itrNorm as any).ob_gtpal))}</td></tr>
      <tr><td>LMP</td><td>${fmt((itrNorm as any).lmp_date)}</td></tr>
      <tr><td>EDD</td><td>${fmt((itrNorm as any).edd_date)}</td></tr>
    </table>
  </section>

  <section class="block">
    <div class="grid2">
      <div>
        <div class="h mini">Risk Codes</div>
        <table class="grid">
          <thead><tr><th style="width:18%">Code</th><th style="width:22%">Flag</th><th>Date noted</th></tr></thead>
          <tbody>${riskRow("A")}${riskRow("B")}${riskRow("C")}${riskRow(
          "D"
        )}${riskRow("E")}</tbody>
        </table>
      </div>
      <div>
        <div class="h mini">TT &amp; Vitamin A</div>
        <table class="grid">
          <thead><tr><th style="width:40%">Item</th><th>Date</th></tr></thead>
          <tbody>${ttDates}</tbody>
        </table>
      </div>
    </div>
  </section>

  ${Array.isArray(visits) && visits.length
          ? `<section class="block">
          <div class="h">Prenatal Visits</div>
          <table class="grid">
            <thead>
              <tr>
                <th style="width:12%">Date</th>
                <th style="width:8%">BP</th>
                <th style="width:6%">PR</th>
                <th style="width:6%">RR</th>
                <th style="width:7%">Temp</th>
                <th style="width:7%">Wt</th>
                <th style="width:8%">Fundic Ht</th>
                <th style="width:8%">FHR</th>
                <th style="width:8%">Iron #</th>
                <th style="width:9%">Trimester</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>${visitRows}</tbody>
          </table>
        </section>`
          : ""
        }
</div>`;

      // ---------- PAGE 2: HBM ----------
      const historySection = history
        ? `<section class="block">
            <div class="h">HBM — Initial History (Summary)</div>
            <table class="kv">
              <tr><td>Blood type</td><td>${esc(
          S(
            (history as any)?.blood_type ??
            (plan as any)?.blood_type ??
            ""
          )
        )}</td></tr>
              <tr><td>Recommend hospital delivery</td><td>${YN(
          (history as any)?.recommend_hospital_delivery
        )}</td></tr>
              <tr><td>Age (years)</td><td>${esc(
          S(
            (history as any)?.age_years ?? age_years ?? ""
          )
        )}</td></tr>
              <tr><td>Height (cm)</td><td>${esc(
          S(
            (history as any)?.height_cm ??
            (patient as any)?.height_cm ??
            (history as any)?.height ??
            ""
          )
        )}</td></tr>
              <tr><td>TT1</td><td>${fmt(
          (history as any)?.tt1_date ?? (itrNorm as any)?.tt1_date
        )}</td></tr>
              <tr><td>TT2</td><td>${fmt(
          (history as any)?.tt2_date ?? (itrNorm as any)?.tt2_date
        )}</td></tr>
              <tr><td>TT3</td><td>${fmt(
          (history as any)?.tt3_date ?? (itrNorm as any)?.tt3_date
        )}</td></tr>
              <tr><td>TT4</td><td>${fmt(
          (history as any)?.tt4_date ?? (itrNorm as any)?.tt4_date
        )}</td></tr>
              <tr><td>TT5</td><td>${fmt(
          (history as any)?.tt5_date ?? (itrNorm as any)?.tt5_date
        )}</td></tr>
              <tr><td>3 consecutive abortions</td><td>${YN(
          (history as any)?.three_consecutive_abortions
        )}</td></tr>
              <tr><td>Stillbirth history</td><td>${YN(
          (history as any)?.stillbirth_history
        )}</td></tr>
              <tr><td>PPH history</td><td>${YN(
          (history as any)?.pph_history
        )}</td></tr>
              <tr><td>Tuberculosis (current)</td><td>${YN(
          (history as any)?.tb_current
        )}</td></tr>
              <tr><td>Heart disease (current)</td><td>${YN(
          (history as any)?.heart_disease_current
        )}</td></tr>
              <tr><td>Diabetes (current)</td><td>${YN(
          (history as any)?.diabetes_current
        )}</td></tr>
              <tr><td>Asthma (current)</td><td>${YN(
          (history as any)?.asthma_current
        )}</td></tr>
              <tr><td>Goiter (current)</td><td>${YN(
          (history as any)?.goiter_current
        )}</td></tr>
            </table>
          </section>`
        : "";

      const supplementsReferralSection = `
<section class="block">
  <div class="h">Supplements &amp; Referral</div>
  <table class="kv">
    <tr><td>Vitamin A date</td><td>${fmt(
        (aft as any)?.supplements?.vitamin_a_date
      )}</td></tr>
    <tr><td>Iron/Folate date</td><td>${fmt(
        (aft as any)?.supplements?.iron_folate_date
      )}</td></tr>
    <tr><td>Iron/Folate qty</td><td>${esc(
        S((aft as any)?.supplements?.iron_folate_count)
      )}</td></tr>
    <tr><td>Referred</td><td>${YN((aft as any)?.referral?.referred)}</td></tr>
    <tr><td>Referral reason</td><td>${esc(
        S((aft as any)?.referral?.reason)
      )}</td></tr>
    <tr><td>Institution</td><td>${esc(
        S((aft as any)?.referral?.institution)
      )}</td></tr>
  </table>
</section>`;

      const familyPlanningSection = `
<section class="block">
  <div class="h">Family Planning</div>
  <table class="kv">
    <tr><td>Follow-up date</td><td>${fmt(
        (aft as any)?.fp?.followup_date
      )}</td></tr>
    <tr><td>Consult date</td><td>${fmt(
        (aft as any)?.fp?.consult_date
      )}</td></tr>
    <tr><td>Method</td><td>${esc(S((aft as any)?.fp?.method))}</td></tr>
    <tr><td>Qty given</td><td>${esc(
        S((aft as any)?.fp?.given_qty)
      )}</td></tr>
    <tr><td>Notes</td><td>${esc(S((aft as any)?.fp?.notes))}</td></tr>
  </table>
  ${fpRowsHtml}
</section>`;

      const afterC1 = afterBox("c1", "24 hours");
      const afterC2 = afterBox("c2", "Day 3");
      const afterC3 = afterBox("c3", "1 Week");
      const afterC4 = afterBox("c4", "2–4 Weeks / Clinic");
      const anyAfter = !!(afterC1 || afterC2 || afterC3 || afterC4);

      const hbmSheet = `
<div class="sheet sheet-hbm">
  <div class="brand">
    <div class="logo">${logoSrc ? `<img src="${logoSrc}" alt=""/>` : "OH"
        }</div>
    <div>
      <div class="title">ONE HEALTH — Prenatal Card</div>
      <div class="sub">HBM · History, Current &amp; After</div>
    </div>
  </div>
  <div class="rule"></div>

  <section class="block">
    <div class="h">Patient Information</div>
    <table class="kv">
      <tr><td>Full name</td><td>${esc(S((patient as any).full_name))}</td></tr>
      <tr><td>Barangay</td><td>${esc(S((patient as any).barangay))}</td></tr>
      <tr><td>Address</td><td>${esc(S((patient as any).address))}</td></tr>
      <tr><td>Birthday</td><td>${fmt((patient as any).birthdate)}</td></tr>
      <tr><td>Age</td><td>${esc(S(age_years))}</td></tr>
    </table>
  </section>

  ${historySection}

  <section class="block">
    <div class="h">HBM — Current (Top)</div>
    <table class="kv">
      <tr><td>LMP</td><td>${fmt((cur as any)?.top?.lmp_date)}</td></tr>
      <tr><td>EDD</td><td>${fmt((cur as any)?.top?.edd_date)}</td></tr>
      <tr><td>Pregnancy number</td><td>${esc(
          S((cur as any)?.top?.pregnancy_number)
        )}</td></tr>
    </table>
  </section>

  ${hasMonthGroups
          ? `<section class="block">
          <div class="h">HBM — Monthly Details</div>
          <div class="grid2">${monthCards}</div>
        </section>`
          : `<section class="block">
          <div class="h">HBM — Monthly Details</div>
          <p class="no-rec">No record yet.</p>
        </section>`
        }

  ${anyAfter
          ? `<section class="block">
           <div class="h">HBM — Postpartum Visits</div>
           <div class="grid2">${afterC1}${afterC2}${afterC3}${afterC4}</div>
         </section>`
          : `<section class="block">
           <div class="h">HBM — Postpartum Visits</div>
           <p class="no-rec">No record yet.</p>
         </section>`
        }

  ${supplementsReferralSection}
  ${familyPlanningSection}
</div>`;

      // ---------- PAGE 3: Birth Plan (same as before) ----------
      const birthPlanSection = planHasAnyContent
        ? `<section class="block">
            <div class="h">BIRTH &amp; EMERGENCY PLAN</div>
            <div class="plan-body">
              <p>“I KNOW THAT COMPLICATION CAN DEVELOP AT ANY TIME IN THE COURSE OF THIS PREGNANCY, CHILDBIRTH. I KNOW THAT THE BEST PLACE TO DELIVER MY BABY IS IN THE HEALTH FACILITY.”</p>
              <p>“I WILL BE ATTENDED AT DELIVERY BY ${planBlank(
          plan_attending_personnel
        )}.”</p>
              <p>“I PLAN TO DELIVER AT ${planBlank(
          plan_planned_facility
        )}.”</p>
              <p>“THIS IS A PHILHEALTH ACCREDITED FACILITY” ${planBlank(
          plan_philhealth || "—"
        )}</p>
              <p>“THE ESTIMATED COST OF THE MATERNITY PACKAGE IN THIS FACILITY IS PHP ${planBlank(
          plan_estimated_cost
        )} (INCLUSIVE OF NEWBORN CARE).”</p>
              <p>“THE MODE OF PAYMENT IS ${planBlank(
          plan_mode_of_payment
        )}.”</p>
              <p>“THE AVAILABLE TRANSPORT IS ${planBlank(
          plan_transport
        )}.”</p>
              <p>“I HAVE CONTACTED ${planBlank(
          plan_companion_name
        )}, RESIDING AT ${planBlank(
          plan_companion_address
        )} AND WITH CONTACT NUMBER ${planBlank(
          plan_companion_contact
        )} TO BRING ME TO THE HOSPITAL/MATERNITY CLINIC/HEALTH CENTER.”</p>
              <p>“I WILL BE ACCOMPANIED BY ${planBlank(
          plan_family_companion_name
        )}, WHO IS MY ${planBlank(
          plan_family_companion_relationship
        )}, RESIDING AT ${planBlank(
          plan_family_companion_address
        )}, AND WITH CONTACT NUMBER ${planBlank(
          plan_family_companion_contact
        )}.”</p>
              <p>“${planBlank(
          plan_caretaker_name
        )}, MY ${planBlank(
          plan_caretaker_relationship
        )}, WILL TAKE CARE OF MY CHILDREN/HOME WHILE I AM IN THE HEALTH FACILITY.”</p>
              <p>“MY BLOOD TYPE IS ${planBlank(plan_blood_type)}.”</p>
              <p>“IN CASE OF A NEED FOR A BLOOD TRANSFUSION, MY POSSIBLE DONORS ARE:”</p>
              <p>&nbsp;&nbsp;&nbsp;&nbsp;${planBlank(
          plan_blood_donor1_name
        )}, ${planBlank(plan_blood_donor1_address)}</p>
              <p>&nbsp;&nbsp;&nbsp;&nbsp;${planBlank(
          plan_blood_donor2_name
        )}, ${planBlank(plan_blood_donor2_address)}</p>
              <p>“IN CASE OF COMPLICATION, I SHOULD BE REFERRED RIGHT AWAY TO:”</p>
              <p>“CONTACT PERSON: ${planBlank(plan_emergency_contact_name)}”</p>
              <p>“ADDRESS: ${planBlank(
          plan_emergency_contact_address
        )} TEL. NO.: ${planBlank(
          plan_emergency_contact_contact
        )}.”</p>
              <p>“THE NEAREST MATERNAL AND NEWBORN HEALTH FACILITY TO MY RESIDENCE ARE:”</p>
              <p>&nbsp;&nbsp;&nbsp;&nbsp;“MATERNAL HOSPITAL: ${planBlank(
          plan_maternal_hospital1_name
        )} ADDRESS: ${planBlank(
          plan_maternal_hospital1_address
        )}”</p>
              <p>&nbsp;&nbsp;&nbsp;&nbsp;“MATERNAL HOSPITAL: ${planBlank(
          plan_maternal_hospital2_name
        )} ADDRESS: ${planBlank(
          plan_maternal_hospital2_address
        )}”</p>
              <div style="margin-top:14px;">
  <table style="width:100%; border-collapse:collapse;">
    <tr>
      <td style="width:65%; vertical-align:bottom; padding-right:16px;">
        <div style="font-size:11pt; color:#64748b; margin-bottom:6px;">Conforme</div>

        ${plan_signature_src
          ? `<div style="width:240px; height:90px; display:flex; align-items:center; justify-content:center; border:1px solid #cbd5e1; border-radius:6px; background:#fff; padding:8px;">
                 <img
                   src="${plan_signature_src}"
                   alt="Patient signature"
                   style="max-width:100%; max-height:70px; object-fit:contain; display:block;"
                 />
               </div>`
          : `<div style="width:240px; height:90px; border:1px dashed #cbd5e1; border-radius:6px; background:#f8fafc;"></div>`
        }

        <div style="width:240px; margin-top:8px; padding-top:4px; border-top:1px solid #94a3b8; font-weight:700;">
          ${esc(S(plan_signature_name))}
        </div>
        <div style="font-size:10pt; color:#64748b;">Signature over printed name</div>
      </td>

      <td style="width:35%; vertical-align:bottom;">
        <div style="font-size:11pt; color:#64748b; margin-bottom:6px;">Date</div>
        <div style="padding-bottom:4px; border-bottom:1px solid #94a3b8; font-weight:700;">
          ${fmt(plan_date)}
        </div>
      </td>
    </tr>
  </table>
</div>
            </div>
          </section>`
        : `<section class="block">
            <div class="h">BIRTH &amp; EMERGENCY PLAN</div>
            <p>No birth &amp; emergency plan recorded yet.</p>
          </section>`;

      const planSheet = `
<div class="sheet sheet-plan">
  <div class="brand">
    <div class="logo">${logoSrc ? `<img src="${logoSrc}" alt=""/>` : "OH"
        }</div>
    <div>
      <div class="title">ONE HEALTH — Prenatal Card</div>
      <div class="sub">Birth &amp; Emergency Plan</div>
    </div>
  </div>
  <div class="rule"></div>

  <section class="block">
    <div class="h">Patient Information</div>
    <table class="kv">
      <tr><td>Full name</td><td>${esc(S((patient as any).full_name))}</td></tr>
      <tr><td>Barangay</td><td>${esc(S((patient as any).barangay))}</td></tr>
      <tr><td>Address</td><td>${esc(S((patient as any).address))}</td></tr>
    </table>
  </section>

  ${birthPlanSection}
</div>`;

      const content = `
<style>
${css}
</style>
${itrSheet}
${hbmSheet}
${planSheet}
`;

      const container = document.createElement("div");
      container.style.position = "fixed";
      container.style.left = "-10000px";
      container.style.top = "0";
      container.innerHTML = content;
      document.body.appendChild(container);

      const filename = `Prenatal_Card_${((patient as any)?.full_name || "Patient")
          .replace(/\s+/g, "_")
          .slice(0, 80)
        }.pdf`;

      const opt = {
        margin: 0,
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"] },
      };

      await html2pdf().set(opt).from(container).save();
      container.remove();
    } catch (err) {
      console.error(err);
      alert("PDF generation failed. Please check your network/CSP.");
    }
  })();
}


/* ────────────────────────────────────────────────────────────────────────────
   Printable "Download" — renders into hidden iframe (no new tab)
──────────────────────────────────────────────────────────────────────────── */
function downloadCard() {
  try {
    const payloadEl = document.getElementById("prenatal-data");
    const data = JSON.parse(payloadEl?.textContent || "{}");

    const esc = (v: any) =>
      String(v ?? "—")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
    const S = (v: any) =>
      v === null || v === undefined || v === "" ? "—" : String(v);
    const fmt = (v: any) => {
      if (!v) return "—";
      const s = String(v).trim();
      const m = s.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);
      if (m) {
        const d = new Date(+m[1], +m[2] - 1, +m[3]);
        return isNaN(d.getTime())
          ? esc(s)
          : d.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "2-digit",
          });
      }
      const d = new Date(s);
      return isNaN(d.getTime())
        ? esc(s)
        : d.toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "2-digit",
        });
    };
    const truthy = (v: any) => {
      if (v === true || v === 1) return true;
      if (v === false || v === 0) return false;
      if (typeof v === "string") {
        const t = v.trim().toLowerCase();
        if (["1", "true", "yes", "y", "oo", "o"].includes(t)) return true;
        if (["0", "false", "no", "n", "hindi"].includes(t)) return false;
      }
      return !!v;
    };
    const YN = (v: any) => (truthy(v) ? "Yes" : "No");

    const logoSrc =
      (document.querySelector('img[alt="OneHealth logo"]') as HTMLImageElement)
        ?.src || "";

    const patient = data.patient || {};
    const itrNorm = data.itrNorm || {};
    const cur = data.cur || {};
    const aft = data.aft || {};
    const plan = data.plan || {};
    const plan_signature_src = data.plan_signature_src || "";
    const history = data.history || {};
    const visits: any[] = Array.isArray(data.visits) ? data.visits : [];
    const age_years = data.age_years;

    const riskRow = (code: "A" | "B" | "C" | "D" | "E") => {
      const r = itrNorm.risk?.[code] || {};
      return `<tr><td>${code}</td><td>${YN(r.flag)}</td><td>${fmt(
        r.date
      )}</td></tr>`;
    };

    const ttDates = [
      ["TT1", itrNorm.tt1_date],
      ["TT2", itrNorm.tt2_date],
      ["TT3", itrNorm.tt3_date],
      ["TT4", itrNorm.tt4_date],
      [
        "TT5",
        itrNorm.tt5_date,
      ],
      [
        "Post-partum Vitamin A",
        itrNorm.vitamin_a_postpartum_date ??
        aft?.supplements?.vitamin_a_date,
      ],
    ]
      .map(([k, v]) => `<tr><td>${esc(k)}</td><td>${fmt(v)}</td></tr>`)
      .join("");

    const visitRows = visits
      .map((v) => {
        const visit_date = v?.visit_date ?? v?.date ?? v?.checked_at ?? null;
        return `<tr>
          <td>${fmt(visit_date)}</td>
          <td>${esc(S(v?.bp ?? v?.blood_pressure))}</td>
          <td>${esc(S(v?.pr ?? v?.pulse_rate))}</td>
          <td>${esc(S(v?.rr ?? v?.respiratory_rate))}</td>
          <td>${esc(S(v?.temp ?? v?.temperature_c ?? v?.temperature))}</td>
          <td>${esc(S(v?.wt ?? v?.weight))}</td>
          <td>${esc(S(v?.fh ?? v?.fundic_height ?? v?.fundal_height))}</td>
          <td>${esc(
          S(v?.fhr ?? v?.fetal_heart_tone ?? v?.fetal_heart_rate)
        )}</td>
          <td>${esc(
          S(v?.iron_tablets ?? v?.iron_tabs ?? v?.feso4_caps ?? v?.feso4)
        )}</td>
          <td>${esc(S(v?.trimester))}</td>
          <td>${esc(S(v?.remarks ?? v?.notes))}</td>
        </tr>`;
      })
      .join("");

    /* ───────── HBM CURRENT MONTHLY CARDS (DOWNLOAD) ─────────
       Same logic as print: months 1–3 merged, others separate,
       compact table layout.
    ---------------------------------------------------------------- */

    const monthsRaw: any[] = Array.isArray(cur?.months) ? cur.months : [];

    const hasMonthData = (m: any) => {
      if (!m) return false;
      const keys = [
        "visit_date",
        "gestational_weeks",
        "bp",
        "weight_kg",
        "fundal_height_cm",
        "urine_infection",
        "vaginal_bleeding",
        "fever_38_or_more",
        "pallor_anemia",
        "abnormal_abdominal_size",
        "abnormal_presentation",
        "absent_fetal_heartbeat",
        "edema",
        "vaginal_infection",
        "laboratory_results",
        "iron_folate_rx",
        "iodine_risk_area",
        "malaria_prophylaxis",
        "plan_breastfeed",
        "counseled_danger_signs",
        "dental_check",
        "birth_plan_prepared",
        "danger_present",
        "next_visit_date",
      ];
      return keys.some((k) => {
        const v = (m as any)[k];
        if (v === null || v === undefined) return false;
        return String(v).trim() !== "";
      });
    };

    const byIndex = new Map<number, any>();
    monthsRaw.forEach((m: any) => {
      if (!hasMonthData(m)) return;
      const idx = Number(m?.month_index ?? m?.column_index);
      if (Number.isFinite(idx)) byIndex.set(idx, m);
    });

    const mergeTrimester = (indexes: number[]) => {
      const srcs = indexes.map((i) => byIndex.get(i)).filter(Boolean);
      if (!srcs.length) return null;
      const merged: any = { month_index: indexes[0] };
      srcs.forEach((src: any) => {
        Object.keys(src).forEach((k) => {
          const v = src[k];
          if (v !== null && v !== undefined && String(v).trim() !== "") {
            merged[k] = v;
          }
        });
      });
      return merged;
    };

    const monthGroups: { label: string; note?: string; data: any }[] = [];
    const m123 = mergeTrimester([1, 2, 3]);
    if (m123) {
      monthGroups.push({
        label: "Months 1–3",
        note: "First trimester",
        data: m123,
      });
    }
    for (let i = 4; i <= 9; i++) {
      const src = byIndex.get(i);
      if (src) {
        monthGroups.push({ label: `Month ${i}`, note: "", data: src });
      }
    }

    const hasMonthGroups = monthGroups.length > 0;

    const monthCards = monthGroups
      .map(({ label, note, data }) => {
        const m = data || {};
        const fields: [string, string][] = [
          ["Check-up date", fmt(m?.visit_date)],
          ["GA (wks)", esc(S(m?.gestational_weeks))],
          ["BP", esc(S(m?.bp))],
          ["Weight (kg)", esc(S(m?.weight_kg))],
          ["Fundal ht (cm)", esc(S(m?.fundal_height_cm))],
          ["Urine infection", YN(m?.urine_infection)],
          ["Vaginal bleeding", YN(m?.vaginal_bleeding)],
          ["Fever ≥ 38°C", YN(m?.fever_38_or_more)],
          ["Pallor/anemia", YN(m?.pallor_anemia)],
          ["Abn. tummy size", YN(m?.abnormal_abdominal_size)],
          ["Abn. presentation", YN(m?.abnormal_presentation)],
          ["Absent FHB", YN(m?.absent_fetal_heartbeat)],
          ["Edema", YN(m?.edema)],
          ["Vaginal infect.", YN(m?.vaginal_infection)],
          ["Lab results", esc(S(m?.laboratory_results))],
          ["Iron/Folate Rx (#)", esc(S(m?.iron_folate_rx))],
          ["Iodine supplement", YN(m?.iodine_risk_area)],
          ["Malaria prophylaxis", YN(m?.malaria_prophylaxis)],
          ["Plans to breastfeed", YN(m?.plan_breastfeed)],
          ["Counseled danger", YN(m?.counseled_danger_signs)],
          ["Dental check", YN(m?.dental_check)],
          ["Birth plan prepared", YN(m?.birth_plan_prepared)],
          ["Any danger noted", YN(m?.danger_present)],
          ["Next visit date", fmt(m?.next_visit_date)],
        ];

        let rowsHtml = "";
        for (let i = 0; i < fields.length; i += 3) {
          const slice = fields.slice(i, i + 3);
          rowsHtml += "<tr>";
          slice.forEach(([lbl, val]) => {
            rowsHtml += `<td class="lbl">${esc(
              lbl
            )}</td><td class="val">${val}</td>`;
          });
          if (slice.length < 3) {
            for (let k = 0; k < 3 - slice.length; k++) {
              rowsHtml += `<td class="lbl"></td><td class="val"></td>`;
            }
          }
          rowsHtml += "</tr>";
        }

        const subtitle = note ? `<div class="sub">${esc(note)}</div>` : "";

        return `<article class="block mini month-card">
          <div class="h mini">${esc(label)}</div>
          ${subtitle}
          <table class="month-table">${rowsHtml}</table>
        </article>`;
      })
      .join("");

    const hasAfterData = (key: "c1" | "c2" | "c3" | "c4") => {
      const v = (aft as any)?.visits?.[key] || {};
      const checks = (aft as any)?.checks || {};
      const fields = [
        v?.date,
        v?.time,
        v?.place,
        checks?.exclusive_breastfeeding?.[key],
        checks?.family_planning_intent?.[key],
        checks?.fever_38_up?.[key],
        checks?.foul_lochia?.[key],
        checks?.heavy_bleeding?.[key],
        checks?.red_breast?.[key],
        checks?.navel_ok?.[key],
      ];
      return fields.some((val) => {
        if (val === null || val === undefined) return false;
        return String(val).trim() !== "";
      });
    };

    const afterBox = (key: "c1" | "c2" | "c3" | "c4", title: string) => {
      if (!hasAfterData(key)) return "";
      const v = (aft as any)?.visits?.[key] || {};
      const checks = (aft as any)?.checks || {};
      const items: [string, string][] = [
        ["Visit date", fmt(v?.date)],
        ["Time", esc(S(v?.time))],
        ["Place", esc(S(v?.place))],
        ["Exclusive BF", YN(checks?.exclusive_breastfeeding?.[key])],
        ["FP intent", YN(checks?.family_planning_intent?.[key])],
        ["Fever ≥ 38°C", YN(checks?.fever_38_up?.[key])],
        ["Foul lochia", YN(checks?.foul_lochia?.[key])],
        ["Heavy bleeding", YN(checks?.heavy_bleeding?.[key])],
        ["Red breast", YN(checks?.red_breast?.[key])],
        ["Navel okay", YN(checks?.navel_ok?.[key])],
      ];
      const body = items
        .map(
          ([lbl, val]) =>
            `<div class="card-item"><span class="card-item-label">${esc(
              lbl
            )}</span><span class="card-item-value">${val}</span></div>`
        )
        .join("");
      return `<article class="block mini">
        <div class="h mini">${esc(title)}</div>
        <div class="card-grid triple">${body}</div>
      </article>`;
    };

    // ---------- Normalize plan same as before ----------
    const planAny: any = plan || {};
    const planHasAnyContent = Object.values(planAny || {}).some(
      (v) => v !== null && v !== undefined && String(v).trim() !== ""
    );

    const plan_attending_personnel =
      pick(planAny, "attending_personnel", "attending") ?? "";
    const plan_planned_facility = pick(planAny, "planned_facility") ?? "";
    const plan_philhealth_raw = pick(
      planAny,
      "planned_facility_is_philhealth",
      "philhealth_accredited"
    );
    let plan_philhealth = "";
    if (
      plan_philhealth_raw !== null &&
      plan_philhealth_raw !== undefined &&
      plan_philhealth_raw !== ""
    ) {
      plan_philhealth = truthy(plan_philhealth_raw) ? "YES" : "NO";
    }

    const plan_estimated_cost = pick(planAny, "estimated_cost") ?? "";
    const plan_mode_of_payment = pick(planAny, "mode_of_payment") ?? "";
    const plan_transport =
      pick(planAny, "available_transport", "transport") ?? "";

    const plan_companion_name =
      pick(planAny, "companion_name", "companion1_name") ?? "";
    const plan_companion_address = pick(planAny, "companion_address") ?? "";
    const plan_companion_contact =
      pick(planAny, "companion_contact", "companion1_contact") ?? "";

    const plan_family_companion_name =
      pick(planAny, "family_companion_name") ?? "";
    const plan_family_companion_relationship =
      pick(planAny, "family_companion_relationship") ?? "";
    const plan_family_companion_address =
      pick(planAny, "family_companion_address") ?? "";
    const plan_family_companion_contact =
      pick(planAny, "family_companion_contact", "companion2_contact") ?? "";

    const plan_caretaker_name = pick(planAny, "caretaker_name") ?? "";
    const plan_caretaker_relationship =
      pick(planAny, "caretaker_relationship") ?? "";

    const plan_blood_type =
      pick(planAny, "blood_type") ?? pick(history || {}, "blood_type") ?? "";

    const plan_blood_donor1_name = pick(planAny, "blood_donor_1_name") ?? "";
    const plan_blood_donor1_address =
      pick(planAny, "blood_donor_1_address") ?? "";
    const plan_blood_donor2_name = pick(planAny, "blood_donor_2_name") ?? "";
    const plan_blood_donor2_address =
      pick(planAny, "blood_donor_2_address") ?? "";

    const plan_emergency_contact_name =
      pick(planAny, "emergency_contact_name") ?? "";
    const plan_emergency_contact_address =
      pick(planAny, "emergency_contact_address") ?? "";
    const plan_emergency_contact_contact =
      pick(planAny, "emergency_contact_contact") ?? "";

    const plan_maternal_hospital1_name =
      pick(planAny, "maternal_hospital_1_name") ?? "";
    const plan_maternal_hospital1_address =
      pick(planAny, "maternal_hospital_1_address") ?? "";
    const plan_maternal_hospital2_name =
      pick(planAny, "maternal_hospital_2_name") ?? "";
    const plan_maternal_hospital2_address =
      pick(planAny, "maternal_hospital_2_address") ?? "";

    const plan_signature_name = pick(planAny, "signature_name") ?? "";
    const plan_date = pick(planAny, "plan_date") ?? "";

    const planBlank = (v: any) => `<span class="blank">${esc(S(v))}</span>`;

    const fpRowsHtml =
      Array.isArray(aft?.fp_rows) && aft.fp_rows.length
        ? aft.fp_rows
          .map((r: any, i: number) => {
            const rows = [
              ["Follow-up date", fmt(r?.follow_up_date ?? r?.followup_date)],
              ["Visit date", fmt(r?.visit_date)],
              ["Method", esc(S(r?.method))],
              ["Qty given", esc(S(r?.qty_given))],
              ["Remarks", esc(S(r?.remarks))],
            ]
              .map(
                (x) =>
                  `<tr><td>${esc(x[0] as string)}</td><td>${x[1]}</td></tr>`
              )
              .join("");
            return `<article class="block mini"><div class="h mini">Family Planning Entry #${i + 1
              }</div><table class="kv">${rows}</table></article>`;
          })
          .join("")
        : "";

    const css = `
@page {
  size: A4 portrait;
  margin: 6mm;
}

:root {
  --ink:#0f172a;
  --muted:#64748b;
  --line:#d7e3ea;
  --teal:#0F8A99;
  --tealDeep:#0a6f7c;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: #ffffff;
  color: var(--ink);
  font-family: 'Poppins', system-ui, -apple-system, Segoe UI, Roboto, Arial;
  font-size: 11pt;
  line-height: 1.35;
}

.sheet {
  border: 1px solid var(--tealDeep);
  border-radius: 6px;
  padding: 6mm;
  background: #fff;
  page-break-after: always;
  margin-bottom: 6mm;
}

.sheet:last-child {
  page-break-after: avoid;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.brand .logo {
  height: 24px;
  width: 24px;
  border-radius: 6px;
  overflow: hidden;
  display: grid;
  place-items: center;
  background: var(--teal);
  color: #fff;
  font-weight: 800;
  font-size: 11pt;
}

.brand .logo img {
  height: 100%;
  width: 100%;
  object-fit: cover;
}

.brand .title {
  font-weight: 800;
  letter-spacing: .02em;
  font-size: 13pt;
}

.brand .sub {
  font-size: 11pt;
  color: var(--muted);
  letter-spacing: .14em;
  text-transform: uppercase;
}

.rule {
  height: 3px;
  background: linear-gradient(90deg,var(--teal),#16a39a,#22d3ee);
  border-radius: 2px;
  margin: 6px 0 10px;
}

.h {
  font-weight: 800;
  color: #0b3d48;
  margin: 0 0 6px;
  font-size: 13pt;
}

.h.mini {
  font-size: 13pt;
  margin-bottom: 4px;
}

.grid2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.grid3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 6px;
}

.block {
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 6px 8px;
  background: #fff;
  margin: 6px 0;
  page-break-inside: avoid;
}

.block.mini {
  margin: 4px 0;
  padding: 4px 6px;
  border-radius: 4px;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 2px 6px;
}

.card-grid.triple {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.card-item {
  font-size: 11pt;
}

.card-item-label {
  display: block;
  color: var(--muted);
}

.card-item-value {
  display: block;
  font-weight: 600;
}
  /* Compact HBM month tables */
.month-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 2px;
}

.month-table th,
.month-table td {
  border: 1px solid #cbd5e1;
  padding: 1px 3px;
  font-size: 9pt;
  vertical-align: top;
}

.month-table th {
  background: #e0f2f5;
  font-weight: 600;
}

.month-table th.month-header {
  text-align: center;
}

.month-card.block.mini {
  padding: 4px 5px;
  margin: 3px 0;
}


.no-rec {
  font-style: italic;
  color: var(--muted);
  font-size: 11pt;
}

table {
  width: 100%;
  border-collapse: collapse;
}

table.kv td:first-child {
  width: 40%;
  color: var(--muted);
}

table.kv td {
  border-bottom: 1px dashed #e6eef2;
  padding: 2px 4px;
  vertical-align: top;
  font-size: 11pt;
}

table.kv tr:last-child td {
  border-bottom: 0;
}

table.grid {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

table.grid th,
table.grid td {
  border: 1px solid var(--tealDeep);
  padding: 3px 4px;
  vertical-align: top;
  font-size: 11pt;
}

table.grid thead th {
  background: var(--teal);
  color: #fff;
  font-weight: 800;
  text-transform: uppercase;
}
            
table.grid .subhead th {
  background:#e6f5f6;
  color:#0b3d48;
  text-transform:none;
  font-weight:700;
}

.blank {
  display:inline-block;
  min-width:40px;
  border-bottom:1px solid #94a3b8;
  padding:0 2px;
  font-weight:700;
}

.plan-body p {
  margin: 3px 0;
  font-size: 11pt;
}

/* Compact monthly tables (HBM current) */
.month-card .h.mini { margin-bottom: 2px; }
.month-card .sub {
  font-size: 10pt;
  color: var(--muted);
  margin-bottom: 2px;
}
.month-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 9.5pt;
}
.month-table td {
  padding: 1px 3px;
  vertical-align: top;
}
.month-table td.lbl {
  color: var(--muted);
  white-space: nowrap;
}
.month-table td.val {
  font-weight: 600;
}

/* two-column key/value grid used in download layout for some sections */
.kv2 {
  display:grid;
  grid-template-columns: 34mm 1fr 34mm 1fr;
  gap:4px 10px;
}
.k {
  color:var(--muted);
  font-size:11pt;
}
.v {
  font-weight:700;
  font-size:11pt;
}
`;

    // ---------- PAGE 1: ITR ----------
    const itrSheet = `
<div class="sheet sheet-itr">
  <div class="brand">
    <div class="logo">${logoSrc ? `<img src="${logoSrc}" alt=""/>` : "OH"}</div>
    <div>
      <div class="title">ONE HEALTH — Prenatal Card</div>
      <div class="sub">ITR · Pregnancy &amp; Visits</div>
    </div>
  </div>
  <div class="rule"></div>

  <section class="block">
    <div class="h">Patient Information</div>
    <table class="kv">
      <tr><td>Full name</td><td>${esc(S(patient?.full_name))}</td></tr>
      <tr><td>Barangay</td><td>${esc(S(patient?.barangay))}</td></tr>
      <tr><td>Address</td><td>${esc(S(patient?.address))}</td></tr>
      <tr><td>Birthday</td><td>${fmt(patient?.birthdate)}</td></tr>
      <tr><td>Age</td><td>${esc(S(age_years))}</td></tr>
      <tr><td>Height (cm)</td><td>${esc(S(patient?.height_cm))}</td></tr>
      <tr><td>Civil Status</td><td>${esc(S(patient?.civil_status))}</td></tr>
      <tr><td>PhilHealth #</td><td>${esc(
      S(
        (patient as any)?.philhealth_number ??
        (patient as any)?.philhealth ??
        (patient as any)?.philhealth_no
      )
    )}</td></tr>
    </table>
  </section>

  <section class="block">
    <div class="h">ITR — Pregnancy Details</div>
    <table class="kv">
      <tr><td>OB: G</td><td>${esc(S(itrNorm?.ob_g))}</td></tr>
      <tr><td>OB: P</td><td>${esc(S(itrNorm?.ob_p))}</td></tr>
      <tr><td>OB: GTPAL</td><td>${esc(S(itrNorm?.ob_gtpal))}</td></tr>
      <tr><td>LMP</td><td>${fmt(itrNorm?.lmp_date)}</td></tr>
      <tr><td>EDD</td><td>${fmt(itrNorm?.edd_date)}</td></tr>
    </table>
  </section>

  <section class="block">
    <div class="grid2">
      <div>
        <div class="h mini">Risk Codes</div>
        <table class="grid">
          <thead><tr><th style="width:18%">Code</th><th style="width:22%">Flag</th><th>Date noted</th></tr></thead>
          <tbody>${riskRow("A")}${riskRow("B")}${riskRow("C")}${riskRow(
      "D"
    )}${riskRow("E")}</tbody>
        </table>
      </div>
      <div>
        <div class="h mini">TT &amp; Vitamin A</div>
        <table class="grid">
          <thead><tr><th style="width:40%">Item</th><th>Date</th></tr></thead>
          <tbody>${ttDates}</tbody>
        </table>
      </div>
    </div>
  </section>

  ${visits.length
        ? `<section class="block">
          <div class="h">Prenatal Visits</div>
          <table class="grid">
            <thead>
              <tr>
                <th style="width:12%">Date</th>
                <th style="width:8%">BP</th>
                <th style="width:6%">PR</th>
                <th style="width:6%">RR</th>
                <th style="width:7%">Temp</th>
                <th style="width:7%">Wt</th>
                <th style="width:8%">Fundic Ht</th>
                <th style="width:8%">FHR</th>
                <th style="width:8%">Iron #</th>
                <th style="width:9%">Trimester</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>${visitRows}</tbody>
          </table>
        </section>`
        : ""
      }
</div>`;

    // ---------- PAGE 2: HBM ----------
    const historySection = history
      ? `<section class="block">
          <div class="h">HBM — Initial History (Summary)</div>
          <table class="kv">${[
        ["Blood type", history?.blood_type ?? plan?.blood_type],
        [
          "Recommend hospital delivery",
          YN(history?.recommend_hospital_delivery),
        ],
        ["Age (years)", history?.age_years ?? age_years],
        [
          "Height (cm)",
          history?.height_cm ??
          patient?.height_cm ??
          (history as any)?.height,
        ],
        ["TT1", fmt(history?.tt1_date ?? itrNorm?.tt1_date)],
        ["TT2", fmt(history?.tt2_date ?? itrNorm?.tt2_date)],
        ["TT3", fmt(history?.tt3_date ?? itrNorm?.tt3_date)],
        ["TT4", fmt(history?.tt4_date ?? itrNorm?.tt4_date)],
        ["TT5", fmt(history?.tt5_date ?? itrNorm?.tt5_date)],
        [
          "3 consecutive abortions",
          YN(history?.three_consecutive_abortions),
        ],
        ["Stillbirth history", YN(history?.stillbirth_history)],
        ["PPH history", YN(history?.pph_history)],
        ["Tuberculosis (current)", YN(history?.tb_current)],
        ["Heart disease (current)", YN(history?.heart_disease_current)],
        ["Diabetes (current)", YN(history?.diabetes_current)],
        ["Asthma (current)", YN(history?.asthma_current)],
        ["Goiter (current)", YN(history?.goiter_current)],
      ]
        .map(
          (r) => `<tr><td>${esc(r[0] as string)}</td><td>${r[1]}</td></tr>`
        )
        .join("")}</table>
        </section>`
      : "";

    const supplementsReferralSection = `
<section class="block">
  <div class="h">Supplements &amp; Referral</div>
  <table class="kv">${[
        ["Vitamin A date", fmt(aft?.supplements?.vitamin_a_date)],
        ["Iron/Folate date", fmt(aft?.supplements?.iron_folate_date)],
        ["Iron/Folate qty", esc(S(aft?.supplements?.iron_folate_count))],
        ["Referred", YN(aft?.referral?.referred)],
        ["Referral reason", esc(S(aft?.referral?.reason))],
        ["Institution", esc(S(aft?.referral?.institution))],
      ]
        .map(
          (r) => `<tr><td>${esc(r[0] as string)}</td><td>${r[1]}</td></tr>`
        )
        .join("")}</table>
</section>`;

    const familyPlanningSection = `
<section class="block">
  <div class="h">Family Planning</div>
  <table class="kv">${[
        ["Follow-up date", fmt(aft?.fp?.followup_date)],
        ["Consult date", fmt(aft?.fp?.consult_date)],
        ["Method", esc(S(aft?.fp?.method))],
        ["Qty given", esc(S(aft?.fp?.given_qty))],
        ["Notes", esc(S(aft?.fp?.notes))],
      ]
        .map(
          (r) => `<tr><td>${esc(r[0] as string)}</td><td>${r[1]}</td></tr>`
        )
        .join("")}</table>
  ${fpRowsHtml}
</section>`;
    const afterC1 = afterBox("c1", "24 hours");
    const afterC2 = afterBox("c2", "Day 3");
    const afterC3 = afterBox("c3", "1 Week");
    const afterC4 = afterBox("c4", "2–4 Weeks / Clinic");
    const anyAfter = !!(afterC1 || afterC2 || afterC3 || afterC4);

    const hbmSheet = `
<div class="sheet sheet-hbm">
  <div class="brand">
    <div class="logo">${logoSrc ? `<img src="${logoSrc}" alt=""/>` : "OH"}</div>
    <div>
      <div class="title">ONE HEALTH — Prenatal Card</div>
      <div class="sub">HBM · History, Current &amp; After</div>
    </div>
  </div>
  <div class="rule"></div>

  <section class="block">
    <div class="h">Patient Information</div>
    <table class="kv">
      <tr><td>Full name</td><td>${esc(S(patient?.full_name))}</td></tr>
      <tr><td>Barangay</td><td>${esc(S(patient?.barangay))}</td></tr>
      <tr><td>Address</td><td>${esc(S(patient?.address))}</td></tr>
      <tr><td>Birthday</td><td>${fmt(patient?.birthdate)}</td></tr>
      <tr><td>Age</td><td>${esc(S(age_years))}</td></tr>
    </table>
  </section>

  ${historySection}

  <section class="block">
    <div class="h">HBM — Current (Top)</div>
    <table class="kv">
      <tr><td>LMP</td><td>${fmt(cur?.top?.lmp_date)}</td></tr>
      <tr><td>EDD</td><td>${fmt(cur?.top?.edd_date)}</td></tr>
      <tr><td>Pregnancy number</td><td>${esc(
      S(cur?.top?.pregnancy_number)
    )}</td></tr>
    </table>
  </section>

  ${hasMonthGroups
        ? `<section class="block">
          <div class="h">HBM — Monthly Details</div>
          <div class="grid2">${monthCards}</div>
        </section>`
        : `<section class="block">
          <div class="h">HBM — Monthly Details</div>
          <p class="no-rec">No record yet.</p>
        </section>`
      }

  ${anyAfter
        ? `<section class="block">
           <div class="h">HBM — Postpartum Visits</div>
           <div class="grid2">${afterC1}${afterC2}${afterC3}${afterC4}</div>
         </section>`
        : `<section class="block">
           <div class="h">HBM — Postpartum Visits</div>
           <p class="no-rec">No record yet.</p>
         </section>`
      }

  ${supplementsReferralSection}
  ${familyPlanningSection}
</div>`;

    // ---------- PAGE 3: Birth Plan ----------
    const birthPlanSection = planHasAnyContent
      ? `<section class="block">
          <div class="h">BIRTH &amp; EMERGENCY PLAN</div>
          <div class="plan-body">
            <p>“I KNOW THAT COMPLICATION CAN DEVELOP AT ANY TIME IN THE COURSE OF THIS PREGNANCY, CHILDBIRTH. I KNOW THAT THE BEST PLACE TO DELIVER MY BABY IS IN THE HEALTH FACILITY.”</p>
            <p>“I WILL BE ATTENDED AT DELIVERY BY ${planBlank(
        plan_attending_personnel
      )}.”</p>
            <p>“I PLAN TO DELIVER AT ${planBlank(plan_planned_facility)}.”</p>
            <p>“THIS IS A PHILHEALTH ACCREDITED FACILITY” ${planBlank(
        plan_philhealth || "—"
      )}</p>
            <p>“THE ESTIMATED COST OF THE MATERNITY PACKAGE IN THIS FACILITY IS PHP ${planBlank(
        plan_estimated_cost
      )} (INCLUSIVE OF NEWBORN CARE).”</p>
            <p>“THE MODE OF PAYMENT IS ${planBlank(plan_mode_of_payment)}.”</p>
            <p>“THE AVAILABLE TRANSPORT IS ${planBlank(plan_transport)}.”</p>
            <p>“I HAVE CONTACTED ${planBlank(
        plan_companion_name
      )}, RESIDING AT ${planBlank(
        plan_companion_address
      )} AND WITH CONTACT NUMBER ${planBlank(
        plan_companion_contact
      )} TO BRING ME TO THE HOSPITAL/MATERNITY CLINIC/HEALTH CENTER.”</p>
            <p>“I WILL BE ACCOMPANIED BY ${planBlank(
        plan_family_companion_name
      )}, WHO IS MY ${planBlank(
        plan_family_companion_relationship
      )}, RESIDING AT ${planBlank(
        plan_family_companion_address
      )}, AND WITH CONTACT NUMBER ${planBlank(
        plan_family_companion_contact
      )}.”</p>
            <p>“${planBlank(
        plan_caretaker_name
      )}, MY ${planBlank(
        plan_caretaker_relationship
      )}, WILL TAKE CARE OF MY CHILDREN/HOME WHILE I AM IN THE HEALTH FACILITY.”</p>
            <p>“MY BLOOD TYPE IS ${planBlank(plan_blood_type)}.”</p>
            <p>“IN CASE OF A NEED FOR A BLOOD TRANSFUSION, MY POSSIBLE DONORS ARE:”</p>
            <p>&nbsp;&nbsp;&nbsp;&nbsp;${planBlank(
        plan_blood_donor1_name
      )}, ${planBlank(plan_blood_donor1_address)}</p>
            <p>&nbsp;&nbsp;&nbsp;&nbsp;${planBlank(
        plan_blood_donor2_name
      )}, ${planBlank(plan_blood_donor2_address)}</p>
            <p>“IN CASE OF COMPLICATION, I SHOULD BE REFERRED RIGHT AWAY TO:”</p>
            <p>“CONTACT PERSON: ${planBlank(plan_emergency_contact_name)}”</p>
            <p>“ADDRESS: ${planBlank(
        plan_emergency_contact_address
      )} TEL. NO.: ${planBlank(plan_emergency_contact_contact)}.”</p>
            <p>“THE NEAREST MATERNAL AND NEWBORN HEALTH FACILITY TO MY RESIDENCE ARE:”</p>
            <p>&nbsp;&nbsp;&nbsp;&nbsp;“MATERNAL HOSPITAL: ${planBlank(
        plan_maternal_hospital1_name
      )} ADDRESS: ${planBlank(
        plan_maternal_hospital1_address
      )}”</p>
            <p>&nbsp;&nbsp;&nbsp;&nbsp;“MATERNAL HOSPITAL: ${planBlank(
        plan_maternal_hospital2_name
      )} ADDRESS: ${planBlank(
        plan_maternal_hospital2_address
      )}”</p>
            <div style="margin-top:14px;">
  <table style="width:100%; border-collapse:collapse;">
    <tr>
      <td style="width:65%; vertical-align:bottom; padding-right:16px;">
        <div style="font-size:11pt; color:#64748b; margin-bottom:6px;">Conforme</div>

        ${plan_signature_src
        ? `<div style="width:240px; height:90px; display:flex; align-items:center; justify-content:center; border:1px solid #cbd5e1; border-radius:6px; background:#fff; padding:8px;">
                 <img
                   src="${plan_signature_src}"
                   alt="Patient signature"
                   style="max-width:100%; max-height:70px; object-fit:contain; display:block;"
                 />
               </div>`
        : `<div style="width:240px; height:90px; border:1px dashed #cbd5e1; border-radius:6px; background:#f8fafc;"></div>`
      }

        <div style="width:240px; margin-top:8px; padding-top:4px; border-top:1px solid #94a3b8; font-weight:700;">
          ${esc(S(plan_signature_name))}
        </div>
        <div style="font-size:10pt; color:#64748b;">Signature over printed name</div>
      </td>

      <td style="width:35%; vertical-align:bottom;">
        <div style="font-size:11pt; color:#64748b; margin-bottom:6px;">Date</div>
        <div style="padding-bottom:4px; border-bottom:1px solid #94a3b8; font-weight:700;">
          ${fmt(plan_date)}
        </div>
      </td>
    </tr>
  </table>
</div>
          </div>
        </section>`
      : `<section class="block">
          <div class="h">BIRTH &amp; EMERGENCY PLAN</div>
          <p>No birth &amp; emergency plan recorded yet.</p>
        </section>`;

    const planSheet = `
<div class="sheet sheet-plan">
  <div class="brand">
    <div class="logo">${logoSrc ? `<img src="${logoSrc}" alt=""/>` : "OH"}</div>
    <div>
      <div class="title">ONE HEALTH — Prenatal Card</div>
      <div class="sub">Birth &amp; Emergency Plan</div>
    </div>
  </div>
  <div class="rule"></div>

  <section class="block">
    <div class="h">Patient Information</div>
    <table class="kv">
      <tr><td>Full name</td><td>${esc(S(patient?.full_name))}</td></tr>
      <tr><td>Barangay</td><td>${esc(S(patient?.barangay))}</td></tr>
      <tr><td>Address</td><td>${esc(S(patient?.address))}</td></tr>
    </table>
  </section>

  ${birthPlanSection}
</div>`;

    const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Prenatal Card — ${esc(patient?.full_name || "Patient")}</title>
<meta name="viewport" content="width=device-width,initial-scale=1" />
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap" rel="stylesheet"/>
<style>
${css}
</style>
</head>
<body>
  ${itrSheet}
  ${hbmSheet}
  ${planSheet}
  <script>window.addEventListener('load',()=>setTimeout(()=>window.print(),0));</script>
</body>
</html>`;

    const iframeId = "__prenatal_print_iframe";
    let iframe = document.getElementById(iframeId) as HTMLIFrameElement | null;

    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.id = iframeId;
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.style.visibility = "hidden";
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      console.error("Failed to access print iframe document");
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();
  } catch (e) {
    console.error(e);
    window.print(); // fallback
  }
}


/* ────────────────────────────────────────────────────────────────────────────
   Icons (outline)
──────────────────────────────────────────────────────────────────────────── */
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


/* ────────────────────────────────────────────────────────────────────────────
   Reusable UI
──────────────────────────────────────────────────────────────────────────── */
function HeaderBar({ onBack }: { onBack: () => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur screen-only">
      <div className="mx-auto max-w-7xl h-14 px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex h-full items-center justify-between gap-2">

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <img src={BackIcon} alt="" className="h-5 w-5 -ml-0.5" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <button
              type="button"
              onClick={downloadCard}
              title="Print (same tab)"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <IconPrint className="h-5 w-5" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              type="button"
              onClick={printCardPDF}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <IconDownload className="h-5 w-5" />
              <span className="hidden sm:inline">Download</span>
            </button>
          </div>

          {/* Page title */}
          <h1 className="hidden sm:block text-base md:text-lg font-semibold tracking-tight text-slate-900">
            My Prenatal Record
          </h1>


          {/* Brand block */}
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
                Patient · Prenatal
              </div>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}

function Tabs<T extends string>({
  items,
  value,
  onChange,
}: {
  items: { key: T; label: string }[];
  value: T;
  onChange: (k: T) => void;
}) {
  return (
    <div className="w-full">
      <div className="hidden sm:flex gap-2">
        {items.map((it) => {
          const active = it.key === value;
          return (
            <button
              key={String(it.key)}
              onClick={() => onChange(it.key)}
              className={[
                "px-3 py-2 rounded-md text-sm font-semibold transition",
                active
                  ? "bg-[#0F8A99] text-white shadow-sm"
                  : "bg-white text-slate-800 border border-slate-200 hover:bg-slate-50",
              ].join(" ")}
            >
              {it.label}
            </button>
          );
        })}
      </div>
      <div className="sm:hidden">
        <select
          value={String(value)}
          onChange={(e) => onChange(e.target.value as T)}
          className="w-full rounded-md border px-3 py-2"
        >
          {items.map((it) => (
            <option key={String(it.key)} value={String(it.key)}>
              {it.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function Section({
  title,
  actions,
  children,
}: React.PropsWithChildren<{ title: string; actions?: React.ReactNode }>) {
  return (
    <section className="rounded-md border border-slate-300 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 sm:px-4 py-2.5">
        <h2 className="text-[15px] md:text-[16px] font-semibold text-[#203D7A]">
          {title}
        </h2>
        {actions ? <div className="ml-4">{actions}</div> : null}
      </div>
      <div className="px-3 sm:px-4 py-3">{children}</div>
    </section>
  );
}

function KV({
  label,
  value,
  className = "",
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`grid grid-cols-[140px_1fr] gap-2 text-[14px] ${className}`}
    >
      <div className="text-slate-600">{label}</div>
      <div className="font-medium text-slate-900 break-words">
        {value ?? EMPTY}
      </div>
    </div>
  );
}

function DividerLine() {
  return <div className="h-px bg-slate-200 my-1" />;
}

/* ────────────────────────────────────────────────────────────────────────────
   Patient Information
──────────────────────────────────────────────────────────────────────────── */
function PatientInfo({
  patient,
  history,
}: {
  patient: Patient;
  history?: any;
}) {
  const height =
    patient?.height_cm ?? history?.height_cm ?? history?.height ?? null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="px-4 py-3 border-b border-slate-200">
        <h2 className="text-[16px] md:text-[17px] font-semibold text-[#203D7A]">
          Patient Information
        </h2>
      </div>
      <div className="p-4">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="divide-y divide-slate-200">
            <KV
              label="Full name"
              value={
                <span className="font-semibold">{toStr(patient?.full_name)}</span>
              }
              className="py-2"
            />
            <KV
              label="Address"
              value={
                <span className="font-semibold uppercase tracking-wide">
                  {toStr(patient?.address)}
                </span>
              }
              className="py-2"
            />
            <KV
              label="Age"
              value={calcAgeYears(patient?.birthdate)}
              className="py-2"
            />
            <KV
              label="Civil Status"
              value={
                <span className="font-semibold">{toStr(patient?.civil_status)}</span>
              }
              className="py-2"
            />
            <KV
              label="Phone"
              value={
                <span className="font-semibold">
                  {toStr(
                    patient?.phone_number ??
                    (patient as any)?.contact_number ??
                    (patient as any)?.phone
                  )}
                </span>
              }
              className="py-2"
            />
          </div>
          <div className="divide-y divide-slate-200">
            <KV
              label="Barangay"
              value={<span className="font-semibold">{toStr(patient?.barangay)}</span>}
              className="py-2"
            />
            <KV
              label="Birthday"
              value={<span className="font-semibold">{fmtDate(patient?.birthdate)}</span>}
              className="py-2"
            />
            <KV
              label="Height (cm)"
              value={<span className="font-semibold">{toStr(height)}</span>}
              className="py-2"
            />
            <KV
              label="PhilHealth #"
              value={
                <span className="font-semibold">
                  {toStr(
                    patient?.philhealth_number ??
                    (patient as any)?.philhealth ??
                    (patient as any)?.philhealth_no
                  )}
                </span>
              }
              className="py-2"
            />
            <KV
              label="Family No."
              value={
                <span className="font-semibold">
                  {toStr((patient as any)?.family_no)}
                </span>
              }
              className="py-2"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Main Component — READ ONLY PRENATAL CARD
──────────────────────────────────────────────────────────────────────────── */
export default function PatientPrenatalCard(props: PageProps) {
  const { patient, itr, plan, visits, history, current, postnatal, after } = props;

  const cur = normalizeCurrent(current || {});
  const aft = normalizeAfter(after || postnatal || {});
  const itrNorm = normalizeITR(itr || {}, cur.top, history || {}, after || postnatal || {});

  const printPayload = React.useMemo(
    () => ({
      patient,
      itrNorm,
      cur,
      aft,
      plan: plan || {},
      plan_signature_src: normalizePrintableSignatureSrc(plan || {}),
      history: history || {},
      visits: Array.isArray(visits) ? visits : [],
      age_years: calcAgeYears(patient?.birthdate),
    }),
    [patient, itrNorm, cur, aft, plan, history, visits]
  );

  const [mainTab, setMainTab] = React.useState<"itr" | "hbm">("itr");

  const itrTabs = [
    { key: "preg", label: "Pregnancy Details" },
    { key: "tt", label: "TT & Vit A" },
    { key: "vis", label: "Visits" },
    { key: "plan", label: "Birth Plan" },
  ] as const;
  const [itrTab, setItrTab] =
    React.useState<(typeof itrTabs)[number]["key"]>("preg");

  const hbmTabs = [
    { key: "history", label: "History" },
    { key: "current", label: "Current" },
    { key: "after", label: "After" },
  ] as const;
  const [hbmTab, setHbmTab] =
    React.useState<(typeof hbmTabs)[number]["key"]>("history");

  const goBack = () => {
    window.location.href = "/patient/dashboard";
  };


  /** Human label for a month card (UI) */
  const monthLabel = (n: number) => {
    if (n === 1) return "Months 1–3";
    const ord =
      n === 2
        ? "2nd"
        : n === 3
          ? "3rd"
          : n === 4
            ? "4th"
            : n === 5
              ? "5th"
              : n === 6
                ? "6th"
                : n === 7
                  ? "7th"
                  : n === 8
                    ? "8th"
                    : n === 9
                      ? "9th"
                      : `${n}th`;
    return `${ord} month`;
  };

  /** Only show months that actually have data; hide 2nd & 3rd because 1–3 are grouped. */
  const hasCurrentMonthData = (m: any) => {
    if (!m) return false;
    if (m.month_index === 2 || m.month_index === 3) return false;
    const ignore = new Set(["month_index", "column_index"]);
    return Object.keys(m).some((key) => {
      if (ignore.has(key)) return false;
      const v = (m as any)[key];
      return v !== null && v !== undefined && v !== "";
    });
  };

  const monthsToShow = cur.months.filter(hasCurrentMonthData);

  // Which postpartum visit period the patient is viewing (24h / Day 3 / 1wk / 2–4wk)
  const [afterCol, setAfterCol] = React.useState<AfterColKey>("c1");

  /* ───────── Birth Plan: normalize fields using the same names as ITRBirthPlan ───────── */
  const planAny: any = plan || {};
  const planHasAnyContent = Object.values(planAny || {}).some(
    (v) => v !== null && v !== undefined && String(v).trim() !== ""
  );

  const plan_attending_personnel =
    pick(planAny, "attending_personnel", "attending") ?? "";
  const plan_planned_facility = pick(planAny, "planned_facility") ?? "";
  const plan_philhealth_raw = pick(
    planAny,
    "planned_facility_is_philhealth",
    "philhealth_accredited"
  );
  const plan_philhealth =
    plan_philhealth_raw === null ||
      plan_philhealth_raw === undefined ||
      plan_philhealth_raw === ""
      ? ""
      : boolish(plan_philhealth_raw)
        ? "Yes"
        : "No";
  const plan_estimated_cost = pick(planAny, "estimated_cost") ?? "";
  const plan_mode_of_payment = pick(planAny, "mode_of_payment") ?? "";
  const plan_transport =
    pick(planAny, "available_transport", "transport") ?? "";

  const plan_companion_name =
    pick(planAny, "companion_name", "companion1_name") ?? "";
  const plan_companion_address =
    pick(planAny, "companion_address") ?? "";
  const plan_companion_contact =
    pick(planAny, "companion_contact", "companion1_contact") ?? "";

  const plan_family_companion_name =
    pick(planAny, "family_companion_name") ?? "";
  const plan_family_companion_relationship =
    pick(planAny, "family_companion_relationship") ?? "";
  const plan_family_companion_address =
    pick(planAny, "family_companion_address") ?? "";
  const plan_family_companion_contact =
    pick(planAny, "family_companion_contact", "companion2_contact") ?? "";

  const plan_caretaker_name = pick(planAny, "caretaker_name") ?? "";
  const plan_caretaker_relationship =
    pick(planAny, "caretaker_relationship") ?? "";

  const plan_blood_type =
    pick(planAny, "blood_type") ??
    pick(history || {}, "blood_type") ??
    "";

  const plan_blood_donor1_name =
    pick(planAny, "blood_donor_1_name") ?? "";
  const plan_blood_donor1_address =
    pick(planAny, "blood_donor_1_address") ?? "";
  const plan_blood_donor2_name =
    pick(planAny, "blood_donor_2_name") ?? "";
  const plan_blood_donor2_address =
    pick(planAny, "blood_donor_2_address") ?? "";

  const plan_emergency_contact_name =
    pick(planAny, "emergency_contact_name") ?? "";
  const plan_emergency_contact_address =
    pick(planAny, "emergency_contact_address") ?? "";
  const plan_emergency_contact_contact =
    pick(planAny, "emergency_contact_contact") ?? "";

  const plan_maternal_hospital1_name =
    pick(planAny, "maternal_hospital_1_name") ?? "";
  const plan_maternal_hospital1_address =
    pick(planAny, "maternal_hospital_1_address") ?? "";
  const plan_maternal_hospital2_name =
    pick(planAny, "maternal_hospital_2_name") ?? "";
  const plan_maternal_hospital2_address =
    pick(planAny, "maternal_hospital_2_address") ?? "";

  const plan_signature_name = pick(planAny, "signature_name") ?? "";
  const plan_date = pick(planAny, "plan_date") ?? "";
  const plan_signature_src = normalizePrintableSignatureSrc(planAny);

  const planValueOrEmpty = (v: any) =>
    v === null || v === undefined || v === ""
      ? EMPTY
      : String(v);

  return (
    <div className="min-h-screen bg-[#f6fbfb]">
      <Head title="Prenatal" />

      <style>{`
        .scrollbar-min{scrollbar-width:thin;scrollbar-color:#94a3b8 transparent}
        .scrollbar-min::-webkit-scrollbar{height:8px;width:8px}
        .scrollbar-min::-webkit-scrollbar-track{background:transparent}
        .scrollbar-min::-webkit-scrollbar-thumb{background:#94a3b8;border-radius:8px}
        @media print{ .screen-only{display:none !important} body{background:white !important} }
      `}</style>

      <HeaderBar onBack={goBack} />

      {/* Hidden JSON payload for print/download builders */}
      <script
        id="prenatal-data"
        type="application/json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(printPayload) }}
      />

      <main
        id="prenatal-printable"
        className="mx-auto max-w-5xl px-4 py-6 space-y-6"
      >
        {/* [PATIENT INFORMATION CARD] */}
        <PatientInfo patient={patient} history={history} />

        {/* [ITR / HBM] main tabs */}
        <Tabs
          items={[
            { key: "itr", label: "ITR" },
            { key: "hbm", label: "HBM" },
          ] as const}
          value={mainTab}
          onChange={(k) => setMainTab(k as any)}
        />

        {/* ============================ ITR ============================ */}
        {mainTab === "itr" && (
          <>
            {/* ITR sub-tabs: Pregnancy Details, TT & Vit A, Visits, Birth Plan */}
            <Tabs
              items={itrTabs as any}
              value={itrTab}
              onChange={(k) => setItrTab(k as any)}
            />

            <div className="space-y-6">
              {/* ============ [PREGNANCY DETAILS TAB] ============ */}
              {itrTab === "preg" && (
                <>
                  {/* “OBSTETRICS (OB)” */}
                  <Section title="OBSTETRICS (OB)">
                    <div className="grid gap-3 md:grid-cols-2">
                      <KV
                        label="Last Menstrual Period (LMP)"
                        value={fmtDate(itrNorm.lmp_date)}
                      />
                      <KV
                        label="Estimated Date of Confinement (EDC)"
                        value={fmtDate(itrNorm.edd_date)}
                      />
                    </div>
                  </Section>

                  {/* “OB SCORE & HISTORY” */}
                  <Section title="OB Score & History">
                    <div className="grid gap-3 md:grid-cols-3">
                      <KV label="G (Gravida)" value={toStr(itrNorm.ob_g)} />
                      <KV label="P (Para)" value={toStr(itrNorm.ob_p)} />
                      <KV label="GTPAL" value={toStr(itrNorm.ob_gtpal)} />
                    </div>
                  </Section>

                  {/* “RISK CODES” – with yellow ring highlight when FLAG = Yes */}
                  <Section title="Risk Codes">
                    <div className="grid gap-4 md:grid-cols-2">
                      {(
                        [
                          ["A", "Age (<20 or >35), short stature, etc."],
                          ["B", "History of obstetric complication."],
                          ["C", "Current conditions / complications (e.g., PIH)."],
                          ["D", "Danger signs / emergency conditions identified."],
                          ["E", "Other medical conditions."],
                        ] as const
                      ).map(([code, desc]) => {
                        const entry = (itrNorm.risk as any)[code] || {};
                        const flagLabel = yesNoDisplay(entry.flag);
                        const isFlagYes = flagLabel === "Yes";

                        return (
                          <article
                            key={code}
                            className={[
                              "rounded-md p-3 text-sm transition-shadow",
                              isFlagYes
                                ? "border border-amber-300 ring-2 ring-amber-200 bg-amber-50/70 shadow-sm"
                                : "border border-slate-200 bg-white",
                            ].join(" ")}
                          >
                            {/* First row: [RISK LETTER, DESCRIPTION] */}
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="text-[13px] font-semibold text-slate-900">
                                  Risk {code}
                                </div>
                                <div className="text-[12px] text-slate-600">
                                  {desc}
                                </div>
                              </div>
                              {isFlagYes && (
                                <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                                  FLAGGED
                                </span>
                              )}
                            </div>

                            {/* Second row: [FLAG: __] [DATE NOTED: __] */}
                            <div className="mt-3 grid gap-2 sm:grid-cols-2 text-[13px]">
                              <div className="flex items-baseline gap-1">
                                <span className="text-slate-500 font-medium">
                                  Flag:
                                </span>
                                <span className="font-semibold text-slate-900">
                                  {flagLabel}
                                </span>
                              </div>
                              <div className="flex items-baseline gap-1">
                                <span className="text-slate-500 font-medium">
                                  Date noted:
                                </span>
                                <span className="font-medium text-slate-900">
                                  {fmtDate(entry.date)}
                                </span>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </Section>
                </>
              )}

              {/* ============ [TT & VIT A] TAB (KEEP LAYOUT) ============ */}
              {itrTab === "tt" && (
                <Section title="Tetanus Toxoid & Vitamin A">
                  <div className="grid gap-3 md:grid-cols-2">
                    <KV label="TT1" value={fmtDate(itrNorm.tt1_date)} />
                    <KV label="TT2" value={fmtDate(itrNorm.tt2_date)} />
                    <KV label="TT3" value={fmtDate(itrNorm.tt3_date)} />
                    <KV label="TT4" value={fmtDate(itrNorm.tt4_date)} />
                    <KV label="TT5" value={fmtDate(itrNorm.tt5_date)} />
                    <KV
                      label="Post-partum Vitamin A"
                      value={fmtDate(
                        itrNorm.vitamin_a_postpartum_date ??
                        aft.supplements.vitamin_a_date
                      )}
                    />
                  </div>
                </Section>
              )}

              {/* ============ [VISITS] TAB ============ */}
              {itrTab === "vis" && (
                <Section title="Prenatal Visits">
                  {!visits || visits.length === 0 ? (
                    <div className="text-[14px] text-slate-700">
                      No prenatal visits recorded yet.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {visits.map((v: any, i: number) => {
                        const visit_date =
                          v?.visit_date ?? v?.date ?? v?.checked_at ?? null;
                        const bp = v?.bp ?? v?.blood_pressure ?? null;
                        const pr = v?.pr ?? v?.pulse_rate ?? null;
                        const rr = v?.rr ?? v?.respiratory_rate ?? null;
                        const temp =
                          v?.temp ?? v?.temperature_c ?? v?.temperature ?? null;
                        const wt = v?.wt ?? v?.weight ?? null;
                        const fh =
                          v?.fh ??
                          v?.fundic_height ??
                          v?.fundal_height ??
                          null;
                        const fhr =
                          v?.fhr ??
                          v?.fetal_heart_tone ??
                          v?.fetal_heart_rate ??
                          null;
                        const iron = v?.iron_tablets ?? v?.iron_tabs ?? v?.feso4_caps ?? v?.feso4 ?? null;
                        const trimester = v?.trimester ?? null;
                        const remarks = v?.remarks ?? v?.notes ?? null;

                        return (
                          <article
                            key={v.id ?? i}
                            className="rounded-md border border-slate-200 bg-white p-3"
                          >
                            {/* First row: [NUMBER OF THE VISIT] [VISIT DATE] */}
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2 mb-2">
                              <div className="text-[13px] text-slate-700">
                                Number of the visit:{" "}
                                <span className="font-semibold text-slate-900">
                                  #{i + 1}
                                </span>
                              </div>
                              <div className="text-[13px] text-slate-700">
                                Visit date:{" "}
                                <span className="font-semibold text-slate-900">
                                  {fmtDate(visit_date)}
                                </span>
                              </div>
                            </div>

                            {/* Second row: vitals & details, responsive columns */}
                            <div className="grid gap-2 text-[13px] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                              {[
                                ["BP", bp],
                                ["RR", rr],
                                ["PR", pr],
                                ["Weight (kg)", wt],
                                ["Temperature (°C)", temp],
                                ["Fundic height (cm)", fh],
                                ["Fetal heart tone (bpm)", fhr],
                                ["Iron with Folic Acid (tablets given)", iron],
                                ["Trimester number", trimester],
                              ].map(([label, val]) => (
                                <div
                                  key={label as string}
                                  className="flex items-baseline gap-1"
                                >
                                  <span className="text-slate-500 font-medium">
                                    {label}:
                                  </span>
                                  <span className="font-semibold text-slate-900">
                                    {val === null || val === undefined || val === ""
                                      ? EMPTY
                                      : String(val)}
                                  </span>
                                </div>
                              ))}

                              {/* Remarks spans full row on wide screens */}
                              <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4 2xl:col-span-5">
                                <span className="text-slate-500 font-medium">
                                  Remarks:
                                </span>{" "}
                                <span className="font-medium text-slate-900">
                                  {remarks === null ||
                                    remarks === undefined ||
                                    remarks === ""
                                    ? EMPTY
                                    : String(remarks)}
                                </span>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </Section>
              )}

              {/* ============ [BIRTH PLAN] TAB ============ */}
              {itrTab === "plan" && (
                <Section title="Birth & Emergency Plan">
                  {!planHasAnyContent ? (
                    <div className="text-[14px] text-slate-700">
                      No birth &amp; emergency plan recorded yet.
                    </div>
                  ) : (
                    <div className="space-y-4 text-[13px] leading-relaxed text-slate-800">
                      {/* Intro statement */}
                      <p className="text-[13px] text-slate-700">
                        I know that any complication can develop at any time in the
                        course of this pregnancy, childbirth and after birth. I know
                        that the best place to deliver my baby is in the health
                        facility.
                      </p>

                      {/* Facility & cost */}
                      <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50/70 px-3 py-2">
                        <p>
                          I will be attended at delivery by{" "}
                          <span className="font-semibold underline decoration-slate-400">
                            {planValueOrEmpty(plan_attending_personnel)}
                          </span>
                          .
                        </p>
                        <p>
                          I plan to deliver at{" "}
                          <span className="font-semibold underline decoration-slate-400">
                            {planValueOrEmpty(plan_planned_facility)}
                          </span>
                          .
                        </p>
                        <p>
                          This is a PhilHealth accredited facility:{" "}
                          <span className="font-semibold">
                            {plan_philhealth ? plan_philhealth : EMPTY}
                          </span>
                          .
                        </p>
                        <p>
                          The estimated cost of the maternity package in this facility
                          is{" "}
                          <span className="font-semibold">
                            PHP {planValueOrEmpty(plan_estimated_cost)}
                          </span>{" "}
                          (inclusive of newborn care).
                        </p>
                        <p>
                          The mode of payment is{" "}
                          <span className="font-semibold">
                            {planValueOrEmpty(plan_mode_of_payment)}
                          </span>
                          .
                        </p>
                        <p>
                          The available transport is{" "}
                          <span className="font-semibold">
                            {planValueOrEmpty(plan_transport)}
                          </span>
                          .
                        </p>
                      </div>

                      {/* Companion + family companion + caretaker */}
                      <div className="space-y-2 rounded-md border border-slate-200 bg-white px-3 py-2">
                        <p>
                          I have contacted{" "}
                          <span className="font-semibold">
                            {planValueOrEmpty(plan_companion_name)}
                          </span>
                          , residing at{" "}
                          <span className="font-semibold">
                            {planValueOrEmpty(plan_companion_address)}
                          </span>{" "}
                          and with contact number{" "}
                          <span className="font-semibold">
                            {planValueOrEmpty(plan_companion_contact)}
                          </span>{" "}
                          to bring me to the hospital / maternity clinic / health
                          center.
                        </p>
                        <p>
                          I will be accompanied by{" "}
                          <span className="font-semibold">
                            {planValueOrEmpty(plan_family_companion_name)}
                          </span>
                          , who is my{" "}
                          <span className="font-semibold">
                            {planValueOrEmpty(
                              plan_family_companion_relationship
                            )}
                          </span>
                          , residing at{" "}
                          <span className="font-semibold">
                            {planValueOrEmpty(plan_family_companion_address)}
                          </span>{" "}
                          and with contact number{" "}
                          <span className="font-semibold">
                            {planValueOrEmpty(plan_family_companion_contact)}
                          </span>
                          .
                        </p>
                        <p>
                          <span className="font-semibold">
                            {planValueOrEmpty(plan_caretaker_name)}
                          </span>
                          , my{" "}
                          <span className="font-semibold">
                            {planValueOrEmpty(plan_caretaker_relationship)}
                          </span>
                          , will take care of my children / home while I am in the
                          health facility.
                        </p>
                      </div>

                      {/* Blood type & donors */}
                      <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50/70 px-3 py-2">
                        <p>
                          My blood type is{" "}
                          <span className="font-semibold">
                            {planValueOrEmpty(plan_blood_type)}
                          </span>
                          .
                        </p>
                        <p className="font-semibold text-slate-800">
                          In case of a need for a blood transfusion, my possible
                          donors are:
                        </p>
                        <div className="space-y-1 pl-1">
                          <div>
                            <span className="text-slate-600 font-medium">1.</span>{" "}
                            <span className="font-semibold text-slate-900">
                              {planValueOrEmpty(plan_blood_donor1_name)}
                            </span>
                            {", "}
                            <span className="text-slate-800">
                              {planValueOrEmpty(plan_blood_donor1_address)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-600 font-medium">2.</span>{" "}
                            <span className="font-semibold text-slate-900">
                              {planValueOrEmpty(plan_blood_donor2_name)}
                            </span>
                            {", "}
                            <span className="text-slate-800">
                              {planValueOrEmpty(plan_blood_donor2_address)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Emergency referral contact */}
                      <div className="space-y-2 rounded-md border border-slate-200 bg-white px-3 py-2">
                        <p>
                          In case of complication, I should be referred right away to:
                        </p>
                        <div className="space-y-1 pl-1">
                          <div>
                            <span className="text-slate-600 font-medium">
                              Contact person:
                            </span>{" "}
                            <span className="font-semibold text-slate-900">
                              {planValueOrEmpty(plan_emergency_contact_name)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-600 font-medium">
                              Address:
                            </span>{" "}
                            <span className="text-slate-900">
                              {planValueOrEmpty(plan_emergency_contact_address)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-600 font-medium">
                              Tel. no.:
                            </span>{" "}
                            <span className="text-slate-900">
                              {planValueOrEmpty(plan_emergency_contact_contact)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Nearest maternal & newborn health facilities */}
                      <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50/70 px-3 py-2">
                        <p className="font-semibold text-slate-800">
                          The nearest maternal and newborn health facility to my
                          residence are:
                        </p>
                        <div className="space-y-1 pl-1">
                          <p>
                            Maternal hospital:{" "}
                            <span className="font-semibold">
                              {planValueOrEmpty(plan_maternal_hospital1_name)}
                            </span>{" "}
                            | Address:{" "}
                            <span className="font-semibold">
                              {planValueOrEmpty(plan_maternal_hospital1_address)}
                            </span>
                          </p>
                          <p>
                            Maternal hospital:{" "}
                            <span className="font-semibold">
                              {planValueOrEmpty(plan_maternal_hospital2_name)}
                            </span>{" "}
                            | Address:{" "}
                            <span className="font-semibold">
                              {planValueOrEmpty(plan_maternal_hospital2_address)}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Conforme & date */}
                      <div className="mt-4 rounded-md border border-slate-200 bg-white px-4 py-4">
                        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                          <div>
                            <div className="text-[12px] font-medium uppercase tracking-wide text-slate-500">
                              Conforme
                            </div>

                            {plan_signature_src ? (
                              <div className="mt-2">
                                <div className="flex h-24 w-full max-w-[260px] items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2">
                                  <img
                                    src={plan_signature_src}
                                    alt="Patient signature"
                                    className="max-h-[72px] w-full object-contain"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="mt-2 h-16 w-full max-w-[260px] rounded-md border border-dashed border-slate-300 bg-slate-50" />
                            )}

                            <div className="mt-2 border-t border-slate-400 pt-1 text-[13px] font-semibold text-slate-900 max-w-[260px]">
                              {planValueOrEmpty(plan_signature_name)}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Signature over printed name
                            </div>
                          </div>

                          <div className="min-w-[180px]">
                            <div className="text-[12px] font-medium uppercase tracking-wide text-slate-500">
                              Date
                            </div>
                            <div className="mt-2 border-b border-slate-400 pb-1 text-[13px] font-semibold text-slate-900">
                              {fmtDate(plan_date)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </Section>
              )}
            </div>
          </>
        )}

        {/* ============================ HBM ============================ */}
        {mainTab === "hbm" && (
          <>
            {/* HBM sub-tabs: History, Current, After (NO CHANGES) */}
            <Tabs
              items={hbmTabs as any}
              value={hbmTab}
              onChange={(k) => setHbmTab(k as any)}
            />

            <div className="space-y-6">
              {/* HBM — HISTORY TAB (unchanged logic, only already-styled) */}
              {hbmTab === "history" && (
                <>
                  <Section title="Initial History (Summary)">
                    {!history ? (
                      <div className="text-slate-700">No history recorded yet.</div>
                    ) : (
                      <div className="grid gap-3 md:grid-cols-2">
                        {/* Blood type: fall back to plan.blood_type (same as center HBM form) */}
                        <KV
                          label="Blood type"
                          value={toStr(history?.blood_type ?? plan?.blood_type)}
                        />

                        <KV
                          label="Recommend hospital delivery"
                          value={
                            boolish(history?.recommend_hospital_delivery)
                              ? "Yes"
                              : "No"
                          }
                        />

                        {/* Age: fall back to computed age from patient birthdate */}
                        <KV
                          label="Age (years)"
                          value={toStr(
                            history?.age_years ?? calcAgeYears(patient?.birthdate)
                          )}
                        />

                        {/* Height: fall back to patient height or any legacy history.height */}
                        <KV
                          label="Height (cm)"
                          value={toStr(
                            history?.height_cm ??
                            patient?.height_cm ??
                            (history as any)?.height
                          )}
                        />

                        {/* TT dates already have fallback to ITR normalizer */}
                        <KV
                          label="TT1"
                          value={fmtDate(history?.tt1_date ?? itrNorm.tt1_date)}
                        />
                        <KV
                          label="TT2"
                          value={fmtDate(history?.tt2_date ?? itrNorm.tt2_date)}
                        />
                        <KV
                          label="TT3"
                          value={fmtDate(history?.tt3_date ?? itrNorm.tt3_date)}
                        />
                        <KV
                          label="TT4"
                          value={fmtDate(history?.tt4_date ?? itrNorm.tt4_date)}
                        />
                        <KV
                          label="TT5"
                          value={fmtDate(history?.tt5_date ?? itrNorm.tt5_date)}
                        />
                      </div>
                    )}
                  </Section>

                  <Section title="Maternal Risks">
                    {!history ? (
                      <div className="text-slate-700">No risks recorded.</div>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-1">
                          <KV
                            label="3 consecutive abortions"
                            value={
                              boolish(history?.three_consecutive_abortions)
                                ? "Yes"
                                : "No"
                            }
                          />
                          <KV
                            label="Stillbirth history"
                            value={
                              boolish(history?.stillbirth_history) ? "Yes" : "No"
                            }
                          />
                          <KV
                            label="PPH history"
                            value={boolish(history?.pph_history) ? "Yes" : "No"}
                          />
                        </div>
                        <div className="space-y-1">
                          <KV
                            label="Tuberculosis (current)"
                            value={boolish(history?.tb_current) ? "Yes" : "No"}
                          />
                          <KV
                            label="Heart disease (current)"
                            value={
                              boolish(history?.heart_disease_current)
                                ? "Yes"
                                : "No"
                            }
                          />
                          <KV
                            label="Diabetes (current)"
                            value={boolish(history?.diabetes_current) ? "Yes" : "No"}
                          />
                          <KV
                            label="Asthma (current)"
                            value={boolish(history?.asthma_current) ? "Yes" : "No"}
                          />
                          <KV
                            label="Goiter (current)"
                            value={boolish(history?.goiter_current) ? "Yes" : "No"}
                          />
                        </div>
                      </div>
                    )}
                  </Section>
                </>
              )}

              {/* HBM — CURRENT TAB (unchanged, already compact layout) */}
              {hbmTab === "current" && (
                <>
                  <Section title="Top Summary">
                    <div className="grid gap-3 md:grid-cols-3">
                      <KV label="LMP" value={fmtDate(cur.top.lmp_date)} />
                      <KV label="EDD" value={fmtDate(cur.top.edd_date)} />
                      <KV
                        label="Pregnancy number"
                        value={toStr(cur.top.pregnancy_number)}
                      />
                    </div>
                  </Section>

                  <Section title="Monthly Details">
                    {monthsToShow.length === 0 ? (
                      <div className="text-slate-700">
                        No HBM current records yet.
                      </div>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2">
                        {monthsToShow.map((m: any) => (
                          <article
                            key={m.month_index}
                            className="rounded-md border border-slate-200 p-3 bg-white"
                          >
                            <div className="mb-2 font-semibold text-slate-900">
                              {monthLabel(m.month_index)}
                            </div>
                            <div className="grid gap-1">
                              <KV
                                label="Check-up date"
                                value={fmtDate(m.visit_date)}
                              />
                              <KV
                                label="Gestational age (weeks)"
                                value={toStr(m.gestational_weeks)}
                              />
                              <KV label="BP" value={toStr(m.bp)} />
                              <KV
                                label="Weight (kg)"
                                value={toStr(m.weight_kg)}
                              />
                              <KV
                                label="Fundal height (cm)"
                                value={toStr(m.fundal_height_cm)}
                              />
                              <KV
                                label="Urine infection"
                                value={yesNoDisplay(m.urine_infection)}
                              />
                              <KV
                                label="Vaginal bleeding"
                                value={yesNoDisplay(m.vaginal_bleeding)}
                              />
                              <KV
                                label="Fever ≥ 38°C"
                                value={yesNoDisplay(m.fever_38_or_more)}
                              />
                              <KV
                                label="Pallor / anemia"
                                value={yesNoDisplay(m.pallor_anemia)}
                              />
                              <KV
                                label="Abnormal tummy size"
                                value={yesNoDisplay(m.abnormal_abdominal_size)}
                              />
                              <KV
                                label="Abnormal presentation"
                                value={yesNoDisplay(m.abnormal_presentation)}
                              />
                              <KV
                                label="Absent fetal heartbeat"
                                value={yesNoDisplay(m.absent_fetal_heartbeat)}
                              />
                              <KV
                                label="Edema"
                                value={yesNoDisplay(m.edema)}
                              />
                              <KV
                                label="Vaginal infection/discharge"
                                value={yesNoDisplay(m.vaginal_infection)}
                              />
                              <KV
                                label="Lab results"
                                value={m.laboratory_results || EMPTY}
                              />
                              <KV
                                label="Iron/Folate Rx (#)"
                                value={toStr(m.iron_folate_rx)}
                              />
                              <KV
                                label="Iodine supplement (risk area)"
                                value={yesNoDisplay(m.iodine_risk_area)}
                              />
                              <KV
                                label="Malaria prophylaxis"
                                value={yesNoDisplay(m.malaria_prophylaxis)}
                              />
                              <KV
                                label="Plans to breastfeed"
                                value={yesNoDisplay(m.plan_breastfeed)}
                              />
                              <KV
                                label="Counseled on danger signs"
                                value={yesNoDisplay(m.counseled_danger_signs)}
                              />
                              <KV
                                label="Dental check"
                                value={yesNoDisplay(m.dental_check)}
                              />
                              <KV
                                label="Birth plan prepared"
                                value={yesNoDisplay(m.birth_plan_prepared)}
                              />
                              <KV
                                label="Any danger noted"
                                value={yesNoDisplay(m.danger_present)}
                              />
                              <KV
                                label="Next visit date"
                                value={fmtDate(m.next_visit_date)}
                              />
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </Section>
                </>
              )}

              {/* HBM — AFTER TAB (unchanged logic, same data) */}
              {hbmTab === "after" && (
                <>
                  <Section title="Postnatal Visits & Assessment">
                    <p className="text-[13px] text-slate-700 mb-3">
                      This shows the <b>postpartum follow-up</b> visits after delivery.
                      Choose a visit period to see its details and assessments.
                    </p>

                    <div className="grid gap-3 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)] items-start">
                      {/* Period selector (24h / Day 3 / 1 Week / 2–4 Weeks) */}
                      <div className="space-y-2">
                        <div>
                          <div className="text-[12px] text-slate-600 mb-1">
                            Visit period
                          </div>
                          <select
                            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[14px]"
                            value={afterCol}
                            onChange={(e) =>
                              setAfterCol(e.target.value as AfterColKey)
                            }
                          >
                            {AFTER_COLS.map((c) => (
                              <option key={c} value={c}>
                                {AFTER_COL_TITLES[c]}
                              </option>
                            ))}
                          </select>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Currently viewing:{" "}
                          <span className="font-medium text-slate-700">
                            {AFTER_COL_TITLES[afterCol]}
                          </span>
                        </p>
                      </div>

                      {/* Selected visit summary + assessments */}
                      <div className="rounded-md border border-slate-200 bg-slate-50/70 p-3">
                        <div className="mb-2 text-[14px] font-semibold text-slate-900">
                          {AFTER_COL_TITLES[afterCol]}
                        </div>

                        <div className="grid gap-2 sm:grid-cols-3">
                          <KV
                            label="Visit date"
                            value={fmtDate(aft.visits?.[afterCol]?.date)}
                          />
                          <KV
                            label="Visit time"
                            value={toStr(aft.visits?.[afterCol]?.time)}
                          />
                          <KV
                            label="Place"
                            value={toStr(aft.visits?.[afterCol]?.place)}
                          />
                        </div>

                        <DividerLine />

                        <div className="mt-2 space-y-1.5">
                          {AFTER_CHECK_ROWS.map(({ key, label }) => (
                            <KV
                              key={key}
                              label={label}
                              value={yesNoDisplay(
                                (aft as any).checks?.[key]?.[afterCol]
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </Section>

                  <Section title="Supplements & Referral">
                    {(!aft || !aft.supplements) && !aft?.referral ? (
                      <div className="text-slate-700">
                        No postnatal supplements or referral recorded.
                      </div>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-3">
                        <KV
                          label="Vitamin A date"
                          value={fmtDate(aft.supplements?.vitamin_a_date)}
                        />
                        <KV
                          label="Iron/Folate date"
                          value={fmtDate(aft.supplements?.iron_folate_date)}
                        />
                        <KV
                          label="Referred"
                          value={boolish(aft.referral?.referred) ? "Yes" : "No"}
                        />
                      </div>
                    )}
                  </Section>

                  <Section title="Family Planning">
                    {(!aft || !aft.fp) &&
                      (!Array.isArray(aft.fp_rows) || !aft.fp_rows.length) ? (
                      <div className="text-slate-700">
                        No family planning record yet.
                      </div>
                    ) : (
                      <>
                        <div className="grid gap-4 md:grid-cols-2">
                          <KV
                            label="Follow-up date"
                            value={fmtDate(aft.fp?.followup_date)}
                          />
                          <KV
                            label="Consult date"
                            value={fmtDate(aft.fp?.consult_date)}
                          />
                          <KV label="Method" value={toStr(aft.fp?.method)} />
                          <KV label="Qty given" value={toStr(aft.fp?.given_qty)} />
                          <div className="md:col-span-2">
                            <KV label="Notes" value={aft.fp?.notes || EMPTY} />
                          </div>
                        </div>

                        {Array.isArray(aft.fp_rows) && aft.fp_rows.length > 0 && (
                          <div className="mt-4 grid gap-3">
                            {aft.fp_rows.map((r: any, i: number) => (
                              <article
                                key={i}
                                className="rounded-md border border-slate-200 p-3 bg-white"
                              >
                                <div className="mb-1 font-semibold text-slate-900">
                                  Family Planning Entry #{i + 1}
                                </div>
                                <div className="grid gap-1 sm:grid-cols-2">
                                  <KV
                                    label="Follow-up date"
                                    value={fmtDate(
                                      r.follow_up_date ?? r.followup_date
                                    )}
                                  />
                                  <KV
                                    label="Visit date"
                                    value={fmtDate(r.visit_date)}
                                  />
                                  <KV label="Method" value={toStr(r.method)} />
                                  <KV
                                    label="Qty given"
                                    value={toStr(r.qty_given)}
                                  />
                                  <div className="sm:col-span-2">
                                    <KV
                                      label="Remarks"
                                      value={toStr(r.remarks)}
                                    />
                                  </div>
                                </div>
                              </article>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </Section>
                </>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
