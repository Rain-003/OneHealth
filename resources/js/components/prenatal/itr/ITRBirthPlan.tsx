// resources/js/components/prenatal/itr/ITRBirthPlan.tsx
import * as React from "react";
import { usePage } from "@inertiajs/react";
import { Field, TextInput } from "./itr-shared";
import { PLAN_URL, Plan, postNestedWithExtras } from "./itr-api";
import { useConfirm } from "../../confirm-kit";

/* ───────── Result dialog ───────── */
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
  onClose: (source?: string) => void;
  kind: ResultKind;
  title: string;
  message?: string;
  autoHideMs?: number;
}) {
  React.useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => onClose("auto-hide"), autoHideMs);
    return () => clearTimeout(id);
  }, [open, autoHideMs, onClose]);

  const iconClass = kind === "success" ? "text-emerald-600" : "text-rose-600";
  const borderClass = kind === "success" ? "ring-emerald-200" : "ring-rose-200";

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
      <div className="absolute inset-0 grid place-items-center p-3 sm:p-4">
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
          <div className={["p-4 sm:p-5 rounded-2xl ring-1", borderClass].join(" ")}>
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
                <h2 id="result-title" className="text-base font-semibold text-slate-900">
                  {title}
                </h2>
                {message ? (
                  <p className="mt-1 text-sm text-slate-600">{message}</p>
                ) : null}
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                onClick={() => onClose("close-button")}
                className="h-11 rounded-md border border-slate-300 bg-white px-4 text-[15px] text-slate-700 hover:bg-slate-50"
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

/* ───────── Icons ───────── */
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

/* ───────── Form shape ───────── */
type Form = {
  plan_date: string;
  attending_personnel: string;
  planned_facility: string;
  planned_facility_is_philhealth: "" | "yes" | "no";
  distance_from_residence: string;
  estimated_cost: string;
  mode_of_payment: string;
  available_transport: string;
  companion_name: string;
  companion_address: string;
  companion_contact: string;
  family_companion_name: string;
  family_companion_relationship: string;
  family_companion_address: string;
  family_companion_contact: string;
  caretaker_name: string;
  caretaker_relationship: string;
  blood_type: string;
  blood_donor_1_name: string;
  blood_donor_1_address: string;
  blood_donor_2_name: string;
  blood_donor_2_address: string;
  emergency_contact_name: string;
  emergency_contact_address: string;
  emergency_contact_contact: string;
  maternal_hospital_1_name: string;
  maternal_hospital_1_address: string;
  maternal_hospital_2_name: string;
  maternal_hospital_2_address: string;
  signature_name: string;
};

/* ───────── Helpers ───────── */
const MAX_LEN = 255;
const TEAL = "#0F8A99";

const UPPER_EXCLUDE: (keyof Form)[] = [
  "plan_date",
  "planned_facility_is_philhealth",
  "mode_of_payment",
  "family_companion_relationship",
  "caretaker_relationship",
  "blood_type",
  "companion_contact",
  "family_companion_contact",
  "emergency_contact_contact",
];

const overLen = (v: string, max = MAX_LEN) => v.length > max;
const onlyDigits = (v: string) => v === "" || /^[0-9]+$/.test(v);

const phoneOk = (v: string) => {
  if (v === "") return true;
  const digits = v.replace(/\D/g, "");
  if (digits.length === 0) return false;
  return digits.length <= 11;
};

const hasNumber = (v: string) => /[0-9]/.test(v);
const digitsMax11 = (v: string) => v.replace(/\D/g, "").slice(0, 11);

const formatPhone = (digits: string) => {
  const d = digitsMax11(digits);
  if (!d) return "";
  if (d.length <= 4) return d;
  if (d.length <= 7) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return `${d.slice(0, 4)}-${d.slice(4, 7)}-${d.slice(7)}`;
};

const errorRingClass = (hasError: boolean) =>
  hasError
    ? "ring-2 ring-red-400 focus-visible:ring-red-500 focus-visible:ring-2"
    : "";

