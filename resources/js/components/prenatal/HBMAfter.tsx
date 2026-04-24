// resources/js/pages/center/prenatal/components/HBMAfter.tsx
import * as React from "react";
import { usePage, router } from "@inertiajs/react";
import type { HBMTabProps } from "./HBMTab";
import { useConfirm } from "../confirm-kit";
import AddPatientWizard from "@/components/add-patient-wizard";

/* --------------------------------- Routes --------------------------------- */
const AFTER_URL = (id: number | string) =>
  `/center/patients/${id}/prenatal/after-grid`;

/* --------------------------- Fetch / Form helpers -------------------------- */
function csrfToken(): string {
  const meta = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null;
  // @ts-ignore
  const fromWindow = (window?.Laravel?.csrfToken as string) || "";
  const fromCookie = (() => {
    const m = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : "";
  })();
  return (meta?.content || fromWindow || fromCookie || "").toString();
}

const enc = (v: any) => (v === true ? "1" : v === false ? "0" : v ?? "");

function appendForm(fd: FormData, prefix: string, value: any) {
  if (Array.isArray(value)) {
    value.forEach((v, i) => appendForm(fd, `${prefix}[${i}]`, v));
  } else if (value && typeof value === "object") {
    Object.entries(value).forEach(([k, v]) => appendForm(fd, `${prefix}[${k}]`, v));
  } else {
    fd.append(prefix, enc(value));
  }
}

async function postForm(
  url: string,
  payload: { after: any; token?: string | null }
) {
  const fd = new FormData();
  appendForm(fd, "after", payload.after);
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
    if (res.status === 419)
      throw new Error(
        "CSRF token mismatch (or session expired). Please reload this page and try again."
      );

    let msg = `Save failed (${res.status})`;
    try {
      if (res.status === 422) {
        const j = await res.json();
        const first = j?.errors
          ? String((Object.values(j.errors).flat() as any[])[0] ?? "Validation failed")
          : j?.message;
        throw new Error(first || msg);
      }
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const j = await res.json().catch(() => ({}));
        msg = j?.message || msg;
      } else {
        const t = await res.text().catch(() => "");
        if ((res.redirected && /\/login/i.test(res.url)) || /<form[^>]+login/i.test(t)) {
          msg = "Not authenticated (session expired). Please sign in again.";
        }
      }
    } catch { }
    throw new Error(msg);
  }
}

/* ---------------------------------- Types ---------------------------------- */
type ColKey = "c1" | "c2" | "c3" | "c4";

const COLS: ColKey[] = ["c1", "c2", "c3", "c4"];
const COL_TITLES = ["24 Hours", "Day 3", "1 Week", "2–4 Weeks / Clinic"];

type Place = "Home" | "Clinic" | "" | null;

type VisitCell = {
  id?: number | string | null;
  column_index?: number | null;
  date: string | null;
  time: string | null;
  place: Place;
};

type CheckKey =
  | "exclusive_breastfeeding"
  | "family_planning_intent"
  | "fever_38_up"
  | "foul_lochia"
  | "heavy_bleeding"
  | "red_breast"
  | "navel_ok";

const CHECK_KEYS: CheckKey[] = [
  "exclusive_breastfeeding",
  "family_planning_intent",
  "fever_38_up",
  "foul_lochia",
  "heavy_bleeding",
  "red_breast",
  "navel_ok",
];

type Delivery = {
  immediate_breastfeeding?: boolean | null;
  delivery_mode?: string | null;
  delivery_date?: string | null;
  delivery_place?: string | null;
  attended_by?: string | null;
  birth_weight_g?: number | null;
  pph_over_500cc?: boolean | null;
  baby_alive?: boolean | null;
  baby_healthy?: boolean | null;
};

type AfterState = {
  visits: Record<ColKey, VisitCell>;
  checks: Record<CheckKey, Record<ColKey, boolean | null>>;
  supplements: {
    vitamin_a_date: string | null;
    iron_folate_date: string | null;
    iron_folate_count: number | null;
  };
  referral: { referred: boolean | null; reason: string; institution: string };
  fp: {
    followup_date: string | null;
    consult_date: string | null;
    method: string | null;
    given_qty: number | null;
    notes: string;
  };
  delivery: Delivery;
};

/* ------------------------------- Local Draft ------------------------------- */
const DRAFT_KEY = (pid: number | string) => `hbm_after:${pid}`;

const readDraft = (pid: number | string) => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY(pid));
    return raw ? (JSON.parse(raw) as Partial<AfterState>) : {};
  } catch {
    return {};
  }
};

const writeDraft = (pid: number | string, snapshot: AfterState) => {
  try {
    localStorage.setItem(DRAFT_KEY(pid), JSON.stringify(snapshot));
  } catch { }
};

const clearDraft = (pid: number | string) => {
  try {
    localStorage.removeItem(DRAFT_KEY(pid));
  } catch { }
};

/* -------------------------------- Utilities -------------------------------- */
const inputBase =
  "w-full rounded-md border bg-white outline-none transition";
const inputH = "h-11 sm:h-10 px-3";
const inputText = "text-[16px] sm:text-[14px]";
const labelXs = "block text-[12px] sm:text-[11px] text-slate-600";
const titleSm = "text-[16px] sm:text-[17px] font-semibold text-[#203D7A]";
const help = "text-[12px] text-slate-500";
const sectionPad = "p-2 sm:p-3";

function inputClass({
  invalid,
  locked,
  extra,
}: {
  invalid?: boolean;
  locked?: boolean;
  extra?: string;
}) {
  return [
    inputBase,
    inputH,
    inputText,
    invalid
      ? "border-rose-500 ring-1 ring-rose-300 focus:ring-2 focus:ring-rose-400 focus:border-rose-500"
      : "border-slate-300 focus:ring-2 focus:ring-oh-teal/25 focus:border-oh-teal",
    locked ? "bg-slate-100 cursor-not-allowed" : "",
    extra || "",
  ]
    .filter(Boolean)
    .join(" ");
}

