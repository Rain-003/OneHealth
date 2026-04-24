// resources/js/components/add-patient-wizard.tsx
import * as React from "react";
import { useForm, usePage } from "@inertiajs/react";
import { useConfirm } from "@/components/confirm-kit";

// Icons
import SyringeIcon from "/public/build/assets/syringe-vaccine-svgrepo-com.svg";
import NewbornIcon from "/public/build/assets/pregnant_icon.svg";

type PatientType = "immunization" | "pregnancy";

function getInitialFormData() {
  return {
    patient_type: "" as "" | PatientType,

    // patient name
    first_name: "",
    middle_name: "",
    last_name: "",
    suffix: "",
    suffix_other: "",

    // shared
    birthdate: "",
    phone: "",
    barangay: "",
    address: "",
    address_province: "Cavite",
    address_city: "Silang",
    address_house_street: "",
    address_line2: "",
    address_postal_code: "",

    // immunization - updated
    date_of_registration: "",
    family_no: "",
    date_referred_nb_screening: "",
    date_nbs_done: "",
    place_of_birth: "",
    age: "",
    child_height_cm: "",
    birth_weight_kg: "",
    sex: "",
    cpab: "",
    delivery_type: "",
    mother_last_name: "",
    mother_given_name: "",
    mother_middle_name: "",
    father_name: "",
    tt_status_mother: "",
    tt_status_date: "",
    health_center: "",

    // pregnancy
    family_serial_number: "",
    philhealth_no: "",
    height_cm: "" as string | number,
    civil_status: "",

    // ux
    stay: false,
  };
}

type WizardPrefill = Partial<ReturnType<typeof getInitialFormData>> & {
  patient_type?: PatientType;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  prefill?: WizardPrefill | null;
};

/* ----------------------------------------------------------------------------
   SILANG, CAVITE — Complete barangay list
----------------------------------------------------------------------------- */
const SILANG_BARANGAYS: readonly string[] = [
  "Acacia",
  "Adlas",
  "Anahaw I",
  "Anahaw II",
  "Balite I",
  "Balite II",
  "Balubad",
  "Banaba",
  "Barangay I (Pob.)",
  "Barangay II (Pob.)",
  "Barangay III (Pob.)",
  "Barangay IV (Pob.)",
  "Barangay V (Pob.)",
  "Batas",
  "Biga I",
  "Biga II",
  "Biluso",
  "Bucal",
  "Buho",
  "Bulihan",
  "Cabangaan",
  "Carmen",
  "Hoyo",
  "Hukay",
  "Iba",
  "Inchican",
  "Ipil I",
  "Ipil II",
  "Kalubkob",
  "Kaong",
  "Lalaan I",
  "Lalaan II",
  "Litlit",
  "Lucsuhin",
  "Lumil",
  "Maguyam",
  "Malabag",
  "Malaking Tatyao",
  "Mataas Na Burol",
  "Munting Ilog",
  "Narra I",
  "Narra II",
  "Narra III",
  "Paligawan",
  "Pasong Langka",
  "Pooc I",
  "Pooc II",
  "Pulong Bunga",
  "Pulong Saging",
  "Puting Kahoy",
  "Sabutan",
  "San Miguel I",
  "San Miguel II",
  "San Vicente I",
  "San Vicente II",
  "Santol",
  "Tartaria",
  "Tibig",
  "Toledo",
  "Tubuan I",
  "Tubuan II",
  "Tubuan III",
  "Ulat",
  "Yakal",
];

const HEALTH_CENTER_FACILITIES: readonly string[] = [
  "ACACIA",
  "ANAHAW I",
  "ANAHAW II",
  "BANABA",
  "BULIHAN",
  "IPIL I",
  "IPIL II",
  "NARRA I",
  "NARRA II",
  "NARRA III",
  "YAKAL",
];

const PH_CIVIL_STATUSES: readonly string[] = [
  "SINGLE",
  "MARRIED",
  "WIDOWED",
  "SEPARATED",
  "DIVORCED",
  "ANNULED",
  "LEGALLY SEPARATED",
  "LIVE-IN",
  "OTHERS",
];

const BRGY_OTHER = "__BRGY_OTHER__";
const DRAFT_STORAGE_KEY = "add-patient-wizard-draft";

/* ----------------------------------------------------------------------------
   Shared control sizing
----------------------------------------------------------------------------- */
const CONTROL =
  "h-12 min-h-12 rounded-xl px-3 text-[15px] focus:outline-none";
const CONTROL_BORDER =
  "border border-slate-300 focus:ring-2 focus:ring-[#0F8A99]";
const CONTROL_ERROR =
  "border border-red-500 focus:ring-2 focus:ring-red-500";
const CONTROL_BTN =
  "h-12 min-h-12 rounded-xl px-3 text-[15px] font-medium";
const GRID_GAP = "gap-4";

/* ----------------------------------------------------------------------------
   Helpers
----------------------------------------------------------------------------- */
function dateOnly(v?: string | null): string {
  if (!v) return "";
  const s = String(v).trim();
  if (!s) return "";
  if (s.includes("T")) return s.split("T")[0];
  if (/^\d{4}-\d{2}-\d{2}Z$/.test(s)) return s.slice(0, 10);
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(s)) return s.replaceAll("/", "-");
  return s;
}