function todayYMD(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function normalizeStorageUrl(path?: string | null): string {
  if (!path) return "";
  const raw = String(path).trim();
  if (!raw) return "";
  if (/^data:image\//i.test(raw)) return raw;
  if (/^blob:/i.test(raw)) return "";

  const cleaned = raw
    .replace(/^https?:\/\/[^/]+/i, "")
    .replace(/^\/+/, "")
    .replace(/^storage\//i, "");

  return cleaned ? `/storage/${cleaned}` : "";
}

function isTransientPreviewUrl(value?: string | null): boolean {
  if (!value) return false;
  return /^blob:/i.test(String(value).trim());
}

function applyUppercaseToForm(form: Form): Form {
  const out: Form = { ...form };
  const outAny: any = out;

  (Object.keys(out) as (keyof Form)[]).forEach((key) => {
    if (UPPER_EXCLUDE.includes(key)) return;
    const val = outAny[key];
    if (typeof val === "string" && val) {
      outAny[key] = val.toUpperCase();
    }
  });

  return out;
}

const RELATIONSHIP_OPTIONS: readonly string[] = [
  "Spouse",
  "Partner",
  "Mother",
  "Father",
  "Parent",
  "Sibling",
  "Child",
  "Relative",
  "Friend",
  "Neighbor",
  "Caregiver",
  "Others",
];

export default function ITRBirthPlan({
  plan,
  patientId,
}: {
  plan: Plan | null;
  patientId: number;
}) {
  const pageProps = usePage<any>().props;
  const { canEdit = false } = pageProps;
  const patientFullName = String(
    pageProps?.patient?.full_name ??
      pageProps?.patient?.name ??
      pageProps?.record?.patient?.full_name ??
      pageProps?.record?.patient?.name ??
      pageProps?.patientName ??
      ""
  )
    .trim()
    .toUpperCase();

  const confirm = useConfirm();
  const formRef = React.useRef<HTMLFormElement>(null);
  const FORM_ID = `itr-birthplan-form-${patientId}`;

  const [locked, setLocked] = React.useState(true);

  const LS_KEY = (pid: number | string) => `itr_draft:${pid}`;
  const PLAN_KEYS: (keyof Form)[] = [
    "plan_date",
    "attending_personnel",
    "planned_facility",
    "planned_facility_is_philhealth",
    "distance_from_residence",
    "estimated_cost",
    "mode_of_payment",
    "available_transport",
    "companion_name",
    "companion_address",
    "companion_contact",
    "family_companion_name",
    "family_companion_relationship",
    "family_companion_address",
    "family_companion_contact",
    "caretaker_name",
    "caretaker_relationship",
    "blood_type",
    "blood_donor_1_name",
    "blood_donor_1_address",
    "blood_donor_2_name",
    "blood_donor_2_address",
    "emergency_contact_name",
    "emergency_contact_address",
    "emergency_contact_contact",
    "maternal_hospital_1_name",
    "maternal_hospital_1_address",
    "maternal_hospital_2_name",
    "maternal_hospital_2_address",
    "signature_name",
  ];

  const readDraft = React.useCallback(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(LS_KEY(patientId)) || "{}");
      if (parsed && typeof parsed === "object") {
        delete (parsed as any).signature_mode;
        delete (parsed as any).signature_data;
        delete (parsed as any).signature_preview;
      }
      return parsed;
    } catch {
      return {};
    }
  }, [patientId]);

  const writeDraft = React.useCallback(
    (vals: Partial<Form>) => {
      try {
        const prev = readDraft();
        localStorage.setItem(LS_KEY(patientId), JSON.stringify({ ...prev, ...vals }));
      } catch {}
    },
    [patientId, readDraft]
  );

  const clearDraft = React.useCallback(() => {
    try {
      const prev = readDraft();
      PLAN_KEYS.forEach((k) => {
        delete (prev as any)[k];
      });
      localStorage.setItem(LS_KEY(patientId), JSON.stringify(prev));
    } catch {}
  }, [patientId, readDraft]);

  const computeInitial = React.useCallback((): Form => {
    const anyPlan = (plan || {}) as any;
    const autoSignerName = patientFullName || String(anyPlan.signature_name ?? "").trim().toUpperCase();

    const base: Form = {
      plan_date: anyPlan.plan_date ?? "",
      attending_personnel: anyPlan.attending_personnel ?? anyPlan.attending ?? "",
      planned_facility: anyPlan.planned_facility ?? "",
      planned_facility_is_philhealth:
        anyPlan.planned_facility_is_philhealth === "1" ||
        anyPlan.planned_facility_is_philhealth === true ||
        anyPlan.philhealth_accredited === true
          ? "yes"
          : anyPlan.planned_facility_is_philhealth === "0" ||
            anyPlan.planned_facility_is_philhealth === false ||
            anyPlan.philhealth_accredited === false
          ? "no"
          : "",
      distance_from_residence:
        anyPlan.distance_from_residence ?? anyPlan.distance ?? "",
      estimated_cost: anyPlan.estimated_cost ?? "",
      mode_of_payment: anyPlan.mode_of_payment ?? anyPlan.payment_mode ?? "",
      available_transport: anyPlan.available_transport ?? anyPlan.transport ?? "",
      companion_name: anyPlan.companion_name ?? anyPlan.companion_1_name ?? "",
      companion_address: anyPlan.companion_address ?? "",
      companion_contact:
        anyPlan.companion_contact ?? anyPlan.companion_1_contact ?? "",
      family_companion_name:
        anyPlan.family_companion_name ?? anyPlan.companion_2_name ?? "",
      family_companion_relationship: anyPlan.family_companion_relationship ?? "",
      family_companion_address: anyPlan.family_companion_address ?? "",
      family_companion_contact:
        anyPlan.family_companion_contact ?? anyPlan.companion_2_contact ?? "",
      caretaker_name: anyPlan.caretaker_name ?? "",
      caretaker_relationship: anyPlan.caretaker_relationship ?? "",
      blood_type: anyPlan.blood_type ?? "",
      blood_donor_1_name: anyPlan.blood_donor_1_name ?? "",
      blood_donor_1_address: anyPlan.blood_donor_1_address ?? "",
      blood_donor_2_name: anyPlan.blood_donor_2_name ?? "",
      blood_donor_2_address: anyPlan.blood_donor_2_address ?? "",
      emergency_contact_name:
        anyPlan.emergency_contact_name ?? anyPlan.refer_to_name ?? "",
      emergency_contact_address:
        anyPlan.emergency_contact_address ?? anyPlan.refer_to_address ?? "",
      emergency_contact_contact:
        anyPlan.emergency_contact_contact ?? anyPlan.refer_to_contact ?? "",
      maternal_hospital_1_name: anyPlan.maternal_hospital_1_name ?? "",
      maternal_hospital_1_address: anyPlan.maternal_hospital_1_address ?? "",
      maternal_hospital_2_name: anyPlan.maternal_hospital_2_name ?? "",
      maternal_hospital_2_address: anyPlan.maternal_hospital_2_address ?? "",
      signature_name: autoSignerName,
    };

    const draft = readDraft();
    const merged: any = { ...base };

    PLAN_KEYS.forEach((k) => {
      const dv = (draft as any)[k];
      if (dv !== undefined && dv !== "") merged[k] = dv;
    });

    merged.signature_name = autoSignerName;

    return applyUppercaseToForm(merged as Form);
  }, [plan, readDraft, patientFullName]);

  const [form, setForm] = React.useState<Form>(computeInitial);

  React.useEffect(() => {
    setForm(computeInitial());
    dirtyRef.current = false;
  }, [computeInitial]);

  const dirtyRef = React.useRef(false);
  const markDirty = React.useCallback(() => {
    if (!dirtyRef.current) {
      dirtyRef.current = true;
      window.dispatchEvent(new CustomEvent("itr:dirty"));
    }
  }, []);

  React.useEffect(() => {
    if (!patientFullName) return;
    setForm((prev) => {
      if (prev.signature_name === patientFullName) return prev;
      writeDraft({ signature_name: patientFullName });
      return { ...prev, signature_name: patientFullName };
    });
  }, [patientFullName, writeDraft]);

  function touch<K extends keyof Form>(k: K, v: Form[K]) {
    if (locked) return;
    markDirty();
    setForm((prev) => {
      let nextValue = v;
      if (typeof v === "string" && !UPPER_EXCLUDE.includes(k)) {
        nextValue = (v.toUpperCase() as unknown) as Form[K];
      }
      const next = { ...prev, [k]: nextValue };
      writeDraft({ [k]: nextValue } as Partial<Form>);
      return next;
    });
  }

  const [saving, setSaving] = React.useState(false);
  const [resultOpen, setResultOpen] = React.useState(false);
  const [resultKind, setResultKind] = React.useState<ResultKind>("success");
  const [resultTitle, setResultTitle] = React.useState("");
  const [resultMsg, setResultMsg] = React.useState<string | undefined>();

  const doSave = async () => {
    setSaving(true);

    try {
      const planPayload = {
        ...form,
        signature_name: patientFullName || form.signature_name,
        planned_facility_is_philhealth:
          form.planned_facility_is_philhealth === "yes"
            ? "1"
            : form.planned_facility_is_philhealth === "no"
            ? "0"
            : "",
      };

      await postNestedWithExtras(
        PLAN_URL(patientId),
        "plan",
        planPayload,
        {}
      );

      dirtyRef.current = false;
      clearDraft();
      setForm((prev) => ({
        ...prev,
        signature_name: patientFullName || prev.signature_name,
      }));
      window.dispatchEvent(new CustomEvent("itr:saved"));

      setResultKind("success");
      setResultTitle("Saved successfully");
      setResultMsg("Birth & emergency plan has been updated.");
      setResultOpen(true);
    } catch (err: any) {
      setResultKind("error");
      setResultTitle("Save failed");
      setResultMsg(err?.message || "Please try again.");
      setResultOpen(true);
    } finally {
      setSaving(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (locked) return;

    const ok = await confirm({
      title: "Save Birth & Emergency Plan?",
      message: "Please confirm you want to save these details.",
      confirmText: "Yes, save it",
      cancelText: "Cancel",
      variant: "default",
    });
    if (!ok) return;
    void doSave();
  };

  const today = todayYMD();

  const errs = {
    attending_personnel:
      overLen(form.attending_personnel) || hasNumber(form.attending_personnel),

    planned_facility: overLen(form.planned_facility),
    distance_from_residence: overLen(form.distance_from_residence),
    estimated_cost:
      overLen(form.estimated_cost) || !onlyDigits(form.estimated_cost),
    mode_of_payment: overLen(form.mode_of_payment),
    available_transport: overLen(form.available_transport),

    companion_name:
      overLen(form.companion_name) || hasNumber(form.companion_name),
    companion_address: overLen(form.companion_address),
    companion_contact:
      overLen(form.companion_contact) || !phoneOk(form.companion_contact),

    family_companion_name:
      overLen(form.family_companion_name) || hasNumber(form.family_companion_name),
    family_companion_relationship: overLen(form.family_companion_relationship),
    family_companion_address: overLen(form.family_companion_address),
    family_companion_contact:
      overLen(form.family_companion_contact) || !phoneOk(form.family_companion_contact),

    caretaker_name: overLen(form.caretaker_name) || hasNumber(form.caretaker_name),
    caretaker_relationship: overLen(form.caretaker_relationship),

    blood_type: overLen(form.blood_type),
    blood_donor_1_name:
      overLen(form.blood_donor_1_name) || hasNumber(form.blood_donor_1_name),
    blood_donor_1_address: overLen(form.blood_donor_1_address),
    blood_donor_2_name:
      overLen(form.blood_donor_2_name) || hasNumber(form.blood_donor_2_name),
    blood_donor_2_address: overLen(form.blood_donor_2_address),

    emergency_contact_name:
      overLen(form.emergency_contact_name) || hasNumber(form.emergency_contact_name),
    emergency_contact_address: overLen(form.emergency_contact_address),
    emergency_contact_contact:
      overLen(form.emergency_contact_contact) || !phoneOk(form.emergency_contact_contact),

    maternal_hospital_1_name: overLen(form.maternal_hospital_1_name),
    maternal_hospital_1_address: overLen(form.maternal_hospital_1_address),
    maternal_hospital_2_name: overLen(form.maternal_hospital_2_name),
    maternal_hospital_2_address: overLen(form.maternal_hospital_2_address),

    signature_name: overLen(form.signature_name) || hasNumber(form.signature_name),
  } as const;

  const hasAnyError = Object.values(errs).some(Boolean);

  const handlePhoneInput =
    (
      key:
        | "companion_contact"
        | "family_companion_contact"
        | "emergency_contact_contact"
    ) =>
    (e: React.FormEvent<HTMLInputElement>) => {
      const raw = e.currentTarget.value || "";
      const digits = digitsMax11(raw);
      touch(key, digits as any);
    };

  return (
    <div className="min-h-[100dvh] flex w-full max-w-full flex-col overflow-x-hidden bg-white text-[14px] leading-[1.45]">
      <div className="mx-auto w-full max-w-screen-2xl flex-1 overflow-x-hidden px-3 pb-24 sm:px-4 lg:px-6">
        <form
          id={FORM_ID}
          ref={formRef}
          onSubmit={onSubmit}
          className="space-y-5 py-3 sm:py-4"
        >
          <div className="grid min-w-0 grid-cols-1 gap-3 border-b border-slate-100 pb-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
            <div className="min-w-0">
              <h2 className="break-words text-[16px] font-semibold leading-snug tracking-tight text-slate-900 sm:text-[18px]">
                BIRTH &amp; EMERGENCY PLAN
              </h2>
              <p className="mt-1 max-w-3xl text-[12px] leading-relaxed text-slate-600 sm:text-[13px] md:text-sm">
                I KNOW THAT ANY COMPLICATION CAN DEVELOP AT ANY TIME IN THE
                COURSE OF THIS PREGNANCY, CHILDBIRTH AND AFTER BIRTH. I KNOW
                THAT THE BEST PLACE TO DELIVER MY BABY IS IN THE HEALTH
                FACILITY.
              </p>
            </div>
            {canEdit && (
              <button
                type="button"
                onClick={() => setLocked((prev) => !prev)}
                aria-pressed={!locked}
                className={[
                  "inline-flex h-11 w-full min-w-0 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold shadow-sm transition sm:w-auto sm:min-w-[112px]",
                  "focus:outline-none focus:ring-2 focus:ring-[#0F8A99]/30",
                  locked
                    ? "border-[#0F8A99] bg-[#0F8A99] text-white hover:bg-[#0d7481]"
                    : "border-[#0F8A99] bg-white text-[#0F8A99] hover:bg-[#0F8A99]/5",
                ].join(" ")}
                title={locked ? "Record is locked" : "Editing enabled"}
              >
                {locked ? <IconLock className="h-4 w-4 shrink-0" /> : <IconUnlock className="h-4 w-4 shrink-0" />}
                <span className="truncate">{locked ? "Locked" : "Editing"}</span>
              </button>
            )}
          </div>

          {locked && (
            <div className="mt-3 mb-2 flex flex-row items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-[11px] text-slate-700 ring-1 ring-slate-100 sm:text-[13px]">
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                <IconLock className="h-3 w-3" />
              </span>
              <p className="leading-snug">
                Record is currently <span className="font-semibold">LOCKED</span>. Tap the square
                on the right to enable editing.
              </p>
            </div>
          )}

            <div className={locked ? "opacity-50 transition-opacity" : "transition-opacity"}>
              <div className={locked ? "pointer-events-none" : ""}>
                <section className="mt-3 space-y-3">
                  <div className="grid gap-3 sm:max-w-sm">
                    <Field label="DATE">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <input
                          type="date"
                          value={form.plan_date || ""}
                          max={today}
                          onChange={(e) => touch("plan_date", e.currentTarget.value)}
                          disabled={locked}
                          className={[
                            "block w-full rounded-md border border-slate-300 bg-white px-3 text-[13px] sm:text-sm text-slate-900 shadow-sm",
                            "h-11",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F8A99] focus-visible:ring-offset-0",
                          ].join(" ")}
                        />
                        <button
                          type="button"
                          onClick={() => !locked && touch("plan_date", today)}
                          className="w-full sm:w-auto shrink-0 h-11 sm:h-11 rounded-md border border-slate-300 bg-slate-50 px-3 text-[11px] sm:text-xs font-medium text-slate-700 hover:bg-slate-100"
                          disabled={locked}
                        >
                          TODAY
                        </button>
                      </div>
                    </Field>
                  </div>
                </section>

                <section className="space-y-2">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="ATTENDING PERSONNEL">
                      <TextInput
                        value={form.attending_personnel}
                        onInput={(e: any) => touch("attending_personnel", e.target.value)}
                        disabled={locked}
                        className={["h-11", errorRingClass(errs.attending_personnel)].join(" ")}
                        placeholder="NAME OF DOCTOR / NURSE / MIDWIFE"
                      />
                      <p className="mt-1 text-[11px] text-slate-500">
                        NAME OF DOCTOR, NURSE OR MIDWIFE.
                      </p>
                      {errs.attending_personnel && (
                        <p className="mt-1 text-[11px] sm:text-xs text-red-600">
                          MAXIMUM OF {MAX_LEN} CHARACTERS ONLY. NAMES MUST NOT CONTAIN NUMBERS.
                        </p>
                      )}
                    </Field>
                  </div>
                </section>

                <section className="space-y-3">
                  <Field label="PLANNED FACILITY OF DELIVERY">
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3">
                        <TextInput
                          value={form.planned_facility}
                          onInput={(e: any) => touch("planned_facility", e.target.value)}
                          disabled={locked}
                          className={["h-11 flex-1 min-w-0", errorRingClass(errs.planned_facility)].join(" ")}
                          placeholder="LOCATION OF HOSPITAL / HEALTH CENTER / CLINIC"
                        />

                        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                          <span className="text-[11px] sm:text-xs text-slate-600 leading-snug">
                            Is this facility PhilHealth-accredited?
                          </span>
                          <div className="grid grid-cols-2 rounded-md bg-slate-50 p-1 ring-1 ring-slate-100 sm:inline-grid">
                            <button
                              type="button"
                              onClick={() => !locked && touch("planned_facility_is_philhealth", "yes")}
                              className={[
                                "h-11 px-4 text-[12px] sm:text-[13px] rounded-md transition-colors",
                                form.planned_facility_is_philhealth === "yes"
                                  ? "text-white"
                                  : "text-slate-700 hover:bg-slate-100",
                              ].join(" ")}
                              style={
                                form.planned_facility_is_philhealth === "yes"
                                  ? { backgroundColor: TEAL }
                                  : undefined
                              }
                              disabled={locked}
                            >
                              YES
                            </button>
                            <button
                              type="button"
                              onClick={() => !locked && touch("planned_facility_is_philhealth", "no")}
                              className={[
                                "h-11 px-4 text-[12px] sm:text-[13px] rounded-md transition-colors",
                                form.planned_facility_is_philhealth === "no"
                                  ? "text-white"
                                  : "text-slate-700 hover:bg-slate-100",
                              ].join(" ")}
                              style={
                                form.planned_facility_is_philhealth === "no"
                                  ? { backgroundColor: TEAL }
                                  : undefined
                              }
                              disabled={locked}
                            >
                              NO
                            </button>
                          </div>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-500">
                        NAME OR LOCATION OF THE HOSPITAL, HEALTH CENTER OR CLINIC.
                      </p>

                      {errs.planned_facility && (
                        <p className="mt-1 text-[11px] sm:text-xs text-red-600">
                          MAXIMUM OF {MAX_LEN} CHARACTERS ONLY.
                        </p>
                      )}
                    </div>
                  </Field>
                </section>

                <section className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="DISTANCE FROM RESIDENCE">
                      <TextInput
                        value={form.distance_from_residence}
                        onInput={(e: any) => touch("distance_from_residence", e.target.value)}
                        disabled={locked}
                        className={["h-11", errorRingClass(errs.distance_from_residence)].join(" ")}
                        placeholder="E.G. 5 KM / 20 MINUTES"
                      />
                      {errs.distance_from_residence && (
                        <p className="mt-1 text-[11px] sm:text-xs text-red-600">
                          MAXIMUM OF {MAX_LEN} CHARACTERS ONLY.
                        </p>
                      )}
                    </Field>
                    <Field label="ESTIMATED COST (NUMBERS ONLY)">
                      <TextInput
                        value={form.estimated_cost}
                        onInput={(e: any) => touch("estimated_cost", e.target.value)}
                        disabled={locked}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className={["h-11", errorRingClass(errs.estimated_cost)].join(" ")}
                        placeholder="E.G. 3000"
                      />
                      {errs.estimated_cost && (
                        <p className="mt-1 text-[11px] sm:text-xs text-red-600">
                          NUMBERS ONLY, MAXIMUM OF {MAX_LEN} CHARACTERS.
                        </p>
                      )}
                    </Field>
                  </div>
                </section>

                <section className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="MODE OF PAYMENT">
                      <select
                        value={form.mode_of_payment}
                        onChange={(e) => touch("mode_of_payment", e.target.value)}
                        disabled={locked}
                        className={[
                          "block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] sm:text-sm text-slate-900 shadow-sm h-11",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F8A99] focus-visible:ring-offset-0",
                          errorRingClass(errs.mode_of_payment),
                        ].join(" ")}
                      >
                        <option value="">SELECT MODE OF PAYMENT</option>
                        <option value="cash">CASH</option>
                        <option value="philhealth">PHILHEALTH</option>
                        <option value="hmo">HMO / HEALTH CARD</option>
                        <option value="insurance">PRIVATE INSURANCE</option>
                        <option value="others">OTHERS</option>
                      </select>
                      {errs.mode_of_payment && (
                        <p className="mt-1 text-[11px] sm:text-xs text-red-600">
                          MAXIMUM OF {MAX_LEN} CHARACTERS ONLY.
                        </p>
                      )}
                    </Field>
                    <Field label="AVAILABLE TRANSPORT">
                      <TextInput
                        value={form.available_transport}
                        onInput={(e: any) => touch("available_transport", e.target.value)}
                        disabled={locked}
                        className={["h-11", errorRingClass(errs.available_transport)].join(" ")}
                        placeholder="E.G. TRICYCLE, CAR, AMBULANCE"
                      />
                      {errs.available_transport && (
                        <p className="mt-1 text-[11px] sm:text-xs text-red-600">
                          MAXIMUM OF {MAX_LEN} CHARACTERS ONLY.
                        </p>
                      )}
                    </Field>
                  </div>
                </section>

                <div className="my-5 h-px w-full bg-slate-100" />

                <section className="space-y-2">
                  <h3 className="text-sm sm:text-[17px] font-semibold text-[#203D7A]">
                    COMPANION DETAILS
                  </h3>

                  <div className="grid gap-3 md:grid-cols-3">
                    <Field label="COMPANION NAME">
                      <TextInput
                        value={form.companion_name}
                        onInput={(e: any) => touch("companion_name", e.target.value)}
                        disabled={locked}
                        className={["h-11", errorRingClass(errs.companion_name)].join(" ")}
                      />
                      {errs.companion_name && (
                        <p className="mt-1 text-[11px] sm:text-xs text-red-600">
                          MAXIMUM OF {MAX_LEN} CHARACTERS ONLY. NAMES MUST NOT CONTAIN NUMBERS.
                        </p>
                      )}
                    </Field>
                    <Field label="COMPANION ADDRESS">
                      <TextInput
                        value={form.companion_address}
                        onInput={(e: any) => touch("companion_address", e.target.value)}
                        disabled={locked}
                        className={["h-11", errorRingClass(errs.companion_address)].join(" ")}
                      />
                      {errs.companion_address && (
                        <p className="mt-1 text-[11px] sm:text-xs text-red-600">
                          MAXIMUM OF {MAX_LEN} CHARACTERS ONLY.
                        </p>
                      )}
                    </Field>
                    <Field label="COMPANION CONTACT NUMBER">
                      <TextInput
                        value={formatPhone(form.companion_contact)}
                        onInput={handlePhoneInput("companion_contact")}
                        disabled={locked}
                        inputMode="numeric"
                        className={["h-11", errorRingClass(errs.companion_contact)].join(" ")}
                        placeholder="XXXX-XXX-XXXX"
                      />
                      {errs.companion_contact && (
                        <p className="mt-1 text-[11px] sm:text-xs text-red-600">
                          NUMBERS ONLY, UP TO 11 DIGITS (FORMAT XXXX-XXX-XXXX).
                        </p>
                      )}
                    </Field>
                  </div>

                  <div className="grid gap-3 md:grid-cols-4">
                    <Field label="FAMILY COMPANION NAME">
                      <TextInput
                        value={form.family_companion_name}
                        onInput={(e: any) => touch("family_companion_name", e.target.value)}
                        disabled={locked}
                        className={["h-11", errorRingClass(errs.family_companion_name)].join(" ")}
                      />
                      {errs.family_companion_name && (
                        <p className="mt-1 text-[11px] sm:text-xs text-red-600">
                          MAXIMUM OF {MAX_LEN} CHARACTERS ONLY. NAMES MUST NOT CONTAIN NUMBERS.
                        </p>
                      )}
                    </Field>

                    <Field label="RELATIONSHIP WITH PATIENT">
                      <select
                        value={form.family_companion_relationship}
                        onChange={(e) => touch("family_companion_relationship", e.target.value)}
                        disabled={locked}
                        className={[
                          "block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] sm:text-sm text-slate-900 shadow-sm h-11",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F8A99] focus-visible:ring-offset-0",
                          errorRingClass(errs.family_companion_relationship),
                        ].join(" ")}
                      >
                        <option value="">SELECT RELATIONSHIP</option>
                        {RELATIONSHIP_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt.toUpperCase()}
                          </option>
                        ))}
                      </select>
                      {errs.family_companion_relationship && (
                        <p className="mt-1 text-[11px] sm:text-xs text-red-600">
                          MAXIMUM OF {MAX_LEN} CHARACTERS ONLY.
                        </p>
                      )}
                    </Field>

                    <Field label="FAMILY COMPANION ADDRESS">
                      <TextInput
                        value={form.family_companion_address}
                        onInput={(e: any) => touch("family_companion_address", e.target.value)}
                        disabled={locked}
                        className={["h-11", errorRingClass(errs.family_companion_address)].join(" ")}
                      />
                      {errs.family_companion_address && (
                        <p className="mt-1 text-[11px] sm:text-xs text-red-600">
                          MAXIMUM OF {MAX_LEN} CHARACTERS ONLY.
                        </p>
                      )}
                    </Field>

                    <Field label="FAMILY COMPANION CONTACT NUMBER">
                      <TextInput
                        value={formatPhone(form.family_companion_contact)}
                        onInput={handlePhoneInput("family_companion_contact")}
                        disabled={locked}
                        inputMode="numeric"
                        className={["h-11", errorRingClass(errs.family_companion_contact)].join(" ")}
                        placeholder="XXXX-XXX-XXXX"
                      />
                      {errs.family_companion_contact && (
                        <p className="mt-1 text-[11px] sm:text-xs text-red-600">
                          NUMBERS ONLY, UP TO 11 DIGITS (FORMAT XXXX-XXX-XXXX).
                        </p>
                      )}
                    </Field>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="CARETAKER NAME">
                      <TextInput
                        value={form.caretaker_name}
                        onInput={(e: any) => touch("caretaker_name", e.target.value)}
                        disabled={locked}
                        className={["h-11", errorRingClass(errs.caretaker_name)].join(" ")}
                      />
                      {errs.caretaker_name && (
                        <p className="mt-1 text-[11px] sm:text-xs text-red-600">
                          MAXIMUM OF {MAX_LEN} CHARACTERS ONLY. NAMES MUST NOT CONTAIN NUMBERS.
                        </p>
                      )}
                    </Field>
                    <Field label="CARETAKER RELATIONSHIP TO THE PATIENT">
                      <select
                        value={form.caretaker_relationship}
                        onChange={(e) => touch("caretaker_relationship", e.target.value)}
                        disabled={locked}
                        className={[
                          "block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] sm:text-sm text-slate-900 shadow-sm h-11",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F8A99] focus-visible:ring-offset-0",
                          errorRingClass(errs.caretaker_relationship),
                        ].join(" ")}
                      >
                        <option value="">SELECT RELATIONSHIP</option>
                        {RELATIONSHIP_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt.toUpperCase()}
                          </option>
                        ))}
                      </select>
                      {errs.caretaker_relationship && (
                        <p className="mt-1 text-[11px] sm:text-xs text-red-600">
                          MAXIMUM OF {MAX_LEN} CHARACTERS ONLY.
                        </p>
                      )}
                    </Field>
                  </div>
                </section>

                <div className="my-5 h-px w-full bg-slate-100" />

                <section className="space-y-4">
                  <h3 className="text-sm sm:text-[17px] font-semibold text-[#203D7A]">
                    BLOOD TRANSFUSION DETAILS
                  </h3>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="BLOOD TYPE">
                      <select
                        value={form.blood_type}
                        onChange={(e) => touch("blood_type", e.target.value)}
                        disabled={locked}
                        className={[
                          "block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] sm:text-sm text-slate-900 shadow-sm h-11",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F8A99] focus-visible:ring-offset-0",
                          errorRingClass(errs.blood_type),
                        ].join(" ")}
                      >
                        <option value="">SELECT BLOOD TYPE</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                      </select>
                      {errs.blood_type && (
                        <p className="mt-1 text-[11px] sm:text-xs text-red-600">
                          MAXIMUM OF {MAX_LEN} CHARACTERS ONLY.
                        </p>
                      )}
                    </Field>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="BLOOD DONOR 1 NAME">
                      <TextInput
                        value={form.blood_donor_1_name}
                        onInput={(e: any) => touch("blood_donor_1_name", e.target.value)}
                        disabled={locked}
                        className={["h-11", errorRingClass(errs.blood_donor_1_name)].join(" ")}
                      />
                      {errs.blood_donor_1_name && (
                        <p className="mt-1 text-[11px] sm:text-xs text-red-600">
                          MAXIMUM OF {MAX_LEN} CHARACTERS ONLY. NAMES MUST NOT CONTAIN NUMBERS.
                        </p>
                      )}
                    </Field>
                    <Field label="BLOOD DONOR 1 ADDRESS">
                      <TextInput
                        value={form.blood_donor_1_address}
                        onInput={(e: any) => touch("blood_donor_1_address", e.target.value)}
                        disabled={locked}
                        className={["h-11", errorRingClass(errs.blood_donor_1_address)].join(" ")}
                      />
                      {errs.blood_donor_1_address && (
                        <p className="mt-1 text-[11px] sm:text-xs text-red-600">
                          MAXIMUM OF {MAX_LEN} CHARACTERS ONLY.
                        </p>
                      )}
                    </Field>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="BLOOD DONOR 2 NAME">
                      <TextInput
                        value={form.blood_donor_2_name}
                        onInput={(e: any) => touch("blood_donor_2_name", e.target.value)}
                        disabled={locked}
                        className={["h-11", errorRingClass(errs.blood_donor_2_name)].join(" ")}
                      />
                      {errs.blood_donor_2_name && (
                        <p className="mt-1 text-[11px] sm:text-xs text-red-600">
                          MAXIMUM OF {MAX_LEN} CHARACTERS ONLY. NAMES MUST NOT CONTAIN NUMBERS.
                        </p>
                      )}
                    </Field>
                    <Field label="BLOOD DONOR 2 ADDRESS">
                      <TextInput
                        value={form.blood_donor_2_address}
                        onInput={(e: any) => touch("blood_donor_2_address", e.target.value)}
                        disabled={locked}
                        className={["h-11", errorRingClass(errs.blood_donor_2_address)].join(" ")}
                      />
                      {errs.blood_donor_2_address && (
                        <p className="mt-1 text-[11px] sm:text-xs text-red-600">
                          MAXIMUM OF {MAX_LEN} CHARACTERS ONLY.
                        </p>
                      )}
                    </Field>
                  </div>
                </section>

                <div className="my-5 h-px w-full bg-slate-100" />

                <section className="space-y-4">
                  <h3 className="text-sm sm:text-[17px] font-semibold text-[#203D7A]">
                    COMPLICATION EMERGENCY DETAILS
                  </h3>

                  <div className="grid gap-3 md:grid-cols-3">
                    <Field label="CONTACT PERSON NAME">
                      <TextInput
                        value={form.emergency_contact_name}
                        onInput={(e: any) => touch("emergency_contact_name", e.target.value)}
                        disabled={locked}
                        className={["h-11", errorRingClass(errs.emergency_contact_name)].join(" ")}
                      />
                      {errs.emergency_contact_name && (
                        <p className="mt-1 text-[11px] sm:text-xs text-red-600">
                          MAXIMUM OF {MAX_LEN} CHARACTERS ONLY. NAMES MUST NOT CONTAIN NUMBERS.
                        </p>
                      )}
                    </Field>

                    <Field label="CONTACT PERSON ADDRESS">
                      <TextInput
                        value={form.emergency_contact_address}
                        onInput={(e: any) => touch("emergency_contact_address", e.target.value)}
                        disabled={locked}
                        className={["h-11", errorRingClass(errs.emergency_contact_address)].join(" ")}
                      />
                      {errs.emergency_contact_address && (
                        <p className="mt-1 text-[11px] sm:text-xs text-red-600">
                          MAXIMUM OF {MAX_LEN} CHARACTERS ONLY.
                        </p>
                      )}
                    </Field>

                    <Field label="CONTACT PERSON CONTACT NUMBER">
                      <TextInput
                        value={formatPhone(form.emergency_contact_contact)}
                        onInput={handlePhoneInput("emergency_contact_contact")}
                        disabled={locked}
                        inputMode="numeric"
                        className={["h-11", errorRingClass(errs.emergency_contact_contact)].join(" ")}
                        placeholder="XXXX-XXX-XXXX"
                      />
                      {errs.emergency_contact_contact && (
                        <p className="mt-1 text-[11px] sm:text-xs text-red-600">
                          NUMBERS ONLY, UP TO 11 DIGITS (FORMAT XXXX-XXX-XXXX).
                        </p>
                      )}
                    </Field>
                  </div>
                </section>

                <div className="my-5 h-px w-full bg-slate-100" />

                <section className="space-y-4">
                  <h3 className="text-sm sm:text-[17px] font-semibold text-[#203D7A]">
                    NEAREST MATERNAL AND NEWBORN HEALTH FACILITY TO MY RESIDENCE
                  </h3>

                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="MATERNAL HOSPITAL 1 NAME">
                      <TextInput
                        value={form.maternal_hospital_1_name}
                        onInput={(e: any) => touch("maternal_hospital_1_name", e.target.value)}
                        disabled={locked}
                        className={["h-11", errorRingClass(errs.maternal_hospital_1_name)].join(" ")}
                      />
                      {errs.maternal_hospital_1_name && (
                        <p className="mt-1 text-[11px] sm:text-xs text-red-600">
                          MAXIMUM OF {MAX_LEN} CHARACTERS ONLY.
                        </p>
                      )}
                    </Field>
                    <Field label="MATERNAL HOSPITAL 1 ADDRESS">
                      <TextInput
                        value={form.maternal_hospital_1_address}
                        onInput={(e: any) => touch("maternal_hospital_1_address", e.target.value)}
                        disabled={locked}
                        className={["h-11", errorRingClass(errs.maternal_hospital_1_address)].join(" ")}
                      />
                      {errs.maternal_hospital_1_address && (
                        <p className="mt-1 text-[11px] sm:text-xs text-red-600">
                          MAXIMUM OF {MAX_LEN} CHARACTERS ONLY.
                        </p>
                      )}
                    </Field>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="MATERNAL HOSPITAL 2 NAME">
                      <TextInput
                        value={form.maternal_hospital_2_name}
                        onInput={(e: any) => touch("maternal_hospital_2_name", e.target.value)}
                        disabled={locked}
                        className={["h-11", errorRingClass(errs.maternal_hospital_2_name)].join(" ")}
                      />
                      {errs.maternal_hospital_2_name && (
                        <p className="mt-1 text-[11px] sm:text-xs text-red-600">
                          MAXIMUM OF {MAX_LEN} CHARACTERS ONLY.
                        </p>
                      )}
                    </Field>
                    <Field label="MATERNAL HOSPITAL 2 ADDRESS">
                      <TextInput
                        value={form.maternal_hospital_2_address}
                        onInput={(e: any) => touch("maternal_hospital_2_address", e.target.value)}
                        disabled={locked}
                        className={["h-11", errorRingClass(errs.maternal_hospital_2_address)].join(" ")}
                      />
                      {errs.maternal_hospital_2_address && (
                        <p className="mt-1 text-[11px] sm:text-xs text-red-600">
                          MAXIMUM OF {MAX_LEN} CHARACTERS ONLY.
                        </p>
                      )}
                    </Field>
                  </div>
                </section>

                <div className="my-5 h-px w-full bg-slate-100" />

                <section className="space-y-4">
                  <h3 className="text-sm sm:text-[17px] font-semibold text-[#203D7A]">
                    SIGNER NAME
                  </h3>

                  <div className="rounded-xl bg-slate-50/80 p-3 ring-1 ring-slate-100 sm:p-4">
                    <Field label="SIGNER NAME">
                      <TextInput
                        value={form.signature_name}
                        readOnly
                        disabled
                        className="h-11 bg-white font-semibold text-slate-900"
                        placeholder="PATIENT NAME"
                      />
                    </Field>

                    <p className="mt-2 text-[11px] leading-relaxed text-slate-500 sm:text-xs">
                      The signer name is automatically filled using the patient name. Signature upload/drawing has been removed.
                    </p>
                  </div>
                </section>
              </div>
            </div>

          <div className="h-20" />
        </form>
      </div>

      <footer className="fixed bottom-0 inset-x-0 z-[30] pointer-events-none">
        <div className="mx-auto w-full max-w-screen-2xl px-2 sm:px-4 lg:px-8 flex justify-end">
          <div
            className="
              mb-0.5
              inline-flex
              w-full sm:w-auto
              rounded-t-md ring-1 ring-slate-100
              bg-white/95 backdrop-blur shadow-sm
              px-2 sm:px-4 py-2
              pointer-events-auto
            "
          >
            <button
              type="button"
              onClick={() =>
                !locked &&
                !saving &&
                !hasAnyError &&
                formRef.current?.requestSubmit()
              }
              className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-md bg-oh-teal px-4 text-[13px] font-semibold text-white hover:bg-oh-tealDark disabled:opacity-60 sm:w-auto sm:px-5 sm:text-[14px]"
              disabled={saving || locked || hasAnyError}
            >
              <IconSave className="h-4 w-4" />
              {locked ? "LOCKED" : saving ? "SAVING…" : "SAVE"}
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