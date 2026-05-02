// resources/js/components/prenatal/HBMHistory.tsx
import * as React from "react";
import { usePage, router } from "@inertiajs/react";
import type { HBMTabProps } from "./HBMTab";
import { useConfirm } from "../confirm-kit";

/* ============================================================================ */
const HISTORY_URL = (id: number | string) =>
  `/center/patients/${id}/prenatal/history`;

/* ------------------------------ HTTP helpers -------------------------------- */
function csrfToken(): string {
  const el = document.querySelector(
    'meta[name="csrf-token"]'
  ) as HTMLMetaElement | null;
  // @ts-ignore
  const fromWindow = (window?.Laravel?.csrfToken as string) || "";
  const fromCookie = (() => {
    const m = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : "";
  })();
  return (el?.content || fromWindow || fromCookie || "").toString();
}
function appendForm(fd: FormData, prefix: string, value: any) {
  const enc = (v: any) =>
    v === "oo" || v === "hindi"
      ? v
      : v === true
        ? "oo"
        : v === false
          ? "hindi"
          : v ?? "";
  if (Array.isArray(value))
    value.forEach((v, i) => appendForm(fd, `${prefix}[${i}]`, v));
  else if (value && typeof value === "object")
    Object.entries(value).forEach(([k, v]) =>
      appendForm(fd, `${prefix}[${k}]`, v)
    );
  else fd.append(prefix, enc(value));
}
async function postNested(url: string, rootKey: string, payload: any) {
  const fd = new FormData();
  appendForm(fd, rootKey, payload);
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
      throw new Error(
        "CSRF token mismatch (or session expired). Please reload the page and try again."
      );
    }
    let msg = `${rootKey} save failed (${res.status})`;
    try {
      if (res.status === 422) {
        const j = await res.json();
        const first = j?.errors
          ? String(
            (Object.values(j.errors).flat() as any[])[0] ??
            "Validation failed"
          )
          : j?.message;
        throw new Error(first || msg);
      }
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const j = await res.json().catch(() => ({}));
        if (j?.message) msg = j.message;
      } else {
        const t = await res.text().catch(() => "");
        if (
          (res.redirected && /\/login/i.test(res.url)) ||
          /<form[^>]+login/i.test(t)
        ) {
          msg = "Not authenticated (session expired). Please sign in again.";
        }
      }
    } catch { }
    throw new Error(msg);
  }

  const ct = res.headers.get("content-type") || "";
  if (ct.includes("text/html")) {
    const t = await res.text().catch(() => "");
    if (
      (res.redirected && /\/login/i.test(res.url)) ||
      /<form[^>]+login/i.test(t)
    ) {
      throw new Error(
        "Not authenticated (session expired). Please sign in again."
      );
    }
    throw new Error(`${rootKey} save returned unexpected HTML.`);
  }
  return res;
}

/* ------------------------------- TYPES -------------------------------------- */
type AgeBracket = "under_18" | "18_34" | "35_plus" | null;
type HeightBracket = "below_145" | "eq_145" | "above_145" | null;
type YesNo = "oo" | "hindi" | null;

type HistoryRecord = {
  age_bracket: AgeBracket;
  height_bracket: HeightBracket;
  prev_pregnancies: number | null;

  cesarean_history: YesNo;
  three_consecutive_abortions: YesNo;
  stillbirth_history: YesNo;
  pph_history: YesNo;

  tb_current: YesNo;
  heart_disease_current: YesNo;
  diabetes_current: YesNo;
  asthma_current: YesNo;
  goiter_current: YesNo;
};

/* ------------------------------ Tiny icons ---------------------------------- */
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
const IconRuler = (p: any) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    {...p}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <path d="M3 8l5-5 13 13-5 5z" />
    <path d="M7 3l3 3M10 6l3 3M13 9l3 3M16 12l3 3" />
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
  >
    <path d="M3 12a9 9 0 1 0 3-6.7M3 3v6h6" />
    <path d="M12 7v5l3 3" />
  </svg>
);
const IconHealth = (p: any) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    {...p}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <path d="M3 12h4l2-5 4 10 2-5h6" />
  </svg>
);
const IconAlert = (p: any) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    {...p}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
    <path d="M10.29 3.86 1.82 18a1 1 0 0 0 .86 1.5h18.64a1 1 0 0 0 .86-1.5L13.71 3.86a1 1 0 0 0-1.72 0Z" />
  </svg>
);
const IconLight = (p: any) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    {...p}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <path d="M12 3a7 7 0 0 0-4 12v3h8v-3a7 7 0 0 0-4-12zM9 21h6" />
  </svg>
);
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
    <path d="M12 16v-2" />
    <path d="M8 11V8a4 4 0 0 1 7.33-2.5" />
  </svg>
);