function trimPhone(v?: string): string {
  if (!v) return "";
  let digits = v.replace(/\D/g, "");
  if (digits.startsWith("63")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  digits = digits.slice(-10);
  return digits ? `0${digits}` : "";
}

function toAllCaps(input: string): string {
  return input ? input.toUpperCase() : "";
}

function normalizeStringForCompare(v?: string | null): string {
  if (!v) return "";
  return String(v).trim().replace(/\s+/g, " ").toUpperCase();
}

function normalizePhoneForCompare(v?: string | null): string {
  if (!v) return "";
  return String(v).replace(/\D/g, "").slice(-10);
}

function normalizeFullNameForCompare(v?: string | null): string {
  if (!v) return "";
  return String(v).trim().replace(/\s+/g, " ").toUpperCase();
}

function validatePersonName(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  if (v === "N/A") return null;
  if (/\d/.test(v)) return "Name must not contain numbers.";
  const re = /^[\p{L}\s\-\.'’]*$/u;
  if (!re.test(v)) {
    return "Name can only contain letters, spaces, - ' . and accented letters.";
  }
  return null;
}

function buildAddress(opts: {
  province: string;
  city: string;
  barangay: string;
  line1: string;
  line2: string;
  postal: string;
}) {
  const segments: string[] = [];
  if (opts.line1?.trim()) segments.push(opts.line1.trim().toUpperCase());
  if (opts.line2?.trim()) segments.push(opts.line2.trim().toUpperCase());
  if (opts.city?.trim()) segments.push(opts.city.trim().toUpperCase());
  if (opts.province?.trim()) segments.push(opts.province.trim().toUpperCase());
  if (opts.postal?.trim()) segments.push(opts.postal.trim().toUpperCase());
  return segments.join(", ");
}

function calculateAge(birthdate?: string | null): string {
  const d = dateOnly(birthdate);
  if (!d) return "";
  const birth = new Date(d);
  if (Number.isNaN(birth.getTime())) return "";

  const today = new Date();
  let years = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  const dayDiff = today.getDate() - birth.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) years--;
  return years < 0 ? "" : String(years);
}

function hasMeaningfulDraft(data: ReturnType<typeof getInitialFormData>): boolean {
  return Object.entries(data).some(([key, value]) => {
    if (key === "stay") return false;
    if (typeof value === "boolean") return value;
    return String(value ?? "").trim() !== "";
  });
}

function SubsectionDivider({ label }: { label: string }) {
  return (
    <div className="col-span-full flex items-center gap-3 mt-1 mb-1">
      <span className="text-[13px] font-semibold text-[#203D7A] uppercase tracking-wider">
        {label}
      </span>
      <span className="h-px bg-slate-200 flex-1" />
    </div>
  );
}

export default function AddPatientWizard({
  open,
  onOpenChange,
  prefill = null,
}: Props) {
  const [step, setStep] = React.useState<1 | 2>(1);
  const [duplicateError, setDuplicateError] = React.useState<string | null>(null);

  const page = usePage<any>();
  const existingPatients: any[] = React.useMemo(() => {
    if (page?.props?.patients && Array.isArray(page.props.patients.data)) {
      return page.props.patients.data as any[];
    }
    if (Array.isArray(page?.props?.allPatients)) {
      return page.props.allPatients as any[];
    }
    return [];
  }, [page]);

  const confirm = useConfirm();
  const initialFormData = React.useMemo(() => getInitialFormData(), []);
  const mergedInitialData = React.useMemo(
    () => ({ ...initialFormData, ...(prefill ?? {}) }),
    [initialFormData, prefill]
  );

  const form = useForm(mergedInitialData);
  const didRestoreDraftRef = React.useRef(false);
  const shouldClearDraftOnCloseRef = React.useRef(false);

  React.useEffect(() => {
    if (!open) {
      didRestoreDraftRef.current = false;
      setStep(1);
      form.reset();
      form.clearErrors();
      setDuplicateError(null);

      if (shouldClearDraftOnCloseRef.current) {
        sessionStorage.removeItem(DRAFT_STORAGE_KEY);
        shouldClearDraftOnCloseRef.current = false;
      }
      return;
    }

    form.setData({ ...mergedInitialData });
    form.clearErrors();
    setDuplicateError(null);
    setStep(mergedInitialData.patient_type ? 2 : 1);
  }, [open, mergedInitialData]);

  React.useEffect(() => {
    if (!open || didRestoreDraftRef.current || prefill) return;
    didRestoreDraftRef.current = true;

    const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      const next = { ...initialFormData, ...parsed };
      if (!hasMeaningfulDraft(next)) return;
      form.setData(next);
      setStep(next.patient_type ? 2 : 1);
    } catch {
      sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    }
  }, [form, initialFormData, open, prefill]);

  React.useEffect(() => {
    if (!open || prefill) return;
    if (hasMeaningfulDraft(form.data)) {
      sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(form.data));
    } else {
      sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    }
  }, [form.data, open, prefill]);

  React.useEffect(() => {
    const autoAge = calculateAge(form.data.birthdate);
    if (autoAge !== form.data.age) {
      form.setData("age", autoAge);
    }
  }, [form.data.birthdate]);

  const hasUnsavedChanges = React.useMemo(() => hasMeaningfulDraft(form.data), [form.data]);

  const requestClose = React.useCallback(async () => {
    if (form.processing) return;

    if (!hasUnsavedChanges) {
      shouldClearDraftOnCloseRef.current = true;
      onOpenChange(false);
      return;
    }

    const ok = await confirm({
      title: "Discard this patient form?",
      message:
        "You have unsaved patient details. Closing this wizard will remove everything you entered.",
      confirmText: "Discard form",
      cancelText: "Keep editing",
      bodyExtra: (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Tip: Your draft is auto-saved while this window stays open, but it will be cleared once you discard it.
        </div>
      ),
      autoFocus: "cancel",
    });

    if (!ok) return;

    shouldClearDraftOnCloseRef.current = true;
    onOpenChange(false);
  }, [confirm, form.processing, hasUnsavedChanges, onOpenChange]);

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        void requestClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, requestClose]);

  React.useEffect(() => {
    if (!open) {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      return;
    }

    const originalBody = document.body.style.overflow;
    const originalHtml = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalBody;
      document.documentElement.style.overflow = originalHtml;
    };
  }, [open]);

  const isImmunization = form.data.patient_type === "immunization";
  const isPregnancy = form.data.patient_type === "pregnancy";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setDuplicateError(null);

    if (!form.data.patient_type) {
      setStep(1);
      return;
    }

    const first = toAllCaps((form.data.first_name || "").trim());
    const middle = toAllCaps((form.data.middle_name || "").trim());
    const last = toAllCaps((form.data.last_name || "").trim());

    let suffixSelect = toAllCaps((form.data.suffix || "").trim());
    const suffixOther = toAllCaps((form.data.suffix_other || "").trim());
    let finalSuffix = "";

    if (suffixSelect === "OTHERS") finalSuffix = suffixOther;
    else finalSuffix = suffixSelect;

    const fullName = [first, middle, last, finalSuffix].filter(Boolean).join(" ");

    const combinedAddress = buildAddress({
      province: form.data.address_province || "Cavite",
      city: form.data.address_city || "Silang",
      barangay: form.data.barangay,
      line1: form.data.address_house_street,
      line2: form.data.address_line2,
      postal: form.data.address_postal_code,
    });

    const trimmedPhone = trimPhone(form.data.phone);

    const motherFullName = [
      toAllCaps(form.data.mother_last_name || ""),
      toAllCaps(form.data.mother_given_name || ""),
      toAllCaps(form.data.mother_middle_name || ""),
    ]
      .filter(Boolean)
      .join(" ");

    const payload: any = {
      ...form.data,
      full_name: fullName,
      suffix: finalSuffix,
      address: combinedAddress,
      birthdate: dateOnly(form.data.birthdate),
      phone: trimmedPhone,
      contact_no: trimmedPhone,
      age: form.data.age === "" ? null : Number(form.data.age),
      child_height_cm:
        form.data.child_height_cm === "" ? null : Number(form.data.child_height_cm),
      birth_weight_kg:
        form.data.birth_weight_kg === "" ? null : Number(form.data.birth_weight_kg),
      height_cm: form.data.height_cm === "" ? null : Number(form.data.height_cm),
      philhealth_no: (form.data.philhealth_no || "").replace(/\D/g, "").slice(0, 12),

      date_of_registration: dateOnly(form.data.date_of_registration),
      date_referred_nb_screening: dateOnly(form.data.date_referred_nb_screening),
      date_nbs_done: dateOnly(form.data.date_nbs_done),
      tt_status_date: dateOnly(form.data.tt_status_date),

      mother_name: motherFullName,
    };

    delete payload.address_province;
    delete payload.address_city;
    delete payload.address_house_street;
    delete payload.address_line2;
    delete payload.address_postal_code;
    delete payload.suffix_other;
    delete payload.phone;

    if (existingPatients.length > 0) {
      const newFullName = normalizeFullNameForCompare(fullName);
      const newBirthdate = dateOnly(payload.birthdate);
      const newPlaceOfBirth = normalizeStringForCompare(payload.place_of_birth);
      const newSex = normalizeStringForCompare(payload.sex);
      const newMother = normalizeStringForCompare(motherFullName);
      const newFather = normalizeStringForCompare(payload.father_name);
      const newGuardianPhone = normalizePhoneForCompare(trimmedPhone);

      const duplicate = existingPatients.find((p: any) => {
        const existingFullName = normalizeFullNameForCompare(
          p.full_name ||
          [p.first_name, p.middle_name, p.last_name, p.suffix].filter(Boolean).join(" ")
        );

        if (!existingFullName || existingFullName !== newFullName) return false;

        const existingBirthdate = dateOnly(p.birthdate);
        if (existingBirthdate !== newBirthdate) return false;

        const existingPlaceOfBirth = normalizeStringForCompare(p.place_of_birth);
        if (existingPlaceOfBirth !== newPlaceOfBirth) return false;

        const existingSex = normalizeStringForCompare(p.sex);
        if (existingSex !== newSex) return false;

        const existingMother = normalizeStringForCompare(
          p.mother_name ||
          [p.mother_last_name, p.mother_given_name, p.mother_middle_name]
            .filter(Boolean)
            .join(" ")
        );

        const existingFather = normalizeStringForCompare(p.father_name);

        const existingGuardianPhone = normalizePhoneForCompare(
          p.contact_no || p.phone_number || p.phone || p.guardian_phone || p.contact_number
        );

        const sameParents = existingMother === newMother && existingFather === newFather;
        const sameGuardianPhone =
          !newGuardianPhone || existingGuardianPhone === newGuardianPhone;

        return sameParents && sameGuardianPhone;
      });

      if (duplicate) {
        setStep(2);
        setDuplicateError(
          "This patient record already exists with the same full name, date of birth, place of birth, sex, and parent/guardian details. Please review the existing record instead of creating a duplicate."
        );
        return;
      }
    }

    form.post("/patients", {
      data: payload,
      preserveScroll: true,
      onError: (errs) => {
        setStep(2);
        const firstKey = Object.keys(errs)[0];
        if (firstKey) {
          const scrollName = firstKey === "full_name" ? "first_name" : firstKey;
          const el = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(
            `[name="${scrollName}"]`
          );
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
          el?.focus();
        }
      },
      onSuccess: () => {
        sessionStorage.removeItem(DRAFT_STORAGE_KEY);

        if (form.data.stay) {
          const type = form.data.patient_type;

          form.setData({
            ...getInitialFormData(),
            patient_type: type,
            address_province: "Cavite",
            address_city: "Silang",
            stay: true,
          });

          setStep(2);
        } else {
          shouldClearDraftOnCloseRef.current = true;
          form.setData(getInitialFormData());
          form.clearErrors();
          setDuplicateError(null);
          setStep(1);
          onOpenChange(false);
        }
      },
    });
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100]"
      aria-hidden={!open}
      style={{
        fontFamily:
          "'Poppins', ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'",
      }}
    >
      <div className="absolute inset-0 bg-black/50" onClick={() => void requestClose()} />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-patient-title"
        className="absolute left-1/2 top-1/2 w-[96vw] max-w-6xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden"
      >
        <div className="sticky top-0 z-10 bg-white rounded-t-2xl border-b border-slate-200">
          <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-start sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <h2
                id="add-patient-title"
                className="text-lg sm:text-xl md:text-2xl font-semibold text-slate-800"
              >
                {step === 1
                  ? "Add Patient"
                  : isImmunization
                    ? "Immunization — New Patient"
                    : "Pregnancy — New Patient"}
              </h2>
              <p className="text-slate-600 text-sm md:text-[15px]">
                {step === 1
                  ? "Choose a record type to continue."
                  : "Fill out patient details. You can edit visits later."}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void requestClose()}
              className="inline-flex shrink-0 items-center justify-center rounded-xl h-12 w-12 border border-slate-300 bg-white shadow-sm hover:shadow-md active:translate-y-[1px] focus:outline-none focus:ring-2 focus:ring-[#0F8A99]"
              aria-label="Close"
              title="Close"
            >
              ✕
            </button>
          </div>

          <ol className="px-4 sm:px-6 lg:px-8 pb-3 flex items-center gap-2 sm:gap-3 text-sm overflow-x-auto">
            <StepPill active={step === 1} done={step > 1}>1. Type</StepPill>
            <Connector />
            <StepPill active={step === 2} done={false}>2. Details</StepPill>
          </ol>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 pb-20">
          <form onSubmit={submit} className="space-y-6">
            {duplicateError && (
              <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
                <div className="font-semibold mb-1">Possible duplicate record</div>
                <p>{duplicateError}</p>
              </div>
            )}

            {step === 1 ? (
              <StepOne
                value={form.data.patient_type}
                onPick={(v) => {
                  form.setData("patient_type", v);
                  setStep(2);
                }}
              />
            ) : (
              <StepTwo isImmunization={isImmunization} isPregnancy={isPregnancy} form={form} />
            )}

            {step === 2 && (
              <div className="mt-2 w-full space-y-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-800">
                        Unsaved-entry protection is on
                      </div>
                      <p className="text-xs text-slate-600">
                        Clicking outside, pressing Esc, or closing this wizard now shows the same
                        confirmation alert before data is discarded.
                      </p>
                    </div>

                    {hasUnsavedChanges ? (
                      <button
                        type="button"
                        onClick={() => {
                          const type = form.data.patient_type;
                          form.reset();
                          form.clearErrors();
                          form.setData("patient_type", type);
                          form.setData("address_province", "Cavite");
                          form.setData("address_city", "Silang");
                          setDuplicateError(null);
                          setStep(type ? 2 : 1);
                          if (!prefill) sessionStorage.removeItem(DRAFT_STORAGE_KEY);
                        }}
                        className="w-full md:w-auto rounded-xl border border-slate-300 bg-white px-4 h-12 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                      >
                        Clear current entries
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between w-full">
                  <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      name="stay"
                      checked={form.data.stay}
                      onChange={(e) => form.setData("stay", e.target.checked)}
                      className="h-5 w-5 rounded-md border border-slate-300 text-[#0F8A99] focus:ring-2 focus:ring-[#0F8A99] focus:outline-none"
                    />
                    <span>Add another after saving</span>
                  </label>

                  <button
                    type="submit"
                    disabled={form.processing}
                    className="w-full md:w-auto md:min-w-[180px] px-4 h-12 rounded-xl bg-[#0F8A99] text-white text-[15px] shadow-sm hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[#0F8A99] disabled:opacity-60"
                  >
                    {form.processing ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

function StepOne(props: { value: "" | PatientType; onPick: (v: PatientType) => void }) {
  const { value, onPick } = props;
  return (
    <section>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        <TypeCard
          title="Immunization"
          desc="Child immunization record & digital card."
          active={value === "immunization"}
          onClick={() => onPick("immunization")}
          iconSrc={SyringeIcon}
          variant="teal"
        />
        <TypeCard
          title="Pregnancy / Prenatal"
          desc="Prenatal record for a pregnant patient."
          active={value === "pregnancy"}
          onClick={() => onPick("pregnancy")}
          iconSrc={NewbornIcon}
          variant="pink"
        />
      </div>
    </section>
  );
}

function TypeCard({
  title,
  desc,
  iconSrc,
  active,
  onClick,
  variant = "teal",
}: {
  title: string;
  desc: string;
  iconSrc: string;
  active: boolean;
  onClick: () => void;
  variant?: "teal" | "pink";
}) {
  const shellActive =
    "border-[#0F8A99] bg-[#0F8A99] text-white ring-2 ring-[#0F8A99]/25";
  const shellInactive =
    "border-[#0F8A99] bg-white text-slate-800 hover:shadow-sm";
  const titleCls = active ? "text-white" : "text-slate-800";
  const descCls = active ? "text-white/90" : "text-slate-600";

  const iconBgClass =
    variant === "pink"
      ? active
        ? "bg-[#FCE4F3]"
        : "bg-[#FDF2F8]"
      : active
        ? "bg-white/20"
        : "bg-[#0F8A99]/10";

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full text-left rounded-2xl border px-5 py-5 transition min-h-[164px]",
        active ? shellActive : shellInactive,
      ].join(" ")}
    >
      <div
        className={`mb-3 inline-flex h-14 w-14 items-center justify-center rounded-[12px] ${iconBgClass}`}
      >
        <img src={iconSrc} alt="" className="h-8 w-8" aria-hidden />
      </div>
      <div className={`text-lg font-semibold ${titleCls}`}>{title}</div>
      <div className={`text-[15px] mt-1 ${descCls}`}>{desc}</div>
      {active && <div className="mt-2 text-white/90 text-xs font-medium">Selected</div>}
    </button>
  );
}

function StepTwo({
  isImmunization,
  isPregnancy,
  form,
}: {
  isImmunization: boolean;
  isPregnancy: boolean;
  form: ReturnType<typeof useForm<any>>;
}) {
  const barangay = form.data.barangay;
  const barangayOptions = SILANG_BARANGAYS;

  return (
    <section className="space-y-8">
      <style>{`
        :root { --oh-teal: #0F8A99; }

        input[type="date"],
        input[type="time"],
        input[type="datetime-local"],
        input[type="month"],
        input[type="week"] {
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

      <fieldset className="rounded-2xl border border-slate-200">
        <legend className="px-3 text-[11px] font-semibold tracking-[0.16em] text-[#0F8A99] uppercase">
          Patient Details
        </legend>

        <div className="p-4 space-y-6">
          {isPregnancy && (
            <div className="space-y-4">
              <div className={`grid grid-cols-1 md:grid-cols-3 ${GRID_GAP}`}>
                <DateField
                  name="date_of_registration"
                  label="Date of Registration"
                  value={form.data.date_of_registration}
                  onChange={(v) => form.setData("date_of_registration", v)}
                  error={form.errors.date_of_registration}
                  maxToday
                />
                <FamilyNumberField
                  name="family_serial_number"
                  label="Family Serial Number"
                  value={form.data.family_serial_number}
                  onChange={(v) => form.setData("family_serial_number", v)}
                  error={form.errors.family_serial_number}
                />
                <PhilhealthField
                  name="philhealth_no"
                  label="PhilHealth Number *"
                  value={form.data.philhealth_no}
                  onChange={(v) => form.setData("philhealth_no", v)}
                  error={form.errors.philhealth_no}
                />
              </div>

              {/* Prenatal paper order: Surname / Last Name first, then Given Name / First Name, then Middle Name. */}
              <div className={`grid grid-cols-1 md:grid-cols-3 ${GRID_GAP}`}>
                <TextField
                  name="last_name"
                  label="Last Name / Surname *"
                  value={form.data.last_name}
                  onChange={(v) => form.setData("last_name", v)}
                  placeholder="SURNAME"
                  error={form.errors.last_name}
                  maxLength={50}
                  required
                  validate={validatePersonName}
                />
                <TextField
                  name="first_name"
                  label="Given Name / First Name *"
                  value={form.data.first_name}
                  onChange={(v) => form.setData("first_name", v)}
                  placeholder="GIVEN NAME"
                  error={form.errors.first_name || form.errors.full_name}
                  maxLength={50}
                  required
                  validate={validatePersonName}
                />
                <TextField
                  name="middle_name"
                  label="Middle Name"
                  value={form.data.middle_name}
                  onChange={(v) => form.setData("middle_name", v)}
                  placeholder="MIDDLE NAME"
                  error={form.errors.middle_name}
                  maxLength={50}
                  validate={validatePersonName}
                />
              </div>

              <div className={`grid grid-cols-1 md:grid-cols-3 ${GRID_GAP}`}>
                <div className="md:col-span-1">
                  <SuffixField
                    value={form.data.suffix}
                    otherValue={form.data.suffix_other}
                    onChangeSelect={(v) => form.setData("suffix", v)}
                    onChangeOther={(v) => form.setData("suffix_other", v)}
                    error={form.errors.suffix || form.errors.suffix_other}
                  />
                </div>
              </div>
            </div>
          )}

          {isImmunization && (
            <>
              <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 ${GRID_GAP}`}>
                <DateField
                  name="date_of_registration"
                  label="Date of Registration"
                  value={form.data.date_of_registration}
                  onChange={(v) => form.setData("date_of_registration", v)}
                  error={form.errors.date_of_registration}
                />
                <FamilyNumberField
                  name="family_no"
                  label="Family Serial Number"
                  value={form.data.family_no}
                  onChange={(v) => form.setData("family_no", v)}
                  error={form.errors.family_no}
                />
                <DateField
                  name="date_referred_nb_screening"
                  label="Date referred to NB screening"
                  value={form.data.date_referred_nb_screening}
                  onChange={(v) => form.setData("date_referred_nb_screening", v)}
                  error={form.errors.date_referred_nb_screening}
                />
                <DateField
                  name="date_nbs_done"
                  label="Date NBS Done"
                  value={form.data.date_nbs_done}
                  onChange={(v) => form.setData("date_nbs_done", v)}
                  error={form.errors.date_nbs_done}
                />
              </div>

              <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 ${GRID_GAP}`}>
                <TextField
                  name="last_name"
                  label="Last Name *"
                  value={form.data.last_name}
                  onChange={(v) => form.setData("last_name", v)}
                  placeholder="LAST NAME"
                  error={form.errors.last_name}
                  maxLength={50}
                  required
                  validate={validatePersonName}
                />
                <TextField
                  name="first_name"
                  label="Given Name *"
                  value={form.data.first_name}
                  onChange={(v) => form.setData("first_name", v)}
                  placeholder="GIVEN NAME"
                  error={form.errors.first_name || form.errors.full_name}
                  maxLength={50}
                  required
                  validate={validatePersonName}
                />
                <TextField
                  name="middle_name"
                  label="Middle Name"
                  value={form.data.middle_name}
                  onChange={(v) => form.setData("middle_name", v)}
                  placeholder="MIDDLE NAME"
                  error={form.errors.middle_name}
                  maxLength={50}
                  validate={validatePersonName}
                />
                <SuffixField
                  value={form.data.suffix}
                  otherValue={form.data.suffix_other}
                  onChangeSelect={(v) => form.setData("suffix", v)}
                  onChangeOther={(v) => form.setData("suffix_other", v)}
                  error={form.errors.suffix || form.errors.suffix_other}
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-4">
                <p className="text-[13px] font-semibold text-slate-700 uppercase tracking-[0.12em]">
                  Complete Address
                </p>

                <div className={`grid grid-cols-1 lg:grid-cols-2 ${GRID_GAP}`}>
                  <BarangayField
                    value={barangay}
                    options={barangayOptions}
                    disabled={false}
                    onChange={(v) => form.setData("barangay", v)}
                    error={form.errors.barangay}
                  />

                  <TextField
                    name="place_of_birth"
                    label="Place of Birth"
                    value={form.data.place_of_birth}
                    onChange={(v) => form.setData("place_of_birth", v)}
                    placeholder="E.G. BANABA HEALTH STATION"
                    error={form.errors.place_of_birth}
                    maxLength={255}
                    multiline
                  />
                </div>

                <TextField
                  name="address_house_street"
                  label="Complete Address"
                  value={form.data.address_house_street}
                  onChange={(v) => form.setData("address_house_street", v)}
                  placeholder="HOUSE NO. / STREET / SITIO / PUROK"
                  error={form.errors.address_house_street}
                  maxLength={255}
                  multiline
                />
              </div>

              <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 ${GRID_GAP}`}>
                <DateFieldWithToday
                  name="birthdate"
                  label="Birthday *"
                  value={form.data.birthdate}
                  onChange={(v) => form.setData("birthdate", v)}
                  error={form.errors.birthdate}
                  required
                />
                <ReadOnlyField
                  name="age"
                  label="Age"
                  value={form.data.age}
                />
                <NumberField
                  name="child_height_cm"
                  label="Height (CM)"
                  step="0.1"
                  value={form.data.child_height_cm as string}
                  onChange={(v) => form.setData("child_height_cm", v)}
                  placeholder="50"
                  error={form.errors.child_height_cm}
                  max={120}
                />
                <NumberField
                  name="birth_weight_kg"
                  label="Birth Weight (KG)"
                  step="0.01"
                  value={form.data.birth_weight_kg as string}
                  onChange={(v) => form.setData("birth_weight_kg", v)}
                  placeholder="3.20"
                  error={form.errors.birth_weight_kg}
                  max={8}
                />
                <CPABField
                  value={form.data.cpab}
                  onChange={(v) => form.setData("cpab", v)}
                  error={form.errors.cpab}
                />
                <DeliveryTypeField
                  value={form.data.delivery_type}
                  onChange={(v) => form.setData("delivery_type", v)}
                  error={form.errors.delivery_type}
                />
              </div>
            </>
          )}

          {isPregnancy && (
            <div className="pt-4 mt-2 border-t border-slate-200 space-y-4">
              <p className="text-[13px] font-medium text-slate-700 uppercase">
                Complete Address
              </p>

              <div className={`grid grid-cols-1 lg:grid-cols-3 ${GRID_GAP}`}>
                <BarangayField
                  value={barangay}
                  options={barangayOptions}
                  disabled={false}
                  onChange={(v) => form.setData("barangay", v)}
                  error={form.errors.barangay}
                />

                <div className="lg:col-span-2">
                  <TextField
                    name="address_house_street"
                    label="Complete Address"
                    value={form.data.address_house_street}
                    onChange={(v) => form.setData("address_house_street", v)}
                    placeholder="HOUSE NO. / STREET / SITIO / PUROK"
                    error={form.errors.address_house_street}
                    maxLength={255}
                    multiline
                  />
                </div>
              </div>

              {/* Same row order as the prenatal paper form: Birthday, Age, Height, Civil Status. */}
              <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 ${GRID_GAP}`}>
                <DateField
                  name="birthdate"
                  label="Birthday *"
                  value={form.data.birthdate}
                  onChange={(v) => form.setData("birthdate", v)}
                  error={form.errors.birthdate}
                  maxToday
                />
                <ReadOnlyField
                  name="age"
                  label="Age"
                  value={form.data.age}
                />
                <NumberField
                  name="height_cm"
                  label="Height (CM) *"
                  step="1"
                  value={form.data.height_cm as any}
                  onChange={(v) => form.setData("height_cm", v)}
                  placeholder="152"
                  error={form.errors.height_cm}
                  max={300}
                />
                <CivilStatusField
                  value={form.data.civil_status}
                  onChange={(v) => form.setData("civil_status", v)}
                  error={form.errors.civil_status}
                />
              </div>

              <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 ${GRID_GAP}`}>
                <PhoneField
                  name="phone"
                  label="Contact Number"
                  value={form.data.phone}
                  onChange={(v) => form.setData("phone", v)}
                  error={form.errors.phone}
                />
              </div>
            </div>
          )}
        </div>
      </fieldset>

      {isImmunization && (
        <fieldset className="rounded-2xl border border-slate-200">
          <legend className="px-3 text-[11px] font-semibold tracking-[0.16em] text-[#0F8A99] uppercase">
            Mother / Family / Additional Details
          </legend>

          <div className="p-4 space-y-6">
            <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 ${GRID_GAP}`}>
              <TextField
                name="mother_last_name"
                label="Mother's Last Name"
                value={form.data.mother_last_name}
                onChange={(v) => form.setData("mother_last_name", v)}
                placeholder="MOTHER LAST NAME"
                error={form.errors.mother_last_name}
                maxLength={50}
                validate={validatePersonName}
              />
              <TextField
                name="mother_given_name"
                label="Mother's Given Name"
                value={form.data.mother_given_name}
                onChange={(v) => form.setData("mother_given_name", v)}
                placeholder="MOTHER GIVEN NAME"
                error={form.errors.mother_given_name}
                maxLength={50}
                validate={validatePersonName}
              />
              <TextField
                name="mother_middle_name"
                label="Mother's Middle Name"
                value={form.data.mother_middle_name}
                onChange={(v) => form.setData("mother_middle_name", v)}
                placeholder="MOTHER MIDDLE NAME"
                error={form.errors.mother_middle_name}
                maxLength={50}
                validate={validatePersonName}
              />
              <TextField
                name="tt_status_mother"
                label="TT Status of Mother"
                value={form.data.tt_status_mother}
                onChange={(v) => form.setData("tt_status_mother", v)}
                placeholder="E.G. TT2 / TT3"
                error={form.errors.tt_status_mother}
                maxLength={20}
              />
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 ${GRID_GAP}`}>
              <DateField
                name="tt_status_date"
                label="TT Status Date"
                value={form.data.tt_status_date}
                onChange={(v) => form.setData("tt_status_date", v)}
                error={form.errors.tt_status_date}
              />
              <SexToggleField
                value={form.data.sex}
                onChange={(v) => form.setData("sex", v)}
                error={form.errors.sex}
                required
              />
              <HealthCenterField
                name="health_center"
                label="Health Center / Facility"
                value={form.data.health_center}
                onChange={(v) => form.setData("health_center", v)}
                error={form.errors.health_center}
              />
              <PhoneField
                name="phone"
                label="Contact Number of Guardian / Parent"
                value={form.data.phone}
                onChange={(v) => form.setData("phone", v)}
                error={form.errors.phone}
              />
            </div>

            <div className={`grid grid-cols-1 lg:grid-cols-2 ${GRID_GAP}`}>
              <ParentNameField
                name="father_name"
                label="Father's Name"
                value={form.data.father_name}
                onChange={(v) => form.setData("father_name", v)}
                placeholder="FATHER FULL NAME"
                error={form.errors.father_name}
              />
            </div>
          </div>
        </fieldset>
      )}
    </section>
  );
}

