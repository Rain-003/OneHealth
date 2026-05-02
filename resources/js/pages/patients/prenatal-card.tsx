// resources/js/pages/patients/prenatal-card.tsx
/* ============================================================================
   ONE HEALTH — Patient Prenatal Card (Read-only)
   ----------------------------------------------------------------------------
   - Print button: opens the same printable A4 layout inside a hidden iframe.
   - Save PDF button: opens the same printable layout so the user can choose Save as PDF.
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
   Printable layout — renders into hidden iframe for Print / Save as PDF
──────────────────────────────────────────────────────────────────────────── */
async function downloadCard(mode: "print" | "pdf" = "print") {
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
        if (typeof v === "boolean") return v === true;
        if (typeof v === "number") return Number.isFinite(v);
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
@page { size: A4 portrait; margin: 6mm; }
:root { --ink:#0f172a; --muted:#64748b; --line:#d7e3ea; --navy:#203D7A; --teal:#0F8A99; --tealDeep:#0a6f7c; }
* { box-sizing: border-box; }
body { margin:0; background:#ffffff; color:var(--ink); font-family:'Poppins',system-ui,-apple-system,Segoe UI,Roboto,Arial; font-size:10pt; line-height:1.35; }
.sheet { border:1px solid #cbd5e1; border-radius:10px; padding:6mm; background:#fff; page-break-after:always; margin-bottom:6mm; box-shadow:0 0 0 1px rgba(15,23,42,.03); }
.sheet:last-child { page-break-after:avoid; }
.brand { display:flex; align-items:center; gap:9px; padding:4px 6px 8px; border-bottom:3px solid var(--navy); margin-bottom:8px; }
.brand .logo { height:28px; width:28px; border-radius:8px; overflow:hidden; display:grid; place-items:center; background:var(--teal); color:#fff; font-weight:800; font-size:10pt; }
.brand .logo img { height:100%; width:100%; object-fit:cover; }
.brand .title { font-weight:800; letter-spacing:.02em; font-size:14pt; color:var(--navy); }
.brand .sub { font-size:9pt; color:var(--muted); letter-spacing:.14em; text-transform:uppercase; }
.rule { height:0; margin:0; }
.h { display:inline-flex; align-items:center; gap:6px; font-weight:800; color:var(--navy); margin:0 0 6px; font-size:12pt; }
.h::before { content:""; display:inline-block; width:4px; height:14px; border-radius:999px; background:var(--teal); }
.h.mini { font-size:11pt; margin-bottom:4px; }
.grid2 { display:grid; grid-template-columns:1fr 1fr; gap:6px; }
.grid3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; }
.block { border:1px solid #dbe5ec; border-radius:8px; padding:7px 8px; background:#fff; margin:6px 0; page-break-inside:avoid; }
.block.mini { margin:4px 0; padding:5px 6px; border-radius:7px; }
.card-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:3px 8px; }
.card-grid.triple { grid-template-columns:repeat(3,minmax(0,1fr)); }
.card-item { font-size:9.8pt; padding:2px 0; }
.card-item-label { display:block; color:var(--muted); font-size:8.8pt; }
.card-item-value { display:block; font-weight:700; color:var(--ink); }
.no-rec { font-style:italic; color:var(--muted); font-size:10pt; }
table { width:100%; border-collapse:collapse; }
table.kv td:first-child { width:38%; color:var(--muted); font-weight:500; }
table.kv td { border-bottom:1px dashed #e6eef2; padding:3px 4px; vertical-align:top; font-size:9.8pt; }
table.kv tr:last-child td { border-bottom:0; }
table.grid { width:100%; border-collapse:collapse; table-layout:fixed; }
table.grid th, table.grid td { border:1px solid #a9c4d0; padding:3px 4px; vertical-align:top; font-size:9.4pt; }
table.grid thead th { background:var(--navy); color:#fff; font-weight:800; text-transform:uppercase; }
table.grid .subhead th { background:#e6f5f6; color:#0b3d48; text-transform:none; font-weight:700; }
.blank { display:inline-block; min-width:40px; border-bottom:1px solid #94a3b8; padding:0 2px; font-weight:700; }
.plan-body p { margin:3px 0; font-size:10pt; }
.plan-body.prose { padding:2px 2px 0; }
.plan-body.prose p { margin:0 0 7px; text-align:justify; text-indent:18px; line-height:1.45; }
.plan-body.prose .plan-line { font-weight:700; border-bottom:1px solid #94a3b8; padding:0 2px; }
.plan-body.prose .donor-list { margin:3px 0 7px 18px; }
.plan-body.prose .donor-list p { margin:2px 0; text-indent:0; }
@page birth-plan-page {
  size: A4 portrait;
  margin: 4mm;
}
.sheet-plan {
  page: birth-plan-page;
  min-height: calc(297mm - 8mm);
  display: flex;
  flex-direction: column;
  padding: 5mm 6mm;
  border: 1.5px solid var(--navy);
  border-radius: 8px;
  margin-bottom: 0;
}
.sheet-plan .brand {
  padding-bottom: 9px;
  margin-bottom: 10px;
}
.sheet-plan .brand .logo {
  height: 34px;
  width: 34px;
  border-radius: 10px;
}
.sheet-plan .brand .title {
  font-size: 18pt;
}
.sheet-plan .brand .sub {
  font-size: 11pt;
  letter-spacing: .16em;
}
.sheet-plan .birth-plan-patient {
  margin-bottom: 10px;
  padding: 8px 10px;
}
.sheet-plan .birth-plan-patient .h,
.sheet-plan .birth-plan-block .h {
  font-size: 15pt;
}
.sheet-plan .birth-plan-patient table.kv td {
  font-size: 11.5pt;
  padding: 4px 6px;
}
.sheet-plan .birth-plan-block {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 10px 12px;
}
.sheet-plan .plan-body.prose {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 4px 2px 0;
}
.sheet-plan .plan-body.prose p {
  margin: 0 0 11px;
  text-align: justify;
  text-indent: 24px;
  line-height: 1.62;
  font-size: 12.7pt;
}
.sheet-plan .plan-body.prose .plan-line {
  font-size: 12.8pt;
  font-weight: 800;
  border-bottom: 1.2px solid #64748b;
  padding: 0 3px;
}
.sheet-plan .plan-body.prose .donor-list {
  margin: -2px 0 11px 28px;
}
.sheet-plan .plan-body.prose .donor-list p {
  margin: 3px 0;
  text-indent: 0;
}
.signature-grid {
  margin-top: auto;
  padding-top: 24px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  align-items: end;
}
.signature-spot {
  min-height: 72px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}
.signature-line {
  border-top: 1.5px solid #334155;
  padding-top: 7px;
  font-weight: 800;
  text-align: center;
  min-height: 24px;
  font-size: 11.5pt;
}
.signature-caption {
  margin-top: 2px;
  font-size: 10.2pt;
  color: #64748b;
  text-align: center;
}
.date-line {
  display: inline-block;
  min-width: 155px;
  padding: 0 10px 3px;
  border-bottom: 1.2px solid #94a3b8;
  font-weight: 800;
  text-align: center;
  font-size: 11.5pt;
}
.month-card { border-left:4px solid var(--teal); }
.month-card .h.mini { margin-bottom:2px; }
.month-card .sub { font-size:8.8pt; color:var(--muted); margin-bottom:2px; }
.month-table { width:100%; border-collapse:collapse; font-size:8.6pt; }
.month-table td { padding:1.5px 3px; vertical-align:top; }
.month-table td.lbl { color:var(--muted); white-space:nowrap; }
.month-table td.val { font-weight:700; }
.kv2 { display:grid; grid-template-columns:34mm 1fr 34mm 1fr; gap:4px 10px; }
.k { color:var(--muted); font-size:10pt; }
.v { font-weight:700; font-size:10pt; }
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

  <section class="block birth-plan-patient">
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

    const hbmHistoryAfterSheet = `
<div class="sheet sheet-hbm-history">
  <div class="brand">
    <div class="logo">${logoSrc ? `<img src="${logoSrc}" alt=""/>` : "OH"}</div>
    <div>
      <div class="title">ONE HEALTH — Prenatal Card</div>
      <div class="sub">Page 2 · HBM History &amp; After</div>
    </div>
  </div>
  <div class="rule"></div>

  <section class="block birth-plan-patient">
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

      const hbmCurrentSheet = `
<div class="sheet sheet-hbm-current">
  <div class="brand">
    <div class="logo">${logoSrc ? `<img src="${logoSrc}" alt=""/>` : "OH"}</div>
    <div>
      <div class="title">ONE HEALTH — Prenatal Card</div>
      <div class="sub">Page 3 · HBM Current</div>
    </div>
  </div>
  <div class="rule"></div>

  <section class="block compact">
    <div class="h">Patient Information</div>
    <table class="kv compact-kv">
      <tr><td>Full name</td><td>${esc(S((patient as any).full_name))}</td></tr>
      <tr><td>Barangay</td><td>${esc(S((patient as any).barangay))}</td></tr>
      <tr><td>Birthday</td><td>${fmt((patient as any).birthdate)}</td></tr>
      <tr><td>Age</td><td>${esc(S(age_years))}</td></tr>
    </table>
  </section>

  <section class="block compact">
    <div class="h">HBM — Current Top Summary</div>
    <table class="kv compact-kv">
      <tr><td>LMP</td><td>${fmt((cur as any)?.top?.lmp_date)}</td></tr>
      <tr><td>EDD</td><td>${fmt((cur as any)?.top?.edd_date)}</td></tr>
      <tr><td>Pregnancy number</td><td>${esc(S((cur as any)?.top?.pregnancy_number))}</td></tr>
    </table>
  </section>

  ${hasMonthGroups
    ? `<section class="block compact">
        <div class="h">HBM — Monthly Details</div>
        <div class="grid2 compact-grid">${monthCards}</div>
      </section>`
    : `<section class="block compact">
        <div class="h">HBM — Monthly Details</div>
        <p class="no-rec">No record yet.</p>
      </section>`
  }
</div>`;

      // ---------- PAGE 3: Birth Plan ----------
    const birthPlanSection = planHasAnyContent
        ? `<section class="block birth-plan-block">
            <div class="h">BIRTH &amp; EMERGENCY PLAN</div>
            <div class="plan-body prose">
              <p>I know that complication can develop at any time in the course of this pregnancy and childbirth. I know that the best place to deliver my baby is in a health facility.</p>

              <p>I will be attended at delivery by <span class="plan-line">${planBlank(plan_attending_personnel)}</span>. I plan to deliver at <span class="plan-line">${planBlank(plan_planned_facility)}</span>. This facility is PhilHealth-accredited: <span class="plan-line">${planBlank(plan_philhealth || "—")}</span>.</p>

              <p>The estimated cost of the maternity package in this facility is PHP <span class="plan-line">${planBlank(plan_estimated_cost)}</span>, inclusive of newborn care. The mode of payment is <span class="plan-line">${planBlank(plan_mode_of_payment)}</span>, and the available transport is <span class="plan-line">${planBlank(plan_transport)}</span>.</p>

              <p>I have contacted <span class="plan-line">${planBlank(plan_companion_name)}</span>, residing at <span class="plan-line">${planBlank(plan_companion_address)}</span>, with contact number <span class="plan-line">${planBlank(plan_companion_contact)}</span>, to bring me to the hospital, maternity clinic, or health center.</p>

              <p>I will be accompanied by <span class="plan-line">${planBlank(plan_family_companion_name)}</span>, who is my <span class="plan-line">${planBlank(plan_family_companion_relationship)}</span>, residing at <span class="plan-line">${planBlank(plan_family_companion_address)}</span>, with contact number <span class="plan-line">${planBlank(plan_family_companion_contact)}</span>.</p>

              <p><span class="plan-line">${planBlank(plan_caretaker_name)}</span>, my <span class="plan-line">${planBlank(plan_caretaker_relationship)}</span>, will take care of my children and/or home while I am in the health facility.</p>

              <p>My blood type is <span class="plan-line">${planBlank(plan_blood_type)}</span>. In case of a need for blood transfusion, my possible donors are:</p>
              <div class="donor-list">
                <p>1. <span class="plan-line">${planBlank(plan_blood_donor1_name)}</span>, <span class="plan-line">${planBlank(plan_blood_donor1_address)}</span></p>
                <p>2. <span class="plan-line">${planBlank(plan_blood_donor2_name)}</span>, <span class="plan-line">${planBlank(plan_blood_donor2_address)}</span></p>
              </div>

              <p>In case of complication, I should be referred right away to the emergency contact person <span class="plan-line">${planBlank(plan_emergency_contact_name)}</span>, located at <span class="plan-line">${planBlank(plan_emergency_contact_address)}</span>, with telephone/contact number <span class="plan-line">${planBlank(plan_emergency_contact_contact)}</span>.</p>

              <p>The nearest maternal and newborn health facilities to my residence are <span class="plan-line">${planBlank(plan_maternal_hospital1_name)}</span> located at <span class="plan-line">${planBlank(plan_maternal_hospital1_address)}</span>, and <span class="plan-line">${planBlank(plan_maternal_hospital2_name)}</span> located at <span class="plan-line">${planBlank(plan_maternal_hospital2_address)}</span>.</p>

              <div class="signature-grid">
                <div class="signature-spot">
                  <div class="signature-line">${esc(S(plan_signature_name))}</div>
                  <div class="signature-caption">Patient / Conforme signature over printed name</div>
                </div>
                <div class="signature-spot">
                  <div class="signature-line">&nbsp;</div>
                  <div class="signature-caption">Birth attendant / health worker signature over printed name</div>
                </div>
              </div>
              <p style="margin-top:14px; text-align:right; text-indent:0; font-size:12pt;">Date: <span class="date-line">${fmt(plan_date)}</span></p>
            </div>
          </section>`
        : `<section class="block birth-plan-block">
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

  <section class="block birth-plan-patient">
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
  ${hbmHistoryAfterSheet}
${hbmCurrentSheet}
  ${planSheet}

</body>
</html>`;

    const iframeId = "__prenatal_print_iframe";
    let iframe = document.getElementById(iframeId) as HTMLIFrameElement | null;

    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.id = iframeId;
      iframe.style.position = "fixed";
      iframe.style.left = "0";
      iframe.style.top = "0";
      iframe.style.width = "794px";
      iframe.style.height = "1123px";
      iframe.style.border = "0";
      iframe.style.opacity = "0";
      iframe.style.pointerEvents = "none";
      iframe.style.zIndex = "-1";
      iframe.style.visibility = "visible";
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

    const waitForPrintableLayout = async () => {
      const win = iframe?.contentWindow;
      const iframeDoc = win?.document;
      if (!win || !iframeDoc) return;

      await new Promise<void>((resolve) => {
        if (iframeDoc.readyState === "complete") {
          resolve();
          return;
        }
        win.addEventListener("load", () => resolve(), { once: true });
        setTimeout(() => resolve(), 700);
      });

      try {
        await (iframeDoc as any).fonts?.ready;
      } catch {}

      const images = Array.from(iframeDoc.images || []);
      await Promise.all(
        images.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          });
        })
      );
    };

    await waitForPrintableLayout();

    if (mode === "pdf") {
      /*
       * Hybrid PDF save path:
       * Use the browser's real print engine, not html2pdf/html2canvas.
       * This keeps the saved PDF identical to the printable layout. The user
       * will choose "Save as PDF" in the print dialog.
       */
      iframe.contentWindow?.focus();
      setTimeout(() => iframe?.contentWindow?.print(), 150);
      return;
    }

    iframe.contentWindow?.focus();
    setTimeout(() => iframe?.contentWindow?.print(), 100);
  } catch (e) {
    console.error(e);
    if (mode === "pdf") {
      alert("Could not open the Save as PDF window. Please try again or use the Print button.");
      return;
    }
    window.print(); // fallback
  }
}


/* ────────────────────────────────────────────────────────────────────────────
   Icons (outline)
──────────────────────────────────────────────────────────────────────────── */
const IconPrint = (props: any) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...props} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M6 9V3h12v6" />
    <rect x="6" y="14" width="12" height="7" rx="1" />
    <rect x="2" y="9" width="20" height="8" rx="2" />
  </svg>
);

const IconDownload = (props: any) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...props} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 3v12" />
    <path d="M7 10l5 5 5-5" />
    <rect x="3" y="17" width="18" height="4" rx="1" />
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

const IconMapPin = (p: any) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...p} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 22s7-5.5 7-12a7 7 0 0 0-14 0c0 6.5 7 12 7 12Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const IconInfo = (p: any) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...p} fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8h.01M11 12h2v5h-2" />
  </svg>
);

const IconChevron = (p: any) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...p} fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ────────────────────────────────────────────────────────────────────────────
   Reusable UI
──────────────────────────────────────────────────────────────────────────── */
const NAVY = "#203D7A";
const TEAL = "#0F8A99";

function HeaderBar({
  onBack,
  onPrint,
  onDownload,
}: {
  onBack: () => void;
  onPrint: () => void;
  onDownload: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 px-2 pt-2 sm:px-4 screen-only">
      <div className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 bg-white/90 shadow-sm backdrop-blur">
        <div className="grid min-h-16 grid-cols-[auto_1fr_auto] items-center gap-2 px-2 py-2 sm:px-4">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <img src={BackIcon} alt="" className="h-5 w-5" />
            <span className="hidden sm:inline">Back</span>
          </button>

          <div className="flex min-w-0 items-center justify-center gap-2">
            <button
              type="button"
              onClick={onPrint}
              title="Print"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 sm:min-w-[112px]"
            >
              <IconPrint className="h-5 w-5" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              type="button"
              onClick={onDownload}
              title="Save as PDF"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 sm:min-w-[128px]"
            >
              <IconDownload className="h-5 w-5" />
              <span className="hidden sm:inline">Save PDF</span>
            </button>
          </div>

          <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
            <img src={Logo} alt="OneHealth logo" className="h-9 w-9 rounded-xl select-none" />
            <div className="hidden leading-tight xs:block sm:block">
              <div className="text-[14px] font-bold tracking-wide text-[#203D7A] sm:text-[17px]">ONE HEALTH</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 sm:text-[11px]">Patient · Prenatal</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}


function DownloadConfirmDialog({
  open,
  patientName,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  patientName: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div className="screen-only fixed inset-0 z-[2147483646] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="h-2 bg-gradient-to-r from-[#0F8A99] to-[#203D7A]" />
        <div className="p-6 sm:p-7">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0F8A99]/10 text-[#0F8A99] ring-1 ring-[#0F8A99]/15">
            <IconDownload className="h-8 w-8" />
          </div>

          <div className="mt-5 text-center">
            <h2 className="text-xl font-extrabold tracking-tight text-[#203D7A]">
              Save prenatal card as PDF?
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              To keep the exact printable layout, your browser print window will open. Choose “Save as PDF” as the destination, then click Save.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[#0F8A99] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#0a6f7c]"
            >
              Open print window
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DownloadPreparingOverlay({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <div className="screen-only fixed inset-0 z-[2147483647] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl ring-1 ring-slate-200">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0F8A99]/10 text-[#0F8A99] ring-1 ring-[#0F8A99]/15">
          <svg className="h-8 w-8 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.22" strokeWidth="3" />
            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
        <h2 className="mt-5 text-xl font-extrabold tracking-tight text-[#203D7A]">
          Opening print window
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Choose “Save as PDF” in the print dialog to save a copy on your device.
        </p>
      </div>
    </div>
  );
}

function DashboardFooter() {
  return (
    <footer className="screen-only mx-auto w-full max-w-5xl px-4 pb-6 pt-8">
      <div className="border-t border-slate-200 pt-5">
        <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <div className="inline-flex items-center gap-2">
            <img src={Logo} alt="OneHealth logo" className="h-9 w-9 rounded-xl" />
            <span className="text-sm font-semibold tracking-wide text-[#203D7A]">ONE HEALTH</span>
          </div>
          <p className="text-xs text-slate-500">© 2026 OneHealth. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

function Tabs<T extends string>({
  items,
  value,
  onChange,
  filledActive = false,
}: {
  items: { key: T; label: string }[];
  value: T;
  onChange: (k: T) => void;
  filledActive?: boolean;
}) {
  return (
    <div className="w-full rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-slate-100">
      <div className="hidden sm:grid sm:grid-cols-[repeat(auto-fit,minmax(130px,1fr))] sm:gap-1.5">
        {items.map((it) => {
          const active = it.key === value;
          return (
            <button
              key={String(it.key)}
              onClick={() => onChange(it.key)}
              className={[
                "h-11 rounded-xl border px-3 text-sm font-semibold transition",
                active
                  ? filledActive
                    ? "border-[#203D7A] bg-[#203D7A] text-white shadow-sm"
                    : "border-[#203D7A] bg-white text-[#203D7A] shadow-sm ring-1 ring-[#203D7A]/10"
                  : "border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50",
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
          className="h-11 w-full rounded-xl border border-[#203D7A]/40 bg-white px-3 text-sm font-semibold text-[#203D7A] focus:outline-none focus:ring-2 focus:ring-[#203D7A]/25"
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
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
      <div className="flex items-center justify-between gap-3 bg-slate-50/80 px-3 py-3 ring-1 ring-slate-100 sm:px-4">
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-bold text-[#203D7A] sm:text-[17px]">{title}</h2>
          <div className="mt-1 h-1 w-16 rounded-full bg-[#0F8A99]" />
        </div>
        {actions ? <div className="ml-2 shrink-0">{actions}</div> : null}
      </div>
      <div className="p-3 sm:p-4">{children}</div>
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
    <div className={`grid grid-cols-1 gap-0.5 rounded-xl bg-slate-50/70 p-2.5 text-[13px] ring-1 ring-slate-100 sm:grid-cols-[140px_1fr] sm:gap-2 sm:text-[14px] ${className}`}>
      <div className="text-[12px] font-medium text-slate-500 sm:text-[13px]">{label}</div>
      <div className="min-w-0 break-words font-semibold text-slate-900">{value ?? EMPTY}</div>
    </div>
  );
}

function HeaderChip({ icon, text }: { icon: React.ReactNode; text: React.ReactNode }) {
  return (
    <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-100 sm:px-3 sm:text-[12px]">
      <span className="text-[#0F8A99]">{icon}</span>
      <span>{text}</span>
    </span>
  );
}

function DividerLine() {
  return <div className="my-2 h-px bg-slate-200" />;
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
  const [open, setOpen] = React.useState(false);
  const height = patient?.height_cm ?? history?.height_cm ?? history?.height ?? null;
  const philhealth = patient?.philhealth_number ?? (patient as any)?.philhealth ?? (patient as any)?.philhealth_no;
  const phone = patient?.phone_number ?? (patient as any)?.contact_number ?? (patient as any)?.phone;

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
      <div className="p-3 sm:p-4 md:p-5">
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[12px] font-semibold tracking-wide text-slate-500 uppercase">
              <IconUser className="h-4 w-4 text-[#0F8A99]" />
              Patient
            </div>
            <h1 className="mt-1 break-words text-2xl font-extrabold leading-tight tracking-tight text-[#203D7A] sm:text-3xl md:text-4xl">
              {toStr(patient?.full_name)}
            </h1>
            <div className="mt-3 flex flex-wrap gap-2">
              <HeaderChip icon={<IconCalendar className="h-3.5 w-3.5" />} text={fmtDate(patient?.birthdate)} />
              <HeaderChip icon={<IconInfo className="h-3.5 w-3.5" />} text={`${calcAgeYears(patient?.birthdate)} yrs`} />
              <HeaderChip icon={<IconMapPin className="h-3.5 w-3.5" />} text={toStr(patient?.barangay)} />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 sm:w-auto"
          >
            {open ? "Hide details" : "Show details"}
            <IconChevron className={["h-4 w-4 transition-transform", open ? "rotate-180" : ""].join(" ")} />
          </button>
        </div>
      </div>

      <div className={["grid transition-all duration-300 ease-out", open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"].join(" ")}>
        <div className="overflow-hidden">
          <div className="border-t border-slate-100 px-3 py-3 sm:px-4 sm:py-4 md:px-5">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
              <KV label="Address" value={<span className="uppercase tracking-wide">{toStr(patient?.address)}</span>} />
              <KV label="Civil Status" value={toStr(patient?.civil_status)} />
              <KV label="Phone" value={toStr(phone)} />
              <KV label="Height (cm)" value={toStr(height)} />
              <KV label="PhilHealth #" value={toStr(philhealth)} />
              <KV label="Family No." value={toStr((patient as any)?.family_no)} />
            </div>
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

  const [showDownloadConfirm, setShowDownloadConfirm] = React.useState(false);
  const [isPreparingDownload, setIsPreparingDownload] = React.useState(false);

  const handlePrint = React.useCallback(() => {
    void downloadCard("print");
  }, []);

  const handleAskDownload = React.useCallback(() => {
    setShowDownloadConfirm(true);
  }, []);

  const handleConfirmDownload = React.useCallback(async () => {
    setShowDownloadConfirm(false);
    setIsPreparingDownload(true);

    try {
      await downloadCard("pdf");
    } finally {
      setIsPreparingDownload(false);
    }
  }, []);


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
      if (v === null || v === undefined) return false;
      if (typeof v === "boolean") return v === true;
      if (typeof v === "number") return Number.isFinite(v);
      return String(v).trim() !== "";
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

  const compactValue = (v: any) => {
    if (v === null || v === undefined || v === "") return EMPTY;
    if (typeof v === "object") {
      try {
        return JSON.stringify(v);
      } catch {
        return String(v);
      }
    }
    return String(v);
  };

  return (
    <div className="relative min-h-screen bg-white text-slate-900">
      <Head title="Prenatal" />

      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-teal-200/15 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-cyan-200/15 blur-3xl" />
      </div>

      <style>{`
        .scrollbar-min{scrollbar-width:thin;scrollbar-color:#94a3b8 transparent}
        .scrollbar-min::-webkit-scrollbar{height:8px;width:8px}
        .scrollbar-min::-webkit-scrollbar-track{background:transparent}
        .scrollbar-min::-webkit-scrollbar-thumb{background:#94a3b8;border-radius:8px}
        @media print{ .screen-only{display:none !important} body{background:white !important} }
      `}</style>

      <HeaderBar
        onBack={goBack}
        onPrint={handlePrint}
        onDownload={handleAskDownload}
      />

      <DownloadConfirmDialog
        open={showDownloadConfirm}
        patientName={toStr(patient?.full_name)}
        onCancel={() => setShowDownloadConfirm(false)}
        onConfirm={handleConfirmDownload}
      />

      <DownloadPreparingOverlay show={isPreparingDownload} />

      {/* Hidden JSON payload for print/download builders */}
      <script
        id="prenatal-data"
        type="application/json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(printPayload) }}
      />

      <main
        id="prenatal-printable"
        className="relative z-10 mx-auto w-full max-w-7xl space-y-4 px-2 py-3 sm:px-3 sm:py-4 md:px-4 lg:px-6"
      >
        {/* [PATIENT INFORMATION CARD] */}
        <PatientInfo patient={patient} history={history} />

        {/* [ITR / HBM] main tabs */}
        <Tabs
          items={[
            { key: "itr", label: "Individual Treatment Record" },
            { key: "hbm", label: "Home-Based Mothers Record" },
          ] as const}
          value={mainTab}
          onChange={(k) => setMainTab(k as any)}
          filledActive
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
                    <div className="grid gap-3 md:grid-cols-2">
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
                            className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-100"
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
                      <div className="grid gap-3 md:grid-cols-2">
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

              {/* HBM — CURRENT TAB */}
              {hbmTab === "current" && (
                <>
                  <Section title="Current Pregnancy Summary">
                    <div className="grid gap-2 sm:grid-cols-3">
                      {[
                        ["Last Menstrual Period", fmtDate(cur.top.lmp_date)],
                        ["Expected Date of Delivery", fmtDate(cur.top.edd_date)],
                        ["Pregnancy Number", toStr(cur.top.pregnancy_number)],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="rounded-2xl bg-gradient-to-br from-slate-50 to-white p-3 shadow-sm ring-1 ring-slate-100 sm:p-4"
                        >
                          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 sm:text-[11px]">
                            {label}
                          </div>
                          <div className="mt-1 break-words text-base font-extrabold text-[#203D7A] sm:text-lg">
                            {value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Section>

                  <Section title="Monthly Details">
                    {monthsToShow.length === 0 ? (
                      <div className="rounded-2xl bg-slate-50/80 p-4 text-sm text-slate-700 ring-1 ring-slate-100">
                        No HBM current records yet.
                      </div>
                    ) : (
                      <div className="grid gap-3 xl:grid-cols-2">
                        {monthsToShow.map((m: any, index: number) => {
                          const primaryItems = [
                            ["Check-up date", fmtDate(m.visit_date)],
                            ["Gestational age", `${toStr(m.gestational_weeks)} weeks`],
                            ["BP", toStr(m.bp)],
                            ["Weight", `${toStr(m.weight_kg)} kg`],
                            ["Fundal height", `${toStr(m.fundal_height_cm)} cm`],
                            ["Lab results", compactValue(m.laboratory_results)],
                          ];

                          const dangerItems = [
                            ["Urine infection", m.urine_infection],
                            ["Vaginal bleeding", m.vaginal_bleeding],
                            ["Fever ≥ 38°C", m.fever_38_or_more],
                            ["Pallor / anemia", m.pallor_anemia],
                            ["Abnormal tummy size", m.abnormal_abdominal_size],
                            ["Abnormal presentation", m.abnormal_presentation],
                            ["Absent fetal heartbeat", m.absent_fetal_heartbeat],
                            ["Edema", m.edema],
                            ["Vaginal infection/discharge", m.vaginal_infection],
                          ];

                          const careItems = [
                            ["Iron/Folate Rx (#)", toStr(m.iron_folate_rx)],
                            ["Iodine supplement", yesNoDisplay(m.iodine_risk_area)],
                            ["Malaria prophylaxis", yesNoDisplay(m.malaria_prophylaxis)],
                            ["Plans to breastfeed", yesNoDisplay(m.plan_breastfeed)],
                            ["Counseled danger signs", yesNoDisplay(m.counseled_danger_signs)],
                            ["Dental check", yesNoDisplay(m.dental_check)],
                            ["Birth plan prepared", yesNoDisplay(m.birth_plan_prepared)],
                            ["Any danger noted", yesNoDisplay(m.danger_present)],
                            ["Next visit date", fmtDate(m.next_visit_date)],
                          ];

                          const importantCount = dangerItems.filter(([, value]) => yesNoDisplay(value) === "Yes").length;

                          return (
                            <details
                              key={m.month_index}
                              open={index === 0}
                              className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100"
                            >
                              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 bg-[#203D7A]/5 px-3 py-3 marker:hidden sm:px-4">
                                <div className="min-w-0">
                                  <div className="break-words text-base font-extrabold text-[#203D7A]">
                                    {monthLabel(m.month_index)}
                                  </div>
                                  <div className="text-xs font-medium text-slate-500">
                                    HBM current monitoring
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  {importantCount > 0 ? (
                                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 ring-1 ring-amber-200">
                                      {importantCount} finding{importantCount > 1 ? "s" : ""}
                                    </span>
                                  ) : null}
                                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[#0F8A99] ring-1 ring-[#0F8A99]/20">
                                    Recorded
                                  </span>
                                  <IconChevron className="h-4 w-4 text-slate-500 transition-transform group-open:rotate-180" />
                                </div>
                              </summary>

                              <div className="space-y-3 p-3 sm:p-4">
                                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                  {primaryItems.map(([label, value]) => (
                                    <div
                                      key={label as string}
                                      className="min-w-0 rounded-xl bg-slate-50/80 px-3 py-2 ring-1 ring-slate-100"
                                    >
                                      <div className="text-[11px] font-semibold text-slate-500">
                                        {label}
                                      </div>
                                      <div className="mt-0.5 min-w-0 break-words text-sm font-bold leading-snug text-slate-900">
                                        {String(value)}
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                <div className="grid gap-3 lg:grid-cols-2">
                                  <div className="rounded-2xl bg-slate-50/80 p-3 ring-1 ring-slate-100">
                                    <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                                      Danger signs / findings
                                    </div>
                                    <div className="grid gap-1.5 sm:grid-cols-2">
                                      {dangerItems.map(([label, value]) => {
                                        const display = yesNoDisplay(value);
                                        return (
                                          <div
                                            key={label as string}
                                            className="flex min-w-0 items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-xs ring-1 ring-slate-100"
                                          >
                                            <span className="min-w-0 break-words text-slate-600">{label}</span>
                                            <span
                                              className={[
                                                "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold",
                                                display === "Yes"
                                                  ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                                                  : "bg-slate-50 text-slate-700",
                                              ].join(" ")}
                                            >
                                              {display}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  <div className="rounded-2xl bg-slate-50/80 p-3 ring-1 ring-slate-100">
                                    <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                                      Care plan / next steps
                                    </div>
                                    <div className="grid gap-1.5 sm:grid-cols-2">
                                      {careItems.map(([label, value]) => (
                                        <div
                                          key={label as string}
                                          className="min-w-0 rounded-xl bg-white px-3 py-2 text-xs ring-1 ring-slate-100"
                                        >
                                          <div className="break-words text-slate-500">{label}</div>
                                          <div className="mt-0.5 break-words font-bold text-slate-900">
                                            {String(value)}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </details>
                          );
                        })}
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
                            className="h-11 w-full rounded-xl border border-[#203D7A]/40 bg-white px-3 text-[14px] font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#203D7A]/25"
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
                      <div className="rounded-xl bg-slate-50/70 p-3 ring-1 ring-slate-100">
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
                        <div className="grid gap-3 md:grid-cols-2">
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
                                className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-100"
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

      <DashboardFooter />
    </div>
  );
}
