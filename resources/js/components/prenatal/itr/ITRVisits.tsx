import * as React from "react";
import { router, usePage } from "@inertiajs/react";
import { Button, Label, inputSm, Card, SectionHeader } from "./itr-shared";
import {
  DELVISIT_URL,
  VISIT_URL,
  VisitRow,
  csrfToken,
  toYMD,
  todayYMD,
  numOrNull,
  intOrNull,
} from "./itr-api";
import { useConfirm } from "../../confirm-kit";

type VisitWithExtras = VisitRow & {
  aog?: string | number | null;
  aog_days?: number | null;
};

type PageProps = {
  itr?: {
    lmp?: string | null;
    lmp_date?: string | null;
  } | null;
  current?: {
    lmp_date?: string | null;
  } | null;
};

type ResultKind = "success" | "error";
type TrimesterValue = "1st" | "2nd" | "3rd" | "";

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
      className={["fixed inset-0 z-[200]", open ? "pointer-events-auto" : "pointer-events-none"].join(" ")}
    >
      <div
        className={["absolute inset-0 bg-black/40 transition-opacity", open ? "opacity-100" : "opacity-0"].join(" ")}
      />
      <div className="absolute inset-0 grid place-items-center p-3 sm:p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="visits-result-title"
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
                <h2 id="visits-result-title" className="text-base font-semibold text-slate-900">
                  {title}
                </h2>
                {message ? <p className="mt-1 text-sm text-slate-600">{message}</p> : null}
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                onClick={onClose}
                className="min-h-[44px] rounded-md border border-slate-300 bg-white px-4 text-[15px] text-slate-700 hover:bg-slate-50"
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

const IconLock = (p: any) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...p} fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

const IconUnlock = (p: any) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...p} fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M9 11V8a4 4 0 0 1 7.3-2.5" />
  </svg>
);

const IconChevronDown = (p: any) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    {...p}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

function validateNumericString(
  value: string | number | null | undefined,
  opts: { max?: number; allowDecimal?: boolean }
): boolean {
  if (value === null || value === undefined || value === "") return false;
  const str = String(value);

  const re = opts.allowDecimal ? /^[0-9]*([.,][0-9]*)?$/ : /^[0-9]*$/;
  if (!re.test(str)) return true;

  if (opts.max != null && str !== "") {
    const num = parseFloat(str.replace(",", "."));
    if (!Number.isFinite(num)) return true;
    if (num > opts.max) return true;
  }
  return false;
}

function formatBpDigits(value: string | null | undefined): string {
  const digits = String(value ?? "").replace(/\D/g, "").slice(0, 5);
  if (!digits) return "";

  const splitAt = digits.startsWith("1") ? 3 : 2;
  if (digits.length < splitAt) return digits;
  if (digits.length === splitAt) return `${digits}/`;
  return `${digits.slice(0, splitAt)}/${digits.slice(splitAt, splitAt + 2)}`;
}

function splitBpParts(value: string | null | undefined): { systolic: string; diastolic: string } {
  const formatted = formatBpDigits(value);
  if (!formatted) return { systolic: "", diastolic: "" };
  if (!formatted.includes("/")) return { systolic: formatted, diastolic: "" };
  const [systolic, diastolic = ""] = formatted.split("/", 2);
  return { systolic, diastolic };
}

function validateBp(value: string | null | undefined): boolean {
  if (!value) return false;
  const { systolic, diastolic } = splitBpParts(value);

  if (!systolic && !diastolic) return false;
  if (!systolic || !diastolic) return true;
  if (!/^[0-9]{2,3}$/.test(systolic) || !/^[0-9]{2}$/.test(diastolic)) return true;

  const s = Number(systolic);
  const d = Number(diastolic);
  if (!Number.isFinite(s) || !Number.isFinite(d)) return true;
  if (s > 255 || d > 255) return true;
  return false;
}


type WeightUnit = "kg" | "lb";

type ConvertibleUnit = WeightUnit;

type VisitDisplayUnits = {
  wt?: WeightUnit;
};