/* ------------------------------ UI TOKENS ----------------------------------- */
const TEAL = "#0F8A99";

const inputBase =
  "h-10 w-full rounded-md border border-slate-300 bg-white px-3 " +
  "text-[14px] outline-none focus-visible:outline-none " +
  "focus-visible:ring-2 focus-visible:ring-[#0F8A99] focus-visible:ring-offset-0";

const roText =
  "min-h-[2.5rem] w-full rounded-md border border-slate-200 bg-slate-50 " +
  "px-3 text-[14px] leading-[2.5rem] text-slate-800";

const label =
  "block text-[11px] font-medium tracking-wide text-slate-600";

const h2Title =
  "text-[18px] sm:text-[20px] font-semibold text-slate-900 tracking-tight";

const titleBlue =
  "text-[15px] sm:text-[17px] font-semibold text-[#203D7A] flex items-center gap-2";

const errorRingClass = (hasError: boolean) =>
  hasError
    ? "ring-2 ring-red-400 focus-visible:ring-red-500 focus-visible:ring-2"
    : "";

/* --------------------------------- UTIL ------------------------------------- */
function toYMD(v?: string | null) {
  if (!v) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(v))) return String(v);
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}
function parseDateLocal(raw: any): Date | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    const m = raw.trim().match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);
    if (m) {
      const [, y, mo, d] = m;
      const dt = new Date(Number(y), Number(mo) - 1, Number(d));
      return Number.isNaN(dt.getTime()) ? null : dt;
    }
  }
  const dt = new Date(raw);
  return Number.isNaN(dt.getTime()) ? null : dt;
}
function calcAgeFromBirthdate(
  dobRaw: any,
  asOf: Date = new Date()
): number | null {
  const dob = parseDateLocal(dobRaw);
  if (!dob) return null;
  let age = asOf.getFullYear() - dob.getFullYear();
  const m = asOf.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && asOf.getDate() < dob.getDate())) age--;
  return age >= 0 ? age : null;
}
function parseNumberLoose(
  v: any,
  { int = false }: { int?: boolean } = {}
): number | null {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v))
    return int ? Math.floor(v) : v;
  if (typeof v === "string") {
    const m = v.match(/-?\d+(\.\d+)?/);
    if (!m) return null;
    const n = Number(m[0]);
    if (!Number.isFinite(n)) return null;
    return int ? Math.floor(n) : n;
  }
  return null;
}
const ageToBracket = (n: number | null): AgeBracket =>
  n == null ? null : n <= 18 ? "under_18" : n <= 34 ? "18_34" : "35_plus";
const heightToBracket = (cm: number | null): HeightBracket =>
  cm == null
    ? null
    : cm < 145
      ? "below_145"
      : cm === 145
        ? "eq_145"
        : "above_145";