/* ----------------------------------------------------------------------------
   UI primitives
----------------------------------------------------------------------------- */
function StepPill({ children, active, done }: { children: React.ReactNode; active: boolean; done: boolean }) {
  const base = "px-3 py-1.5 rounded-full border text-sm whitespace-nowrap transition";
  const state = active
    ? "bg-[#0F8A99] text-white border-[#0F8A99]"
    : "bg-transparent text-[#0F8A99] border-[#0F8A99] " + (done ? "opacity-90" : "opacity-70");
  return <li className={`${base} ${state}`}>{children}</li>;
}

function Connector() {
  return <span className="inline-block w-6 h-0.5 bg-slate-200 shrink-0" aria-hidden />;
}

function renderFieldLabel(label: string, required?: boolean) {
  const hasStarInLabel = /\*/.test(label);
  const cleanLabel = label.replace(/\s*\*\s*/g, "").trim();
  const showRequired = required || hasStarInLabel;

  return (
    <>
      {cleanLabel}
      {showRequired ? <span className="ml-1 font-semibold text-rose-500">*</span> : null}
    </>
  );
}

function TextField(props: {
  name: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  className?: string;
  type?: React.HTMLInputTypeAttribute;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  pattern?: string;
  maxLength?: number;
  required?: boolean;
  multiline?: boolean;
  validate?: (v: string) => string | null;
}) {
  const {
    name,
    label,
    value,
    onChange,
    placeholder,
    error,
    className,
    type = "text",
    inputMode,
    pattern,
    maxLength,
    required,
    multiline,
    validate,
  } = props;

  const [localError, setLocalError] = React.useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const raw = e.target.value;
    const next = toAllCaps(raw);
    onChange(next);

    if (validate) setLocalError(validate(next) || null);
    else setLocalError(null);

    if (multiline) {
      const el = e.target;
      el.style.height = "auto";
      el.style.height = `${Math.max(el.scrollHeight, 48)}px`;
    }
  };

  const hasError = !!(error || localError);
  const borderCls = hasError ? CONTROL_ERROR : CONTROL_BORDER;

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-slate-700 mb-1">{renderFieldLabel(label)}</label>
      {multiline ? (
        <textarea
          name={name}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          maxLength={maxLength ?? 255}
          required={required}
          className={`w-full rounded-xl px-3 py-3 text-[15px] uppercase placeholder:uppercase focus:outline-none resize-none leading-snug min-h-[48px] ${borderCls}`}
          rows={1}
          style={{ overflow: "hidden" }}
        />
      ) : (
        <input
          name={name}
          type={type}
          inputMode={inputMode}
          pattern={pattern}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          maxLength={maxLength}
          required={required}
          className={`w-full uppercase placeholder:uppercase ${CONTROL} ${borderCls}`}
        />
      )}
      {(error || localError) && <p className="text-sm text-red-600 mt-1">{error || localError}</p>}
    </div>
  );
}