function roundForDisplay(num: number, maxDecimals = 2): string {
  if (!Number.isFinite(num)) return "";
  return num.toFixed(maxDecimals).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

function convertUnitValue(value: number, from: ConvertibleUnit, to: ConvertibleUnit): number {
  if (from === to) return value;
  return from === "kg" ? value * 2.2046226218 : value / 2.2046226218;
}

function toDisplayValueString(
  value: string | number | null | undefined,
  baseUnit: ConvertibleUnit,
  displayUnit: ConvertibleUnit,
  maxDecimals = 2
): string {
  if (value === null || value === undefined || String(value).trim() === "") return "";
  const parsed = Number(String(value).replace(",", "."));
  if (!Number.isFinite(parsed)) return String(value);
  return roundForDisplay(convertUnitValue(parsed, baseUnit, displayUnit), maxDecimals);
}

function parseLocalDate(v?: string | null): Date | null {
  const ymd = toYMD(v || "");
  if (!ymd) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function diffDays(from?: string | null, to?: string | null): number | null {
  const a = parseLocalDate(from);
  const b = parseLocalDate(to);
  if (!a || !b) return null;

  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((utcB - utcA) / 86400000);
}

function trimesterFromAogDays(days?: number | null): "1st" | "2nd" | "3rd" | null {
  if (days == null || !Number.isFinite(days) || days < 0) return null;
  if (days <= 97) return "1st";
  if (days <= 181) return "2nd";
  return "3rd";
}

function toExistingAogDays(row: VisitWithExtras): number | null {
  if (row.aog_days != null && Number.isFinite(Number(row.aog_days))) {
    const n = Number(row.aog_days);
    return n >= 0 ? n : null;
  }

  if (row.aog != null && String(row.aog).trim() !== "") {
    const days = Number(row.aog);
    if (Number.isFinite(days) && days >= 0) return Math.floor(days);
  }

  return null;
}

function formatAogWeeksDays(days?: number | null): string {
  if (days == null || !Number.isFinite(days) || days < 0) return "";
  const totalDays = Math.floor(days);
  const weeks = Math.floor(totalDays / 7);
  return `${weeks} week${weeks === 1 ? "" : "s"} (${totalDays} day${totalDays === 1 ? "" : "s"})`;
}

function computeAogRows(rows: VisitWithExtras[], lmpDate?: string | null): VisitWithExtras[] {
  const next = rows.map((r) => ({ ...r }));

  const dated = next
    .map((row, index) => ({ row, index, visit_date: toYMD(row.visit_date || "") }))
    .filter((x) => !!x.visit_date)
    .sort((a, b) => {
      if (a.visit_date < b.visit_date) return -1;
      if (a.visit_date > b.visit_date) return 1;
      return a.index - b.index;
    });

  let prevComputedDays: number | null = null;
  let prevVisitDate: string | null = null;

  for (let pos = 0; pos < dated.length; pos++) {
    const item = dated[pos];
    const row = item.row;
    const visitDate = item.visit_date;

    let aogDays: number | null = null;

    if (pos === 0) {
      const fromLmp = diffDays(lmpDate || null, visitDate);
      if (fromLmp != null && fromLmp >= 0) {
        aogDays = fromLmp;
      } else {
        aogDays = toExistingAogDays(row);
      }
    } else {
      const gap = diffDays(prevVisitDate, visitDate);
      if (prevComputedDays != null && gap != null) {
        aogDays = prevComputedDays + gap;
      } else {
        const fromLmp = diffDays(lmpDate || null, visitDate);
        if (fromLmp != null && fromLmp >= 0) {
          aogDays = fromLmp;
        } else {
          aogDays = toExistingAogDays(row);
        }
      }
    }

    row.aog_days = aogDays;
    row.aog = aogDays == null ? "" : String(aogDays);
    row.trimester = trimesterFromAogDays(aogDays);

    prevComputedDays = aogDays;
    prevVisitDate = visitDate;
  }

  for (const row of next) {
    if (!toYMD(row.visit_date || "")) {
      row.aog_days = null;
      row.aog = "";
      row.trimester = null;
    }
  }

  return next;
}

function normalizeRow(r: any): VisitWithExtras {
  const incomingAogDays =
    r?.aog_days != null && String(r.aog_days).trim() !== ""
      ? intOrNull(r?.aog_days)
      : r?.aog != null && String(r.aog).trim() !== ""
      ? intOrNull(r?.aog)
      : null;

  return {
    id: r?.id,
    visit_date: toYMD(r?.visit_date ?? ""),
    bp: r?.bp ?? "",
    pr: r?.pr ?? "",
    rr: r?.rr ?? "",
    temp: r?.temp ?? "",
    wt: r?.wt ?? "",
    fundic_height: r?.fundic_height ?? r?.fh ?? "",
    fetal_heart_tone: r?.fetal_heart_tone ?? r?.fhr ?? "",
    iron_tablets: r?.iron_tablets ?? r?.feso4_caps ?? null,
    trimester: r?.trimester ?? null,
    remarks: r?.remarks ?? "",
    aog_days: incomingAogDays,
    aog: incomingAogDays == null ? "" : String(incomingAogDays),
  } as VisitWithExtras;
}

function emptyVisit(): VisitWithExtras {
  return {
    visit_date: "",
    trimester: null,
    bp: "",
    pr: "",
    rr: "",
    wt: "",
    temp: "",
    fundic_height: "",
    fetal_heart_tone: "",
    iron_tablets: null,
    remarks: "",
    aog: "",
    aog_days: null,
  };
}

function visitHasContent(v: VisitWithExtras | undefined) {
  if (!v) return false;
  const hasStr = (s?: string | null) => !!(s && String(s).trim().length);
  const hasNum = (n: any) => n != null && String(n).trim().length > 0;
  return (
    hasStr(v.visit_date) ||
    hasStr(v.bp) ||
    hasStr(v.pr) ||
    hasStr(v.rr) ||
    hasStr(v.temp) ||
    hasNum(v.wt) ||
    hasNum(v.fundic_height) ||
    hasNum(v.fetal_heart_tone) ||
    hasNum(v.iron_tablets as any) ||
    hasStr(v.remarks) ||
    !!v.trimester
  );
}

function getVisitSummary(row: VisitWithExtras, lmpDate?: string | null) {
  const main = row.visit_date ? row.visit_date : "No visit date yet";
  const chips: string[] = [];

  if (row.aog_days != null && row.aog_days >= 0) {
    chips.push(`AOG ${formatAogWeeksDays(row.aog_days)}`);
  } else if (row.visit_date && !lmpDate) {
    chips.push("No LMP");
  }

  if (row.trimester) chips.push(`${row.trimester} trimester`);
  if (row.bp) chips.push(`BP ${row.bp}`);
  if (row.wt !== null && row.wt !== undefined && String(row.wt).trim() !== "") {
    chips.push(`WT ${row.wt} kg`);
  }
  if (row.remarks && String(row.remarks).trim()) chips.push("Has remarks");

  return {
    main,
    chips,
  };
}

function draftStorageKey(patientId: number) {
  return `itr-visits-draft:${patientId}`;
}

function comparableValue(value: any) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeComparableDecimal(value: any) {
  if (value === null || value === undefined || String(value).trim() === "") return "";
  const n = Number(String(value).replace(",", "."));
  if (!Number.isFinite(n)) return String(value).trim();
  return String(n);
}

function normalizeComparableInteger(value: any) {
  if (value === null || value === undefined || String(value).trim() === "") return "";
  const n = Number(String(value).replace(",", "."));
  if (!Number.isFinite(n)) return String(value).trim();
  return String(Math.trunc(n));
}

function rowComparable(row: VisitWithExtras) {
  return {
    id: row.id ?? null,
    visit_date: toYMD(row.visit_date || ""),
    bp: comparableValue(row.bp),
    pr: normalizeComparableInteger(row.pr),
    rr: normalizeComparableInteger(row.rr),
    temp: normalizeComparableDecimal(row.temp),
    wt: normalizeComparableDecimal(row.wt),
    fundic_height: normalizeComparableDecimal(row.fundic_height),
    fetal_heart_tone: normalizeComparableInteger(row.fetal_heart_tone),
    iron_tablets: normalizeComparableInteger(row.iron_tablets),
    trimester: comparableValue(row.trimester),
    remarks: comparableValue(row.remarks),
  };
}

function rowsEqualForDraft(a?: VisitWithExtras, b?: VisitWithExtras) {
  return JSON.stringify(rowComparable(a as VisitWithExtras)) === JSON.stringify(rowComparable(b as VisitWithExtras));
}

function readDraftRows(patientId: number): VisitWithExtras[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(draftStorageKey(patientId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((r) => normalizeRow(r)).filter((r) => !!r && (r.id != null || visitHasContent(r)));
  } catch {
    return [];
  }
}

function writeDraftRows(patientId: number, rows: VisitWithExtras[]) {
  if (typeof window === "undefined") return;
  if (!rows.length) {
    window.localStorage.removeItem(draftStorageKey(patientId));
    return;
  }
  window.localStorage.setItem(draftStorageKey(patientId), JSON.stringify(rows.map((r) => normalizeRow(r))));
}

function mergeServerAndDraftRows(serverRows: VisitWithExtras[], draftRows: VisitWithExtras[]) {
  if (!draftRows.length) return serverRows;

  const draftById = new Map<any, VisitWithExtras>();
  const unsavedDrafts: VisitWithExtras[] = [];

  for (const row of draftRows) {
    if (row.id != null) draftById.set(row.id, row);
    else if (visitHasContent(row)) unsavedDrafts.push(row);
  }

  const merged = serverRows.map((row) => {
    if (row.id != null && draftById.has(row.id)) {
      return normalizeRow(draftById.get(row.id));
    }
    return row;
  });

  for (const draft of draftRows) {
    if (draft.id != null) {
      const existsOnServer = serverRows.some((s) => s.id === draft.id);
      if (!existsOnServer && visitHasContent(draft)) {
        merged.push(normalizeRow(draft));
      }
    }
  }

  merged.push(...unsavedDrafts.map((r) => normalizeRow(r)));
  return merged;
}

const SegTrimester: React.FC<{
  value: TrimesterValue;
}> = ({ value }) => {
  const options: Array<{ value: "1st" | "2nd" | "3rd"; label: string }> = [
    { value: "1st", label: "1st" },
    { value: "2nd", label: "2nd" },
    { value: "3rd", label: "3rd" },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <div
            key={opt.value}
            className={[
              "min-h-[44px] rounded-xl border px-3 text-sm font-semibold transition flex items-center justify-center",
              active
                ? "border-teal-600 bg-teal-50 text-teal-700 shadow-sm"
                : "border-slate-300 bg-slate-50 text-slate-500",
            ].join(" ")}
          >
            {opt.label}
          </div>
        );
      })}
    </div>
  );
};

