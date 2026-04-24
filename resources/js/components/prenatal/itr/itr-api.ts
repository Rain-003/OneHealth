/* =============================================
   ITR API — central helpers & route builders
   ============================================= */

/**
 * Base path relative to the app root.
 * Do NOT start with "/" so it works better in hosted subfolder setups.
 */
const BASE_PREFIX = "center/patients";

/**
 * Resolve a relative app path safely for both local and hosted environments.
 * Examples:
 * - local root:   http://127.0.0.1:8000/center/patients/1/prenatal/plan
 * - hosted root:  https://site.com/center/patients/1/prenatal/plan
 * - hosted subdir (when app runs under current path base): still resolves cleanly
 */
function joinUrl(...parts: Array<string | number>) {
  const cleaned = parts
    .map((p) => String(p ?? "").trim())
    .filter(Boolean)
    .map((p) => p.replace(/^\/+|\/+$/g, ""))
    .join("/");

  return `/${cleaned}`;
}

/** Build endpoints */
export const ITR_URL = (patientId: number | string) =>
  joinUrl(BASE_PREFIX, patientId, "prenatal", "itr-details");

export const TTVITA_URL = (patientId: number | string) =>
  joinUrl(BASE_PREFIX, patientId, "prenatal", "tt-vitA");

export const PLAN_URL = (patientId: number | string) =>
  joinUrl(BASE_PREFIX, patientId, "prenatal", "plan");

export const VISIT_URL = (patientId: number | string) =>
  joinUrl(BASE_PREFIX, patientId, "prenatal", "visit");

export const DELVISIT_URL = (
  patientId: number | string,
  visitId: number | string
) => joinUrl(BASE_PREFIX, patientId, "prenatal", "visit", visitId);

/* ---------- Types used across the ITR UI ---------- */

export type VisitRow = {
  id?: number;
  visit_date: string | null;
  trimester: "1st" | "2nd" | "3rd" | null;
  bp?: string | null;
  pr?: string | null;
  rr?: string | null;
  wt?: string | null;
  temp?: string | null;
  fundic_height?: string | null;
  fetal_heart_tone?: string | null;
  iron_tablets?: number | null;
  remarks?: string | null;
};

export type Plan = {
  plan_date?: string | null;

  planned_facility?: string | null;
  planned_facility_is_philhealth?: string | boolean | null;

  attending?: string | null;
  attending_personnel?: string | null;

  philhealth_accredited?: boolean | null;

  distance?: string | null;
  distance_from_residence?: string | null;

  estimated_cost?: string | null;

  payment_mode?: string | null;
  mode_of_payment?: string | null;

  transport?: string | null;
  available_transport?: string | null;

  companion_1_name?: string | null;
  companion_name?: string | null;
  companion_address?: string | null;
  companion_1_contact?: string | null;
  companion_contact?: string | null;

  companion_2_name?: string | null;
  family_companion_name?: string | null;
  family_companion_relationship?: string | null;
  family_companion_address?: string | null;
  companion_2_contact?: string | null;
  family_companion_contact?: string | null;

  caretaker_name?: string | null;
  caretaker_relationship?: string | null;

  blood_type?: string | null;
  blood_donors?: string | null;
  blood_donor_1_name?: string | null;
  blood_donor_1_address?: string | null;
  blood_donor_2_name?: string | null;
  blood_donor_2_address?: string | null;

  refer_to_name?: string | null;
  emergency_contact_name?: string | null;
  refer_to_contact?: string | null;
  emergency_contact_contact?: string | null;
  refer_to_address?: string | null;
  emergency_contact_address?: string | null;

  maternal_hospital_1_name?: string | null;
  maternal_hospital_1_address?: string | null;
  maternal_hospital_2_name?: string | null;
  maternal_hospital_2_address?: string | null;

  signature_name?: string | null;
  signature_mode?: "" | "upload" | "draw" | null;
  signature_data?: string | null;
  signature_path?: string | null;
  signed_at?: string | null;
};

/* ---------- Utilities ---------- */

export function csrfToken(): string {
  const meta = document.querySelector(
    'meta[name="csrf-token"]'
  ) as HTMLMetaElement | null;

  // @ts-ignore
  const glb = (window as any)?.Laravel?.csrfToken as string | undefined;

  return (meta?.content || glb || "").toString();
}

export const todayYMD = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};

/** Normalize any date string to YYYY-MM-DD (keeps empty). */
export function toYMD(v: string | null | undefined): string {
  if (!v) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

  const t = new Date(v);
  if (Number.isNaN(t.getTime())) return "";

  const m = String(t.getMonth() + 1).padStart(2, "0");
  const d = String(t.getDate()).padStart(2, "0");
  return `${t.getFullYear()}-${m}-${d}`;
}

export const intOrNull = (v: any) => {
  if (v === "" || v === null || v === undefined) return null;
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
};

export const numOrNull = (v: any) => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/* ---------- Fetch helpers (Laravel-friendly) ---------- */

function appendFormData(fd: FormData, key: string, value: any) {
  if (value === undefined || value === null) {
    fd.append(key, "");
    return;
  }

  if (value instanceof File || value instanceof Blob) {
    fd.append(key, value);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => appendFormData(fd, `${key}[]`, item));
    return;
  }

  if (typeof value === "boolean") {
    fd.append(key, value ? "1" : "0");
    return;
  }

  fd.append(key, String(value));
}

async function request(url: string, body: FormData) {
  const res = await fetch(url, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "X-CSRF-TOKEN": csrfToken(),
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
    body,
  });

  if (!res.ok) throw await buildError(res);
  return safeJson(res);
}

/**
 * POST with flat keys -> field=value
 * e.g. postFlat(url, { a:1, b:"x" })
 */
export async function postFlat(url: string, data: Record<string, any>) {
  const fd = new FormData();

  Object.entries(data).forEach(([k, v]) => {
    appendFormData(fd, k, v);
  });

  return request(url, fd);
}

/**
 * POST with nested keys -> root[field]=value
 * e.g. postNested(url, "itr", { ob_g:2, edc:"2025-05-01" })
 */
export async function postNested(
  url: string,
  root: string,
  obj: Record<string, any>
) {
  const fd = new FormData();

  Object.entries(obj).forEach(([k, v]) => {
    appendFormData(fd, `${root}[${k}]`, v);
  });

  return request(url, fd);
}

/**
 * POST with nested keys plus extra top-level fields/files
 * useful for Birth Plan signature upload:
 * - plan[signature_name]
 * - plan[signature_mode]
 * - signature_file
 */
export async function postNestedWithExtras(
  url: string,
  root: string,
  obj: Record<string, any>,
  extras: Record<string, any> = {}
) {
  const fd = new FormData();

  Object.entries(obj).forEach(([k, v]) => {
    appendFormData(fd, `${root}[${k}]`, v);
  });

  Object.entries(extras).forEach(([k, v]) => {
    appendFormData(fd, k, v);
  });

  return request(url, fd);
}

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

async function buildError(res: Response) {
  let msg = `HTTP ${res.status}`;

  try {
    const j = await res.json();
    if (j?.message) msg = j.message;
    else if (j?.errors) msg = Object.values(j.errors).flat().join(" ");
  } catch {
    const t = await res.text().catch(() => "");
    if (t) msg = `${msg} — ${t.slice(0, 180)}`;
  }

  return new Error(msg);
}