function NumberField(props: {
  name: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  step?: string;
  error?: string;
  max?: number;
  required?: boolean;
}) {
  const { name, label, value, onChange, placeholder, step, error, max, required } = props;
  const [localError, setLocalError] = React.useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    onChange(v);

    if (v && max !== undefined && !isNaN(Number(v)) && Number(v) > max) {
      setLocalError(`Value must not be greater than ${max}.`);
    } else {
      setLocalError(null);
    }
  };

  const hasError = !!(error || localError);
  const borderCls = hasError ? CONTROL_ERROR : CONTROL_BORDER;

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{renderFieldLabel(label, required)}</label>
      <input
        name={name}
        type="number"
        step={step ?? "1"}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        max={max !== undefined ? max : undefined}
        className={`w-full ${CONTROL} ${borderCls}`}
      />
      {(error || localError) && <p className="text-sm text-red-600 mt-1">{error || localError}</p>}
    </div>
  );
}

function DateField({
  name,
  label,
  value,
  onChange,
  error,
  maxToday = false,
  required = false,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  maxToday?: boolean;
  required?: boolean;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const borderCls = error ? CONTROL_ERROR : CONTROL_BORDER;

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{renderFieldLabel(label, required)}</label>
      <input
        name={name}
        type="date"
        value={dateOnly(value)}
        onChange={(e) => onChange(dateOnly(e.target.value))}
        max={maxToday ? today : undefined}
        className={`w-full ${CONTROL} ${borderCls}`}
      />
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  );
}