const BPInput = React.memo(function BPInput({
  i,
  value,
  disabled,
  invalid,
  dirty,
  onActivate,
  onChangeValue,
  dirtyFieldClass,
}: {
  i: number;
  value?: string | null;
  disabled?: boolean;
  invalid?: boolean;
  dirty?: boolean;
  onActivate: (index: number) => void;
  onChangeValue: (index: number, next: string) => void;
  dirtyFieldClass: string;
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const pendingDigitCaretRef = React.useRef<number | null>(null);

  const rawDigits = React.useMemo(() => String(value ?? "").replace(/\D/g, "").slice(0, 5), [value]);
  const displayValue = React.useMemo(() => formatBpDigits(rawDigits), [rawDigits]);
  const placeholder = rawDigits && !rawDigits.startsWith("1") ? "00/00" : "000/00";

  const digitCountBeforeCaret = React.useCallback((inputValue: string, caretPos: number | null) => {
    const safeCaret = Math.max(0, Math.min(caretPos ?? inputValue.length, inputValue.length));
    return (inputValue.slice(0, safeCaret).match(/\d/g) || []).length;
  }, []);

  const caretFromDigitCount = React.useCallback((formattedValue: string, digitCount: number) => {
    if (digitCount <= 0) return 0;

    let seen = 0;
    for (let idx = 0; idx < formattedValue.length; idx++) {
      if (/\d/.test(formattedValue[idx])) {
        seen += 1;
        if (seen >= digitCount) return idx + 1;
      }
    }

    return formattedValue.length;
  }, []);

  React.useLayoutEffect(() => {
    if (pendingDigitCaretRef.current == null) return;
    const el = inputRef.current;
    if (!el) return;

    const nextPos = caretFromDigitCount(displayValue, pendingDigitCaretRef.current);
    try {
      el.setSelectionRange(nextPos, nextPos);
    } catch {}
    pendingDigitCaretRef.current = null;
  }, [displayValue, caretFromDigitCount]);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        spellCheck={false}
        value={displayValue}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={6}
        onFocus={() => onActivate(i)}
        onChange={(e) => {
          const inputValue = e.currentTarget.value;
          const digits = inputValue.replace(/\D/g, "").slice(0, 5);
          const caretDigits = digitCountBeforeCaret(inputValue, e.currentTarget.selectionStart);
          pendingDigitCaretRef.current = Math.min(caretDigits, digits.length);
          onChangeValue(i, formatBpDigits(digits));
        }}
        className={[
          inputSm,
          "w-full min-h-[44px] sm:min-h-[40px] text-sm sm:text-[15px] pr-12 tracking-[0.12em] font-semibold",
          dirty ? dirtyFieldClass : "focus:ring-teal-600/30",
          disabled ? "bg-slate-50 text-slate-500 cursor-default" : "",
        ].join(" ")}
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-400">
        mmHg
      </span>
    </div>
  );
});

const UnitInput = React.memo(function UnitInput({

  unit,
  className,
  i,
  value,
  numericMode,
  invalid,
  dirty,
  disabled,
  inputMode,
  dirtyFieldClass,
  onActivate,
  onChangeValue,
}: {
  unit?: string;
  className?: string;
  i: number;
  value: any;
  numericMode?: "int" | "decimal";
  invalid?: boolean;
  dirty?: boolean;
  disabled?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  dirtyFieldClass: string;
  onActivate: (index: number) => void;
  onChangeValue: (index: number, next: string) => void;
}) {
  const strValue =
    value === null || value === undefined ? "" : typeof value === "number" ? String(value) : String(value);

  const isDisabled = Boolean(disabled);

  return (
    <div className="relative">
      <input
        type="text"
        value={strValue}
        autoComplete="off"
        spellCheck={false}
        tabIndex={isDisabled ? -1 : 0}
        disabled={isDisabled}
        inputMode={numericMode === "decimal" ? "decimal" : numericMode === "int" ? "numeric" : inputMode}
        onFocus={() => onActivate(i)}
        onChange={(e) => {
          const nextValue = e.currentTarget.value;

          if (numericMode) {
            const re = numericMode === "decimal" ? /^[0-9]*([.,][0-9]*)?$/ : /^[0-9]*$/;
            if (!re.test(nextValue)) return;
          }

          onChangeValue(i, nextValue);
        }}
        className={[
          inputSm,
          "w-full pr-12 min-h-[44px] sm:min-h-[40px] text-sm sm:text-[15px]",
          invalid
            ? "border-rose-500 ring-2 ring-rose-300 focus:ring-rose-400 focus:border-rose-500"
            : dirty
            ? dirtyFieldClass
            : "focus:ring-teal-600/30",
          isDisabled ? "bg-slate-50 text-slate-500 cursor-default" : "",
          className || "",
        ]
          .filter(Boolean)
          .join(" ")}
      />
      {unit ? (
        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[11px] sm:text-xs text-slate-500">
          {unit}
        </span>
      ) : null}
    </div>
  );
});


