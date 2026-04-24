// resources/js/components/prenatal/itr/ITRPregnancyDetails.tsx
import * as React from "react";
import { usePage, router } from "@inertiajs/react";
import { Field, TextInput } from "./itr-shared";
import { ITR_URL, postNested, toYMD } from "./itr-api";
import { useConfirm } from "../../confirm-kit";

/* Icons */
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
    strokeWidth="1.8"
  >
    <rect x="5" y="11" width="14" height="10" rx="2" />
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
    strokeWidth="1.8"
  >
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M9 11V8a4 4 0 0 1 7.3-2.5" />
  </svg>
);

const TEAL = "#0F8A99";

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
          aria-labelledby="result-title"
          className={[
            "w-full max-w-lg rounded-2xl bg-white shadow-xl ring-1 ring-black/10 outline-none",
            "transition-all duration-200",
            open ? "scale-100 opacity-100" : "scale-95 opacity-0",
          ].join(" ")}
        >
          <div className={["p-4 sm:p-4 rounded-2xl ring-1", ringClass].join(" ")}>
            <div className="flex items-start gap-2.5">
              <div className={`mt-0.5 shrink-0 ${iconClass}`}>
                {kind === "success" ? (
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
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
                    className="h-5 w-5"
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
                <h2 id="result-title" className="text-[14px] font-semibold text-slate-900">
                  {title}
                </h2>
                {message ? (
                  <p className="mt-0.5 text-[13px] text-slate-600">{message}</p>
                ) : null}
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                onClick={onClose}
                className="h-8 rounded-md border border-slate-300 bg-white px-3 text-[13px] text-slate-700 hover:bg-slate-50"
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

/* ---------- Form state helpers ---------- */

type FormState = {
  // OB score + history
  ob_g: string;
  ob_p: string;
  gtpal_t: string;
  gtpal_p: string;
  gtpal_a: string;
  gtpal_l: string;

  // dates
  lmp: string;
  edc: string;

  // risk codes
  risk_a_date: string;
  risk_b_date: string;
  risk_c_date: string;
  risk_d_date: string;
  risk_e_date: string;
  risk_a_flag: boolean;
  risk_b_flag: boolean;
  risk_c_flag: boolean;
  risk_d_flag: boolean;
  risk_e_flag: boolean;
};

function parseGTPAL(raw: any): Pick<
  FormState,
  "gtpal_t" | "gtpal_p" | "gtpal_a" | "gtpal_l"
> {
  const s = (raw ?? "").toString();
  const base = { gtpal_t: "", gtpal_p: "", gtpal_a: "", gtpal_l: "" };
  if (!s.trim()) return base;

  const re = /T\s*(\d+)[^\d]*P\s*(\d+)[^\d]*A\s*(\d+)[^\d]*L\s*(\d+)/i;
  const m = re.exec(s);
  if (!m) return base;

  return {
    gtpal_t: m[1] || "",
    gtpal_p: m[2] || "",
    gtpal_a: m[3] || "",
    gtpal_l: m[4] || "",
  };
}

/** Naegele's rule: LMP + 7 days + 9 months */
function computeEDCFromLMP(lmp: string): string {
  if (!lmp) return "";
  const d = new Date(lmp);
  if (Number.isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + 7);
  d.setMonth(d.getMonth() + 9);
  return d.toISOString().slice(0, 10);
}

function normalizeObFieldsForSave(form: FormState) {
  return {
    ob_g: form.ob_g === "" ? "0" : form.ob_g,
    ob_p: form.ob_p === "" ? "0" : form.ob_p,
    gtpal_t: form.gtpal_t === "" ? "0" : form.gtpal_t,
    gtpal_p: form.gtpal_p === "" ? "0" : form.gtpal_p,
    gtpal_a: form.gtpal_a === "" ? "0" : form.gtpal_a,
    gtpal_l: form.gtpal_l === "" ? "0" : form.gtpal_l,
  };
}

/** Validate numeric OB fields: digits only, 0–50, required. */
function validateObFields(form: FormState): string | null {
  const pairs: [keyof FormState, string][] = [
    ["ob_g", "G (current pregnancy count)"],
    ["ob_p", "P (parity)"],
    ["gtpal_t", "T (term births)"],
    ["gtpal_p", "P (preterm births)"],
    ["gtpal_a", "A (abortions)"],
    ["gtpal_l", "L (living children)"],
  ];

  for (const [k, label] of pairs) {
    const v = form[k];

    // allow empty while editing
    if (v === "" || v == null) continue;

    const n = Number(v);
    if (!Number.isFinite(n)) return `${label} must be a number.`;
    if (n < 0) return `${label} cannot be negative.`;
    if (n > 50) return `${label} cannot exceed 50.`;
  }

  if (!form.lmp) return "Last Menstrual Period (LMP) is required.";
  if (!form.edc) return "Expected Date of Confinement (EDC) is required.";

  return null;
}

function getEmptyObHistoryFields(form: FormState): string[] {
  const empties: string[] = [];

  if (form.ob_g === "") empties.push("G — Gravida");
  if (form.ob_p === "") empties.push("P — Para");
  if (form.gtpal_t === "") empties.push("T — Term");
  if (form.gtpal_p === "") empties.push("P — Preterm");
  if (form.gtpal_a === "") empties.push("A — Abortions");
  if (form.gtpal_l === "") empties.push("L — Living");

  return empties;
}

/** Pregnancy Details (ITR) */
export default function ITRPregnancyDetails({ patientId }: { patientId: number }) {
  const { canEdit = false } = usePage<any>().props;
  const confirm = useConfirm();
  const page = usePage<any>();
  const itr = (page?.props?.itr as any) ?? {};

  /* ---------- localStorage draft helpers ---------- */
  const LS_KEY = (pid: number | string) => `itr_draft:${pid}`;
  const readDraft = React.useCallback(() => {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY(patientId)) || "{}");
    } catch {
      return {};
    }
  }, [patientId]);

  const writeDraft = React.useCallback(
    (vals: Record<string, any>) => {
      try {
        localStorage.setItem(LS_KEY(patientId), JSON.stringify(vals));
      } catch {}
    },
    [patientId]
  );

  const clearDraft = React.useCallback(() => {
    try {
      localStorage.removeItem(LS_KEY(patientId));
    } catch {}
  }, [patientId]);

  /* ---------- controlled form state ---------- */
  const computeInitial = React.useCallback((): FormState => {
    const parsedGtpal = parseGTPAL(itr?.ob_gtpal);
    const base: FormState = {
      ob_g: (itr?.ob_g ?? "") + "",
      ob_p: (itr?.ob_p ?? "") + "",
      ...parsedGtpal,
      lmp: toYMD(itr?.lmp ?? itr?.lmp_date ?? ""),
      edc: toYMD(itr?.edc ?? itr?.edc_date ?? ""),
      risk_a_date: toYMD(itr?.risk_a_date ?? ""),
      risk_b_date: toYMD(itr?.risk_b_date ?? ""),
      risk_c_date: toYMD(itr?.risk_c_date ?? ""),
      risk_d_date: toYMD(itr?.risk_d_date ?? ""),
      risk_e_date: toYMD(itr?.risk_e_date ?? ""),
      risk_a_flag: !!itr?.risk_a_flag,
      risk_b_flag: !!itr?.risk_b_flag,
      risk_c_flag: !!itr?.risk_c_flag,
      risk_d_flag: !!itr?.risk_d_flag,
      risk_e_flag: !!itr?.risk_e_flag,
    };

    const draft = readDraft();
    return { ...base, ...draft };
  }, [itr, readDraft]);

  const [form, setForm] = React.useState<FormState>(computeInitial);
  const [locked, setLocked] = React.useState<boolean>(true);

  React.useEffect(() => {
    setForm(computeInitial());
    setStatus("");
    setError(null);
    dirtyRef.current = false;
  }, [computeInitial, patientId]);

  /* ---------- dirty + status ---------- */
  const dirtyRef = React.useRef(false);
  const markDirty = React.useCallback(() => {
    if (!dirtyRef.current) {
      dirtyRef.current = true;
      window.dispatchEvent(new CustomEvent("itr:dirty"));
    }
  }, []);

  const formRef = React.useRef<HTMLFormElement>(null);
  const statusRef = React.useRef<HTMLSpanElement>(null);
  const errorRef = React.useRef<HTMLDivElement>(null);

  const [saving, setSaving] = React.useState(false);
  const [resultOpen, setResultOpen] = React.useState(false);
  const [resultKind, setResultKind] = React.useState<ResultKind>("success");
  const [resultTitle, setResultTitle] = React.useState("");
  const [resultMsg, setResultMsg] = React.useState<string | undefined>();

  const setStatus = (t: string) => {
    if (statusRef.current) statusRef.current.textContent = t;
  };

  const setError = (t: string | null) => {
    if (!errorRef.current) return;
    errorRef.current.textContent = t || "";
    errorRef.current.style.display = t ? "block" : "none";
  };

  const URL = ITR_URL(patientId);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  function flushDraft(next?: Partial<FormState>) {
    const payload = { ...(form as FormState), ...(next ?? {}) };
    writeDraft(payload);
    setStatus("Draft ✓");
    setTimeout(() => {
      if ((statusRef.current?.textContent || "") === "Draft ✓") setStatus("");
    }, 800);
  }

  function touch<K extends keyof FormState>(k: K, v: FormState[K]) {
    markDirty();
    if (timer.current) clearTimeout(timer.current);
    setForm((prev) => {
      const next = { ...prev, [k]: v };

      if (k === "lmp") {
        next.edc = computeEDCFromLMP(String(v));
      }

      timer.current = setTimeout(
        () => flushDraft({ [k]: v } as Partial<FormState>),
        450
      );
      return next;
    });
  }

  async function commitToDb() {
    setError(null);
    setStatus("Saving…");
    setSaving(true);

    const validationError = validateObFields(form);
    if (validationError) {
      setStatus("");
      setSaving(false);

      setError(validationError);
      setResultKind("error");
      setResultTitle("Invalid input");
      setResultMsg(validationError);
      setResultOpen(true);

      setTimeout(() => setError(null), 2000);
      return;
    }

    const normalized = normalizeObFieldsForSave(form);

    try {
const gtpalString = `T${normalized.gtpal_t} P${normalized.gtpal_p} A${normalized.gtpal_a} L${normalized.gtpal_l}`;

      const payload = {
ob_g: normalized.ob_g,
ob_p: normalized.ob_p,
ob_gtpal: gtpalString,
        lmp: form.lmp,
        edc: form.edc,
        risk_a_date: form.risk_a_date || null,
        risk_b_date: form.risk_b_date || null,
        risk_c_date: form.risk_c_date || null,
        risk_d_date: form.risk_d_date || null,
        risk_e_date: form.risk_e_date || null,
        risk_a_flag: !!form.risk_a_flag,
        risk_b_flag: !!form.risk_b_flag,
        risk_c_flag: !!form.risk_c_flag,
        risk_d_flag: !!form.risk_d_flag,
        risk_e_flag: !!form.risk_e_flag,
      };

      await postNested(URL, "itr", payload);

      await new Promise<void>((resolve) =>
        router.get(window.location.pathname + window.location.search, {}, {
          only: ["itr"],
          preserveScroll: true,
          preserveState: true,
          replace: true,
          onSuccess: () => resolve(),
          onError: () => resolve(),
        })
      );

      clearDraft();
      setStatus("Saved ✓");
      setTimeout(() => setStatus(""), 900);

      dirtyRef.current = false;
      window.dispatchEvent(new CustomEvent("itr:saved"));

      setResultKind("success");
      setResultTitle("Saved successfully");
      setResultMsg("Pregnancy details have been updated.");
      setResultOpen(true);
    } catch (e: any) {
      setStatus("");
      setError(e?.message || "Save failed");

      setResultKind("error");
      setResultTitle("Save failed");
      setResultMsg(e?.message || "Please try again.");
      setResultOpen(true);

      setTimeout(() => setError(null), 1600);
    } finally {
      setSaving(false);
    }
  }

  const minDate = "1900-01-01";
  const today = new Date().toISOString().slice(0, 10);
  const farFuture = "2100-12-31";

  return (
    <div className="min-h-[100dvh] flex flex-col w-full max-w-full">
      <div className="mx-auto w-full max-w-screen-2xl px-2 sm:px-3 lg:px-4 flex-1 overflow-x-hidden">
        {/* Header + lock toggle */}
        <div className="mt-1 mb-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <h2 className="text-[17px] sm:text-[18px] font-semibold text-slate-900 tracking-tight">
                Pregnancy Details (ITR)
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span
                ref={statusRef}
                className="text-[11px] sm:text-[12px] text-slate-600"
                aria-live="polite"
              />
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setLocked((prev) => !prev)}
                  className={[
                    "inline-flex h-9 w-9 items-center justify-center border text-xs font-medium rounded-md",
                    locked
                      ? "bg-slate-100 border-slate-200 text-slate-600 bg-white shadow-sm"
                      : "text-white",
                  ].join(" ")}
                  style={locked ? undefined : { backgroundColor: TEAL, borderColor: TEAL }}
                  aria-pressed={!locked ? "true" : "false"}
                  title={locked ? "Click to enable editing" : "Click to lock"}
                >
                  {locked ? <IconLock className="h-4 w-4" /> : <IconUnlock className="h-4 w-4" />}
                </button>
              )}
            </div>
          </div>
          <div className="mt-1 h-px w-full bg-slate-200" />
        </div>

        {/* Locked banner */}
        {locked && (
          <div className="mt-3 mb-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs sm:text-[13px] text-slate-700">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-slate-600">
              <IconLock className="h-3 w-3" />
            </span>
            <p>
              Record is currently <span className="font-semibold">LOCKED</span>. Tap the square on the right to
              enable editing.
            </p>
          </div>
        )}

        {/* Error note */}
        <div
          ref={errorRef}
          style={{ display: "none" }}
          className="mx-2 sm:mx-3 mt-2 rounded-[4px] border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[12px] text-rose-700"
        />

        {/* Everything below dims + non-clickable when locked */}
        <div className={locked ? "opacity-50 transition-opacity" : "transition-opacity"}>
          <div className={locked ? "pointer-events-none" : ""}>
            <section className="rounded-md bg-white shadow-sm divide-y divide-slate-200 overflow-hidden">
              <form
                ref={formRef}
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (locked) return;

                  const emptyFields = getEmptyObHistoryFields(form);