function DateFieldWithToday({
  name,
  label,
  value,
  onChange,
  error,
  required = false,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  required?: boolean;
}) {
  const today = React.useMemo(() => new Date().toISOString().slice(0, 10), []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const v = dateOnly(raw);
    const finalVal = v && v > today ? today : v;
    onChange(finalVal);
  };

  const borderCls = error ? CONTROL_ERROR : CONTROL_BORDER;

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{renderFieldLabel(label, required)}</label>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
        <input
          name={name}
          type="date"
          value={dateOnly(value)}
          onChange={handleChange}
          max={today}
          className={`w-full ${CONTROL} ${borderCls}`}
        />
        <button
          type="button"
          onClick={() => onChange(today)}
          className={`w-full sm:w-auto min-w-[92px] ${CONTROL_BTN} border border-slate-300 text-[13px] text-slate-700 bg-slate-50 hover:bg-slate-100 hover:border-[#0F8A99]/70 focus:outline-none focus:ring-2 focus:ring-[#0F8A99]`}
        >
          TODAY
        </button>
      </div>
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  );
}

function ReadOnlyField({
  name,
  label,
  value,
}: {
  name: string;
  label: string;
  value: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{renderFieldLabel(label)}</label>
      <input
        name={name}
        type="text"
        value={value}
        readOnly
        className={`w-full ${CONTROL} border border-slate-300 bg-slate-50 text-slate-700`}
      />
    </div>
  );
}