const ConvertibleUnitInput = React.memo(function ConvertibleUnitInput({
  i,
  baseValue,
  baseUnit,
  selectedUnit,
  unitOptions,
  numericMode,
  invalid,
  dirty,
  disabled,
  dirtyFieldClass,
  onActivate,
  onChangeBaseValue,
  onChangeUnit,
}: {
  i: number;
  baseValue: any;
  baseUnit: ConvertibleUnit;
  selectedUnit: ConvertibleUnit;
  unitOptions: Array<{ value: ConvertibleUnit; label: string }>;
  numericMode?: "int" | "decimal";
  invalid?: boolean;
  dirty?: boolean;
  disabled?: boolean;
  dirtyFieldClass: string;
  onActivate: (index: number) => void;
  onChangeBaseValue: (index: number, nextBase: string) => void;
  onChangeUnit: (nextUnit: ConvertibleUnit) => void;
}) {
  const displayValue = React.useMemo(
    () => toDisplayValueString(baseValue, baseUnit, selectedUnit, numericMode === "int" ? 0 : 2),
    [baseValue, baseUnit, selectedUnit, numericMode]
  );

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_88px] gap-2">
      <input
        type="text"
        value={displayValue}
        autoComplete="off"
        spellCheck={false}
        tabIndex={disabled ? -1 : 0}
        disabled={disabled}
        inputMode={numericMode === "decimal" ? "decimal" : numericMode === "int" ? "numeric" : undefined}
        onFocus={() => onActivate(i)}
        onChange={(e) => {
          const raw = e.currentTarget.value;
          const re = numericMode === "decimal" ? /^[0-9]*([.,][0-9]*)?$/ : /^[0-9]*$/;
          if (!re.test(raw)) return;
          if (raw === "") {
            onChangeBaseValue(i, "");
            return;
          }
          const parsed = Number(raw.replace(",", "."));
          if (!Number.isFinite(parsed)) return;
          const converted = convertUnitValue(parsed, selectedUnit, baseUnit);
          onChangeBaseValue(i, numericMode === "int" ? String(Math.round(converted)) : roundForDisplay(converted, 2));
        }}
        className={[
          inputSm,
          "w-full min-h-[44px] sm:min-h-[40px] text-sm sm:text-[15px]",
          invalid
            ? "border-rose-500 ring-2 ring-rose-300 focus:ring-rose-400 focus:border-rose-500"
            : dirty
            ? dirtyFieldClass
            : "focus:ring-teal-600/30",
          disabled ? "bg-slate-50 text-slate-500 cursor-default" : "",
        ].join(" ")}
      />
      <select
        value={selectedUnit}
        disabled={disabled}
        onFocus={() => onActivate(i)}
        onChange={(e) => onChangeUnit(e.currentTarget.value as ConvertibleUnit)}
        className={[
          inputSm,
          "min-h-[44px] sm:min-h-[40px] text-sm",
          disabled ? "bg-slate-50 text-slate-500 cursor-default" : "",
        ].join(" ")}
      >
        {unitOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
});