if (emptyFields.length > 0) {
  const ok = await confirm({
    title: "Some OB/History fields are empty",
    message:
      `The following fields are empty and will be saved as 0:\n\n` +
      emptyFields.join(", ") +
      `\n\nDo you want to continue?`,
    confirmText: "Yes, save as 0",
    cancelText: "Review fields",
  });
  if (!ok) return;
} else {
  const ok = await confirm({
    title: "Save pregnancy details?",
    message: "Please confirm you want to save these ITR details.",
    confirmText: "Yes, save it",
    cancelText: "Cancel",
  });
  if (!ok) return;
}

await commitToDb();
                }}
                className="px-3 sm:px-4 py-3 space-y-5 text-[14px] leading-[1.45]"
              >
                {/* OB section */}
                <section className="space-y-3.5">
                  {/* OB dates */}
                  <div className="rounded-md border border-slate-200 bg-slate-50/40 px-3 py-3">
                    <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                      <div>
                        <p className="text-[10px] font-semibold tracking-[0.22em] text-slate-600 uppercase">
                          Obstetrics (OB)
                        </p>
                        <p className="text-[12px] text-slate-600">LMP and expected date of confinement.</p>
                      </div>
                      <p className="text-[10px] text-slate-500">* All fields in this section are required.</p>
                    </div>

                    <div className="grid gap-2.5 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.05fr)]">
                      <Field label="Last Menstrual Period (LMP) *">
                        <div className="flex items-center gap-1.5">
                          <TextInput
                            type="date"
                            className="h-9 text-[14px] flex-1"
                            min={minDate}
                            max={today}
                            value={form.lmp || ""}
                            disabled={locked}
                            onInput={(e: any) =>
                              touch("lmp", ((e.currentTarget as HTMLInputElement).value || "") as any)
                            }
                            aria-label="Last Menstrual Period"
                          />
                          <button
                            type="button"
                            disabled={locked}
                            onClick={() => touch("lmp", today as any)}
                            className="h-9 rounded-md border border-slate-300 bg-white px-2.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                          >
                            TODAY
                          </button>
                          <button
                            type="button"
                            disabled={locked || !form.lmp}
                            onClick={() => touch("lmp", "" as any)}
                            className="h-9 rounded-md border border-slate-300 bg-white px-2.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                          >
                            CLEAR
                          </button>
                        </div>
                      </Field>

                      <Field label="Expected Date of Confinement (EDC) *">
                        <div>
                          <TextInput
                            type="date"
                            className="h-9 text-[14px] w-full"
                            min={minDate}
                            max={farFuture}
                            value={form.edc || ""}
                            onInput={(e: any) =>
                              touch("edc", ((e.currentTarget as HTMLInputElement).value || "") as any)
                            }
                            aria-label="Expected Date of Confinement"
                            disabled={locked}
                          />
                          <p className="mt-0.5 text-[11px] text-slate-500">Auto: LMP + 9 months + 7 days.</p>
                        </div>
                      </Field>
                    </div>
                  </div>

                  {/* OB score & history */}
                  <div className="rounded-md border border-slate-200 px-3 py-3">
                    <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                      <p className="text-[10px] font-semibold tracking-[0.22em] text-slate-600 uppercase">
                        OB Score and History
                      </p>
                    </div>

                    <div className="grid gap-2.5 sm:grid-cols-7">
                      <Field label="G — Gravida *">
                        <ObNumberInput
                          value={form.ob_g}
                          locked={locked}
                          placeholder="0"
                          onValueChange={(v) => touch("ob_g", v as any)}
                        />
                      </Field>

                      <Field label="P — Para  *">
                        <ObNumberInput
                          value={form.ob_p}
                          locked={locked}
                          placeholder="0"
                          onValueChange={(v) => touch("ob_p", v as any)}
                        />
                      </Field>

                      <Field label="T — Term *">
                        <ObNumberInput
                          value={form.gtpal_t}
                          locked={locked}
                          placeholder="0"
                          onValueChange={(v) => touch("gtpal_t", v as any)}
                        />
                      </Field>

                      <Field label="P — Preterm *">
                        <ObNumberInput
                          value={form.gtpal_p}
                          locked={locked}
                          placeholder="0"
                          onValueChange={(v) => touch("gtpal_p", v as any)}
                        />
                      </Field>

                      <Field label="A — Abortions *">
                        <ObNumberInput
                          value={form.gtpal_a}
                          locked={locked}
                          placeholder="0"
                          onValueChange={(v) => touch("gtpal_a", v as any)}
                        />
                      </Field>

                      <Field label="L — Living *">
                        <ObNumberInput
                          value={form.gtpal_l}
                          locked={locked}
                          placeholder="0"
                          onValueChange={(v) => touch("gtpal_l", v as any)}
                        />
                      </Field>
                    </div>
                  </div>
                </section>

                {/* Risk Codes */}
                <div>
                  <div className="mb-1.5 flex items-baseline justify-between gap-2">
                    <div>
                      <div className="text-[13px] font-semibold text-slate-900">Risk Codes</div>
                      <p className="text-[12px] text-slate-600">
                        Add the date for any identified maternal risk factor. Once dated, the patient is marked as
                        high risk and in need of referral.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-2.5 md:grid-cols-2">
                    {(
                      [
                        [
                          "risk_a_flag",
                          "risk_a_date",
                          "Risk Code A",
                          "An age less than 18 or greater than 35, or very short stature.",
                        ],
                        [
                          "risk_b_flag",
                          "risk_b_date",
                          "Risk Code B",
                          "Previous obstetric complications (e.g., CS, stillbirth, PPH).",
                        ],
                        [
                          "risk_c_flag",
                          "risk_c_date",
                          "Risk Code C",
                          "Current pregnancy complications (e.g., PIH, GDM, multiple gestation).",
                        ],
                        ["risk_d_flag", "risk_d_date", "Risk Code D", "Danger signs or emergency conditions identified."],
                        ["risk_e_flag", "risk_e_date", "Risk Code E", "Other medical conditions (e.g., cardiac disease, TB)."],
                      ] as const
                    ).map(([flagK, dateK, title, desc]) => {
                      const dateValue = (form as any)[dateK] as string;
                      const hasRiskDate = !!dateValue;

                      return (
                        <fieldset
                          key={flagK}
                          className={[
                            "grid grid-cols-1 gap-1.5 rounded-[6px] px-2.5 py-2.5 border transition",
                            hasRiskDate ? "border-rose-500 bg-rose-50/60" : "border-slate-200 bg-white",
                          ].join(" ")}
                        >
                          <legend
                            className={[
                              "mb-0.5 text-[14px] font-semibold",
                              hasRiskDate ? "text-rose-700" : "text-slate-900",
                            ].join(" ")}
                          >
                            {title}
                          </legend>

                          <p className="text-[12px] text-slate-600">{desc}</p>

                          <div className="mt-1.5 flex flex-col gap-0.5">
                            <label
                              className={[
                                "text-[11px]",
                                hasRiskDate ? "text-rose-700" : "text-slate-600",
                              ].join(" ")}
                            >
                              Date noted
                            </label>

                            <div className="flex items-center gap-1.5">
                              <TextInput
                                type="date"
                                className={[
                                  "h-9 text-[13px] flex-1",
                                  hasRiskDate
                                    ? "border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500"
                                    : "",
                                ].join(" ")}
                                min={minDate}
                                max={today}
                                disabled={locked}
                                value={dateValue || ""}
                                onInput={(e: any) => {
                                  const v = ((e.currentTarget as HTMLInputElement).value || "") as any;
                                  touch(dateK as keyof FormState, v);
                                  touch(flagK as keyof FormState, (!!v) as any);
                                }}
                                aria-label="Date noted"
                              />

                              <button
                                type="button"
                                disabled={locked}
                                onClick={() => {
                                  touch(dateK as keyof FormState, today as any);
                                  touch(flagK as keyof FormState, true as any);
                                }}
                                className="h-9 rounded-md border border-slate-300 bg-white px-2.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                              >
                                TODAY
                              </button>

                              <button
                                type="button"
                                disabled={locked || !hasRiskDate}
                                onClick={() => {
                                  touch(dateK as keyof FormState, "" as any);
                                  touch(flagK as keyof FormState, false as any);
                                }}
                                className="h-9 rounded-md border border-rose-300 bg-white px-2.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                              >
                                CLEAR
                              </button>
                            </div>

                            {hasRiskDate && (
                              <div className="mt-2 rounded-md border border-rose-200 bg-rose-100 px-2.5 py-2">
                                <p className="text-[12px] font-semibold text-rose-700">
                                  Patient is at high risk and needs referral.
                                </p>
                              </div>
                            )}
                          </div>
                        </fieldset>
                      );
                    })}
                  </div>
                </div>

                <div className="h-12 sm:h-0" />
                <button type="submit" className="hidden" aria-hidden="true" />
              </form>
            </section>
          </div>
        </div>
      </div>

      {/* Sticky bottom actions */}
      <footer className="fixed bottom-0 inset-x-0 z-[10] pointer-events-none">
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
              onClick={() => !locked && formRef.current?.requestSubmit()}
              className="w-full sm:w-auto h-10 rounded-md bg-oh-teal px-5 text-[14px] text-white hover:bg-oh-tealDark disabled:opacity-60 inline-flex items-center justify-center gap-1.5"
              disabled={saving || locked}
            >
              <IconSave className="h-4 w-4" />
              {locked ? "Locked" : saving ? "Saving…" : "Save"}
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