function PhoneField({
  name,
  label,
  value,
  onChange,
  error,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  required?: boolean;
}) {
  const digits = (value || "").replace(/\D/g, "").slice(0, 10);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let next = e.target.value.replace(/\D/g, "");
    if (next.startsWith("0")) next = next.slice(1);
    next = next.slice(0, 10);
    onChange(next);
  };

  const borderCls = error ? CONTROL_ERROR : CONTROL_BORDER;

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{renderFieldLabel(label)}</label>
      <div className="grid grid-cols-[72px_1fr] gap-2">
        <div className={`${CONTROL} flex items-center justify-center border border-slate-300 bg-slate-50`}>
          +63
        </div>
        <input
          name={name}
          type="tel"
          inputMode="numeric"
          maxLength={10}
          value={digits}
          onChange={handleChange}
          placeholder="9123456789"
          className={`w-full ${CONTROL} tracking-[0.08em] ${borderCls}`}
        />
      </div>
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  );
}

function ParentNameField({
  name,
  label,
  value,
  onChange,
  placeholder,
  error,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
}) {
  const isNA = value.trim().toUpperCase() === "N/A";
  const [localError, setLocalError] = React.useState<string | null>(null);

  const toggleNA = () => {
    if (isNA) {
      onChange("");
      setLocalError(null);
    } else {
      onChange("N/A");
      setLocalError(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = toAllCaps(e.target.value);
    onChange(next);
    setLocalError(validatePersonName(next));
  };

  const hasError = !!(error || localError);
  const borderCls = hasError ? CONTROL_ERROR : CONTROL_BORDER;

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{renderFieldLabel(label)}</label>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
        <input
          name={name}
          type="text"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          maxLength={80}
          className={`w-full ${CONTROL} uppercase placeholder:uppercase ${borderCls}`}
        />
        <button
          type="button"
          onClick={toggleNA}
          className={`w-full sm:w-auto min-w-[78px] ${CONTROL_BTN} text-xs font-semibold tracking-wide border transition ${isNA
            ? "bg-[#0F8A99] text-white border-[#0F8A99]"
            : "bg-white text-slate-700 border-slate-300 hover:border-[#0F8A99]/80"
            }`}
        >
          N/A
        </button>
      </div>
      {(error || localError) && <p className="text-sm text-red-600 mt-1">{error || localError}</p>}
    </div>
  );
}

function SegmentedButtons({
  label,
  value,
  onChange,
  options,
  error,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  error?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {renderFieldLabel(label, required)}
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`${CONTROL_BTN} w-full border text-sm font-semibold flex items-center justify-center transition ${active
                ? "bg-[#0F8A99] text-white border-[#0F8A99]"
                : "bg-white text-slate-700 border-slate-300 hover:border-[#0F8A99]/70"
                }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  );
}

function SexToggleField({
  value,
  onChange,
  error,
  required = false,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
  required?: boolean;
}) {
  return (
    <SegmentedButtons
      label="Sex"
      required={required}
      value={value}
      onChange={onChange}
      error={error}
      options={[
        { value: "Male", label: "MALE" },
        { value: "Female", label: "FEMALE" },
      ]}
    />
  );
}

function CPABField({
  value,
  onChange,
  error,
  required = false,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
  required?: boolean;
}) {
  return (
    <SegmentedButtons
      label="CPAB"
      required={required}
      value={value}
      onChange={onChange}
      error={error}
      options={[
        { value: "YES", label: "YES" },
        { value: "NO", label: "NO" },
      ]}
    />
  );
}

function DeliveryTypeField({
  value,
  onChange,
  error,
  required = false,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
  required?: boolean;
}) {
  return (
    <SegmentedButtons
      label="Delivery Type"
      required={required}
      value={value}
      onChange={onChange}
      error={error}
      options={[
        { value: "NSVD", label: "NSVD" },
        { value: "CS", label: "CS" },
      ]}
    />
  );
}

function SuffixField({
  value,
  otherValue,
  onChangeSelect,
  onChangeOther,
  error,
}: {
  value: string;
  otherValue: string;
  onChangeSelect: (v: string) => void;
  onChangeOther: (v: string) => void;
  error?: string;
}) {
  const options = ["", "JR", "SR", "II", "III", "IV"];
  const useOther = value === "OTHERS";
  const borderCls = error ? CONTROL_ERROR : CONTROL_BORDER;

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{renderFieldLabel("Suffix")}</label>
      <select
        name="suffix"
        value={value || ""}
        onChange={(e) => onChangeSelect(e.target.value)}
        className={`w-full ${CONTROL} ${borderCls}`}
      >
        <option value="">N/A</option>
        {options
          .filter((o) => o !== "")
          .map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        <option value="OTHERS">OTHERS</option>
      </select>
      {useOther && (
        <div className="mt-2">
          <input
            type="text"
            name="suffix_other"
            value={otherValue}
            onChange={(e) => onChangeOther(toAllCaps(e.target.value))}
            placeholder="TYPE OTHER SUFFIX"
            maxLength={10}
            className={`w-full ${CONTROL} uppercase placeholder:uppercase ${CONTROL_BORDER}`}
          />
        </div>
      )}
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  );
}

function CivilStatusField({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  const borderCls = error ? CONTROL_ERROR : CONTROL_BORDER;

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{renderFieldLabel("Civil Status")}</label>
      <select
        name="civil_status"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full ${CONTROL} ${borderCls}`}
      >
        <option value="">SELECT CIVIL STATUS</option>
        {PH_CIVIL_STATUSES.map((cs) => (
          <option key={cs} value={cs}>{cs}</option>
        ))}
      </select>
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  );
}

