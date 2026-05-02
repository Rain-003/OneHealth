import * as React from "react";
import { Head, usePage, router } from "@inertiajs/react";
import { ImmunizationCard } from "@/components/immunization-card";

// Brand assets (same as center header)
import Logo from "/public/build/assets/LOGO.svg";
import BackIcon from "/public/build/assets/back-outline-svgrepo-com.svg";

/* Small icon used by several center pages */
const IconClipboard = (p: any) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...p} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M9 2h6a2 2 0 0 1 2 2v1h-2V4H9v1H7V4a2 2 0 0 1 2-2z" />
    <rect x="7" y="7" width="10" height="12" rx="2" />
    <path d="M9 11h6M9 15h6" />
  </svg>
);

/* Pencil / edit icon */
const IconEdit = (p: any) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...p} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M4 20h4l9.5-9.5a1.5 1.5 0 0 0 0-2.12L15.62 6.5a1.5 1.5 0 0 0-2.12 0L4 16v4z" />
    <path d="M13.5 7.5 16.5 10.5" />
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

type PatientType = "immunization" | "pregnancy";
type PatientStatus = "active" | "transferred" | "deceased" | "left_without_notice" | string;

type Patient = {
  id: number;
  full_name?: string | null;
  birthdate?: string | null;
  barangay?: string | null;
  patient_type?: PatientType | null;

  mother_name?: string | null;
  father_name?: string | null;

  place_of_birth?: string | null;
  contact_no?: string | null;

  address?: string | null;
  sex?: string | null;
  health_center?: string | null;
  family_no?: string | null;

  phone_number?: string | null;
  phone?: string | null;

  status?: PatientStatus | null;

  // wizard / new immunization fields
  date_of_registration?: string | null;
  date_referred_nb_screening?: string | null;
  date_nbs_done?: string | null;
  birth_weight_kg?: number | string | null;
  child_height_cm?: number | string | null;
  cpab?: string | null;
  delivery_type?: string | null;
  tt_status_mother?: string | null;
  tt_status_date?: string | null;
};

type Dose = {
  vaccine: string;
  dose_label: string;
  date_given: string | null;
  remarks?: string | null;
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
  patient: Patient;
  owner?: { id: number; name?: string | null; barangay?: string | null } | null;
  canEdit?: boolean;
  pendingOwnershipRequestId?: number | null;
  transferTargets?: { id: number; name?: string | null; barangay?: string | null }[];
  dashboardUrl?: string;
  flash?: { status?: string };
  csrf?: string;
  immunization?: {
    matrix: Record<string, string[]> | null;
    doses: Dose[] | [];
  };
  barangayTransferHistory?: TransferHistoryRow[];
};

function fmtMDY(v?: string | null): string {
  if (!v) return "—";
  const s = String(v).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const y = Number(m[1]),
      mm = Number(m[2]),
      dd = Number(m[3]);
    return `${String(mm).padStart(2, "0")}/${String(dd).padStart(2, "0")}/${String(y).padStart(4, "0")}`;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime())
    ? s
    : d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
}