function textareaClass({
  invalid,
  locked,
  extra,
}: {
  invalid?: boolean;
  locked?: boolean;
  extra?: string;
}) {
  return [
    inputBase,
    inputText,
    "px-3 py-2",
    invalid
      ? "border-rose-500 ring-1 ring-rose-300 focus:ring-2 focus:ring-rose-400 focus:border-rose-500"
      : "border-slate-300 focus:ring-2 focus:ring-oh-teal/25 focus:border-oh-teal",
    locked ? "bg-slate-100 cursor-not-allowed" : "",
    extra || "",
  ]
    .filter(Boolean)
    .join(" ");
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

const nowHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(
    2,
    "0"
  )}`;
};

const normBool = (v: any): boolean | null => {
  if (v === true || v === 1 || v === "1" || v === "true" || v === "yes" || v === "oo")
    return true;
  if (
    v === false ||
    v === 0 ||
    v === "0" ||
    v === "false" ||
    v === "no" ||
    v === "hindi"
  )
    return false;
  return null;
};

function splitMotherName(fullName?: string | null) {
  const raw = String(fullName ?? "").trim().replace(/\s+/g, " ");
  if (!raw) {
    return {
      mother_given_name: "",
      mother_middle_name: "",
      mother_last_name: "",
    };
  }

  const parts = raw.split(" ");
  if (parts.length === 1) {
    return {
      mother_given_name: parts[0].toUpperCase(),
      mother_middle_name: "",
      mother_last_name: "",
    };
  }
  if (parts.length === 2) {
    return {
      mother_given_name: parts[0].toUpperCase(),
      mother_middle_name: "",
      mother_last_name: parts[1].toUpperCase(),
    };
  }

  return {
    mother_given_name: parts[0].toUpperCase(),
    mother_middle_name: parts.slice(1, -1).join(" ").toUpperCase(),
    mother_last_name: parts[parts.length - 1].toUpperCase(),
  };
}


function splitAddressParts(rawAddress?: string | null) {
  const raw = String(rawAddress ?? "").trim();
  if (!raw) {
    return {
      address_house_street: "",
      address_line2: "",
      address_city: "Silang",
      address_province: "Cavite",
      address_postal_code: "",
    };
  }

  const parts = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const lowerParts = parts.map((part) => part.toLowerCase());
  const cityIdx = lowerParts.findIndex((part) => part.includes("silang"));
  const provinceIdx = lowerParts.findIndex((part) => part.includes("cavite"));

  const city = cityIdx >= 0 ? parts[cityIdx] : "Silang";
  const province = provinceIdx >= 0 ? parts[provinceIdx] : "Cavite";

  const streetParts = parts.filter((_, idx) => idx !== cityIdx && idx !== provinceIdx)

  return {
    address_house_street: streetParts[0] ?? raw,
    address_line2: streetParts.slice(1).join(", "),
    address_city: city,
    address_province: province,
    address_postal_code: "",
  };
}

function normalizeServerAfter(serverRaw: any): Partial<AfterState> {
  if (!serverRaw) return {};

  const out: Partial<AfterState> = {};
  const arr: any[] = Array.isArray(serverRaw.visits)
    ? serverRaw.visits
    : Array.isArray(serverRaw)
      ? serverRaw
      : [];

  const byIndex: Record<number, any> = {};
  arr.forEach((r: any, idx: number) => {
    const ciRaw = r?.column_index ?? idx + 1;
    const ci = Number(ciRaw);
    if (ci >= 1 && ci <= 4) byIndex[ci] = r || {};
  });

  const asVisitCell = (r: any, idx: number): VisitCell => ({
    id: r?.id ?? null,
    column_index: r?.column_index ?? idx + 1,
    date: r?.visit_date ?? r?.followup_date ?? null,
    time: r?.followup_time ?? r?.time ?? null,
    place: (r?.place ?? "") as Place,
  });

  const byCol: Record<ColKey, any> = {
    c1: byIndex[1] || {},
    c2: byIndex[2] || {},
    c3: byIndex[3] || {},
    c4: byIndex[4] || {},
  };

  out.visits = {
    c1: asVisitCell(byCol.c1, 0),
    c2: asVisitCell(byCol.c2, 1),
    c3: asVisitCell(byCol.c3, 2),
    c4: asVisitCell(byCol.c4, 3),
  } as any;

  const blankChecks: AfterState["checks"] = {
    exclusive_breastfeeding: { c1: null, c2: null, c3: null, c4: null },
    family_planning_intent: { c1: null, c2: null, c3: null, c4: null },
    fever_38_up: { c1: null, c2: null, c3: null, c4: null },
    foul_lochia: { c1: null, c2: null, c3: null, c4: null },
    heavy_bleeding: { c1: null, c2: null, c3: null, c4: null },
    red_breast: { c1: null, c2: null, c3: null, c4: null },
    navel_ok: { c1: null, c2: null, c3: null, c4: null },
  };

  (CHECK_KEYS as CheckKey[]).forEach((key) => {
    (["c1", "c2", "c3", "c4"] as ColKey[]).forEach((ck, i) => {
      const raw = byCol[ck]?.[key];
      (blankChecks as any)[key][ck] = normBool(raw);
      if (out.visits) {
        const cell = (out.visits as any)[ck];
        if (cell && (cell.column_index === undefined || cell.column_index === null)) {
          cell.column_index = i + 1;
        }
      }
    });
  });

  out.checks = blankChecks;

  const suppSourceRow =
    (serverRaw.supplements as any) ||
    arr.find(
      (r) =>
        r?.vitamin_a_date ||
        r?.iron_folate_date ||
        r?.iron_folate_count ||
        r?.iron_folate_qty
    ) ||
    {};

  out.supplements = {
    vitamin_a_date:
      serverRaw.vitamin_a_date ?? suppSourceRow.vitamin_a_date ?? null,
    iron_folate_date:
      serverRaw.iron_folate_date ?? suppSourceRow.iron_folate_date ?? null,
    iron_folate_count:
      serverRaw.iron_folate_count ??
      suppSourceRow.iron_folate_count ??
      suppSourceRow.iron_folate_qty ??
      null,
  };

  const lastRowWithExtras =
    arr
      .slice()
      .reverse()
      .find((r) => r?.referral || r?.fp || r?.delivery) || arr[arr.length - 1] || {};

  const rawReferral = serverRaw.referral || lastRowWithExtras.referral || {};
  const rawFp = serverRaw.fp || lastRowWithExtras.fp || {};
  const rawDelivery = serverRaw.delivery || lastRowWithExtras.delivery || {};

  out.referral = {
    referred:
      normBool(rawReferral.referred ?? rawReferral?.referred_yn) ?? null,
    reason: rawReferral.reason ?? rawReferral?.referral_reason ?? "",
    institution:
      rawReferral.institution ??
      rawReferral?.referral_institution ??
      "",
  };

  out.fp = {
    followup_date:
      rawFp.followup_date ?? rawFp?.fp_followup_date ?? null,
    consult_date:
      rawFp.consult_date ?? rawFp?.fp_consult_date ?? null,
    method: rawFp.method ?? rawFp?.fp_method ?? null,
    given_qty:
      rawFp.given_qty ?? rawFp?.fp_given_qty ?? null,
    notes: rawFp.notes ?? rawFp?.fp_notes ?? "",
  };

  out.delivery = {
    immediate_breastfeeding: normBool(rawDelivery?.immediate_breastfeeding),
    delivery_mode: rawDelivery?.delivery_mode ?? null,
    delivery_date: rawDelivery?.delivery_date ?? null,
    delivery_place: rawDelivery?.delivery_place ?? null,
    attended_by: rawDelivery?.attended_by ?? null,
    birth_weight_g:
      rawDelivery?.birth_weight_g == null || rawDelivery?.birth_weight_g === ""
        ? null
        : Number(rawDelivery.birth_weight_g),
    pph_over_500cc: normBool(rawDelivery?.pph_over_500cc),
    baby_alive: normBool(rawDelivery?.baby_alive),
    baby_healthy: normBool(rawDelivery?.baby_healthy),
  };

  return out;
}

/* --------------------------- Small SVG icons ------------------------------- */
const IconSave = (p: any) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    {...p}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
    <path d="M17 21v-8H7v8M7 3v5h8" />
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
    strokeWidth="2"
  >
    <rect x="4" y="11" width="16" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

const IconUnlock = (p: any) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    {...p}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <rect x="4" y="11" width="16" height="9" rx="2" />
    <path d="M15 11V8a3 3 0 0 0-6 0" />
  </svg>
);

const IconCalendar = (p: any) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...p} fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

const IconBaby = (p: any) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...p} fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="8" r="3" />
    <path d="M8 21v-5a4 4 0 0 1 8 0v5" />
    <path d="M9 13h6" />
  </svg>
);

/* --------------------------- Small UI building blocks ---------------------- */
function SegYN({
  value,
  onChange,
  labels,
  disabled,
  danger,
}: {
  value: boolean | null | undefined;
  onChange: (v: boolean) => void;
  labels?: { no?: string; yes?: string };
  disabled?: boolean;
  danger?: boolean;
}) {
  const L = { no: labels?.no ?? "No", yes: labels?.yes ?? "Yes" };
  const base =
    "px-3 h-11 sm:h-9 inline-flex items-center justify-center text-[15px] sm:text-[13px] " +
    "border rounded-md transition focus-visible:ring-2 focus-visible:ring-oh-teal/40";
  const on = danger
    ? "bg-rose-600 text-white border-rose-600"
    : "bg-oh-teal text-white border-oh-teal";
  const off = "bg-white text-slate-900 border-slate-300 hover:bg-slate-50";
  const disabledCls = disabled ? "opacity-60 cursor-not-allowed pointer-events-none" : "";
  return (
    <div className={`inline-flex gap-1 ${disabledCls}`}>
      <button
        type="button"
        className={`${base} ${value === false ? on.replace("bg-rose-600 text-white border-rose-600", "bg-oh-teal text-white border-oh-teal") : off}`}
        onClick={() => {
          if (disabled) return;
          onChange(false);
        }}
      >
        {L.no}
      </button>
      <button
        type="button"
        className={`${base} ${value === true ? on : off}`}
        onClick={() => {
          if (disabled) return;
          onChange(true);
        }}
      >
        {L.yes}
      </button>
    </div>
  );
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
          aria-labelledby="hbm-after-result-title"
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
                  <svg
                    viewBox="0 0 24 24"
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M15 9 9 15M9 9l6 6" />
                  </svg>
                )}
              </div>
              <div className="min-w-0">
                <h2
                  id="hbm-after-result-title"
                  className="text-base font-semibold text-slate-900"
                >
                  {title}
                </h2>
                {message ? (
                  <p className="mt-1 text-sm text-slate-600">{message}</p>
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

/* -------------------------------- Component -------------------------------- */
export default function HBMAfter({ patient, token, ...rest }: HBMTabProps) {
  const { canEdit = false } = usePage<any>().props;
  const confirm = useConfirm();
  const url = React.useMemo(() => AFTER_URL(patient.id), [patient.id]);

  const defaults: AfterState = React.useMemo(
    () => ({
      visits: {
        c1: { id: null, column_index: 1, date: null, time: null, place: "" },
        c2: { id: null, column_index: 2, date: null, time: null, place: "" },
        c3: { id: null, column_index: 3, date: null, time: null, place: "" },
        c4: { id: null, column_index: 4, date: null, time: null, place: "" },
      },
      checks: CHECK_KEYS.reduce((acc, key) => {
        (acc as any)[key] = { c1: null, c2: null, c3: null, c4: null };
        return acc;
      }, {} as AfterState["checks"]),
      supplements: {
        vitamin_a_date: null,
        iron_folate_date: null,
        iron_folate_count: null,
      },
      referral: { referred: null, reason: "", institution: "" },
      fp: {
        followup_date: null,
        consult_date: null,
        method: null,
        given_qty: null,
        notes: "",
      },
      delivery: {
        immediate_breastfeeding: null,
        delivery_mode: null,
        delivery_date: null,
        delivery_place: null,
        attended_by: null,
        birth_weight_g: null,
        pph_over_500cc: null,
        baby_alive: null,
        baby_healthy: null,
      },
    }),
    []
  );

  const [dirty, setDirty] = React.useState(false);
  const ignoreBeforeNavRef = React.useRef(false);
  const [openBabyWizard, setOpenBabyWizard] = React.useState(false);

  const buildState = React.useCallback(
    (server: any, draft: Partial<AfterState>): AfterState => {
      const fromServer = normalizeServerAfter(server);
      const out: AfterState = {
        ...defaults,
        ...fromServer,
        ...draft,
        visits: {
          ...defaults.visits,
          ...(fromServer?.visits || {}),
          ...(draft?.visits || {}),
        },
        checks: {
          ...defaults.checks,
          ...(fromServer?.checks || {}),
          ...(draft?.checks || {}),
        },
        supplements: {
          ...defaults.supplements,
          ...(fromServer?.supplements || {}),
          ...(draft?.supplements || {}),
        },
        referral: {
          ...defaults.referral,
          ...(fromServer?.referral || {}),
          ...(draft?.referral || {}),
        },
        fp: {
          ...defaults.fp,
          ...(fromServer?.fp || {}),
          ...(draft?.fp || {}),
        },
        delivery: {
          ...defaults.delivery,
          ...(fromServer?.delivery || {}),
          ...(draft?.delivery || {}),
        },
      };
      (["c1", "c2", "c3", "c4"] as ColKey[]).forEach((ck, i) => {
        if (
          out.visits[ck].column_index === undefined ||
          out.visits[ck].column_index === null
        ) {
          out.visits[ck].column_index = i + 1;
        }
      });
      return out;
    },
    [defaults]
  );

  const [data, setData] = React.useState<AfterState>(() => {
    const server = (rest as any)?.after;
    const draft = readDraft(patient.id);
    return buildState(server, draft);
  });

  const motherParts = React.useMemo(
    () => splitMotherName((patient as any)?.full_name),
    [patient]
  );

  const babyWizardPrefill = React.useMemo(() => {
    const p: any = patient ?? {};
    const delivery = data?.delivery ?? {};
    const addressParts = splitAddressParts(
      p.address ??
      p.full_address ??
      p.complete_address ??
      ""
    );

    const deliveryTypeMap: Record<string, string> = {
      NSVD: "NSVD",
      CS: "CS",
      Breech: "OTHERS",
      Instrumental: "OTHERS",
      Other: "OTHERS",
    };

    const birthdate = delivery.delivery_date ?? p.birthdate ?? "";
    const registrationDate =
      delivery.delivery_date ??
      p.date_of_registration ??
      p.registration_date ??
      "";

    return {
      patient_type: "immunization" as const,

      first_name: "",
      middle_name:
        p.middle_name ??
        p.patient_middle_name ??
        p.child_middle_name ??
        motherParts.mother_middle_name ??
        "",
      last_name: motherParts.mother_last_name || "",
      suffix: "",
      suffix_other: "",

      birthdate,
      sex: "",

      phone: p.contact_no ?? p.phone ?? p.phone_number ?? "",
      barangay: p.barangay ?? p.address_barangay ?? "",
      address: p.address ?? p.full_address ?? p.complete_address ?? "",
      address_province: p.address_province ?? p.province ?? addressParts.address_province,
      address_city: p.address_city ?? p.city ?? p.municipality ?? addressParts.address_city,
      address_house_street:
        p.address_house_street ??
        p.house_street ??
        p.street ??
        p.street_address ??
        addressParts.address_house_street,
      address_line2:
        p.address_line2 ??
        p.sitio ??
        p.purok ??
        p.zone ??
        p.subdivision ??
        addressParts.address_line2,
      address_postal_code:
        p.address_postal_code ??
        p.postal_code ??
        p.zip_code ??
        "",

      date_of_registration: registrationDate,
      family_no: p.family_no ?? p.family_number ?? p.family_serial_number ?? "",
      date_referred_nb_screening: "",
      date_nbs_done: "",
      place_of_birth:
        delivery.delivery_place ??
        p.place_of_birth ??
        p.delivery_place ??
        "",
      age: "",
      child_height_cm: "",
      birth_weight_kg:
        delivery.birth_weight_g != null
          ? String(Number(delivery.birth_weight_g) / 1000)
          : "",
      cpab: p.cpab ?? "",
      delivery_type: deliveryTypeMap[String(delivery.delivery_mode ?? "")] ?? "",
      mother_last_name: motherParts.mother_last_name,
      mother_given_name: motherParts.mother_given_name,
      mother_middle_name: motherParts.mother_middle_name,
      father_name:
        p.father_name ??
        [p.father_first_name, p.father_middle_name, p.father_last_name]
          .filter(Boolean)
          .join(" "),
      tt_status_mother: p.tt_status_mother ?? "",
      tt_status_date: p.tt_status_date ?? "",
      health_center: p.health_center ?? p.center_name ?? "",
    };
  }, [patient, data, motherParts]);

  const VISIT_OPTIONS: { col: ColKey; label: string }[] = [
    { col: "c1", label: "24 Hours" },
    { col: "c3", label: "1 Week" },
    { col: "c4", label: "2–4 Weeks / Clinic" },
  ];

  const [activeCol, setActiveCol] = React.useState<ColKey>("c1");

  const [saving, setSaving] =
    React.useState<"idle" | "saving" | "saved" | "failed" | "draft">("idle");
  const isSaving = saving === "saving";

  const statusRef = React.useRef<HTMLSpanElement>(null);
  const errorRef = React.useRef<HTMLDivElement>(null);

  const setStatus = (t: string) => {
    if (statusRef.current) statusRef.current.textContent = t;
  };

  const setError = (t: string | null) => {
    const el = errorRef.current;
    if (!el) return;
    el.textContent = t || "";
    el.style.display = t ? "block" : "none";
  };

  const [resultOpen, setResultOpen] = React.useState(false);
  const [resultKind, setResultKind] = React.useState<ResultKind>("success");
  const [resultTitle, setResultTitle] = React.useState("");
  const [resultMsg, setResultMsg] = React.useState<string | undefined>();

  const [locked, setLocked] = React.useState<boolean>(true);
  const toggleLock = () => setLocked((v) => !v);

  const todayStr = React.useMemo(() => {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
  }, []);

  const followupMaxStr = React.useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
  }, []);

  React.useEffect(() => {
    const server = (rest as any)?.after;
    const draft = readDraft(patient.id);
    setData(buildState(server, draft));
    setSaving("idle");
    setError(null);
    setStatus("");
    setDirty(false);
    setActiveCol("c1");
    setLocked(true);
  }, [patient.id, JSON.stringify((rest as any)?.after), buildState]);

  React.useEffect(() => {
    if (saving === "failed") {
      setResultKind("error");
      setResultTitle("Save failed");
      setResultMsg(errorRef.current?.textContent || "Please try again.");
      setResultOpen(true);
    }
  }, [saving]);

  React.useEffect(() => {
    const beforeUnload = (e: any) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);

    const unbind = (router as any).on("before", (evt: any) => {
      if (ignoreBeforeNavRef.current) return;
      if (!dirty) return;
      const ok = window.confirm("You have unsaved changes. Leave this page?");
      if (!ok) evt.preventDefault();
    });

    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      try {
        unbind?.();
      } catch { }
    };
  }, [dirty]);

  const markDraft = React.useCallback(() => {
    setDirty(true);
    setSaving("draft");
    setStatus("Draft ✓");
    setTimeout(() => {
      if ((statusRef.current?.textContent || "") === "Draft ✓") setStatus("");
    }, 900);
  }, []);

  const mutate = React.useCallback(
    (updater: (prev: AfterState) => AfterState) => {
      setData((prev) => {
        if (locked) return prev;
        const next = updater(prev);
        writeDraft(patient.id, next);
        markDraft();
        return next;
      });
    },
    [patient.id, markDraft, locked]
  );

  const setVisitDate = (c: ColKey, v: string) =>
    mutate((d) => ({
      ...d,
      visits: {
        ...d.visits,
        [c]: {
          ...d.visits[c],
          date: v || null,
          time: d.visits[c].time ?? (v ? nowHHMM() : null),
        },
      },
    }));

  const setCheck = (row: CheckKey, c: ColKey, val: boolean) =>
    mutate((d) => ({
      ...d,
      checks: {
        ...d.checks,
        [row]: { ...d.checks[row], [c]: val },
      },
    }));

  const setSupp = <K extends keyof AfterState["supplements"]>(
    k: K,
    v: AfterState["supplements"][K]
  ) =>
    mutate((d) => ({
      ...d,
      supplements: { ...d.supplements, [k]: v },
    }));

  const setFP = <K extends keyof AfterState["fp"]>(
    k: K,
    v: AfterState["fp"][K]
  ) =>
    mutate((d) => ({
      ...d,
      fp: { ...d.fp, [k]: v },
    }));

  const setDelivery = <K extends keyof Delivery>(k: K, v: Delivery[K]) =>
    mutate((d) => ({
      ...d,
      delivery: { ...d.delivery, [k]: v },
    }));

  const doSaveAll = React.useCallback(async () => {
    try {
      setStatus("Saving…");
      setError(null);
      setSaving("saving");

      const visitsAll = COLS.map((c, idx) => {
        const v: VisitCell =
          data.visits[c] || {
            id: null,
            column_index: idx + 1,
            date: null,
            time: null,
            place: "",
          };

        const pick = (row: CheckKey) => data.checks[row]?.[c] ?? null;

        const baseVisit: any = {
          id: v.id ?? null,
          column_index: v.column_index ?? idx + 1,
          visit_date: v.date || null,
          followup_date: v.date || null,
          followup_time: v.time || null,
          place: v.place || null,
          exclusive_breastfeeding: pick("exclusive_breastfeeding"),
          family_planning_intent: pick("family_planning_intent"),
          fever_38_up: pick("fever_38_up"),
          foul_lochia: pick("foul_lochia"),
          heavy_bleeding: pick("heavy_bleeding"),
          red_breast: pick("red_breast"),
          navel_ok: pick("navel_ok"),
          vitamin_a_date: data.supplements.vitamin_a_date ?? null,
          iron_folate_date: data.supplements.iron_folate_date ?? null,
          iron_folate_count: data.supplements.iron_folate_count ?? null,
          iron_folate_qty: data.supplements.iron_folate_count ?? null,
        };

        if (idx === 3) {
          baseVisit.referral = {
            referred: data.referral.referred ?? null,
            reason: data.referral.reason ?? "",
            institution: data.referral.institution ?? "",
          };
          baseVisit.fp = {
            followup_date: data.fp.followup_date ?? null,
            consult_date: data.fp.consult_date ?? null,
            method: data.fp.method ?? null,
            given_qty: data.fp.given_qty ?? null,
            notes: data.fp.notes ?? "",
          };
          baseVisit.delivery = {
            immediate_breastfeeding: data.delivery.immediate_breastfeeding ?? null,
            delivery_mode: data.delivery.delivery_mode ?? null,
            delivery_date: data.delivery.delivery_date ?? null,
            delivery_place: data.delivery.delivery_place ?? null,
            attended_by: data.delivery.attended_by ?? null,
            birth_weight_g: data.delivery.birth_weight_g ?? null,
            pph_over_500cc: data.delivery.pph_over_500cc ?? null,
            baby_alive: data.delivery.baby_alive ?? null,
            baby_healthy: data.delivery.baby_healthy ?? null,
          };
        }

        return baseVisit;
      });

      const visits = visitsAll.filter((v) => !!v.visit_date);

      const supplements = {
        vitamin_a_date: data.supplements.vitamin_a_date ?? null,
        iron_folate_date: data.supplements.iron_folate_date ?? null,
        iron_folate_count: data.supplements.iron_folate_count ?? null,
        iron_folate_qty: data.supplements.iron_folate_count ?? null,
      };

      const payload = {
        visits,
        vitamin_a_date: supplements.vitamin_a_date,
        iron_folate_date: supplements.iron_folate_date,
        iron_folate_count: supplements.iron_folate_count,
        iron_folate_qty: supplements.iron_folate_qty,
        supplements,
        referral: {
          referred: data.referral.referred ?? null,
          reason: data.referral.reason ?? "",
          institution: data.referral.institution ?? "",
        },
        fp: {
          followup_date: data.fp.followup_date ?? null,
          consult_date: data.fp.consult_date ?? null,
          method: data.fp.method ?? null,
          given_qty: data.fp.given_qty ?? null,
          notes: data.fp.notes ?? "",
        },
        delivery: {
          immediate_breastfeeding: data.delivery.immediate_breastfeeding ?? null,
          delivery_mode: data.delivery.delivery_mode ?? null,
          delivery_date: data.delivery.delivery_date ?? null,
          delivery_place: data.delivery.delivery_place ?? null,
          attended_by: data.delivery.attended_by ?? null,
          birth_weight_g: data.delivery.birth_weight_g ?? null,
          pph_over_500cc: data.delivery.pph_over_500cc ?? null,
          baby_alive: data.delivery.baby_alive ?? null,
          baby_healthy: data.delivery.baby_healthy ?? null,
        },
      };

      await postForm(
        url,
        token ? { after: payload, token } : { after: payload }
      );

      setDirty(false);
      clearDraft(patient.id);
      setSaving("saved");
      setStatus("Saved ✓");
      setTimeout(() => {
        setSaving("idle");
        setStatus("");
      }, 900);

      ignoreBeforeNavRef.current = true;
      router.reload({ only: ["after"] });
      setTimeout(() => {
        ignoreBeforeNavRef.current = false;
      }, 1500);

      setResultKind("success");
      setResultTitle("Saved successfully");
      setResultMsg("Postnatal record has been updated.");
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
  }, [data, url, token, patient.id]);

  const activeTitle = React.useMemo(() => {
    const idx = COLS.indexOf(activeCol);
    return COL_TITLES[idx] ?? "";
  }, [activeCol]);

  const periodKind: "24H" | "1W" | "2to4W" | "other" =
    activeCol === "c1" ? "24H" : activeCol === "c3" ? "1W" : activeCol === "c4" ? "2to4W" : "other";

  const visitDateStr = toYMD(data.visits[activeCol].date);
  const visitDateInvalid =
    !!visitDateStr && !!todayStr && visitDateStr > todayStr;

  const ironDateStr = toYMD(data.supplements.iron_folate_date);
  const ironDateInvalid =
    !!ironDateStr && !!todayStr && ironDateStr > todayStr;

  const followupDateStr = toYMD(data.fp.followup_date);
  const followupDateInvalid =
    !!followupDateStr &&
    ((followupDateStr < todayStr && !!todayStr) ||
      (followupDateStr > followupMaxStr && !!followupMaxStr));

  const consultDateStr = toYMD(data.fp.consult_date);
  const consultDateInvalid =
    !!consultDateStr && !!todayStr && consultDateStr > todayStr;

  const amt = data.fp.given_qty;
  const amountInvalid =
    amt !== null &&
    (Number.isNaN(amt) || amt < 0 || amt > 100);

  const vitaminAGiven = !!data.supplements.vitamin_a_date;

  const deliveryWeightInvalid =
    data.delivery.birth_weight_g != null &&
    (data.delivery.birth_weight_g <= 0 || data.delivery.birth_weight_g > 5000);

  const deliveryDateInvalid =
    !!toYMD(data.delivery.delivery_date) &&
    toYMD(data.delivery.delivery_date) > todayStr;

  const canOpenBabyWizard =
    !dirty &&
    !!toYMD(data.delivery.delivery_date) &&
    data.delivery.baby_alive === true;

  return (
    <div className="min-h-[100dvh] flex flex-col w-full max-w-full">
      <style>{`
        :root { --oh-teal: #0F8A99; }
        input[type="date"], input[type="time"], input[type="datetime-local"], input[type="month"], input[type="week"] {
          accent-color: var(--oh-teal);
          caret-color: var(--oh-teal);
        }
        input[type="date"]::-webkit-calendar-picker-indicator,
        input[type="time"]::-webkit-calendar-picker-indicator,
        input[type="datetime-local"]::-webkit-calendar-picker-indicator,
        input[type="month"]::-webkit-calendar-picker-indicator,
        input[type="week"]::-webkit-calendar-picker-indicator {
          filter: invert(43%) sepia(27%) saturate(1098%) hue-rotate(137deg) brightness(88%) contrast(92%);
          opacity: 0.95; cursor: pointer;
        }
        input[type="date"]::-webkit-calendar-picker-indicator,
        input[type="time"]::-webkit-calendar-picker-indicator { width: 1.25em; height: 1.25em; }
        @supports (-moz-appearance: none) {
          input[type="date"], input[type="time"], input[type="datetime-local"], input[type="month"], input[type="week"] {
            accent-color: var(--oh-teal); caret-color: var(--oh-teal);
          }
        }
      `}</style>

      <div
        className={[
          "mx-auto w-full max-w-screen-2xl px-2 sm:px-3 lg:px-6 flex-1 overflow-x-hidden",
          locked ? "opacity-60" : "opacity-100",
          "transition-opacity duration-150",
        ].join(" ")}
      >
        <div className="mt-1 mb-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[18px] sm:text-[20px] font-semibold text-[#203D7A]">
              Home-Based Mother’s Record — Postnatal (After)
            </h2>
            <div className="flex items-center gap-2">
              {dirty && (
                <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs text-amber-800">
                  • Unsaved changes
                </span>
              )}
              <span
                ref={statusRef}
                className="text-[12px] sm:text-[13px] text-slate-600"
                aria-live="polite"
              />
              <button
                type="button"
                onClick={toggleLock}
                className={[
                  "h-9 w-9 rounded-lg flex items-center justify-center border-2 text-xs font-medium transition",
                  locked
                    ? "bg-slate-100 border-slate-300 text-slate-700 shadow-inner bg-white"
                    : "bg-[var(--oh-teal,_#0F8A99)] border-[var(--oh-teal,_#0F8A99)] text-white shadow-lg",
                ].join(" ")}
                title={locked ? "Locked (Tap to edit)" : "Editing (Tap to lock)"}
              >
                {locked ? (
                  <IconLock className="h-4 w-4" />
                ) : (
                  <IconUnlock className="h-4 w-4" />
                )}
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

          <div
            ref={errorRef}
            style={{ display: "none" }}
            className="mt-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700"
            role="alert"
          />
          <div className="mt-2 h-px w-full bg-slate-200" />
        </div>

        <div className="rounded-md bg-white shadow-sm divide-y divide-slate-200 overflow-hidden">
          <section className={sectionPad}>
            <h3 className={titleSm}>Visits</h3>
            <p className={`${help} mt-0.5`}>
              Choose a <b>visit period</b>, then fill in the <b>date</b>.
            </p>

            <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,210px)_minmax(0,1fr)] items-end">
              <div>
                <label className={labelXs}>Visit period</label>
                <select
                  className={inputClass({ locked })}
                  value={activeCol}
                  onChange={(e) =>
                    setActiveCol(e.currentTarget.value as ColKey)
                  }
                  disabled={locked}
                >
                  {VISIT_OPTIONS.map((opt) => (
                    <option key={opt.col} value={opt.col}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelXs}>Visit date</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    className={inputClass({
                      invalid: visitDateInvalid,
                      locked,
                    })}
                    value={visitDateStr}
                    max={todayStr || undefined}
                    onChange={(e) =>
                      setVisitDate(activeCol, e.currentTarget.value)
                    }
                    disabled={locked}
                  />
                  <button
                    type="button"
                    onClick={() => !locked && setVisitDate(activeCol, todayStr)}
                    className={[
                      "whitespace-nowrap rounded-md border text-[13px] px-3",
                      "h-11 sm:h-10",
                      locked
                        ? "bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed"
                        : "bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100",
                    ].join(" ")}
                    disabled={locked}
                  >
                    Today
                  </button>
                </div>
                {visitDateInvalid && (
                  <p className="mt-1 text-[11px] text-rose-600">
                    Visit date cannot be in the future.
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className={sectionPad}>
            <h3 className={titleSm}>Assessment</h3>
            <p className={`${help} mt-0.5`}>
              Set <b>Yes / No</b> for the <b>{activeTitle}</b> visit.
            </p>

            {(() => {
              const exBF = data.checks.exclusive_breastfeeding[activeCol];
              const intendsFP = data.checks.family_planning_intent[activeCol];
              const fever = data.checks.fever_38_up[activeCol];
              const foul = data.checks.foul_lochia[activeCol];
              const heavy = data.checks.heavy_bleeding[activeCol];
              const pale = data.checks.red_breast[activeCol];
              const navelOk = data.checks.navel_ok[activeCol];

              const baseCard =
                "flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2 border rounded-md";

              const yellowCard =
                "bg-[#E0F4F6] border-[#0F8A99]/40";
              const redCard =
                "bg-rose-50 border-rose-300";
              const neutralCard =
                "bg-slate-50/60 border-slate-200";

              let feverCardClass = neutralCard;
              let feverMsg: string | null = null;
              if (fever === true) {
                if (periodKind === "24H") {
                  feverCardClass = yellowCard;
                  feverMsg =
                    "Send the patient immediately to the doctor or RHU.";
                } else if (periodKind === "1W" || periodKind === "2to4W") {
                  feverCardClass = redCard;
                  feverMsg =
                    "Send the patient immediately to the HOSPITAL.";
                }
              }

              const foulCardClass =
                foul === true ? yellowCard : neutralCard;
              const foulMsg =
                foul === true
                  ? "Send the patient immediately to the doctor or RHU."
                  : null;

              const heavyCardClass =
                heavy === true ? redCard : neutralCard;
              const heavyMsg =
                heavy === true
                  ? "Send the patient immediately to the HOSPITAL."
                  : null;

              const paleCardClass =
                pale === true ? yellowCard : neutralCard;
              const paleMsg =
                pale === true
                  ? "Send the patient immediately to the doctor or RHU."
                  : null;

              const navelCardClass = neutralCard;

              return (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="space-y-2.5">
                    <div className={`${baseCard} ${neutralCard}`}>
                      <span className="text-[14px] sm:text-[15px] text-slate-900">
                        Exclusive breastfeeding
                      </span>
                      <div className="sm:ml-auto">
                        <SegYN
                          value={exBF}
                          onChange={(v) =>
                            setCheck("exclusive_breastfeeding", activeCol, v)
                          }
                          disabled={locked}
                        />
                      </div>
                    </div>

                    <div className={`${baseCard} ${neutralCard}`}>
                      <span className="text-[14px] sm:text-[15px] text-slate-900">
                        Intends family planning
                      </span>
                      <div className="sm:ml-auto">
                        <SegYN
                          value={intendsFP}
                          onChange={(v) =>
                            setCheck("family_planning_intent", activeCol, v)
                          }
                          disabled={locked}
                        />
                      </div>
                    </div>

                    <div className={`${baseCard} ${feverCardClass}`}>
                      <div className="flex-1">
                        <span className="text-[14px] sm:text-[15px] text-slate-900">
                          Fever of 38°C or above
                        </span>
                        {feverMsg && (
                          <p
                            className={`mt-1 text-[11px] ${feverMsg.includes("HOSPITAL")
                              ? "text-rose-700 font-semibold"
                              : "text-amber-700 font-medium"
                              }`}
                          >
                            {feverMsg}
                          </p>
                        )}
                      </div>
                      <div className="sm:ml-auto">
                        <SegYN
                          value={fever}
                          onChange={(v) =>
                            setCheck("fever_38_up", activeCol, v)
                          }
                          disabled={locked}
                          danger={fever === true && (periodKind === "1W" || periodKind === "2to4W")}
                        />
                      </div>
                    </div>

                    <div className={`${baseCard} ${foulCardClass}`}>
                      <div className="flex-1">
                        <span className="text-[14px] sm:text-[15px] text-slate-900">
                          Foul-smelling lochia
                        </span>
                        {foulMsg && (
                          <p className="mt-1 text-[11px] text-amber-700 font-medium">
                            {foulMsg}
                          </p>
                        )}
                      </div>
                      <div className="sm:ml-auto">
                        <SegYN
                          value={foul}
                          onChange={(v) =>
                            setCheck("foul_lochia", activeCol, v)
                          }
                          disabled={locked}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div className={`${baseCard} ${heavyCardClass}`}>
                      <div className="flex-1">
                        <span className="text-[14px] sm:text-[15px] text-slate-900">
                          Heavy bleeding
                        </span>
                        {heavyMsg && (
                          <p className="mt-1 text-[11px] text-rose-700 font-semibold">
                            {heavyMsg}
                          </p>
                        )}
                      </div>
                      <div className="sm:ml-auto">
                        <SegYN
                          value={heavy}
                          onChange={(v) =>
                            setCheck("heavy_bleeding", activeCol, v)
                          }
                          disabled={locked}
                          danger={heavy === true}
                        />
                      </div>
                    </div>

                    <div className={`${baseCard} ${paleCardClass}`}>
                      <div className="flex-1">
                        <span className="text-[14px] sm:text-[15px] text-slate-900">
                          Paleness
                        </span>
                        {paleMsg && (
                          <p className="mt-1 text-[11px] text-amber-700 font-medium">
                            {paleMsg}
                          </p>
                        )}
                      </div>
                      <div className="sm:ml-auto">
                        <SegYN
                          value={pale}
                          onChange={(v) =>
                            setCheck("red_breast", activeCol, v)
                          }
                          disabled={locked}
                        />
                      </div>
                    </div>

                    <div className={`${baseCard} ${navelCardClass}`}>
                      <span className="text-[14px] sm:text-[15px] text-slate-900">
                        Umbilical stump OK
                      </span>
                      <div className="sm:ml-auto">
                        <SegYN
                          value={navelOk}
                          onChange={(v) =>
                            setCheck("navel_ok", activeCol, v)
                          }
                          disabled={locked}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </section>

          <section className={sectionPad}>
            <h3 className={titleSm}>Vitamin A / Iron–Folate</h3>
            <div className="mt-2 grid gap-3 md:grid-cols-[minmax(0,250px)_minmax(0,1fr)] items-center">
              <div>
                <label className={labelXs}>Vitamin A 200,000 IU</label>
                <div className="mt-1">
                  <SegYN
                    value={vitaminAGiven}
                    onChange={(v) =>
                      setSupp(
                        "vitamin_a_date",
                        v ? data.supplements.vitamin_a_date || todayStr : null
                      )
                    }
                    disabled={locked}
                  />
                </div>
              </div>

              <div>
                <label className={labelXs}>Iron/Folate — Date</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    className={inputClass({
                      invalid: ironDateInvalid,
                      locked,
                    })}
                    value={ironDateStr}
                    max={todayStr || undefined}
                    onChange={(e) =>
                      setSupp(
                        "iron_folate_date",
                        e.currentTarget.value || null
                      )
                    }
                    disabled={locked}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      !locked &&
                      setSupp("iron_folate_date", todayStr as any)
                    }
                    className={[
                      "whitespace-nowrap rounded-md border text-[13px] px-3",
                      "h-11 sm:h-10",
                      locked
                        ? "bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed"
                        : "bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100",
                    ].join(" ")}
                    disabled={locked}
                  >
                    Today
                  </button>
                </div>
                {ironDateInvalid && (
                  <p className="mt-1 text-[11px] text-rose-600">
                    Iron/Folate date cannot be in the future.
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className={sectionPad}>
            <h3 className={titleSm}>Labor and Delivery</h3>

            <div className="mt-2 grid gap-3 md:grid-cols-2">
              <div className="flex items-center justify-between rounded-md bg-slate-50/40 px-3 py-2">
                <div className="text-[14px]">Immediate breastfeeding</div>
                <SegYN
                  value={data.delivery.immediate_breastfeeding ?? null}
                  onChange={(v) => setDelivery("immediate_breastfeeding", v)}
                  disabled={locked}
                />
              </div>

              <div>
                <label className={labelXs}>Delivery mode / type</label>
                <select
                  className={inputClass({ locked })}
                  value={data.delivery.delivery_mode ?? ""}
                  onChange={(e) =>
                    setDelivery("delivery_mode", e.currentTarget.value || null)
                  }
                  disabled={locked}
                >
                  <option value="">Select delivery type…</option>
                  <option value="NSVD">Normal spontaneous vaginal delivery (NSVD)</option>
                  <option value="CS">Cesarean section (CS)</option>
                  <option value="Breech">Breech delivery</option>
                  <option value="Instrumental">Instrumental / assisted</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className={labelXs}>Date of delivery</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    className={inputClass({
                      invalid: deliveryDateInvalid,
                      locked,
                    })}
                    max={todayStr || undefined}
                    value={toYMD(data.delivery.delivery_date)}
                    onChange={(e) =>
                      setDelivery("delivery_date", e.currentTarget.value || null)
                    }
                    disabled={locked}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      !locked && setDelivery("delivery_date", todayStr)
                    }
                    className={[
                      "whitespace-nowrap rounded-md border text-[13px] px-3",
                      "h-11 sm:h-10",
                      locked
                        ? "bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed"
                        : "bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100",
                    ].join(" ")}
                    disabled={locked}
                  >
                    <span className="inline-flex items-center gap-1">
                      <IconCalendar className="h-4 w-4" />
                      Today
                    </span>
                  </button>
                </div>
                {deliveryDateInvalid && (
                  <p className="mt-1 text-[11px] text-rose-600">
                    Delivery date cannot be in the future.
                  </p>
                )}
              </div>

              <div>
                <label className={labelXs}>Place of delivery</label>
                <input
                  className={inputClass({ locked })}
                  placeholder="Name of hospital / health center / clinic"
                  value={data.delivery.delivery_place ?? ""}
                  maxLength={255}
                  onChange={(e) =>
                    setDelivery("delivery_place", e.currentTarget.value || null)
                  }
                  disabled={locked}
                />
              </div>

              <div>
                <label className={labelXs}>Attended by</label>
                <div className="grid grid-cols-[minmax(0,1fr)_1.3fr] gap-2 max-sm:grid-cols-1">
                  <select
                    className={inputClass({ locked })}
                    value={
                      ["DOCTOR", "NURSE", "MIDWIFE", "HILOT", "OTHERS"].includes(
                        (data.delivery.attended_by || "").toUpperCase()
                      )
                        ? (data.delivery.attended_by || "").toUpperCase()
                        : data.delivery.attended_by
                          ? "OTHERS"
                          : ""
                    }
                    onChange={(e) => {
                      const v = e.currentTarget.value;
                      if (v === "OTHERS" || v === "") return;
                      setDelivery("attended_by", v);
                    }}
                    disabled={locked}
                  >
                    <option value="">Select…</option>
                    <option value="DOCTOR">Doctor</option>
                    <option value="NURSE">Nurse</option>
                    <option value="MIDWIFE">Midwife</option>
                    <option value="HILOT">Hilot</option>
                    <option value="OTHERS">Others (specify)</option>
                  </select>
                  <input
                    className={inputClass({ locked })}
                    placeholder="If others, type specifically"
                    value={
                      ["DOCTOR", "NURSE", "MIDWIFE", "HILOT"].includes(
                        (data.delivery.attended_by || "").toUpperCase()
                      )
                        ? ""
                        : data.delivery.attended_by ?? ""
                    }
                    maxLength={255}
                    onChange={(e) =>
                      setDelivery("attended_by", e.currentTarget.value || null)
                    }
                    disabled={locked}
                  />
                </div>
              </div>

              <div>
                <label className={labelXs}>Birth weight (grams)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  className={inputClass({
                    invalid: deliveryWeightInvalid,
                    locked,
                  })}
                  value={(data.delivery.birth_weight_g ?? "") as any}
                  onChange={(e) =>
                    setDelivery(
                      "birth_weight_g",
                      e.currentTarget.value ? Number(e.currentTarget.value) : null
                    )
                  }
                  disabled={locked}
                />
                <p className={`${help} mt-0.5`}>Cannot exceed 5000 grams.</p>
              </div>

              <div className="flex items-center justify-between rounded-md bg-slate-50/40 px-3 py-2">
                <div className="text-[14px]">Excessive bleeding (500 cc+)</div>
                <SegYN
                  value={data.delivery.pph_over_500cc ?? null}
                  onChange={(v) => setDelivery("pph_over_500cc", v)}
                  disabled={locked}
                  danger={data.delivery.pph_over_500cc === true}
                />
              </div>

              <div className="flex items-center justify-between rounded-md bg-slate-50/40 px-3 py-2">
                <div className="text-[14px]">Baby alive</div>
                <SegYN
                  value={data.delivery.baby_alive ?? null}
                  onChange={(v) => setDelivery("baby_alive", v)}
                  disabled={locked}
                />
              </div>

              <div className="flex items-center justify-between rounded-md bg-slate-50/40 px-3 py-2">
                <div className="text-[14px]">Baby healthy</div>
                <SegYN
                  value={data.delivery.baby_healthy ?? null}
                  onChange={(v) => setDelivery("baby_healthy", v)}
                  disabled={locked}
                />
              </div>
            </div>
          </section>

          {!dirty && canOpenBabyWizard && (
            <section className={sectionPad}>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-emerald-900">
                      Baby can now be added to immunization
                    </div>
                    <p className="mt-1 text-xs text-emerald-800">
                      Delivery details will be used to prefill the new immunization patient form.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setOpenBabyWizard(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F8A99] px-4 h-11 text-sm font-semibold text-white hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[#0F8A99]"
                  >
                    <IconBaby className="h-4 w-4" />
                    Add baby to immunization
                  </button>
                </div>
              </div>
            </section>
          )}

          <section className={sectionPad}>
            <h3 className={titleSm}>Family Planning</h3>
            <div className="mt-2 grid gap-2 sm:gap-3 md:grid-cols-4">
              <div>
                <label className={labelXs}>Follow-up date</label>
                <input
                  type="date"
                  className={inputClass({
                    invalid: followupDateInvalid,
                    locked,
                  })}
                  value={followupDateStr}
                  min={todayStr || undefined}
                  max={followupMaxStr || undefined}
                  onChange={(e) =>
                    setFP("followup_date", e.currentTarget.value || null)
                  }
                  disabled={locked}
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Future date, up to 1 year from today.
                </p>
                {followupDateInvalid && (
                  <p className="mt-0.5 text-[11px] text-rose-600">
                    Follow-up date must be from today up to 1 year ahead.
                  </p>
                )}
              </div>

              <div>
                <label className={labelXs}>Consult date</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    className={inputClass({
                      invalid: consultDateInvalid,
                      locked,
                    })}
                    value={consultDateStr}
                    max={todayStr || undefined}
                    onChange={(e) =>
                      setFP("consult_date", e.currentTarget.value || null)
                    }
                    disabled={locked}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      !locked &&
                      setFP("consult_date", todayStr as any)
                    }
                    className={[
                      "whitespace-nowrap rounded-md border text-[13px] px-3",
                      "h-11 sm:h-10",
                      locked
                        ? "bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed"
                        : "bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100",
                    ].join(" ")}
                    disabled={locked}
                  >
                    Today
                  </button>
                </div>
                {consultDateInvalid && (
                  <p className="mt-1 text-[11px] text-rose-600">
                    Consult date cannot be in the future.
                  </p>
                )}
              </div>

              <div>
                <label className={labelXs}>Method</label>
                <select
                  className={inputClass({ locked })}
                  value={data.fp.method ?? ""}
                  onChange={(e) =>
                    setFP("method", (e.currentTarget.value || null) as any)
                  }
                  disabled={locked}
                >
                  <option value="">—</option>
                  {[
                    "LAM",
                    "Condom",
                    "Pills",
                    "Injectable",
                    "IUD",
                    "Implant",
                    "Calendar",
                    "Undecided",
                  ].map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelXs}>Amount given</label>
                <input
                  type="number"
                  inputMode="numeric"
                  className={inputClass({
                    invalid: amountInvalid,
                    locked,
                  })}
                  value={(data.fp.given_qty ?? "") as any}
                  onChange={(e) => {
                    const raw = e.currentTarget.value;
                    const num = raw === "" ? null : Number(raw);
                    setFP("given_qty", (raw === "" ? null : num) as any);
                  }}
                  min={0}
                  max={100}
                  disabled={locked}
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Maximum of 100.
                </p>
                {amountInvalid && (
                  <p className="mt-0.5 text-[11px] text-rose-600">
                    Amount must be between 0 and 100.
                  </p>
                )}
              </div>

              <div className="md:col-span-4">
                <label className={labelXs}>Remarks</label>
                <textarea
                  className={textareaClass({
                    locked,
                    extra: "min-h-[3.25rem]",
                  })}
                  value={data.fp.notes}
                  maxLength={255}
                  onChange={(e) => setFP("notes", e.currentTarget.value)}
                  disabled={locked}
                  placeholder="Additional notes (max 255 characters)"
                />
              </div>
            </div>
          </section>
        </div>

        <div className="h-14 sm:h-0" />
      </div>

      <footer className="fixed bottom-0 inset-x-0 z-[30] pointer-events-none">
        <div className="mx-auto w-full max-w-screen-2xl px-0 sm:px-4 lg:px-8 flex justify-end">
          <div
            className="
              mb-0.5
              inline-flex
              w-full sm:w-auto
              rounded-t-md border border-slate-200
              bg-white/95 backdrop-blur shadow-sm
              px-3 sm:px-4 py-2
              pointer-events-auto
            "
          >
            <button
              type="button"
              onClick={async () => {
                if (locked || isSaving) return;
                const ok = await confirm({
                  title: "Save postnatal record?",
                  message:
                    "Please confirm you want to save all changes in this record.",
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

      <AddPatientWizard
        open={openBabyWizard}
        onOpenChange={setOpenBabyWizard}
        prefill={babyWizardPrefill}
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