function PhilhealthField({
  name,
  label,
  value,
  onChange,
  error,
  required = false,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  required?: boolean;
}) {
  const [localError, setLocalError] = React.useState<string | null>(null);
  const digits = (value || "").replace(/\D/g, "").slice(0, 12);

  const formatPhilhealth = (d: string): string => {
    const p1 = d.slice(0, 2);
    const p2 = d.slice(2, 11);
    const p3 = d.slice(11, 12);
    if (!p1) return "";
    if (!p2) return p1;
    if (!p3) return `${p1}-${p2}`;
    return `${p1}-${p2}-${p3}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextDigits = e.target.value.replace(/\D/g, "").slice(0, 12);
    onChange(nextDigits);
    if (nextDigits.length > 12) setLocalError("PhilHealth number must not exceed 12 digits.");
    else setLocalError(null);
  };

  const formatted = formatPhilhealth(digits);
  const hasError = !!(error || localError);
  const borderCls = hasError ? CONTROL_ERROR : CONTROL_BORDER;

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{renderFieldLabel(label, required)}</label>
      <input
        name={name}
        type="text"
        value={formatted}
        onChange={handleChange}
        placeholder="XX-XXXXXXXXX-X"
        inputMode="numeric"
        className={`w-full ${CONTROL} tracking-[0.14em] ${borderCls}`}
        required
      />
      {(error || localError) && <p className="text-sm text-red-600 mt-1">{error || localError}</p>}
    </div>
  );
}

function HealthCenterField({
  name,
  label,
  value,
  onChange,
  error,
  required = false,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  required?: boolean;
}) {
  const borderCls = error ? CONTROL_ERROR : CONTROL_BORDER;

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{renderFieldLabel(label, required)}</label>
      <select
        name={name}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full ${CONTROL} ${borderCls}`}
      >
        <option value="">SELECT HEALTH CENTER</option>
        {HEALTH_CENTER_FACILITIES.map((f) => (
          <option key={f} value={f}>{f}</option>
        ))}
      </select>
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  );
}