function fmtDateTime(v?: string | null): string {
  if (!v) return "—";
  const s = String(v).trim();
  const safe = s.includes("T") ? s : s.replace(" ", "T");
  const d = new Date(safe);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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

const NAME_SUFFIX_OPTIONS: readonly string[] = ["", "JR", "SR", "II", "III", "IV", "V", "OTHERS"];
const TT_STATUS_OPTIONS: readonly string[] = ["", "TT1", "TT2", "TT3", "TT4", "TT5", "FULLY IMMUNIZED"];
const DELIVERY_TYPE_OPTIONS: readonly string[] = ["", "NSD", "CS", "HOME", "BREECH", "ASSISTED", "OTHERS"];
const BRGY_OTHER = "__BRGY_OTHER__";

const LIMITS = {
  first_name: 50,
  middle_name: 50,
  last_name: 50,
  suffix_other: 20,
  family_no: 5,
  mother_name: 80,
  father_name: 80,
  place_of_birth: 80,
  address: 255,
  barangay_other: 80,
  cpab: 100,
  birth_weight_kg: 5,
  child_height_cm: 6,
};

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

function trimPhone(v?: string): string {
  if (!v) return "";
  let digits = v.replace(/\D/g, "");
  if (digits.startsWith("63")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  digits = digits.slice(-10);
  return digits;
}

function clampText(v: string, max: number, upper = false) {
  const next = String(v ?? "").slice(0, max);
  return upper ? toAllCaps(next) : next;
}

function clampNumericText(v: string, maxLen: number, allowDot = false) {
  let next = String(v ?? "");
  next = allowDot ? next.replace(/[^\d.]/g, "") : next.replace(/\D/g, "");
  if (allowDot) {
    const firstDot = next.indexOf(".");
    if (firstDot >= 0) {
      next = next.slice(0, firstDot + 1) + next.slice(firstDot + 1).replace(/\./g, "");
    }
  }
  return next.slice(0, maxLen);
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

function validateDecimalRange(raw: string, min: number, max: number, label: string): string | null {
  const v = String(raw ?? "").trim();
  if (!v) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return `${label} must be a valid number.`;
  if (n < min || n > max) return `${label} must be between ${min} and ${max}.`;
  return null;
}

function splitWizardStyleFullName(fullName?: string | null) {
  const raw = String(fullName ?? "").trim();
  if (!raw) {
    return {
      first_name: "",
      middle_name: "",
      last_name: "",
      suffix: "",
      suffix_other: "",
    };
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
    return {
      first_name: parts[0] ?? "",
      middle_name: "",
      last_name: "",
      suffix,
      suffix_other: "",
    };
  }

  if (parts.length === 2) {
    return {
      first_name: parts[0] ?? "",
      middle_name: "",
      last_name: parts[1] ?? "",
      suffix,
      suffix_other: "",
    };
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

function base64UrlDecode(input: string): string | null {
  try {
    const s = String(input || "").trim();
    if (!s) return null;
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return null;
  }
}

function readFocusTargetFromUrl(): { vaccine: string; label: string } | null {
  if (typeof window === "undefined") return null;

  const sp = new URLSearchParams(window.location.search);

  const f = sp.get("f");
  if (f) {
    const decoded = base64UrlDecode(f);
    if (decoded) {
      const parts = decoded.split("\n");
      const vaccine = (parts[0] ?? "").trim();
      const label = (parts.slice(1).join("\n") ?? "").trim();
      if (vaccine && label) return { vaccine, label };
    }
  }

  const focus = sp.get("focus");
  if (focus) {
    const decoded = decodeURIComponent(focus);
    const parts = decoded.split("__");
    if (parts.length >= 2) {
      const vaccine = (parts[0] ?? "").trim();
      const label = parts.slice(1).join("__").trim();
      if (vaccine && label) return { vaccine, label };
    }
  }

  const v = sp.get("focusVaccine");
  const l = sp.get("focusDose");
  if (v && l) {
    const vaccine = decodeURIComponent(v).trim();
    const label = decodeURIComponent(l).trim();
    if (vaccine && label) return { vaccine, label };
  }

  return null;
}

function stripQueryFromAddressBar() {
  if (typeof window === "undefined") return;
  const { pathname, hash } = window.location;
  const clean = `${pathname}${hash || ""}`;
  try {
    window.history.replaceState(null, document.title, clean);
  } catch {}
}

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
    <div
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button type="button" aria-label="Close modal" onClick={onClose} className="absolute inset-0 cursor-default" />

      <div
        className={[
          "relative w-full sm:max-w-2xl",
          "bg-white shadow-2xl border border-slate-200",
          "rounded-t-2xl sm:rounded-2xl",
          "max-h-[88vh] sm:max-h-[90vh]",
          "flex flex-col",
        ].join(" ")}
      >
        <div className="sticky top-0 z-10 bg-white rounded-t-2xl sm:rounded-t-2xl border-b border-slate-200">
          <div className="px-4 sm:px-6 py-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id={titleId} className="text-base sm:text-lg font-semibold text-slate-900">
                {title}
              </h2>
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

function TransferHistoryList({ rows, currentBarangay }: { rows: TransferHistoryRow[]; currentBarangay: string }) {
  const items = Array.isArray(rows) ? rows : [];

  if (items.length === 0) {
    return <EmptyState title="No transfer history yet" hint="This patient hasn’t been transferred between barangays." />;
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4">
        <div className="text-xs font-semibold text-teal-800 uppercase tracking-wide">Current barangay</div>
        <div className="mt-1 text-sm sm:text-base font-semibold text-teal-900">
          {canonicalBarangay(currentBarangay) || "—"}
        </div>
      </div>

      <ol className="space-y-3">
        {items.map((r, idx) => {
          const from = canonicalBarangay(r.from_barangay) || "—";
          const to = canonicalBarangay(r.to_barangay) || "—";
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

export default function RecordsShow() {
  const { props } = usePage<PageProps>();
  const {
    patient,
    canEdit = false,
    pendingOwnershipRequestId,
    transferTargets = [],
    dashboardUrl,
    immunization,
    flash,
    csrf: sharedCsrf,
    barangayTransferHistory = [],
  } = props;

  const csrf = sharedCsrf ?? ((document.querySelector("meta[name='csrf-token']") as HTMLMetaElement)?.content || "");

  const focusTarget = React.useMemo(() => readFocusTargetFromUrl(), []);

  React.useEffect(() => {
    if (!focusTarget) return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.has("f") || sp.has("focus") || sp.has("focusVaccine") || sp.has("focusDose")) {
      stripQueryFromAddressBar();
    }
  }, [focusTarget]);

  const requestOwnership = React.useCallback(() => {
    if (pendingOwnershipRequestId) return;
    router.post(
      `/center/patients/${patient.id}/ownership-requests`,
      { _token: csrf },
      { preserveScroll: true, replace: true } as any
    );
  }, [pendingOwnershipRequestId, patient.id, csrf]);

  const ui = {
    shell: "w-full min-w-0 max-w-none mx-auto px-2 sm:px-3 md:px-4 lg:px-5 xl:px-6 2xl:px-8",
    panel: "w-full min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm p-2 sm:p-4",
  };

  const fieldBase =
    "mt-1 w-full rounded-xl h-12 min-h-[48px] border px-3 text-[15px] focus:outline-none focus:ring-2";
  const blockButtonBase =
    "inline-flex items-center justify-center rounded-xl h-12 min-h-[48px] px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0F8A99]";

  const isImmunization = patient.patient_type === "immunization";

  const name = patient.full_name ?? `Patient #${patient.id}`;
  const birth = fmtMDY(patient.birthdate);

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    if (dashboardUrl) router.visit(dashboardUrl, { replace: true } as any);
    else router.visit("/center/records", { replace: true } as any);
  };

  const [editOpen, setEditOpen] = React.useState(false);
  const [transferOpen, setTransferOpen] = React.useState(false);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [newOwnerId, setNewOwnerId] = React.useState<string>("");

  const initialContact = patient.contact_no ?? (patient as any).phone_number ?? (patient as any).phone ?? "";
  const initialSplitName = splitWizardStyleFullName(patient.full_name);

  const [form, setForm] = React.useState({
    first_name: initialSplitName.first_name,
    middle_name: initialSplitName.middle_name,
    last_name: initialSplitName.last_name,
    suffix: initialSplitName.suffix,
    suffix_other: initialSplitName.suffix_other,

    birthdate: dateOnly(patient.birthdate),
    sex: patient.sex ?? "",
    contact_no: trimPhone(initialContact),
    barangay: canonicalBarangay(patient.barangay),
    address: patient.address ?? "",
    family_no: patient.family_no ?? "",
    mother_name: patient.mother_name ?? "",
    father_name: patient.father_name ?? "",
    place_of_birth: patient.place_of_birth ?? "",
    health_center: toAllCaps(patient.health_center ?? ""),
    status: String(patient.status ?? "active"),

    // immunization edit fields
    birth_weight_kg: patient.birth_weight_kg != null ? String(patient.birth_weight_kg) : "",
    child_height_cm: patient.child_height_cm != null ? String(patient.child_height_cm) : "",
    date_of_registration: dateOnly(patient.date_of_registration),
    date_referred_nb_screening: dateOnly(patient.date_referred_nb_screening),
    date_nbs_done: dateOnly(patient.date_nbs_done),
    cpab: patient.cpab ?? "",
    delivery_type: toAllCaps(patient.delivery_type ?? ""),
    tt_status_mother: toAllCaps(patient.tt_status_mother ?? ""),
    tt_status_date: dateOnly(patient.tt_status_date),
  });

  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string | null>>({});

  const CAPS_KEYS: (keyof typeof form)[] = [
    "first_name",
    "middle_name",
    "last_name",
    "suffix_other",
    "family_no",
    "mother_name",
    "father_name",
    "place_of_birth",
    "health_center",
    "address",
    "cpab",
    "delivery_type",
    "tt_status_mother",
  ];

  React.useEffect(() => {
    if (!editOpen) return;

    const resetContact = patient.contact_no ?? (patient as any).phone_number ?? (patient as any).phone ?? "";
    const splitName = splitWizardStyleFullName(patient.full_name);

    setForm({
      first_name: splitName.first_name,
      middle_name: splitName.middle_name,
      last_name: splitName.last_name,
      suffix: splitName.suffix,
      suffix_other: splitName.suffix_other,

      birthdate: dateOnly(patient.birthdate),
      sex: patient.sex ?? "",
      contact_no: trimPhone(resetContact),
      barangay: canonicalBarangay(patient.barangay),
      address: patient.address ?? "",
      family_no: patient.family_no ?? "",
      mother_name: patient.mother_name ?? "",
      father_name: patient.father_name ?? "",
      place_of_birth: patient.place_of_birth ?? "",
      health_center: toAllCaps(patient.health_center ?? ""),
      status: String(patient.status ?? "active"),

      birth_weight_kg: patient.birth_weight_kg != null ? String(patient.birth_weight_kg) : "",
      child_height_cm: patient.child_height_cm != null ? String(patient.child_height_cm) : "",
      date_of_registration: dateOnly(patient.date_of_registration),
      date_referred_nb_screening: dateOnly(patient.date_referred_nb_screening),
      date_nbs_done: dateOnly(patient.date_nbs_done),
      cpab: patient.cpab ?? "",
      delivery_type: toAllCaps(patient.delivery_type ?? ""),
      tt_status_mother: toAllCaps(patient.tt_status_mother ?? ""),
      tt_status_date: dateOnly(patient.tt_status_date),
    });
    setFieldErrors({});
  }, [editOpen, patient]);

  function updateField<K extends keyof typeof form>(key: K, value: string) {
    let nextValue = value;

    if (key === "first_name") nextValue = clampText(value, LIMITS.first_name, true);
    if (key === "middle_name") nextValue = clampText(value, LIMITS.middle_name, true);
    if (key === "last_name") nextValue = clampText(value, LIMITS.last_name, true);
    if (key === "suffix_other") nextValue = clampText(value, LIMITS.suffix_other, true);
    if (key === "family_no") nextValue = clampNumericText(value, LIMITS.family_no, false);
    if (key === "mother_name") nextValue = clampText(value, LIMITS.mother_name, true);
    if (key === "father_name") nextValue = clampText(value, LIMITS.father_name, true);
    if (key === "place_of_birth") nextValue = clampText(value, LIMITS.place_of_birth, true);
    if (key === "address") nextValue = clampText(value, LIMITS.address, true);
    if (key === "cpab") nextValue = clampText(value, LIMITS.cpab, true);
    if (key === "birth_weight_kg") nextValue = clampNumericText(value, LIMITS.birth_weight_kg, true);
    if (key === "child_height_cm") nextValue = clampNumericText(value, LIMITS.child_height_cm, true);
    if (CAPS_KEYS.includes(key) && !["birth_weight_kg", "child_height_cm"].includes(String(key))) {
      nextValue = toAllCaps(nextValue);
    }

    setForm((prev) => ({
      ...prev,
      [key]: nextValue,
      ...(key === "suffix" && nextValue !== "OTHERS" ? { suffix_other: "" } : {}),
    }));

    setFieldErrors((prev) => {
      let msg: string | null = null;

      if (key === "first_name") msg = validatePersonName(nextValue);
      if (key === "middle_name") msg = validatePersonName(nextValue);
      if (key === "last_name") msg = validatePersonName(nextValue);
      if (key === "mother_name") msg = validatePersonName(nextValue);
      if (key === "father_name") msg = validatePersonName(nextValue);
      if (key === "family_no") msg = validateFamilyNo(nextValue);
      if (key === "suffix_other" && form.suffix === "OTHERS") msg = validatePersonName(nextValue);
      if (key === "birth_weight_kg") msg = validateDecimalRange(nextValue, 0, 20, "Birth weight");
      if (key === "child_height_cm") msg = validateDecimalRange(nextValue, 0, 200, "Child height");

      return { ...prev, [key]: msg };
    });
  }

  function validateEditForm() {
    const errors: Record<string, string | null> = {};

    errors.first_name = !form.first_name.trim() ? "First name is required." : validatePersonName(form.first_name);

    errors.middle_name = validatePersonName(form.middle_name);

    errors.last_name = !form.last_name.trim() ? "Last name is required." : validatePersonName(form.last_name);

    errors.suffix_other =
      String(form.suffix).toUpperCase() === "OTHERS"
        ? !form.suffix_other.trim()
          ? "Other suffix is required."
          : validatePersonName(form.suffix_other)
        : null;

    errors.mother_name = validatePersonName(form.mother_name);
    errors.father_name = validatePersonName(form.father_name);
    errors.family_no = validateFamilyNo(form.family_no);
    errors.birth_weight_kg = validateDecimalRange(form.birth_weight_kg, 0, 20, "Birth weight");
    errors.child_height_cm = validateDecimalRange(form.child_height_cm, 0, 200, "Child height");

    const today = new Date().toISOString().slice(0, 10);

    if (form.birthdate && dateOnly(form.birthdate) > today) {
      errors.birthdate = "Birthdate cannot be later than today.";
    } else {
      errors.birthdate = null;
    }

    for (const k of [
      "date_of_registration",
      "date_referred_nb_screening",
      "date_nbs_done",
      "tt_status_date",
    ] as const) {
      if (form[k] && dateOnly(form[k]) > today) {
        errors[k] = "Date cannot be later than today.";
      } else {
        errors[k] = null;
      }
    }

    setFieldErrors(errors);
    return Object.values(errors).every((v) => !v);
  }

  function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateEditForm()) return;

    const full_name = buildWizardStyleFullName(form);

    const payload = {
      full_name,
      birthdate: dateOnly(form.birthdate),
      sex: form.sex,
      contact_no: normalizePhone(form.contact_no),
      barangay: canonicalBarangay(form.barangay),
      address: form.address,
      family_no: form.family_no,
      mother_name: form.mother_name,
      father_name: form.father_name,
      place_of_birth: form.place_of_birth,
      health_center: toAllCaps(form.health_center),
      status: String(form.status || "active").toLowerCase(),

      birth_weight_kg: form.birth_weight_kg || null,
      child_height_cm: form.child_height_cm || null,
      date_of_registration: dateOnly(form.date_of_registration) || null,
      date_referred_nb_screening: dateOnly(form.date_referred_nb_screening) || null,
      date_nbs_done: dateOnly(form.date_nbs_done) || null,
      cpab: form.cpab || null,
      delivery_type: form.delivery_type || null,
      tt_status_mother: form.tt_status_mother || null,
      tt_status_date: dateOnly(form.tt_status_date) || null,

      _method: "PUT",
    };

    router.post(`/center/records/${patient.id}`, payload, {
      preserveScroll: true,
      onSuccess: () => setEditOpen(false),
    });
  }

  const [toast, setToast] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (flash?.status) {
      setToast(flash.status);
      const t = window.setTimeout(() => setToast(null), 4000);
      return () => window.clearTimeout(t);
    }
  }, [flash?.status]);

  const historyCount = Array.isArray(barangayTransferHistory) ? barangayTransferHistory.length : 0;
  const hasClientErrors = Object.values(fieldErrors).some(Boolean);

  return (
    <div
      className="oh-fit min-h-dvh bg-white text-slate-900"
      style={{
        fontFamily:
          "'Poppins', ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
      }}
    >
      <Head title="Patient">
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        html, body { overflow-x: hidden !important; }

        .oh-fit {
          width: 100%;
          max-width: 100vw;
          overflow-x: hidden;
        }

        .oh-no-x { overflow-x: hidden !important; }

        .oh-page-wide {
          width: 100%;
          max-width: none !important;
        }

        .oh-immunization-wide,
        .oh-immunization-wide > *,
        .oh-immunization-wide main,
        .oh-immunization-wide section {
          width: 100% !important;
          max-width: none !important;
        }

        .oh-immunization-wide .max-w-7xl,
        .oh-immunization-wide .max-w-6xl,
        .oh-immunization-wide .max-w-5xl,
        .oh-immunization-wide .max-w-screen-2xl,
        .oh-immunization-wide .max-w-screen-xl {
          max-width: none !important;
        }

        @media (max-width: 420px) {
          .oh-fit {
            width: 100vw;
            margin-left: calc(50% - 50vw);
            margin-right: calc(50% - 50vw);
          }
          .oh-stack-xs { display: grid !important; grid-template-columns: 1fr; align-items: stretch; gap: .5rem; height: auto !important; padding-top: .5rem; padding-bottom: .5rem; }
          .oh-brand-xs { gap: .5rem; }
          .oh-header-compact { padding-left: .5rem !important; padding-right: .5rem !important; }
        }
      `}</style>

      <header className="relative z-20 border-b border-slate-200 bg-white/90 backdrop-blur oh-no-x">
        <div className={[ui.shell, "flex min-h-16 items-center gap-2 py-2 sm:gap-3 sm:py-2.5"].join(" ")}>
          <button
            type="button"
            onClick={goBack}
            className="inline-flex h-10 min-h-[40px] shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-2.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0F8A99] sm:px-3"
            aria-label="Back"
          >
            <img src={BackIcon} alt="" className="h-4 w-4" draggable={false} />
            <span className="hidden min-[390px]:inline">Back</span>
          </button>

          <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1.55fr)_auto_auto_auto] items-center gap-1.5 sm:gap-2 md:grid-cols-[minmax(0,2.1fr)_minmax(92px,.55fr)_minmax(120px,.75fr)_auto_auto] lg:grid-cols-[minmax(260px,2.4fr)_minmax(110px,.65fr)_minmax(160px,.9fr)_auto_auto] xl:gap-3">
            <div className="min-w-0 leading-tight">
              <div className="truncate text-[13px] font-semibold text-slate-800 min-[390px]:text-sm sm:text-[15px] md:text-base">
                {name}
              </div>
              <div className="hidden text-[10px] text-slate-500 min-[390px]:block sm:text-[11px] md:hidden">
                Patient record
              </div>
            </div>

            <div className="hidden min-w-0 rounded-xl border border-slate-200 bg-slate-50/80 px-2 py-1.5 text-right md:block lg:text-left">
              <div className="text-[9px] font-semibold uppercase tracking-wide text-slate-400 lg:text-[10px]">Birthdate</div>
              <div className="truncate text-[11px] font-semibold text-slate-700 lg:text-xs">{patient?.birthdate ? birth : "—"}</div>
            </div>

            <div className="hidden min-w-0 rounded-xl border border-slate-200 bg-slate-50/80 px-2 py-1.5 md:block">
              <div className="text-[9px] font-semibold uppercase tracking-wide text-slate-400 lg:text-[10px]">Barangay</div>
              <div className="truncate text-[11px] font-semibold text-slate-700 lg:text-xs">
                {patient?.barangay ? canonicalBarangay(patient.barangay) : "—"}
              </div>
            </div>

            <div className="hidden min-w-0 justify-self-end sm:block">
              {patient?.status ? <StatusBadge status={patient.status as PatientStatus} compact /> : null}
            </div>

            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="inline-flex h-9 min-h-[36px] min-w-[38px] shrink-0 items-center justify-center gap-1.5 justify-self-end rounded-xl border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0F8A99] sm:h-10 sm:min-h-[40px] sm:min-w-[44px] md:px-2.5 lg:px-3"
              title="View barangay transfer history"
              aria-label={`View barangay transfer history, ${historyCount} item${historyCount === 1 ? "" : "s"}`}
            >
              <IconHistory className="h-4 w-4 shrink-0" />
              <span className="hidden lg:inline">History</span>
              <span className="inline-flex min-w-[18px] justify-center rounded-full bg-slate-100 px-1.5 py-[1px] text-[10px] font-bold text-slate-700">
                {historyCount}
              </span>
            </button>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            <img
              src={Logo}
              alt="OneHealth logo"
              className="h-9 w-9 rounded-xl select-none sm:h-10 sm:w-10"
              draggable={false}
            />
            <div className="hidden leading-tight xl:block">
              <div className="text-base md:text-lg font-semibold tracking-wide text-[#203D7A]">ONE HEALTH</div>
              <div className="text-[11px] uppercase tracking-wider text-slate-500">Records · Patient</div>
            </div>
          </div>
        </div>
      </header>

      <main className={`${ui.shell} oh-page-wide py-2 sm:py-3`}>
        <div className="mb-3 grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <h1 className="min-w-0 text-xl md:text-2xl font-semibold text-[#203D7A] tracking-tight flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[#0F8A99]/10 shrink-0">
              <IconClipboard className="h-4 w-4 text-[#0F8A99]" />
            </span>
            <span className="truncate">{isImmunization ? "Immunization record" : "Patient record"}</span>
          </h1>

          {canEdit ? (
            <div className="w-full lg:w-auto lg:justify-self-end">
              <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
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
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-slate-700 text-xs">↔</span>
                <span>{pendingOwnershipRequestId ? "Request pending" : "Request ownership"}</span>
              </button>
            </div>
          )}
        </div>

        <section className={isImmunization ? "w-full min-w-0" : ui.panel}>
          <div className="oh-immunization-wide w-full min-w-0 overflow-x-hidden">
            {isImmunization && immunization?.matrix ? (
              <ImmunizationCard
                patient={patient as any}
                matrix={immunization.matrix!}
                doses={immunization.doses as Dose[]}
                editable={canEdit}
                focus={focusTarget}
              />
            ) : (
              <div className="text-sm text-slate-700">
                This patient is not registered as an <span className="font-medium">immunization</span> patient.
              </div>
            )}
          </div>
        </section>

        <div className="mt-8 flex w-full max-w-none items-center justify-between border-t border-slate-200 pt-5">
          <div className="flex items-center gap-2">
            <img src={Logo} alt="OneHealth logo" className="h-8 w-8 rounded-lg" />
            <span className="text-sm font-semibold tracking-wide text-[#203D7A]">ONE HEALTH</span>
          </div>
          <span className="text-xs text-slate-500">© {new Date().getFullYear()} OneHealth. All rights reserved.</span>
        </div>
      </main>

      <ModalShell
        open={transferOpen}
        titleId="transfer-title"
        title="Assign health worker"
        subtitle="Moves the patient record to another health worker. Barangay can change depending on your flow."
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
              className={`${fieldBase} border-slate-300 bg-white focus:ring-[#0F8A99]`}
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
              className={`w-full sm:w-auto ${blockButtonBase} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!newOwnerId}
              onClick={() => {
                router.post(
                  `/center/patients/${patient.id}/ownership-transfer`,
                  { new_owner_id: Number(newOwnerId), _token: csrf },
                  { preserveScroll: true }
                );
                setTransferOpen(false);
              }}
              className={`w-full sm:w-auto ${blockButtonBase} bg-[#0F8A99] text-white disabled:opacity-50`}
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
            className={`w-full sm:w-auto ${blockButtonBase} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
          >
            Close
          </button>
        </div>
      </ModalShell>

      {editOpen && (
        <div
          className="fixed inset-0 z-[80]"
          style={{
            fontFamily:
              "'Poppins', ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
          }}
        >
          <div className="absolute inset-0 bg-black/50" onClick={() => setEditOpen(false)} />

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
                </div>

                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="inline-flex items-center justify-center rounded-xl h-12 min-h-[48px] w-12 border border-slate-300 bg-white shadow-sm hover:shadow-md active:translate-y-[1px] focus:outline-none focus:ring-2 focus:ring-[#0F8A99] shrink-0"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-4 pb-24 sm:px-5 sm:py-5 lg:px-6">
              <form onSubmit={submitEdit} className="space-y-4 sm:space-y-5">
                <section className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3 sm:p-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-4">Patient identity</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">
                        First name <span className="text-slate-400">({form.first_name.length}/{LIMITS.first_name})</span>
                      </label>
                      <input
                        type="text"
                        value={form.first_name}
                        onChange={(e) => updateField("first_name", e.target.value)}
                        maxLength={LIMITS.first_name}
                        className={`${fieldBase} uppercase placeholder:uppercase ${
                          fieldErrors.first_name ? "border-red-500 focus:ring-red-500" : "border-slate-300 focus:ring-[#0F8A99]"
                        }`}
                        required
                      />
                      {fieldErrors.first_name && <p className="text-sm text-red-600 mt-1">{fieldErrors.first_name}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700">
                        Middle name <span className="text-slate-400">({form.middle_name.length}/{LIMITS.middle_name})</span>
                      </label>
                      <input
                        type="text"
                        value={form.middle_name}
                        onChange={(e) => updateField("middle_name", e.target.value)}
                        maxLength={LIMITS.middle_name}
                        className={`${fieldBase} uppercase placeholder:uppercase ${
                          fieldErrors.middle_name ? "border-red-500 focus:ring-red-500" : "border-slate-300 focus:ring-[#0F8A99]"
                        }`}
                      />
                      {fieldErrors.middle_name && <p className="text-sm text-red-600 mt-1">{fieldErrors.middle_name}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700">
                        Last name <span className="text-slate-400">({form.last_name.length}/{LIMITS.last_name})</span>
                      </label>
                      <input
                        type="text"
                        value={form.last_name}
                        onChange={(e) => updateField("last_name", e.target.value)}
                        maxLength={LIMITS.last_name}
                        className={`${fieldBase} uppercase placeholder:uppercase ${
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
                        className={`${fieldBase} border-slate-300 bg-white focus:ring-[#0F8A99]`}
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
                        <label className="block text-sm font-medium text-slate-700">
                          Other suffix <span className="text-slate-400">({form.suffix_other.length}/{LIMITS.suffix_other})</span>
                        </label>
                        <input
                          type="text"
                          value={form.suffix_other}
                          onChange={(e) => updateField("suffix_other", e.target.value)}
                          maxLength={LIMITS.suffix_other}
                          className={`${fieldBase} uppercase placeholder:uppercase ${
                            fieldErrors.suffix_other ? "border-red-500 focus:ring-red-500" : "border-slate-300 focus:ring-[#0F8A99]"
                          }`}
                        />
                        {fieldErrors.suffix_other && <p className="text-sm text-red-600 mt-1">{fieldErrors.suffix_other}</p>}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <DateFieldWithToday
                      label="Birthdate"
                      value={form.birthdate}
                      onChange={(v) => updateField("birthdate", v)}
                      error={fieldErrors.birthdate ?? undefined}
                    />

                    <SexToggleField value={form.sex ?? ""} onChange={(v) => updateField("sex", v)} />
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3 sm:p-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-4">Contact and location</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <PhoneField label="Contact no." value={form.contact_no ?? ""} onChange={(v) => updateField("contact_no", v)} />

                    <div>
                      <label className="block text-sm font-medium text-slate-700">
                        Family no. <span className="text-slate-400">({form.family_no.length}/{LIMITS.family_no})</span>
                      </label>
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={form.family_no ?? ""}
                        onChange={(e) => updateField("family_no", e.target.value)}
                        maxLength={LIMITS.family_no}
                        placeholder="e.g. 123"
                        className={`${fieldBase} ${
                          fieldErrors.family_no ? "border-red-500 focus:ring-red-500" : "border-slate-300 focus:ring-[#0F8A99]"
                        }`}
                      />
                      {fieldErrors.family_no && <p className="text-sm text-red-600 mt-1">{fieldErrors.family_no}</p>}
                    </div>

                    <BarangayField
                      value={canonicalBarangay(form.barangay)}
                      options={SILANG_BARANGAYS}
                      disabled={false}
                      onChange={(v) => updateField("barangay", v)}
                    />

                    <HealthCenterField value={form.health_center ?? ""} onChange={(v) => updateField("health_center", v)} />

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-slate-700">
                        Address <span className="text-slate-400">({form.address.length}/{LIMITS.address})</span>
                      </label>
                      <textarea
                        value={form.address ?? ""}
                        onChange={(e) => updateField("address", e.target.value)}
                        maxLength={LIMITS.address}
                        className="mt-1 w-full rounded-xl min-h-[96px] border border-slate-300 px-3 py-3 text-[15px] uppercase placeholder:uppercase focus:outline-none focus:ring-2 focus:ring-[#0F8A99] resize-y"
                        placeholder="HOUSE / STREET, CITY, PROVINCE"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700">
                        Place of birth <span className="text-slate-400">({form.place_of_birth.length}/{LIMITS.place_of_birth})</span>
                      </label>
                      <input
                        type="text"
                        value={form.place_of_birth ?? ""}
                        onChange={(e) => updateField("place_of_birth", e.target.value)}
                        maxLength={LIMITS.place_of_birth}
                        className={`${fieldBase} uppercase placeholder:uppercase border-slate-300 focus:ring-[#0F8A99]`}
                        placeholder="e.g. RHU SILANG"
                      />
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3 sm:p-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-4">Parents</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ParentNameField
                      label="Mother's name"
                      value={form.mother_name ?? ""}
                      onChange={(v) => updateField("mother_name", v)}
                      error={fieldErrors.mother_name ?? undefined}
                    />

                    <ParentNameField
                      label="Father's name"
                      value={form.father_name ?? ""}
                      onChange={(v) => updateField("father_name", v)}
                      error={fieldErrors.father_name ?? undefined}
                    />
                  </div>
                </section>

                {isImmunization && (
                  <section className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3 sm:p-4">
                    <h3 className="text-sm font-semibold text-slate-900 mb-4">Immunization details</h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <DecimalField
                        label="Birth weight (kg)"
                        value={form.birth_weight_kg}
                        onChange={(v) => updateField("birth_weight_kg", v)}
                        placeholder="e.g. 3.2"
                        maxLength={LIMITS.birth_weight_kg}
                        error={fieldErrors.birth_weight_kg ?? undefined}
                      />

                      <DecimalField
                        label="Child height (cm)"
                        value={form.child_height_cm}
                        onChange={(v) => updateField("child_height_cm", v)}
                        placeholder="e.g. 49.5"
                        maxLength={LIMITS.child_height_cm}
                        error={fieldErrors.child_height_cm ?? undefined}
                      />

                      <DateFieldWithToday
                        label="Date of registration"
                        value={form.date_of_registration}
                        onChange={(v) => updateField("date_of_registration", v)}
                        error={fieldErrors.date_of_registration ?? undefined}
                      />

                      <DateFieldWithToday
                        label="Date referred to NB screening"
                        value={form.date_referred_nb_screening}
                        onChange={(v) => updateField("date_referred_nb_screening", v)}
                        error={fieldErrors.date_referred_nb_screening ?? undefined}
                      />

                      <DateFieldWithToday
                        label="Date NBS done"
                        value={form.date_nbs_done}
                        onChange={(v) => updateField("date_nbs_done", v)}
                        error={fieldErrors.date_nbs_done ?? undefined}
                      />

                      <DateFieldWithToday
                        label="TT status date"
                        value={form.tt_status_date}
                        onChange={(v) => updateField("tt_status_date", v)}
                        error={fieldErrors.tt_status_date ?? undefined}
                      />

                      <div>
                        <label className="block text-sm font-medium text-slate-700">
                          CPAB <span className="text-slate-400">({form.cpab.length}/{LIMITS.cpab})</span>
                        </label>
                        <input
                          type="text"
                          value={form.cpab}
                          onChange={(e) => updateField("cpab", e.target.value)}
                          maxLength={LIMITS.cpab}
                          className={`${fieldBase} uppercase placeholder:uppercase border-slate-300 focus:ring-[#0F8A99]`}
                          placeholder="e.g. COMPLETE"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700">Delivery type</label>
                        <select
                          value={form.delivery_type}
                          onChange={(e) => updateField("delivery_type", e.target.value)}
                          className={`${fieldBase} border-slate-300 bg-white focus:ring-[#0F8A99]`}
                        >
                          {DELIVERY_TYPE_OPTIONS.map((opt) => (
                            <option key={opt || "__blank"} value={opt}>
                              {opt || "SELECT DELIVERY TYPE"}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700">TT status of mother</label>
                        <select
                          value={form.tt_status_mother}
                          onChange={(e) => updateField("tt_status_mother", e.target.value)}
                          className={`${fieldBase} border-slate-300 bg-white focus:ring-[#0F8A99]`}
                        >
                          {TT_STATUS_OPTIONS.map((opt) => (
                            <option key={opt || "__blank"} value={opt}>
                              {opt || "SELECT TT STATUS"}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </section>
                )}

                <section className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3 sm:p-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-4">Record status</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Status</label>
                      <select
                        value={String(form.status ?? "active").toLowerCase()}
                        onChange={(e) => updateField("status", e.target.value)}
                        className={`${fieldBase} border-slate-300 bg-white text-[13px] font-semibold tracking-wide focus:ring-[#0F8A99]`}
                      >
                        <option value="active">ACTIVE</option>
                        <option value="transferred">TRANSFERRED</option>
                        <option value="left_without_notice">LEFT WITHOUT NOTICE</option>
                        <option value="deceased">DECEASED</option>
                      </select>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Note: <span className="font-semibold">DECEASED</span> may remove schedules.{" "}
                        <span className="font-semibold">LEFT WITHOUT NOTICE</span> still allows online access.
                      </p>
                    </div>
                  </div>
                </section>

                <div className="pt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setEditOpen(false)}
                    className={`w-full sm:w-auto ${blockButtonBase} border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={hasClientErrors}
                    className={`w-full sm:w-auto ${blockButtonBase} border border-teal-300 bg-[#0F8A99] text-white shadow-sm hover:opacity-95 disabled:opacity-60`}
                  >
                    Save changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center pointer-events-none">
          <div className="pointer-events-auto rounded-xl bg-emerald-600 text-white text-sm shadow-lg px-5 py-3 flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-sm">✓</span>
            <span>{toast}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status, compact = false }: { status?: PatientStatus | null; compact?: boolean }) {
  if (!status) return null;

  const normalized = String(status).toLowerCase() as PatientStatus;

  let label = "Active";
  let classes =
    "inline-flex shrink-0 items-center justify-center rounded-full border px-2.5 py-[3px] text-[11px] font-semibold uppercase tracking-wide " +
    "border-emerald-200 bg-emerald-50 text-emerald-800";

  if (normalized === "deceased") {
    label = "Deceased";
    classes =
      "inline-flex shrink-0 items-center justify-center rounded-full border px-2.5 py-[3px] text-[11px] font-semibold uppercase tracking-wide " +
      "border-rose-200 bg-rose-50 text-rose-800";
  } else if (normalized === "transferred") {
    label = "Transferred";
    classes =
      "inline-flex shrink-0 items-center justify-center rounded-full border px-2.5 py-[3px] text-[11px] font-semibold uppercase tracking-wide " +
      "border-amber-200 bg-amber-50 text-amber-800";
  } else if (normalized === "left_without_notice") {
    label = "Without notice";
    classes =
      "inline-flex shrink-0 items-center justify-center rounded-full border px-2.5 py-[3px] text-[11px] font-semibold uppercase tracking-wide " +
      "border-slate-200 bg-slate-100 text-slate-800";
  }

  return (
    <span className={classes} title={label}>
      <span className={compact ? "hidden lg:inline" : ""}>{label}</span>
      {compact ? <span className="lg:hidden">{label.charAt(0)}</span> : null}
    </span>
  );
}

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

function DecimalField({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  error?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">
        {label}
        {maxLength ? <span className="text-slate-400"> ({value.length}/{maxLength})</span> : null}
      </label>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        placeholder={placeholder}
        className={`mt-1 w-full rounded-xl h-12 min-h-[48px] px-3 text-[15px] focus:outline-none border ${
          error ? "border-red-500 focus:ring-red-500" : "border-slate-300 focus:ring-[#0F8A99]"
        }`}
      />
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
      <label className="block text-sm font-medium text-slate-700">
        {label} <span className="text-slate-400">({digits.length}/10)</span>
      </label>
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

function ParentNameField({
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
  const isNA = value.trim().toUpperCase() === "N/A";

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">
        {label} <span className="text-slate-400">({value.length}/{LIMITS.mother_name})</span>
      </label>
      <div className="mt-1 flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(toAllCaps(e.target.value).slice(0, LIMITS.mother_name))}
          maxLength={LIMITS.mother_name}
          className={`flex-1 rounded-xl h-12 min-h-[48px] px-3 text-[15px] uppercase placeholder:uppercase focus:outline-none border ${
            error ? "border-red-500 focus:ring-red-500" : "border-slate-300 focus:ring-[#0F8A99]"
          }`}
        />
        <button
          type="button"
          onClick={() => onChange(isNA ? "" : "N/A")}
          className={`h-12 min-h-[48px] px-3 rounded-xl text-xs font-semibold tracking-wide border transition ${
            isNA
              ? "bg-[#0F8A99] text-white border-[#0F8A99]"
              : "bg-white text-slate-700 border-slate-300 hover:border-[#0F8A99]/80"
          }`}
        >
          N/A
        </button>
      </div>
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
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
    { value: "Male", label: "MALE" },
    { value: "Female", label: "FEMALE" },
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

function HealthCenterField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">Health center / facility</label>
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl h-12 min-h-[48px] px-3 text-[15px] focus:outline-none border border-slate-300 focus:ring-2 focus:ring-[#0F8A99] bg-white"
      >
        <option value="">SELECT HEALTH CENTER</option>
        {HEALTH_CENTER_FACILITIES.map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>
    </div>
  );
}

function BarangayField({
  value,
  options,
  disabled,
  onChange,
}: {
  value: string;
  options: readonly string[];
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  const [useOther, setUseOther] = React.useState<boolean>(() => (value ? !options.includes(value) : false));

  React.useEffect(() => {
    if (value) setUseOther(!options.includes(value));
    else setUseOther(false);
  }, [value, options]);

  const selectValue = disabled ? "" : useOther ? BRGY_OTHER : value || "";

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">Barangay</label>

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
        className="mt-1 w-full rounded-xl h-12 min-h-[48px] px-3 text-[15px] disabled:bg-slate-50 disabled:text-slate-400 focus:outline-none border border-slate-300 focus:ring-2 focus:ring-[#0F8A99] bg-white"
      >
        <option value="">{disabled ? "DISABLED" : "— SELECT BARANGAY —"}</option>

        {!disabled &&
          options.map((b) => (
            <option key={b} value={b}>
              {b.toUpperCase()}
            </option>
          ))}

        {!disabled && <option value={BRGY_OTHER}>OTHER (TYPE MANUALLY)</option>}
      </select>

      {!disabled && useOther && (
        <div className="mt-2">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(clampText(e.target.value, LIMITS.barangay_other, true))}
            placeholder="TYPE BARANGAY NAME"
            maxLength={LIMITS.barangay_other}
            className="w-full rounded-xl h-12 min-h-[48px] px-3 text-[15px] uppercase placeholder:uppercase focus:outline-none border border-slate-300 focus:ring-2 focus:ring-[#0F8A99]"
            aria-label="Barangay (Other)"
          />
        </div>
      )}
    </div>
  );
}