export default function ITRVisits({
  patientId,
  rows,
}: {
  patientId: number;
  rows: VisitRow[];
}) {
  const confirm = useConfirm();
  const { props } = usePage<PageProps>();

  const lmpDate = React.useMemo(() => {
    return toYMD(props?.itr?.lmp ?? props?.itr?.lmp_date ?? props?.current?.lmp_date ?? "");
  }, [props?.itr?.lmp, props?.itr?.lmp_date, props?.current?.lmp_date]);

  const initialServerRows = React.useMemo(() => (rows?.length ? rows.map((r) => normalizeRow(r)) : []), [rows]);

  const [localRows, setLocalRows] = React.useState<VisitWithExtras[]>(() => {
    const serverRows = rows?.length ? rows.map((r) => normalizeRow(r)) : [];
    const draftRows = readDraftRows(patientId);
    return mergeServerAndDraftRows(serverRows, draftRows);
  });

  const baselineRowsRef = React.useRef<VisitWithExtras[]>(initialServerRows);
  const didMountRef = React.useRef(false);

  const computedRows = React.useMemo(() => computeAogRows(localRows, lmpDate), [localRows, lmpDate]);

  const [locked, setLocked] = React.useState<boolean>(true);

  const keysRef = React.useRef<string[]>([]);
  const cardRefs = React.useRef<Array<HTMLElement | null>>([]);
  const dateRefs = React.useRef<Array<HTMLInputElement | null>>([]);

  const rowsSigRef = React.useRef<string>("");

  React.useEffect(() => {
    const normalizedServer = (rows || []).map((r) => normalizeRow(r));
    baselineRowsRef.current = normalizedServer;

    const sig = JSON.stringify(normalizedServer);
    if (sig === rowsSigRef.current) return;
    rowsSigRef.current = sig;

    const storedDraftRows = readDraftRows(patientId);
    const merged = mergeServerAndDraftRows(normalizedServer, storedDraftRows);

    setLocalRows((prev) => {
      if (!prev || prev.length === 0) {
        keysRef.current = merged.map((r) => `id:${r.id ?? `tmp:${Math.random()}`}`);
        return merged;
      }

      const next = merged.map((r, idx) => {
        const existingKey = keysRef.current[idx];
        if (!existingKey) {
          keysRef.current[idx] = r.id != null ? `id:${r.id}` : `tmp:${Date.now()}:${idx}`;
        }
        return r;
      });

      return next;
    });

    cardRefs.current = [];
    dateRefs.current = [];
    setActiveIndex(null);
    setWarnIndex(null);
    setPendingFocusIndex(null);
    setExpandedRows({});
  }, [rows, patientId]);

  React.useEffect(() => {
    if (keysRef.current.length === localRows.length) return;

    const nextKeys = localRows.map((r, i) => {
      if (keysRef.current[i]) return keysRef.current[i];
      return r.id != null ? `id:${r.id}` : `tmp:${Date.now()}:${i}`;
    });

    keysRef.current = nextKeys;
  }, [localRows]);

  const baselineRows = baselineRowsRef.current;

  const baselineById = React.useMemo(() => {
    const map = new Map<any, VisitWithExtras>();
    baselineRows.forEach((row) => {
      if (row.id != null) map.set(row.id, row);
    });
    return map;
  }, [baselineRows]);

  const dirtyFlags = React.useMemo(() => {
    return computedRows.map((row) => {
      if (!visitHasContent(row)) return false;
      if (row.id == null) return true;

      const baseline = baselineById.get(row.id);
      if (!baseline) return true;

      return !rowsEqualForDraft(row, baseline);
    });
  }, [computedRows, baselineById]);

  React.useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
    }

    const draftRows = computedRows.filter((row, index) => dirtyFlags[index] && visitHasContent(row));
    writeDraftRows(patientId, draftRows);
  }, [patientId, computedRows, dirtyFlags]);

  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);
  const [warnIndex, setWarnIndex] = React.useState<number | null>(null);
  const [expandedRows, setExpandedRows] = React.useState<Record<number, boolean>>({});

  const [pendingFocusIndex, setPendingFocusIndex] = React.useState<number | null>(null);
  React.useEffect(() => {
    if (pendingFocusIndex == null) return;
    const i = pendingFocusIndex;
    const el = cardRefs.current[i];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    setExpandedRows((prev) => ({ ...prev, [i]: true }));
    setTimeout(() => dateRefs.current[i]?.focus(), 120);
    setActiveIndex(i);
    setPendingFocusIndex(null);
  }, [localRows.length, pendingFocusIndex]);

  const [savingIndex, setSavingIndex] = React.useState<number | null>(null);
  const [deletingIndex, setDeletingIndex] = React.useState<number | null>(null);

  const [resultOpen, setResultOpen] = React.useState(false);
  const [resultKind, setResultKind] = React.useState<ResultKind>("success");
  const [resultTitle, setResultTitle] = React.useState("");
  const [resultMsg, setResultMsg] = React.useState<string | undefined>();

  const [displayUnits, setDisplayUnits] = React.useState<Record<string, VisitDisplayUnits>>({});

  const updateRow = React.useCallback(<K extends keyof VisitWithExtras>(index: number, key: K, value: VisitWithExtras[K]) => {
    setLocalRows((prev) => {
      const next = prev.slice();
      next[index] = { ...next[index], [key]: value };
      return next;
    });

    setExpandedRows((prev) => ({ ...prev, [index]: true }));
    setActiveIndex(index);
  }, []);

  const setVisitDate = React.useCallback((index: number, visitDate: string) => {
    setLocalRows((prev) => {
      const next = prev.slice();
      next[index] = {
        ...next[index],
        visit_date: visitDate,
      };
      return computeAogRows(next, lmpDate);
    });

    setExpandedRows((prev) => ({ ...prev, [index]: true }));
    setActiveIndex(index);
  }, [lmpDate]);

  const activateVisit = React.useCallback((index: number) => {
    setExpandedRows((prev) => ({ ...prev, [index]: true }));
    setActiveIndex(index);
  }, []);

  const updateBpValue = React.useCallback((index: number, next: string) => {
    updateRow(index, "bp", next as any);
  }, [updateRow]);

  const updateNumericField = React.useCallback((index: number, key: keyof VisitWithExtras, next: string) => {
    updateRow(index, key, next as any);
  }, [updateRow]);


  const getRowUiKey = React.useCallback((index: number, row: VisitWithExtras) => {
    return keysRef.current[index] ?? (row.id != null ? `id:${row.id}` : `idx:${index}`);
  }, []);

  const getDisplayUnit = React.useCallback(
    <K extends keyof VisitDisplayUnits>(rowKey: string, field: K, fallback: NonNullable<VisitDisplayUnits[K]>) => {
      return (displayUnits[rowKey]?.[field] as NonNullable<VisitDisplayUnits[K]>) || fallback;
    },
    [displayUnits]
  );

  const updateDisplayUnit = React.useCallback(
    <K extends keyof VisitDisplayUnits>(rowKey: string, field: K, value: NonNullable<VisitDisplayUnits[K]>) => {
      setDisplayUnits((prev) => ({
        ...prev,
        [rowKey]: {
          ...(prev[rowKey] || {}),
          [field]: value,
        },
      }));
    },
    []
  );

  const toggleExpanded = (index: number) => {
    setExpandedRows((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const collapseAll = () => {
    setExpandedRows({});
  };

  const expandAll = () => {
    const next: Record<number, boolean> = {};
    localRows.forEach((_, i) => {
      next[i] = true;
    });
    setExpandedRows(next);
  };

  const addVisit = () => {
    const key = `tmp:${Date.now()}`;
    const newRow = emptyVisit();
    setLocalRows((prev) => {
      const next = [...prev, newRow];
      keysRef.current = [...keysRef.current, key];
      setPendingFocusIndex(next.length - 1);
      return next;
    });
  };

  const addVisitSmart = () => {
    if (locked) return;
    const lastIdx = localRows.length - 1;
    if (lastIdx >= 0 && !visitHasContent(localRows[lastIdx])) {
      setActiveIndex(lastIdx);
      setWarnIndex(lastIdx);
      setExpandedRows((prev) => ({ ...prev, [lastIdx]: true }));
      const el = cardRefs.current[lastIdx];
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => dateRefs.current[lastIdx]?.focus(), 120);
      setTimeout(() => setWarnIndex(null), 900);
      return;
    }
    addVisit();
  };

  function isFieldDirty(index: number, key: keyof VisitWithExtras): boolean {
    const row = computedRows[index];
    if (!row?.id) return false;

    const baseline = baselineById.get(row.id);
    if (!baseline) return false;

    const currentComparable = rowComparable(row);
    const baselineComparable = rowComparable(baseline);
    return currentComparable[key as keyof typeof currentComparable] !== baselineComparable[key as keyof typeof baselineComparable];
  }

  async function cancelDraft(index: number) {
    const row = computedRows[index];

    if (!dirtyFlags[index]) return;

    if (row?.id != null) {
      const baseline = baselineById.get(row.id);
      if (!baseline) return;

      const ok = await confirm({
        title: "Discard draft changes?",
        message: "This will restore the last saved values for this visit.",
        confirmText: "Restore",
        cancelText: "Keep editing",
      });
      if (!ok) return;

      setLocalRows((prev) => {
        const next = [...prev];
        next[index] = normalizeRow(baseline);
        return next;
      });

      setResultKind("success");
      setResultTitle("Draft cancelled");
      setResultMsg(`Visit #${index + 1} was restored to its saved values.`);
      setResultOpen(true);
      return;
    }

    const ok = await confirm({
      variant: "destructive",
      title: "Discard new draft visit?",
      message: "This will remove the new unsaved visit.",
      confirmText: "Remove draft",
      cancelText: "Keep editing",
    });
    if (!ok) return;

    setLocalRows((prev) => prev.filter((_, i) => i !== index));
    keysRef.current = keysRef.current.filter((_, i) => i !== index);
    cardRefs.current.splice(index, 1);
    dateRefs.current.splice(index, 1);
    setExpandedRows((prev) => {
      const next: Record<number, boolean> = {};
      Object.entries(prev).forEach(([k, v]) => {
        const num = Number(k);
        if (num < index) next[num] = v;
        if (num > index) next[num - 1] = v;
      });
      return next;
    });

    setResultKind("success");
    setResultTitle("Draft cancelled");
    setResultMsg(`New draft visit #${index + 1} was removed.`);
    setResultOpen(true);
  }

  async function saveRowCore(index: number) {
    const row = computeAogRows(localRows, lmpDate)[index];

    const payload: any = {
      ...(row.id ? { id: row.id } : {}),
      visit_date: toYMD(row.visit_date || ""),
      aog_days: row.aog_days != null ? intOrNull(row.aog_days) : null,
      bp: row.bp || null,
      pr: row.pr || null,
      rr: row.rr || null,
      temp: row.temp || null,
      wt: numOrNull(row.wt),
      fh: numOrNull(row.fundic_height),
      fhr: intOrNull(row.fetal_heart_tone),
      feso4_caps: intOrNull(row.iron_tablets),
      trimester: row.trimester ?? null,
      remarks: row.remarks || null,
    };

    const fd = new FormData();
    Object.entries(payload).forEach(([k, v]) => fd.append(`visit[${k}]`, (v ?? "") as any));

    const res = await fetch(VISIT_URL(patientId), {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "X-CSRF-TOKEN": csrfToken(),
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: fd,
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Save failed (${res.status}) ${txt.slice(0, 200)}`);
    }

    const js = await res.json().catch(() => ({} as any));

    const savedUi = normalizeRow({
      ...row,
      id: js?.row?.id ?? js?.id ?? row.id,
      aog_days: js?.row?.aog_days ?? row.aog_days,
      trimester: js?.row?.trimester ?? row.trimester,
    });

    setLocalRows((prev) => {
      const next = [...prev];
      next[index] = savedUi;
      return next;
    });

    keysRef.current[index] = `id:${savedUi.id ?? row.id}`;
    window.dispatchEvent(new CustomEvent("itr:saved"));

    await new Promise<void>((resolve) => {
      const url = window.location.pathname + window.location.search + window.location.hash;
      router.get(url, {}, {
        only: ["visits"],
        preserveScroll: true as any,
        preserveState: true,
        replace: true,
        onFinish: () => resolve(),
      });
    });

    return savedUi;
  }

  async function saveRow(index: number) {
    if (locked) return;

    const ok = await confirm({
      title: "Save this visit?",
      message: "Please confirm you want to save the details for this visit.",
      confirmText: "Yes, save",
      cancelText: "Cancel",
    });
    if (!ok) return;

    setSavingIndex(index);
    try {
      const saved = await saveRowCore(index);
      setExpandedRows((prev) => ({ ...prev, [index]: false }));
      setResultKind("success");
      setResultTitle("Visit saved");
      setResultMsg(`Visit #${index + 1} has been saved${saved?.visit_date ? ` (${saved.visit_date})` : ""}.`);
      setResultOpen(true);
    } catch (err: any) {
      setResultKind("error");
      setResultTitle("Save failed");
      setResultMsg(err?.message || "Please try again.");
      setResultOpen(true);
    } finally {
      setSavingIndex(null);
    }
  }

  async function deleteRow(index: number) {
    if (locked) return;
    const row = localRows[index];

    if (!row?.id) {
      const okUnsaved = await confirm({
        variant: "destructive",
        title: "Remove this draft visit?",
        message: "This will remove the unsaved visit from the list.",
        confirmText: "Remove",
        cancelText: "Cancel",
      });
      if (!okUnsaved) return;

      setLocalRows((prev) => prev.filter((_, i) => i !== index));
      keysRef.current = keysRef.current.filter((_, i) => i !== index);
      cardRefs.current.splice(index, 1);
      dateRefs.current.splice(index, 1);
      setExpandedRows((prev) => {
        const next: Record<number, boolean> = {};
        Object.entries(prev).forEach(([k, v]) => {
          const num = Number(k);
          if (num < index) next[num] = v;
          if (num > index) next[num - 1] = v;
        });
        return next;
      });

      setResultKind("success");
      setResultTitle("Removed");
      setResultMsg(`Draft visit #${index + 1} has been removed.`);
      setResultOpen(true);
      return;
    }

    const ok = await confirm({
      variant: "destructive",
      title: "Delete this visit?",
      message: "This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
    });
    if (!ok) return;

    setDeletingIndex(index);
    try {
      await fetch(DELVISIT_URL(patientId, row.id), {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "X-CSRF-TOKEN": csrfToken(), Accept: "application/json" },
      });

      setLocalRows((prev) => prev.filter((_, i) => i !== index));
      keysRef.current = keysRef.current.filter((_, i) => i !== index);
      cardRefs.current.splice(index, 1);
      dateRefs.current.splice(index, 1);
      setExpandedRows((prev) => {
        const next: Record<number, boolean> = {};
        Object.entries(prev).forEach(([k, v]) => {
          const num = Number(k);
          if (num < index) next[num] = v;
          if (num > index) next[num - 1] = v;
        });
        return next;
      });

      await new Promise<void>((resolve) => {
        const url = window.location.pathname + window.location.search + window.location.hash;
        router.get(url, {}, {
          only: ["visits"],
          preserveScroll: true as any,
          preserveState: true,
          replace: true,
          onFinish: () => resolve(),
        });
      });

      window.dispatchEvent(new CustomEvent("itr:saved"));

      setResultKind("success");
      setResultTitle("Deleted");
      setResultMsg(`Visit #${index + 1} has been deleted.`);
      setResultOpen(true);
    } catch (err: any) {
      setResultKind("error");
      setResultTitle("Delete failed");
      setResultMsg(err?.message || "Please try again.");
      setResultOpen(true);
    } finally {
      setDeletingIndex(null);
    }
  }

  const minDate = "1900-01-01";
  const maxDate = todayYMD();

  const dirtyFieldClass =
    "border-amber-400 bg-amber-50 ring-2 ring-amber-200 focus:border-amber-500 focus:ring-amber-300";

  const summaryChipClass =
    "inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700";

  const anyBusy = savingIndex !== null || deletingIndex !== null;

  return (
    <Card>
      <SectionHeader
        title="Pre-natal Visits"
        right={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {localRows.length > 1 && (
              <>
                <Button variant="outline" onClick={expandAll} disabled={locked}>
                  Expand All
                </Button>
                <Button variant="outline" onClick={collapseAll} disabled={locked}>
                  Collapse All
                </Button>
              </>
            )}

            <button
              type="button"
              onClick={() => setLocked((prev) => !prev)}
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

            <Button variant="outline" onClick={addVisitSmart} disabled={locked}>
              + Add Visit
            </Button>
          </div>
        }
      />

      {locked && (
        <div className="mt-3 mb-2 flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs sm:text-[13px] text-slate-700">
          <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600">
            <IconLock className="h-3 w-3" />
          </span>
          <p>
            Record is currently <span className="font-semibold">LOCKED</span>. Tap the square on the right to enable editing.
          </p>
        </div>
      )}

      <div className={["relative mt-1", locked ? "opacity-50" : "", "transition-opacity"].join(" ")}>
        <div className={locked ? "pointer-events-none" : ""}>
          {(!localRows || localRows.length === 0) && (
            <button
              type="button"
              onClick={addVisitSmart}
              disabled={locked}
              className={[
                "m-3 w-[calc(100%-1.5rem)] rounded-xl border border-dashed p-5 sm:p-6 text-center text-sm sm:text-base text-slate-600",
                locked ? "cursor-default opacity-60" : "hover:border-teal-400 hover:text-teal-700",
              ].join(" ")}
            >
              No visits yet. Tap <b>{locked ? "+ Add Visit" : "here or + Add Visit"}</b> to start.
            </button>
          )}

          <div className="grid gap-3 p-3 sm:gap-4 sm:p-4 xl:grid-cols-2">
            {localRows.map((row, i) => {
              const computedRow = computedRows[i] ?? row;
              const active = i === activeIndex;
              const warn = i === warnIndex;
              const isSaving = savingIndex === i;
              const isDeleting = deletingIndex === i;
              const expanded = !!expandedRows[i];
              const isDraft = !!dirtyFlags[i];
              const isNewDraftVisit = row.id == null && visitHasContent(computedRow);
              const isSavedVisitDraft = row.id != null && isDraft;

              const bpInvalid = validateBp(computedRow.bp as any);
              const prInvalid = validateNumericString(computedRow.pr as any, { max: 255, allowDecimal: false });
              const rrInvalid = validateNumericString(computedRow.rr as any, { max: 50, allowDecimal: false });
              const tempInvalid = validateNumericString(computedRow.temp as any, { max: 50, allowDecimal: true });
              const wtInvalid = validateNumericString(computedRow.wt as any, { max: 500, allowDecimal: true });
              const fhInvalid = validateNumericString(computedRow.fundic_height as any, { max: 100, allowDecimal: true });
              const fhtInvalid = validateNumericString(computedRow.fetal_heart_tone as any, { max: 255, allowDecimal: false });
              const ironInvalid = validateNumericString(computedRow.iron_tablets as any, { max: 50, allowDecimal: false });

              const disabled = locked || isSaving || isDeleting;
              const hasContent = visitHasContent(computedRow);
              const summary = getVisitSummary(computedRow, lmpDate);
              const summaryChips = summary.chips.slice(0, 4);
              const hasVisitDate = !!toYMD(computedRow.visit_date || "");
              const aogDisplay = formatAogWeeksDays(computedRow.aog_days);
              const aogSourceText = !hasVisitDate
                ? "Select a visit date to auto-compute."
                : computedRow.aog_days == null
                ? lmpDate
                  ? "Unable to compute from current dates."
                  : "Set LMP in Pregnancy Details first."
                : "Computed from LMP and visit date.";

              const dirtyVisitDate = isFieldDirty(i, "visit_date");
              const dirtyTrimester = isFieldDirty(i, "trimester");
              const dirtyBp = isFieldDirty(i, "bp");
              const dirtyPr = isFieldDirty(i, "pr");
              const dirtyRr = isFieldDirty(i, "rr");
              const dirtyTemp = isFieldDirty(i, "temp");
              const dirtyWt = isFieldDirty(i, "wt");
              const dirtyFh = isFieldDirty(i, "fundic_height");
              const dirtyFht = isFieldDirty(i, "fetal_heart_tone");
              const dirtyIron = isFieldDirty(i, "iron_tablets");
              const dirtyRemarks = isFieldDirty(i, "remarks");

              return (
                <article
                  key={keysRef.current[i] ?? `i:${i}`}
                  ref={(el: HTMLElement | null) => {
                    cardRefs.current[i] = el;
                  }}
                  className={[
                    "rounded-xl border transition-all overflow-hidden",
                    warn
                      ? "border-rose-500 ring-2 ring-rose-400/20"
                      : isNewDraftVisit
                      ? "border-amber-400 ring-2 ring-amber-200 shadow-[0_0_0_1px_rgba(245,158,11,0.18)]"
                      : active
                      ? "border-teal-600 ring-2 ring-teal-600/15 shadow-[0_0_0_1px_rgba(13,148,136,0.15)]"
                      : "border-slate-200",
                    disabled ? "bg-slate-50" : "bg-white",
                  ].join(" ")}
                >
                  <button
                    type="button"
                    onClick={() => toggleExpanded(i)}
                    className="w-full text-left px-3 py-3 sm:px-4 sm:py-4 hover:bg-slate-50/70 transition"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-md bg-slate-900 px-2 text-[12px] font-semibold text-white">
                        #{i + 1}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm sm:text-[15px] font-semibold text-slate-900">Visit {i + 1}</h3>

                              {isNewDraftVisit ? (
                                <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700 border border-amber-200">
                                  New Draft
                                </span>
                              ) : isSavedVisitDraft ? (
                                <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700 border border-amber-200">
                                  Edited Draft
                                </span>
                              ) : row.id ? (
                                <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 border border-emerald-200">
                                  Saved
                                </span>
                              ) : null}
                            </div>

                            <p className="mt-0.5 text-xs sm:text-[13px] font-medium text-slate-700 break-words">{summary.main}</p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {summaryChips.length ? (
                                summaryChips.map((chip, chipIndex) => (
                                  <span key={`${keysRef.current[i] ?? i}:chip:${chipIndex}`} className={summaryChipClass}>
                                    {chip}
                                  </span>
                                ))
                              ) : (
                                <span className={summaryChipClass}>No details yet</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-auto">
                            {!hasContent && (
                              <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600 border border-slate-200">
                                Empty
                              </span>
                            )}

                            <span
                              className={[
                                "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-transform",
                                expanded ? "rotate-180" : "",
                              ].join(" ")}
                            >
                              <IconChevronDown className="h-4 w-4" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>

                  {expanded && (
                    <div className="border-t border-slate-200 px-3 py-3 sm:px-4 sm:py-4">
                      {isDraft && (
                        <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] sm:text-[13px] text-amber-800">
                          {isNewDraftVisit
                            ? "This is a new unsaved draft visit."
                            : "This saved visit has unsaved draft changes. Highlighted fields were edited."}
                        </div>
                      )}

                      <div className="grid gap-3">
                        <div className="grid gap-3 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                          <div>
                            <Label className="mb-1 text-sm">Visit Date</Label>
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                              <input
                                type="date"
                                ref={(r) => {
                                  dateRefs.current[i] = r;
                                }}
                                min={minDate}
                                max={maxDate}
                                value={row.visit_date ?? ""}
                                onFocus={() => activateVisit(i)}
                                onChange={(e) => setVisitDate(i, e.currentTarget.value)}
                                disabled={disabled}
                                className={[
                                  inputSm,
                                  "flex-1 min-w-0 min-h-[44px] sm:min-h-[40px] text-sm sm:text-[15px]",
                                  dirtyVisitDate ? dirtyFieldClass : "",
                                  disabled ? "bg-slate-50 text-slate-500 cursor-default" : "",
                                ].join(" ")}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                className="min-h-[44px] sm:h-10"
                                disabled={disabled}
                                onClick={() => {
                                  const v = todayYMD();
                                  setVisitDate(i, v);
                                  requestAnimationFrame(() => dateRefs.current[i]?.focus());
                                }}
                              >
                                Today
                              </Button>
                            </div>
                          </div>

                          <div>
                            <Label className="mb-1 text-sm">
                              AOG (Age of Gestation)
                              <span className="ml-1 text-[11px] text-slate-500">(auto)</span>
                            </Label>
                            <input
                              value={aogDisplay}
                              readOnly
                              disabled={disabled}
                              className={[
                                inputSm,
                                "min-h-[44px] sm:min-h-[40px] text-sm sm:text-[15px] bg-slate-50 text-slate-700",
                                disabled ? "text-slate-500 cursor-default" : "",
                              ].join(" ")}
                              onFocus={() => {
                                activateVisit(i);
                              }}
                              placeholder="Auto"
                            />
                            <p className="mt-1 text-[11px] text-slate-500">{aogSourceText}</p>
                          </div>
                        </div>

                        <div>
                          <Label className="mb-1 text-sm">Trimester</Label>
                          <div
                            className={[
                              dirtyTrimester ? "rounded-xl border border-amber-400 bg-amber-50 p-1" : "",
                            ].join(" ")}
                          >
                            <SegTrimester value={(computedRow.trimester as TrimesterValue) || ""} />
                          </div>
                          <p className="mt-1 text-[11px] text-slate-500">Automatically adjusted from the visit date and current LMP/AOG.</p>
                        </div>

                        <div className="mt-1">
                          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Vital Signs</div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                              <Label className="mb-1 text-sm">
                                BP <span className="text-xs text-slate-500">(Blood Pressure)</span>
                              </Label>
                              <BPInput
                                i={i}
                                value={computedRow.bp ?? ""}
                                disabled={disabled}
                                invalid={bpInvalid}
                                dirty={dirtyBp}
                                onActivate={activateVisit}
                                onChangeValue={updateBpValue}
                                dirtyFieldClass={dirtyFieldClass}
                              />
                              <p className="mt-1 text-[11px] text-slate-500">Type continuously like 12080 or 9070. The slash inserts automatically: values starting with 1 use 000/00, others use 00/00.</p>
                            </div>

                            <div>
                              <Label className="mb-1 text-sm">
                                PR <span className="text-xs text-slate-500">(Pulse Rate)</span>
                              </Label>
                              <UnitInput
                                i={i}
                                value={computedRow.pr ?? ""}
                                unit="bpm"
                                numericMode="int"
                                invalid={prInvalid}
                                dirty={dirtyPr}
                                disabled={disabled}
                                onActivate={activateVisit}
                                onChangeValue={(idx, next) => updateNumericField(idx, "pr", next)}
                                dirtyFieldClass={dirtyFieldClass}
                              />
                            </div>

                            <div>
                              <Label className="mb-1 text-sm">
                                RR <span className="text-xs text-slate-500">(Respiratory Rate)</span>
                              </Label>
                              <UnitInput
                                i={i}
                                value={computedRow.rr ?? ""}
                                unit="cpm"
                                numericMode="int"
                                invalid={rrInvalid}
                                dirty={dirtyRr}
                                disabled={disabled}
                                onActivate={activateVisit}
                                onChangeValue={(idx, next) => updateNumericField(idx, "rr", next)}
                                dirtyFieldClass={dirtyFieldClass}
                              />
                            </div>

                            <div>
                              <Label className="mb-1 text-sm">
                                Temp <span className="text-xs text-slate-500">(Temperature)</span>
                              </Label>
                              <UnitInput
                                i={i}
                                value={computedRow.temp ?? ""}
                                unit="°C"
                                numericMode="decimal"
                                invalid={tempInvalid}
                                dirty={dirtyTemp}
                                disabled={disabled}
                                onActivate={activateVisit}
                                onChangeValue={(idx, next) => updateNumericField(idx, "temp", next)}
                                dirtyFieldClass={dirtyFieldClass}
                              />
                            </div>

                            <div>
                              <Label className="mb-1 text-sm">
                                Weight <span className="text-xs text-slate-500">(Body Weight)</span>
                              </Label>
                              <ConvertibleUnitInput
                                i={i}
                                baseValue={computedRow.wt ?? ""}
                                baseUnit="kg"
                                selectedUnit={getDisplayUnit(getRowUiKey(i, row), "wt", "kg")}
                                unitOptions={[
                                  { value: "kg", label: "kg" },
                                  { value: "lb", label: "lb" },
                                ]}
                                numericMode="decimal"
                                invalid={wtInvalid}
                                dirty={dirtyWt}
                                disabled={disabled}
                                onActivate={activateVisit}
                                onChangeBaseValue={(idx, next) => updateNumericField(idx, "wt", next)}
                                onChangeUnit={(nextUnit) => updateDisplayUnit(getRowUiKey(i, row), "wt", nextUnit as WeightUnit)}
                                dirtyFieldClass={dirtyFieldClass}
                              />
                              <p className="mt-1 text-[11px] text-slate-500">Switch kg/lb and the value converts automatically in place.</p>
                            </div>

                            <div>
                              <Label className="mb-1 text-sm">
                                Fundic Height <span className="text-xs text-slate-500">(Uterine size)</span>
                              </Label>
                              <UnitInput
                                i={i}
                                value={computedRow.fundic_height ?? ""}
                                unit="cm"
                                numericMode="decimal"
                                invalid={fhInvalid}
                                dirty={dirtyFh}
                                disabled={disabled}
                                onActivate={activateVisit}
                                onChangeValue={(idx, next) => updateNumericField(idx, "fundic_height", next)}
                                dirtyFieldClass={dirtyFieldClass}
                              />
                            </div>

                            <div>
                              <Label className="mb-1 text-sm">
                                Fetal Heart Tone <span className="text-xs text-slate-500">(Fetal heart rate)</span>
                              </Label>
                              <UnitInput
                                i={i}
                                value={computedRow.fetal_heart_tone ?? ""}
                                unit="bpm"
                                numericMode="int"
                                invalid={fhtInvalid}
                                dirty={dirtyFht}
                                disabled={disabled}
                                onActivate={activateVisit}
                                onChangeValue={(idx, next) => updateNumericField(idx, "fetal_heart_tone", next)}
                                dirtyFieldClass={dirtyFieldClass}
                              />
                            </div>

                            <div className="sm:col-span-2">
                              <Label className="mb-1 text-sm">
                                Iron with Folic Acid
                                <span className="ml-1 text-xs text-slate-500">(tablets given)</span>
                              </Label>
                              <UnitInput
                                i={i}
                                value={(computedRow.iron_tablets ?? "") as any}
                                unit="tabs"
                                numericMode="int"
                                invalid={ironInvalid}
                                dirty={dirtyIron}
                                disabled={disabled}
                                onActivate={activateVisit}
                                onChangeValue={(idx, next) => updateNumericField(idx, "iron_tablets", next)}
                                dirtyFieldClass={dirtyFieldClass}
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <Label className="mb-1 text-sm">Remarks</Label>
                          <textarea
                            value={computedRow.remarks ?? ""}
                            onFocus={() => {
                              activateVisit(i);
                            }}
                            onChange={(e) => updateRow(i, "remarks", e.currentTarget.value)}
                            disabled={disabled}
                            className={[
                              "min-h-[88px] sm:min-h-[96px] w-full rounded-xl border-2 bg-white p-3 text-sm outline-none",
                              dirtyRemarks
                                ? "border-amber-400 bg-amber-50 ring-2 ring-amber-200 focus:border-amber-500 focus:ring-amber-300"
                                : disabled
                                ? "bg-slate-50 text-slate-500 cursor-default"
                                : "border-slate-300 focus:ring-2 focus:ring-teal-600/30",
                              disabled ? "text-slate-500 cursor-default" : "",
                            ].join(" ")}
                          />
                        </div>
                      </div>

                      <div className="mt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
                        {isDraft && (
                          <Button variant="outline" onClick={() => cancelDraft(i)} disabled={disabled || anyBusy}>
                            Cancel Draft
                          </Button>
                        )}
                        <Button variant="outline" onClick={() => deleteRow(i)} disabled={disabled || anyBusy}>
                          {isDeleting ? "Deleting…" : "Delete"}
                        </Button>
                        <Button onClick={() => saveRow(i)} disabled={disabled || anyBusy}>
                          {isSaving ? "Saving…" : isDraft ? "Save Draft" : "Save"}
                        </Button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </div>

      <ResultDialog
        open={resultOpen}
        onClose={() => setResultOpen(false)}
        kind={resultKind}
        title={resultTitle}
        message={resultMsg}
      />
    </Card>
  );
}