function FamilyNumberField({
  name,
  label,
  value,
  onChange,
  error,
  required = false,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  required?: boolean;
}) {
  const [localError, setLocalError] = React.useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, "");
    if (digitsOnly === "") {
      onChange("");
      setLocalError(null);
      return;
    }

    const num = Number(digitsOnly);
    onChange(digitsOnly);

    if (!isNaN(num) && num > 10000) {
      setLocalError("Family Serial Number must not exceed 4 digits.");
    } else {
      setLocalError(null);
    }
  };

  const hasError = !!(error || localError);
  const borderCls = hasError ? CONTROL_ERROR : CONTROL_BORDER;

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{renderFieldLabel(label, required)}</label>
      <input
        name={name}
        type="tel"
        inputMode="numeric"
        value={value}
        onChange={handleChange}
        placeholder="e.g. 123"
        className={`w-full ${CONTROL} ${borderCls}`}
      />
      {(error || localError) && <p className="text-sm text-red-600 mt-1">{error || localError}</p>}
    </div>
  );
}

function BarangayField({
  value,
  options,
  disabled,
  onChange,
  error,
}: {
  value: string;
  options: readonly string[];
  disabled: boolean;
  onChange: (v: string) => void;
  error?: string;
}) {
  const [useOther, setUseOther] = React.useState<boolean>(() => (value ? !options.includes(value) : false));

  React.useEffect(() => {
    if (value) setUseOther(!options.includes(value));
    else setUseOther(false);
  }, [value, options]);

  const selectValue = disabled ? "" : useOther ? BRGY_OTHER : value || "";
  const borderCls = error ? CONTROL_ERROR : CONTROL_BORDER;

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{renderFieldLabel("Barangay")}</label>

      <select
        value={selectValue}
        disabled={disabled}
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
        className={`w-full ${CONTROL} disabled:bg-slate-50 disabled:text-slate-400 ${borderCls}`}
      >
        <option value="">{disabled ? "DISABLED" : "— SELECT BARANGAY —"}</option>
        {!disabled &&
          options.map((b) => (
            <option key={b} value={b}>{b.toUpperCase()}</option>
          ))}
        {!disabled && <option value={BRGY_OTHER}>OTHER (TYPE MANUALLY)</option>}
      </select>

      {!disabled && useOther && (
        <div className="mt-2">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(toAllCaps(e.target.value))}
            placeholder="TYPE BARANGAY NAME"
            maxLength={80}
            className={`w-full ${CONTROL} uppercase placeholder:uppercase ${borderCls}`}
          />
        </div>
      )}

      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  );
}