/* ---------------------- Segmented chips (Age / Height) ---------------------- */
/* Buttons are PERMANENTLY READ-ONLY indicators: highlight is driven by value only. */
function SegAge({
  value,
  disabled = true,
}: {
  value: AgeBracket;
  onChange?: (v: AgeBracket) => void;
  disabled?: boolean;
}) {
  const curr: AgeBracket = value ?? null;
  const base =
    "px-3 h-9 inline-flex items-center justify-center text-[13px] " +
    "border rounded-md transition";
  const active = "bg-[#0F8A99] text-white border-[#0F8A99]";
  const idle = "bg-white text-slate-900 border-slate-300";
  const disabledCls = "opacity-80 cursor-default";

  const opts: Array<{ v: AgeBracket; label: string }> = [
    { v: "under_18", label: "≤18" },
    { v: "18_34", label: "18–34" },
    { v: "35_plus", label: "35+" },
  ];
  return (
    <div
      className="inline-flex flex-wrap gap-1"
      role="group"
      aria-label="Age range"
    >
      {opts.map((o) => (
        <button
          key={o.v!}
          type="button"
          className={`${base} ${curr === o.v ? active : idle
            } ${disabledCls}`}
          disabled
          aria-pressed={curr === o.v}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
function SegHeight({
  value,
  disabled = true,
}: {
  value: HeightBracket;
  onChange?: (v: HeightBracket) => void;
  disabled?: boolean;
}) {
  const curr: HeightBracket = value ?? null;
  const base =
    "px-3 h-9 inline-flex items-center justify-center text-[13px] " +
    "border rounded-md transition";
  const active = "bg-[#0F8A99] text-white border-[#0F8A99]";
  const idle = "bg-white text-slate-900 border-slate-300";
  const disabledCls = "opacity-80 cursor-default";

  const opts: Array<{ v: HeightBracket; label: string }> = [
    { v: "below_145", label: "<145 cm" },
    { v: "eq_145", label: "145 cm" },
    { v: "above_145", label: ">145 cm" },
  ];
  return (
    <div
      className="inline-flex flex-wrap gap-1"
      role="group"
      aria-label="Height range"
    >
      {opts.map((o) => (
        <button
          key={o.v!}
          type="button"
          className={`${base} ${curr === o.v ? active : idle
            } ${disabledCls}`}
          disabled
          aria-pressed={curr === o.v}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------------------- YES / NO chips -------------------------------- */
function YNChips({
  value,
  onChange,
  yesLabel = "Yes",
  noLabel = "No",
  dangerWhenYes = false,
  disabled,
}: {
  value: YesNo;
  onChange: (v: YesNo) => void;
  yesLabel?: string;
  noLabel?: string;
  dangerWhenYes?: boolean;
  disabled?: boolean;
}) {
  const yesActive = value === "oo";
  const noActive = value === "hindi";
  const base =
    "px-3 h-9 inline-flex items-center justify-center text-[13px] rounded-md border transition-colors";
  const disabledCls = disabled ? "opacity-60 cursor-not-allowed" : "";

  const yesCls = yesActive
    ? dangerWhenYes
      ? "bg-red-600 text-white border-red-600"
      : "bg-[#0F8A99] text-white border-[#0F8A99]"
    : "bg-white text-slate-800 border-slate-300 hover:bg-slate-50";

  const noCls = noActive
    ? "bg-slate-700 text-white border-slate-700"
    : "bg-white text-slate-800 border-slate-300 hover:bg-slate-50";

  return (
    <div className="inline-flex flex-wrap gap-1">
      <button
        type="button"
        className={`${base} ${noCls} ${disabledCls}`}
        onClick={() => {
          if (disabled) return;
          onChange(noActive ? null : "hindi");
        }}
        aria-pressed={noActive}
        disabled={disabled}
      >
        {noLabel}
      </button>
      <button
        type="button"
        className={`${base} ${yesCls} ${disabledCls}`}
        onClick={() => {
          if (disabled) return;
          onChange(yesActive ? null : "oo");
        }}
        aria-pressed={yesActive}
        disabled={disabled}
      >
        {yesLabel}
      </button>
    </div>
  );
}

/* ------------ Centered result popup (same style as other tabs) ------------- */
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
          aria-labelledby="hbm-history-result-title"
          className={[
            "w-full max-w-lg rounded-2xl bg-white shadow-xl ring-1 ring-black/10 outline-none",
            "transition-all duration-200",
            open ? "scale-100 opacity-100" : "scale-95 opacity-0",
          ].join(" ")}
        >
          <div
            className={["p-4 sm:p-5 rounded-2xl ring-1", ringClass].join(" ")}
          >
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
                  id="hbm-history-result-title"
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

/* -------------------------------- COMPONENT --------------------------------- */
export default function HBMHistory(props: HBMTabProps) {
  const { canEdit = false } = usePage<any>().props;
  const confirm = useConfirm();
  const page = usePage<any>();
  const { patient } = props as any;

  const itrTop = (props as any)?.itr ?? (page?.props?.itr ?? {});
  const server: Partial<HistoryRecord> = (props.history as any) ?? {};

  const [, bump] = React.useReducer((x) => x + 1, 0);

  const [dirty, setDirty] = React.useState(false);
  const [locked, setLocked] = React.useState(true);

  /* ---------- Local draft (per patient) ---------- */
  const LS_KEY = (pid: number | string) => `hbm_history_draft:${pid}`;
  const readDraft = (): Partial<HistoryRecord> => {
    try {
      const raw = localStorage.getItem(LS_KEY(patient.id));
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };
  const writeDraft = (vals: Partial<HistoryRecord>) => {
    try {
      const prev = readDraft();
      localStorage.setItem(
        LS_KEY(patient.id),
        JSON.stringify({ ...prev, ...vals })
      );
    } catch { }
  };
  const clearDraft = () => {
    try {
      localStorage.removeItem(LS_KEY(patient.id));
    } catch { }
  };

  /* ---------- Data ref ---------- */
  const dataRef = React.useRef<HistoryRecord>({
    age_bracket: null,
    height_bracket: null,
    prev_pregnancies: null,
    cesarean_history: null,
    three_consecutive_abortions: null,
    stillbirth_history: null,
    pph_history: null,
    tb_current: null,
    heart_disease_current: null,
    diabetes_current: null,
    asthma_current: null,
    goiter_current: null,
  });

  /* ---------- Status / error ---------- */
  const [saving, setSaving] = React.useState(false);
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

  /* ---------- Age / height controlled inputs ---------- */
  const [ageInput, setAgeInput] = React.useState<string>("");
  const [heightInput, setHeightInput] = React.useState<string>("");

  const ready = React.useRef(false);

  /* ---------- Hydrate from server + draft + patient ---------- */
  React.useEffect(() => {
    ready.current = false;
    const draft = readDraft();

    const base: HistoryRecord = {
      age_bracket: null,
      height_bracket: null,
      prev_pregnancies: null,
      cesarean_history: null,
      three_consecutive_abortions: null,
      stillbirth_history: null,
      pph_history: null,
      tb_current: null,
      heart_disease_current: null,
      diabetes_current: null,
      asthma_current: null,
      goiter_current: null,
    };

    const merged: HistoryRecord = {
      ...base,
      ...(server as any),
      ...(draft as any),
    };

    dataRef.current = merged;

    const ageFromDOB =
      calcAgeFromBirthdate((props.patient as any)?.birthdate) ??
      parseNumberLoose((props.patient as any)?.age_years, { int: true });

    const heightFromPatient = parseNumberLoose(
      (props.patient as any)?.height_cm
    );

    setAgeInput(ageFromDOB != null ? String(ageFromDOB) : "");
    setHeightInput(heightFromPatient != null ? String(heightFromPatient) : "");

    dataRef.current.age_bracket = ageToBracket(ageFromDOB);
    dataRef.current.height_bracket = heightToBracket(heightFromPatient);

    setDirty(false);
    setStatus("");
    setError(null);
    bump();

    setTimeout(() => {
      ready.current = true;
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient?.id, JSON.stringify(server)]);

  /* ---------- Draft autosave (local ONLY) ---------- */
  const debTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleDraft = () => {
    if (!ready.current) return;
    setDirty(true);
    if (debTimer.current) clearTimeout(debTimer.current);
    setStatus("Saving draft…");
    debTimer.current = setTimeout(() => {
      writeDraft(dataRef.current);
      setStatus("Draft ✓");
      setTimeout(() => {
        if ((statusRef.current?.textContent || "") === "Draft ✓")
          setStatus("");
      }, 900);
    }, 300);
  };

  /* ---------- Unsaved changes guards ---------- */
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
      } catch { }
    };
  }, [dirty]);

  /* ---------- Mutators ---------- */
  const setYN = (k: keyof HistoryRecord, v: YesNo) => {
    (dataRef.current as any)[k] = v;
    scheduleDraft();
    bump();
  };
  const setPrevPreg = (n: number | null) => {
    dataRef.current.prev_pregnancies = n;
    scheduleDraft();
    bump();
  };

  /* ---------- Age / height handlers + validation ---------- */
  const handleAgeChange = (raw: string) => {
    if (locked) return;
    const cleaned = raw.replace(/\D/g, "").slice(0, 3);
    setAgeInput(cleaned);
    const n =
      cleaned === ""
        ? null
        : Number.isNaN(Number(cleaned))
          ? null
          : parseInt(cleaned, 10);
    dataRef.current.age_bracket = ageToBracket(n);
    scheduleDraft();
    bump();
  };
  const handleHeightChange = (raw: string) => {
    if (locked) return;
    const cleaned = raw.replace(/[^\d]/g, "").slice(0, 3);
    setHeightInput(cleaned);
    const n =
      cleaned === ""
        ? null
        : Number.isNaN(Number(cleaned))
          ? null
          : parseInt(cleaned, 10);
    dataRef.current.height_bracket = heightToBracket(n);
    scheduleDraft();
    bump();
  };

  const ageNum =
    ageInput === "" || Number.isNaN(Number(ageInput))
      ? null
      : parseInt(ageInput, 10);
  const heightNum =
    heightInput === "" || Number.isNaN(Number(heightInput))
      ? null
      : parseInt(heightInput, 10);

  const ageError = ageNum != null && (ageNum < 0 || ageNum > 150);
  const heightError = heightNum != null && (heightNum < 0 || heightNum > 300);

  const hasAnyError = ageError || heightError;

  /* ---------- Save ---------- */
  const onSave = async () => {
    if (!canEdit) return;
    if (locked || hasAnyError) return;

    const ok = await confirm({
      title: "Save history?",
      message: "Please confirm you want to save these history details.",
      confirmText: "Yes, save",
      cancelText: "Cancel",
    });
    if (!ok) return;

    setError(null);
    setStatus("Saving…");
    setSaving(true);
    try {
      await postNested(HISTORY_URL(patient.id), "history", {
        ...dataRef.current,
      });
      clearDraft();
      setDirty(false);
      setStatus("Saved ✓");
      setTimeout(() => setStatus(""), 900);

      setResultKind("success");
      setResultTitle("Saved successfully");
      setResultMsg("History details have been updated.");
      setResultOpen(true);
    } catch (e: any) {
      setStatus("");
      const msg = e?.message || "Save failed";
      setError(msg);
      setTimeout(() => setError(null), 1800);

      setResultKind("error");
      setResultTitle("Save failed");
      setResultMsg(msg);
      setResultOpen(true);
    } finally {
      setSaving(false);
    }
  };

  /* ---------- Read-only info ---------- */
  const bloodType =
    itrTop?.blood_type ?? (props.plan as any)?.blood_type ?? null;
  const familyNo =
    (props.plan as any)?.pampamilyang_bilang ??
    (props.plan as any)?.family_number ??
    null;
  const fullName = (props.patient as any)?.full_name ?? null;
  const address = (props.patient as any)?.address ?? null;

  const ttDates: string[] = (
    ["tt1_date", "tt2_date", "tt3_date", "tt4_date", "tt5_date"] as const
  ).map((k) => toYMD(itrTop?.[k] ?? ""));

  /* ---------- High-risk flags (CURRENT HEALTH PROBLEM only) ---------- */
  const highRiskPregnancyHistory =
    dataRef.current.cesarean_history === "oo" ||
    dataRef.current.three_consecutive_abortions === "oo" ||
    dataRef.current.stillbirth_history === "oo" ||
    (
      dataRef.current.pph_history === "oo" &&
      (dataRef.current.prev_pregnancies ?? 0) >= 2
    );

  const highRiskCurrent =
    dataRef.current.heart_disease_current === "oo" ||
    dataRef.current.diabetes_current === "oo" ||
    dataRef.current.asthma_current === "oo" ||
    dataRef.current.goiter_current === "oo";

  const hasHighRisk = highRiskPregnancyHistory || highRiskCurrent;

  /* ---------------------------------- UI ------------------------------------ */
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
          opacity: 0.95;
          cursor: pointer;
        }
      `}</style>

      <div className="mx-auto w-full max-w-screen-2xl px-2 sm:px-3 lg:px-6 flex-1 overflow-x-hidden pb-20">
        <header className="pt-2 sm:pt-3">
          <div className="flex items-center justify-between gap-3 min-w-0">
            <h2 className={`${h2Title} truncate`}>HBM – History</h2>
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
                onClick={() => setLocked((v) => !v)}
                aria-pressed={!locked}
                className={[
                  "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium shadow-sm transition",
                  "focus:outline-none focus:ring-2 focus:ring-[#0F8A99]",
                  locked
                    ? "border-[#0F8A99] bg-[#0F8A99] text-white hover:bg-[#0d7481]"
                    : "border-[#0F8A99] bg-white text-[#0F8A99] hover:bg-[#0F8A99]/5",
                ].join(" ")}
                title={locked ? "Record is locked" : "Editing enabled"}
              >
                {locked ? <IconLock className="h-4 w-4" /> : <IconUnlock className="h-4 w-4" />}
                <span>{locked ? "Locked" : "Editing"}</span>
              </button>
            </div>
          </div>
          <div className="mt-2 h-px w-full bg-slate-200" />
        </header>

        {locked && (
          <div className="mt-3 mb-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs sm:text-[13px] text-slate-700">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-slate-600">
              <IconLock className="h-3 w-3" />
            </span>
            <p>
              Record is currently <span className="font-semibold">LOCKED</span>.
              Tap the square on the right to enable editing.
            </p>
          </div>
        )}

        <div
          ref={errorRef}
          style={{ display: "none" }}
          className="mt-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700"
        />

        <div
          className={
            locked ? "opacity-50 transition-opacity" : "transition-opacity"
          }
        >
          <div className={locked ? "pointer-events-none" : ""}>
            <div className="mt-3 rounded-md bg-white shadow-sm divide-y divide-slate-200 overflow-hidden">
              <section className="p-2 sm:p-3">
                <h3 className={titleBlue}>
                  <IconInfo className="h-4 w-4 text-slate-500" />
                  PRIMARY INFORMATION
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mt-3">
                  <label>
                    <span className={label}>Blood type</span>
                    <div className={roText}>{bloodType || "—"}</div>
                  </label>
                  <label>
                    <span className={label}>Family number</span>
                    <div className={roText}>{familyNo || "—"}</div>
                  </label>
                  <label className="sm:col-span-3">
                    <span className={label}>Name</span>
                    <div className={roText}>{fullName || "—"}</div>
                  </label>
                  <label className="sm:col-span-3">
                    <span className={label}>Address</span>
                    <div className={roText}>{address || "—"}</div>
                  </label>
                </div>

                <div className="mt-3">
                  <div className="text-[13px] font-medium text-slate-900 mb-1.5">
                    Tetanus toxoid (TT) injection dates
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 sm:gap-3">
                    {["TT1", "TT2", "TT3", "TT4", "TT5"].map((h, idx) => (
                      <div key={h}>
                        <div className="text-[11px] text-slate-600 mb-1">
                          {h}
                        </div>
                        <div className={roText}>{ttDates[idx] || "—"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="p-2 sm:p-3">
                <h3 className={titleBlue}>
                  <IconRuler className="h-4 w-4 text-slate-500" />
                  AGE AND HEIGHT
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mt-3">
                  <div className="min-w-0">
                    <span className={label}>Age (auto-filled)</span>
                    <div className="mt-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                      <div className="relative w-full sm:w-28">
                        <input
                          type="text"
                          value={ageInput}
                          readOnly
                          tabIndex={-1}
                          className={`${inputBase} pr-10 bg-slate-50 text-slate-700 cursor-not-allowed`}
                          placeholder="Age"
                        />
                        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[11px] text-slate-500">
                          yr
                        </span>
                      </div>
                      <SegAge value={dataRef.current.age_bracket} disabled />
                    </div>
                  </div>

                  <div className="min-w-0">
                    <span className={label}>Height (auto-filled)</span>
                    <div className="mt-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                      <div className="relative w-full sm:w-32">
                        <input
                          type="text"
                          value={heightInput}
                          readOnly
                          tabIndex={-1}
                          className={`${inputBase} pr-12 bg-slate-50 text-slate-700 cursor-not-allowed`}
                          placeholder="Height"
                        />
                        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[11px] text-slate-500">
                          cm
                        </span>
                      </div>
                      <SegHeight
                        value={dataRef.current.height_bracket}
                        disabled
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className="p-2 sm:p-3">
                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <h3 className={titleBlue}>
                      <IconHistory className="h-4 w-4 text-slate-500" />
                      HISTORY OF PREGNANCY
                    </h3>

                    <div className="mt-3 rounded-md bg-slate-50/60 border border-slate-200">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 px-3 py-2.5 border-b border-slate-200">
                        <div className="text-[14px] text-slate-900">
                          Number of past pregnancies
                        </div>
                        <div className="inline-flex flex-wrap gap-1">
                          {[1, 2, 3, 4].map((n) => {
                            const is4plus = n === 4;
                            const active =
                              dataRef.current.prev_pregnancies === n;
                            return (
                              <button
                                key={n}
                                type="button"
                                disabled={locked}
                                onClick={() =>
                                  setPrevPreg(
                                    locked
                                      ? dataRef.current.prev_pregnancies
                                      : active
                                        ? null
                                        : n
                                  )
                                }
                                className={[
                                  "px-3 h-9 rounded-md border text-[13px] transition-colors",
                                  active
                                    ? "bg-[#0F8A99] text-white border-[#0F8A99]"
                                    : "bg-white text-slate-800 border-slate-300 hover:bg-slate-50",
                                  locked ? "opacity-60 cursor-not-allowed" : "",
                                ].join(" ")}
                              >
                                {is4plus ? "4+" : n}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {(
                        [
                          ["cesarean_history", "Cesarean delivery"],
                          ["three_consecutive_abortions", "3 miscarriages in a row"],
                          ["stillbirth_history", "Born stillborn"],
                          ["pph_history", "Excessive bleeding after delivery"],
                        ] as const
                      ).map(([key, labelText], idx, arr) => {
                        const danger =
                          key === "pph_history"
                            ? (dataRef.current.prev_pregnancies ?? 0) >= 2
                            : true;

                        return (
                          <div
                            key={key}
                            className={[
                              "flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 px-3 py-2.5",
                              idx < arr.length - 1 ? "border-b border-slate-200" : "",
                            ].join(" ")}
                          >
                            <div className="text-[14px] text-slate-900">{labelText}</div>
                            <YNChips
                              value={(dataRef.current as any)[key] as YesNo}
                              onChange={(v) => setYN(key as any, v)}
                              yesLabel="Yes"
                              noLabel="No"
                              dangerWhenYes={danger}
                              disabled={locked}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h3 className={titleBlue}>
                      <IconHealth className="h-4 w-4 text-slate-500" />
                      CURRENT HEALTH PROBLEM
                    </h3>

                    <div className="mt-3 rounded-md bg-slate-50/60 border border-slate-200">
                      {(
                        [
                          [
                            "tb_current",
                            "Tuberculosis (coughing for 14 consecutive days)",
                            false,
                          ],
                          ["heart_disease_current", "Heart disease", true],
                          ["diabetes_current", "Diabetes", true],
                          ["asthma_current", "Asthma", true],
                          ["goiter_current", "Goiter", true],
                        ] as const
                      ).map(([key, labelText, danger], idx, arr) => (
                        <div
                          key={key}
                          className={[
                            "flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 px-3 py-2.5",
                            idx < arr.length - 1
                              ? "border-b border-slate-200"
                              : "",
                          ].join(" ")}
                        >
                          <div className="text-[14px] text-slate-900">
                            {labelText}
                          </div>
                          <YNChips
                            value={(dataRef.current as any)[key] as YesNo}
                            onChange={(v) => setYN(key as any, v)}
                            yesLabel="Have"
                            noLabel="None"
                            dangerWhenYes={danger}
                            disabled={locked}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {hasHighRisk && (
                  <div className="mt-4 rounded-md border border-red-300 bg-red-50 px-3 py-3 flex gap-2">
                    <div className="mt-0.5">
                      <IconAlert className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <div className="text-[15px] sm:text-[16px] font-semibold text-red-800">
                        High-risk pregnancy – advise delivery in hospital.
                      </div>
                      <p className="mt-1 text-[13px] sm:text-[14px] text-red-800">
                        One or more serious current health risk factors are
                        present. The patient should be strongly advised to
                        deliver in a hospital or higher-level health facility
                        with emergency obstetric and newborn care.
                      </p>
                    </div>
                  </div>
                )}
              </section>

              <section className="p-2 sm:p-3">
                <h3 className={titleBlue}>
                  <IconLight className="h-4 w-4 text-slate-500" />
                  GUIDANCE
                </h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-[14px] text-slate-800">
                  <li>
                    Review these risk factors during prenatal visits and update
                    when needed.
                  </li>
                  <li>
                    If any red-highlighted current health condition is present,
                    counsel the mother about the need for facility-based
                    delivery.
                  </li>
                  <li>
                    Coordinate referral early with the hospital or higher-level
                    facility when indicated.
                  </li>
                </ul>
              </section>
            </div>
          </div>
        </div>
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
              onClick={() => !locked && !saving && !hasAnyError && onSave()}
              className="w-full sm:w-auto h-10 rounded-md bg-oh-teal px-5 text-[14px] text-white hover:bg-oh-tealDark disabled:opacity-60 inline-flex items-center justify-center gap-1.5"
              disabled={saving || locked || hasAnyError}
            >
              <IconSave className="h-4 w-4" />
              {locked
                ? "Locked"
                : saving
                  ? "Saving…"
                  : hasAnyError
                    ? "Fix errors to save"
                    : "Save"}
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