/* ---------- Small numeric input (0–50) with live error + red glow ---------- */

function ObNumberInput({
  value,
  onValueChange,
  locked,
  placeholder,
}: {
  value: string;
  onValueChange: (v: string) => void;
  locked: boolean;
  placeholder?: string;
}) {
  const [localError, setLocalError] = React.useState<string | null>(null);

  const handleInput = (e: any) => {
    const raw: string = (e.currentTarget as HTMLInputElement).value ?? "";
    const digits = raw.replace(/[^\d]/g, "");
    const n = digits === "" ? NaN : Number(digits);

    if (digits && (!Number.isFinite(n) || n > 50)) setLocalError("Must be 0–50, numbers only.");
    else setLocalError(null);

    onValueChange(digits);
  };

  const borderClass = localError
    ? "border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500"
    : "border-slate-300 focus:border-oh-teal focus:ring-2 focus:ring-oh-teal";

  return (
    <div>
      <TextInput
        type="tel"
        inputMode="numeric"
        disabled={locked}
        value={value}
        onInput={handleInput}
        className={`h-9 text-[14px] w-full ${borderClass}`}
        placeholder={placeholder}
      />
      {localError && <p className="mt-0.5 text-[11px] text-rose-600">{localError}</p>}
    </div>
  );
} 