// resources/js/pages/center/dashboard.tsx
import * as React from "react";
import { Head, Link, usePage, router } from "@inertiajs/react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import Logo from "/public/build/assets/LOGO.svg";

/** ─────────────────────────────────────────────────────────────────────────────
 *  Adjust these to match your app
 *  ────────────────────────────────────────────────────────────────────────────*/
const ADMIN_ACCOUNTS_PATH = "/admin";
const REPORTS_PATH = "/center/reports";
const PRENATAL_BASE_PREFIX = "/center/patients";
type SearchPlacement = "inline" | "top";
const SEARCH_PLACEMENT: SearchPlacement = "inline";

/** ─────────────────────────────────────────────────────────────────────────────
 *  Types
 *  ────────────────────────────────────────────────────────────────────────────*/
type Activity = {
  id: number;
  type: string;
  description: string;
  patient?: string | null;
  by?: string | null;
  at?: string | null;
  when?: string | null;
  details?: string | string[] | null;
};

type Announcement = {
  id: number;
  title: string;
  body?: string | null;
  audience?: string | null;
  is_pinned?: boolean;
  is_active?: boolean;
  published_at?: string | null;
};

type CenterApptStatus = "upcoming" | "today" | "missed" | "done";

type CenterAppt = {
  id: number | string;
  date: string; // YYYY-MM-DD
  title: string;
  display?: string | null;
  program?: string | null; // "prenatal" | "immunization"
  kind?: string | null;
  meta?: Record<string, any> | null;
  status?: CenterApptStatus | string;
  given_date?: string | null;
  has_record?: boolean | null;
  can_reschedule?: boolean;
  patient_name?: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  suffix?: string | null;
  patient_id?: number | string | null;
  barangay?: string | null;
};

type OwnershipRequest = {
  id: number;
  patient: {
    id: number;
    full_name?: string | null;
    first_name?: string | null;
    middle_name?: string | null;
    last_name?: string | null;
    suffix?: string | null;
    barangay?: string | null;
  };
  requester: { id: number; name?: string | null; barangay?: string | null };
  message?: string | null;
  when?: string | null;
  at?: string | null;
};

type PageProps = {
  csrf?: string;
  auth?: { user?: { name?: string; role?: string | null; email?: string | null } };
  activities?: Activity[];
  announcements?: Announcement[];
  appointments?: CenterAppt[];
  ownershipRequests?: OwnershipRequest[];
  ownershipRequestsCount?: number;
  flash?: { status?: string | null; error?: string | null; message?: string | null };
};

/** ───────────────────────────── Simple modal ───────────────────────────── */
type SimpleModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
};
function SimpleModal({ open, title, onClose, children }: SimpleModalProps) {
  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 px-4" onClick={onClose}>
      <div
        className="relative flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <h2 className="text-base font-semibold text-[#203D7A]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-500" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="scroll-thin overflow-y-auto px-5 py-3 pb-4">{children}</div>
      </div>
    </div>
  );
}

/** ─────────────────────────────────────────────────────────────────────────────
 *  Main page
 *  ────────────────────────────────────────────────────────────────────────────*/
export default function CenterDashboard() {
  const {
    auth,
    activities = [],
    announcements: rawAnnouncements = [],
    appointments: rawAppointments = [],
    ownershipRequests = [],
    flash,
    csrf: sharedCsrf,
  } = usePage<PageProps>().props;

  const csrf =
    sharedCsrf ?? ((document.querySelector("meta[name='csrf-token']") as HTMLMetaElement)?.content || "");

  const name = auth?.user?.name ?? "Health Worker";
  const email = auth?.user?.email ?? "";
  const role = auth?.user?.role ?? null;

  /** Toast */
  const status = flash?.status ?? null;
  const error = flash?.error ?? null;
  const [toastIsSuccess, setToastIsSuccess] = React.useState(false);
  const [toastMsg, setToastMsg] = React.useState<string | null>(null);
  const lastFlashSigRef = React.useRef<string | null>(null);

  const toastTimersRef = React.useRef<number[]>([]);
  const showToast = React.useCallback((msg: string, kind: "success" | "error") => {
    toastTimersRef.current.forEach((t) => window.clearTimeout(t));
    toastTimersRef.current = [];
    setToastMsg(msg);
    setToastIsSuccess(kind === "success");
    toastTimersRef.current.push(window.setTimeout(() => setToastMsg(null), 2600));
  }, []);

  React.useEffect(() => {
    const msg = status && String(status).trim() ? String(status) : null;
    const err = !msg && error && String(error).trim() ? String(error) : null;
    if (!msg && !err) return;

    const fid = (flash as any)?.flash_id ? String((flash as any).flash_id) : "";
    const sig = msg ? `s:${msg}|${fid}` : `e:${err}|${fid}`;
    if (lastFlashSigRef.current === sig) return;
    lastFlashSigRef.current = sig;

    showToast(msg ?? err!, msg ? "success" : "error");
  }, [status, error, flash, showToast]);

  /** Search */
  const [q, setQ] = React.useState<string>("");
  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    router.get("/center/records", { q: q.trim() }, { preserveState: true, preserveScroll: true });
  }

  /** Pretty time */
  const fmt = React.useCallback((iso?: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleString();
  }, []);
  const fmtDateShort = React.useCallback((iso?: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? ""
      : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
  }, []);

  const formatRole = React.useCallback((r: string | null | undefined) => {
    if (!r) return "User";
    return r.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }, []);

  /** Patient display name: SURNAME, GIVEN NAME M., SUFFIX. */
  function formatFormalPatientName(parts: {
    id?: number | string | null;
    full_name?: string | null;
    patient_name?: string | null;
    first_name?: string | null;
    middle_name?: string | null;
    last_name?: string | null;
    suffix?: string | null;
  }, fallback = "Unnamed patient"): string {
    const clean = (v?: string | null) => String(v ?? "").replace(/\s+/g, " ").trim();
    const suffixes = new Set(["JR", "JR.", "SR", "SR.", "II", "III", "IV", "V"]);

    const first = clean(parts.first_name);
    const middle = clean(parts.middle_name);
    const last = clean(parts.last_name);
    const suffix = clean(parts.suffix);

    if (first || middle || last || suffix) {
      const middleInitial = middle ? `${middle.charAt(0).toUpperCase()}.` : "";
      const givenBlock = [first, middleInitial].filter(Boolean).join(" ");
      return [last || fallback, givenBlock, suffix].filter(Boolean).join(", ");
    }

    const text = clean(parts.full_name) || clean(parts.patient_name);
    if (!text) return parts.id != null ? `Patient #${parts.id}` : fallback;

    if (text.includes(",")) {
      const [surnamePart, ...restParts] = text.split(",");
      const surname = surnamePart.trim();
      const restText = restParts.join(",").trim();
      if (!surname || !restText) return text;

      const rest = restText.split(" ").filter(Boolean);
      let detectedSuffix = "";
      const lastRestPart = rest[rest.length - 1]?.toUpperCase().replace(/\.$/, "");
      if (lastRestPart && (suffixes.has(lastRestPart) || suffixes.has(`${lastRestPart}.`))) {
        detectedSuffix = rest.pop() ?? "";
      }

      const given = rest.shift() ?? "";
      const middleInitial = rest.length > 0 ? `${rest[0].charAt(0).toUpperCase()}.` : "";
      return [surname, [given, middleInitial].filter(Boolean).join(" "), detectedSuffix]
        .filter(Boolean)
        .join(", ");
    }

    const nameParts = text.split(" ").filter(Boolean);
    if (nameParts.length <= 1) return text;

    let detectedSuffix = "";
    const lastPart = nameParts[nameParts.length - 1].toUpperCase().replace(/\.$/, "");
    if (suffixes.has(lastPart) || suffixes.has(`${lastPart}.`)) {
      detectedSuffix = nameParts.pop() ?? "";
    }

    if (nameParts.length <= 1) {
      return detectedSuffix ? `${nameParts[0]}, ${detectedSuffix}` : nameParts[0];
    }

    const given = nameParts.shift() ?? "";
    const surname = nameParts.pop() ?? "";
    const middleInitial = nameParts.length > 0 ? `${nameParts[0].charAt(0).toUpperCase()}.` : "";

    return [surname, [given, middleInitial].filter(Boolean).join(" "), detectedSuffix]
      .filter(Boolean)
      .join(", ");
  }

  function appointmentPatientName(a: Pick<CenterAppt, "id" | "patient_id" | "patient_name" | "first_name" | "middle_name" | "last_name" | "suffix">): string {
    return formatFormalPatientName(
      {
        id: a.patient_id ?? a.id,
        patient_name: a.patient_name,
        first_name: a.first_name,
        middle_name: a.middle_name,
        last_name: a.last_name,
        suffix: a.suffix,
      },
      "Unknown patient"
    );
  }

  /** Announcements */
  const announcements = React.useMemo(
    () => (rawAnnouncements || []).filter((a) => a.is_active !== false),
    [rawAnnouncements]
  );
  const [seenAnnouncementIds, setSeenAnnouncementIds] = React.useState<number[]>([]);

  React.useEffect(() => {
    if (!email || typeof window === "undefined") return;
    try {
      const key = `onehealth_seen_announcements_${email}`;
      const raw = window.localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) setSeenAnnouncementIds(parsed.filter((x) => typeof x === "number"));
    } catch {
      //
    }
  }, [email]);

  const saveSeenAnnouncements = React.useCallback(
    (ids: number[]) => {
      if (!email || typeof window === "undefined") return;
      try {
        const key = `onehealth_seen_announcements_${email}`;
        window.localStorage.setItem(key, JSON.stringify(ids));
      } catch {
        //
      }
    },
    [email]
  );

  const markAnnouncementAsSeen = React.useCallback(
    (id: number) => {
      setSeenAnnouncementIds((prev) => {
        if (prev.includes(id)) return prev;
        const next = [...prev, id];
        saveSeenAnnouncements(next);
        return next;
      });
    },
    [saveSeenAnnouncements]
  );

  const unseenAnnouncements = React.useMemo(() => {
    if (!announcements.length) return [];
    const seenSet = new Set(seenAnnouncementIds);
    return announcements.filter((a) => !seenSet.has(a.id));
  }, [announcements, seenAnnouncementIds]);

  const unseenCount = unseenAnnouncements.length;

  /** Ownership requests */
  const [ownershipBusyId, setOwnershipBusyId] = React.useState<number | null>(null);
  const [ownershipReqs, setOwnershipReqs] = React.useState<OwnershipRequest[]>(ownershipRequests);
  React.useEffect(() => setOwnershipReqs(ownershipRequests), [ownershipRequests]);

  const [ownershipConfirmOpen, setOwnershipConfirmOpen] = React.useState(false);
  const [ownershipConfirmAction, setOwnershipConfirmAction] = React.useState<"approve" | "reject">("approve");
  const [ownershipConfirmReq, setOwnershipConfirmReq] = React.useState<OwnershipRequest | null>(null);

  const openOwnershipConfirm = React.useCallback((action: "approve" | "reject", req: OwnershipRequest) => {
    setOwnershipConfirmAction(action);
    setOwnershipConfirmReq(req);
    setOwnershipConfirmOpen(true);
  }, []);

  const handleApproveOwnership = React.useCallback(
    (id: number) => {
      if (ownershipBusyId) return;
      setOwnershipBusyId(id);
      router.put(
        `/center/ownership-requests/${id}`,
        { _token: csrf },
        {
          preserveScroll: true,
          onSuccess: () => {
            setOwnershipReqs((prev) => prev.filter((r) => r.id !== id));
            setOwnershipConfirmOpen(false);
          },
          onError: () => showToast("Unable to approve this request. Please try again.", "error"),
          onFinish: () => setOwnershipBusyId(null),
        }
      );
    },
    [csrf, ownershipBusyId, showToast]
  );

  const handleRejectOwnership = React.useCallback(
    (id: number) => {
      if (ownershipBusyId) return;
      setOwnershipBusyId(id);
      router.put(
        `/center/ownership-requests/${id}/reject`,
        { _token: csrf },
        {
          preserveScroll: true,
          onSuccess: () => {
            setOwnershipReqs((prev) => prev.filter((r) => r.id !== id));
            setOwnershipConfirmOpen(false);
          },
          onError: () => showToast("Unable to reject this request. Please try again.", "error"),
          onFinish: () => setOwnershipBusyId(null),
        }
      );
    },
    [csrf, ownershipBusyId, showToast]
  );

  const pendingOwnershipCount = ownershipReqs.length;
  const totalNotifCount = unseenCount + pendingOwnershipCount;
  const totalNotifLabel = totalNotifCount > 9 ? "9+" : totalNotifCount.toString();

  /** Announcements modal state */
  const [announcementsOpen, setAnnouncementsOpen] = React.useState(false);
  const [announcementDetailOpen, setAnnouncementDetailOpen] = React.useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = React.useState<Announcement | null>(null);

  const handleOpenAnnouncements = React.useCallback(() => setAnnouncementsOpen(true), []);
  const handleOpenAnnouncementDetail = React.useCallback(
    (a: Announcement) => {
      setSelectedAnnouncement(a);
      setAnnouncementDetailOpen(true);
      markAnnouncementAsSeen(a.id);
    },
    [markAnnouncementAsSeen]
  );

  /** Schedule summary modals */
  const [upcomingModalOpen, setUpcomingModalOpen] = React.useState(false);
  const [missedModalOpen, setMissedModalOpen] = React.useState(false);
  const [selectedDayModalOpen, setSelectedDayModalOpen] = React.useState(false);

  /** Schedule → Record focus helpers */
  function base64UrlEncodeUtf8(input: string) {
    try {
      const utf8 = encodeURIComponent(input).replace(/%([0-9A-F]{2})/g, (_, p1) =>
        String.fromCharCode(parseInt(p1, 16))
      );
      const b64 = btoa(utf8);
      return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
    } catch {
      return "";
    }
  }

  function parseFocusFromText(text?: string | null): { vaccine: string; label: string } | null {
    const t = String(text ?? "").trim();
    if (!t) return null;

    const patterns: RegExp[] = [
      /^next\s+immunization:\s*(.+?)\s*[—-]\s*(.+)$/i,
      /^missed\s+dose:\s*(.+?)\s*[—-]\s*(.+)$/i,
      /^immunization:\s*(.+?)\s*[—-]\s*(.+)$/i,
      /^vaccine\s+due:\s*(.+?)\s*(?:\(|[—-])\s*(.+?)(?:\))?$/i,
      /^missed\s+vaccine:\s*(.+?)\s*(?:\(|[—-])\s*(.+?)(?:\))?$/i,
    ];

    for (const re of patterns) {
      const m = t.match(re);
      if (m) {
        const vaccine = String(m[1] ?? "").trim();
        const label = String(m[2] ?? "").trim();
        if (vaccine && label) return { vaccine, label };
      }
    }
    return null;
  }

  function isPrenatalAppt(appt: Pick<CenterAppt, "program" | "title" | "kind">): boolean {
    const program = String(appt.program ?? "").trim().toLowerCase();
    const title = String(appt.title ?? "").trim().toLowerCase();
    const kind = String(appt.kind ?? "").trim().toLowerCase();

    return program === "prenatal" || title.includes("prenatal") || kind.includes("prenatal");
  }

  function buildPrenatalUrl(patientId?: number | string | null) {
    if (patientId === null || patientId === undefined || patientId === "") return null;
    return `${PRENATAL_BASE_PREFIX}/${patientId}/prenatal?section=visits&itr_sub=visits#visits`;
  }

  function buildImmunizationUrl(
    patientId?: number | string | null,
    apptTitle?: string | null,
    apptDisplay?: string | null
  ) {
    if (patientId === null || patientId === undefined || patientId === "") return null;

    const focus = parseFocusFromText(apptDisplay ?? null) || parseFocusFromText(apptTitle ?? null);
    if (!focus) return `/center/records/${patientId}`;

    const encoded = base64UrlEncodeUtf8(`${focus.vaccine}\n${focus.label}`);
    if (!encoded) return `/center/records/${patientId}`;

    return `/center/records/${patientId}?f=${encoded}`;
  }

  function buildRecordUrl(appt: Pick<CenterAppt, "patient_id" | "title" | "display" | "program" | "kind">) {
    if (isPrenatalAppt(appt)) return buildPrenatalUrl(appt.patient_id);
    return buildImmunizationUrl(appt.patient_id, appt.title, appt.display ?? null);
  }

  function openPatientRecordFromAppt(appt: Pick<CenterAppt, "patient_id" | "title" | "display" | "program" | "kind">) {
    const href = buildRecordUrl(appt);
    if (!href) return;
    router.visit(href);
  }

  /** Friendly schedule text */
  function getApptText(a: CenterAppt): string {
    const st = normalizeStatus(String(a.status)) || "upcoming";
    const program = String(a.program ?? "").toLowerCase();
    const meta = (a.meta ?? {}) as Record<string, any>;

    if (program === "prenatal" || String(a.title ?? "").toLowerCase().includes("prenatal")) {
      return st === "missed" ? "Missed prenatal check-up" : "Prenatal check-up";
    }

    if (program === "immunization" || String(a.title ?? "").toLowerCase().includes("immunization")) {
      const vaccine = typeof meta.vaccine === "string" ? meta.vaccine.trim() : "";
      const label = typeof meta.dose_label === "string" ? meta.dose_label.trim() : "";

      if (vaccine && label) {
        return st === "missed" ? `Missed vaccine: ${vaccine} (${label})` : `Vaccine due: ${vaccine} (${label})`;
      }

      const d = String(a.display ?? "").trim();
      if (d) return d;

      return st === "missed" ? "Missed vaccination" : "Vaccination";
    }

    const d = String(a.display ?? "").trim();
    if (d) return d;
    return String(a.title ?? "Schedule").trim() || "Schedule";
  }

  /** Calendar state */
  const today = React.useMemo(() => startOfDayLocal(new Date()), []);
  const todayKey = React.useMemo(() => ymdLocal(today), [today]);

  type CenterApptWithRecord = CenterAppt & {
    given_date?: string | null;
    has_record?: boolean | null;
  };

  const computedFromProps = React.useMemo(() => {
    const list = (rawAppointments ?? []).map((a) => {
      const safeDate = (a.date && String(a.date).slice(0, 10)) || todayKey;

      const base: CenterApptWithRecord = { ...a, date: safeDate };

      const backendStatusRaw = (a.status ?? "") as string;
      const backendStatus = normalizeStatus(backendStatusRaw);

      let finalStatus: CenterApptStatus;
      if (backendStatus) {
        finalStatus = backendStatus;
        if (finalStatus === "upcoming") {
          const sched = startOfDayLocal(parseYMDLocal(safeDate));
          if (compareLocal(sched, today) === 0) finalStatus = "today";
        }
      } else {
        finalStatus = deriveStatus(base, today);
      }

      return { ...base, status: finalStatus } as CenterApptWithRecord & { status: CenterApptStatus };
    });

    return list;
  }, [rawAppointments, today, todayKey]);

  const [appointmentsState, setAppointmentsState] = React.useState(computedFromProps);
  React.useEffect(() => setAppointmentsState(computedFromProps), [computedFromProps]);

  const [cursor, setCursor] = React.useState<Date | null>(null);
  const [selectedDateKey, setSelectedDateKey] = React.useState<string>("");

  React.useEffect(() => {
    const appts = appointmentsState;

    if (!appts.length) {
      if (!cursor) {
        const base = parseYMDLocal(todayKey);
        base.setDate(1);
        setCursor(startOfDayLocal(base));
      }
      if (!selectedDateKey) setSelectedDateKey(todayKey);
      return;
    }

    const nonDone = appts.filter((a) => a.status !== "done").map((a) => a.date).sort();
    const firstDateStr = nonDone[0] ?? todayKey;

    setCursor((prev) => {
      if (prev) return prev;
      const base = parseYMDLocal(firstDateStr);
      base.setDate(1);
      return startOfDayLocal(base);
    });

    setSelectedDateKey((prev) => prev || firstDateStr);
  }, [appointmentsState, todayKey, cursor, selectedDateKey]);

  const calendarByDate = React.useMemo(() => {
    const map = new Map<string, CenterApptWithRecord[]>();
    for (const a of appointmentsState) {
      if (normalizeStatus(String(a.status)) === "done") continue;
      const key = a.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return map;
  }, [appointmentsState]);

  const selectedAppointments = selectedDateKey ? calendarByDate.get(selectedDateKey) ?? [] : [];

  const upcomingList = appointmentsState.filter((a) => a.status === "upcoming" || a.status === "today");
  const missedList = appointmentsState.filter((a) => a.status === "missed");
  const finishedList = appointmentsState.filter((a) => a.status === "done");
  const pastTotal = finishedList.length + missedList.length;

  function moveMonth(delta: number) {
    setCursor((prev) => {
      const base = new Date(prev ?? today);
      base.setMonth(base.getMonth() + delta);
      base.setDate(1);
      return startOfDayLocal(base);
    });
  }

  const goToday = React.useCallback(() => {
    setSelectedDateKey(todayKey);
    const base = parseYMDLocal(todayKey);
    base.setDate(1);
    setCursor(startOfDayLocal(base));
  }, [todayKey]);

  /** Calendar grid */
  const usedCursor = cursor ?? today;

  const monthOptions = React.useMemo(
    () => [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ],
    []
  );

  const selectedMonth = usedCursor.getMonth();
  const selectedYear = usedCursor.getFullYear();

  const yearOptions = React.useMemo(() => {
    const currentYear = today.getFullYear();
    const years: number[] = [];
    for (let y = currentYear - 5; y <= currentYear + 5; y++) years.push(y);
    return years;
  }, [today]);

  function jumpToMonthYear(month: number, year: number) {
    setCursor(startOfDayLocal(new Date(year, month, 1)));
  }

  function onMonthChange(e: React.ChangeEvent<HTMLSelectElement>) {
    jumpToMonthYear(Number(e.target.value), selectedYear);
  }

  function onYearChange(e: React.ChangeEvent<HTMLSelectElement>) {
    jumpToMonthYear(selectedMonth, Number(e.target.value));
  }

  /** Reschedule */
  const [editingApptId, setEditingApptId] = React.useState<number | string | null>(null);
  const [editDate, setEditDate] = React.useState<string>("");
  const [rescheduleBusyId, setRescheduleBusyId] = React.useState<number | string | null>(null);

  const submitReschedule = React.useCallback(
    (appt: CenterApptWithRecord & { status: CenterApptStatus }, newDate: string) => {
      if (!newDate || rescheduleBusyId) return;
      setRescheduleBusyId(appt.id);

      setAppointmentsState((prev) =>
        prev.map((x) => {
          if (String(x.id) !== String(appt.id)) return x;
          const nextDate = String(newDate).slice(0, 10);
          const nextStatus =
            normalizeStatus(String(x.status)) === "done"
              ? "done"
              : compareLocal(parseYMDLocal(nextDate), today) === 0
              ? "today"
              : compareLocal(parseYMDLocal(nextDate), today) < 0
              ? "missed"
              : "upcoming";

          return { ...x, date: nextDate, status: nextStatus };
        })
      );

      setSelectedDateKey((prev) => (prev === appt.date ? String(newDate).slice(0, 10) : prev));

      router.put(
        `/center/appointments/${appt.id}`,
        { date: newDate, _token: csrf },
        {
          preserveScroll: true,
          onSuccess: () => {
            setEditingApptId(null);
            showToast("Appointment rescheduled.", "success");
            router.reload({ only: ["appointments", "flash"] });
          },
          onError: () => {
            showToast("Unable to reschedule. Please try again.", "error");
            router.reload({ only: ["appointments", "flash"] });
          },
          onFinish: () => setRescheduleBusyId(null),
        }
      );
    },
    [csrf, rescheduleBusyId, showToast, today]
  );

  const firstDay = new Date(usedCursor);
  firstDay.setDate(1);

  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(usedCursor.getFullYear(), usedCursor.getMonth() + 1, 0).getDate();

  const calendarCells: { date: Date; inMonth: boolean }[] = [];
  for (let i = 0; i < startWeekday; i++) {
    const d = new Date(firstDay);
    d.setDate(d.getDate() - (startWeekday - i));
    calendarCells.push({ date: d, inMonth: false });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(firstDay);
    d.setDate(i);
    calendarCells.push({ date: d, inMonth: true });
  }
  while (calendarCells.length % 7 !== 0) {
    const last = calendarCells[calendarCells.length - 1].date;
    const d = new Date(last);
    d.setDate(last.getDate() + 1);
    calendarCells.push({ date: d, inMonth: false });
  }

  const monthLabel = usedCursor.toLocaleString(undefined, { month: "long", year: "numeric" });

  const calendarColRef = React.useRef<HTMLDivElement | null>(null);
  const [calendarColHeight, setCalendarColHeight] = React.useState<number>(0);

  React.useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const c = calendarColRef.current;
    if (!c) return;

    const ro = new ResizeObserver(() => setCalendarColHeight(c.offsetHeight || 0));
    ro.observe(c);
    setCalendarColHeight(c.offsetHeight || 0);

    return () => ro.disconnect();
  }, [cursor, selectedDateKey, appointmentsState.length]);

  const borderClassForStatus = React.useCallback((st: CenterApptStatus) => {
    switch (st) {
      case "today":
        return "border-amber-300";
      case "missed":
        return "border-rose-300";
      case "upcoming":
        return "border-emerald-300";
      default:
        return "border-slate-200";
    }
  }, []);

  return (
    <div
      className="relative min-h-dvh bg-white text-slate-900"
      style={{
        fontFamily:
          "'Poppins', ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'",
      }}
    >
      <Head title="Dashboard">
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <form id="logout-form" method="post" action="/logout" className="hidden">
        <input type="hidden" name="_token" value={csrf} />
      </form>

      <style>{`
        .scroll-thin { scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent; }
        .scroll-thin::-webkit-scrollbar { width: 8px; height: 8px; }
        .scroll-thin::-webkit-scrollbar-track { background: transparent; }
        .scroll-thin::-webkit-scrollbar-thumb {
          background: #cbd5e1; border-radius: 9999px; border: 2px solid transparent; background-clip: padding-box;
        }
        .scroll-thin:hover::-webkit-scrollbar-thumb { background: #a8b3c3; }

        @media (max-width: 420px) {
          .calendar-cell-compact {
            min-height: 58px;
            padding: 6px;
            border-radius: 14px;
          }
          .calendar-cell-compact .calendar-day-badge {
            min-width: 1.5rem;
            height: 1.5rem;
            font-size: 10px;
          }
          .calendar-cell-compact .calendar-schedule-text {
            display: none;
          }
        }
      `}</style>

      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute z-[-1] -top-24 -left-24 h-72 w-72 rounded-full bg-teal-200/15 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-cyan-200/15 blur-3xl" />
        <div className="absolute -top-10 right-10 h-20 w-20 rounded-2xl bg-teal-50/50 rotate-6" />
        <div className="absolute bottom-6 left-10 h-24 w-24 rounded-2xl bg-cyan-50/50 -rotate-6" />
      </div>

      {toastMsg && (
        <div className="pointer-events-none fixed inset-0 z-[90] flex items-center justify-center px-4">
          <div
            className={
              "pointer-events-auto max-w-md w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-xl text-sm " +
              (toastIsSuccess ? "text-[#0F8A99]" : "text-rose-600")
            }
          >
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide">
              {toastIsSuccess ? "Success" : "Error"}
            </div>
            <div className="text-sm leading-snug">{toastMsg}</div>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-20 w-full max-w-none items-center justify-between px-3 sm:px-5 lg:px-8 2xl:px-10">
          <Link href="/dashboard" className="group flex min-w-0 items-center gap-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600">
            <img src={Logo} alt="OneHealth" className="h-11 w-11 rounded-xl select-none" draggable={false} />
            <div className="min-w-0 leading-tight">
              <div className="truncate text-lg font-semibold tracking-wide text-[#203D7A] md:text-xl">ONE HEALTH</div>
              <div className="text-[11px] uppercase tracking-wider text-slate-500">Health Worker</div>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleOpenAnnouncements}
              className="relative grid h-11 w-11 place-items-center rounded-xl border border-slate-300 bg-white shadow-sm transition hover:shadow-md active:translate-y-[1px] focus:outline-none focus:ring-2 focus:ring-teal-600"
              aria-label="View notifications"
            >
              <IconBell className="h-5 w-5 text-slate-700" />
              {totalNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-pink-400 px-1 text-[10px] font-semibold text-white ring-2 ring-white shadow-sm">
                  {totalNotifLabel}
                </span>
              )}
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="inline-flex h-11 items-center gap-3 rounded-xl border border-slate-300 bg-white px-2.5 sm:px-3 shadow-sm transition hover:shadow-md active:translate-y-[1px] focus:outline-none focus:ring-2 focus:ring-teal-600"
                  aria-label="Open profile menu"
                >
                  <div className="grid size-8 place-items-center rounded-[50%] bg-[#0F8A99] text-sm text-white shadow-sm">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden max-w-[180px] truncate sm:block text-sm font-medium text-slate-800">{name}</span>
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-64 bg-white shadow-sm">
                <DropdownMenuLabel className="truncate">
                  <div className="font-semibold">{name}</div>
                  <div className="mt-0.5 truncate text-xs font-normal text-slate-500">{email}</div>
                  <div className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-600">{formatRole(role)}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    (document.getElementById("logout-form") as HTMLFormElement)?.submit();
                  }}
                >
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {SEARCH_PLACEMENT === "top" && (
          <div className="border-t border-slate-200 bg-white/70 backdrop-blur-sm">
            <div className="mx-auto w-full max-w-none px-4 py-4 sm:px-6 lg:px-8 2xl:px-10">
              <form onSubmit={onSearch} className="relative w-full">
                <label className="sr-only" htmlFor="global-search-top">
                  Search patients or records
                </label>
                <Input
                  id="global-search-top"
                  type="search"
                  placeholder="Search patients or records"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-24 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#0F8A99]"
                />
                <SearchGlyph className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                  aria-label="Search"
                >
                  Search
                </button>
              </form>
            </div>
          </div>
        )}
      </header>

      <main className="relative z-10">
        <div className="mx-auto w-full max-w-none px-3 pb-10 sm:px-5 lg:px-8 2xl:px-10">
          <section className="pt-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <h1 className="text-[22px] font-semibold tracking-tight text-[#203D7A] sm:text-[24px] md:text-[28px]">
                  Welcome, {name.split(" ")[0]}
                </h1>
                <div className="mt-1 inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs text-teal-800 md:text-sm">
                  <span className="inline-block size-2 rounded-full bg-teal-400" />
                  {formatRole(role)}
                </div>
              </div>

              {SEARCH_PLACEMENT === "inline" && (
                <form onSubmit={onSearch} className="relative w-full xl:max-w-[860px] 2xl:max-w-[920px]">
                  <label className="sr-only" htmlFor="global-search-inline">
                    Search patients or records
                  </label>
                  <Input
                    id="global-search-inline"
                    type="search"
                    placeholder="Search patients or records"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-24 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#0F8A99]"
                  />
                  <SearchGlyph className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                  >
                    Search
                  </button>
                </form>
              )}
            </div>
          </section>

          <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <CardLink href="/center/records" title="Records" subtitle="Open the records index" icon={<IconRecords className="h-5 w-5 text-[#0F8A99]" />} />
            <CardLink href={REPORTS_PATH} title="Reports" subtitle="View health center summary" icon={<IconReports className="h-5 w-5 text-[#0F8A99]" />} />
            {role === "admin" && (
              <CardLink href={ADMIN_ACCOUNTS_PATH} title="Admin" subtitle="Admin panel" icon={<IconAccounts className="h-5 w-5 text-[#0F8A99]" />} />
            )}
          </section>

          <section className="mt-6 md:mt-8">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
              <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-4 py-4 sm:px-5 lg:px-6">
                <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold tracking-tight text-[#203D7A] sm:text-xl">
                      Schedule Calendar
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      View upcoming, today, and missed patient schedules.
                    </p>
                  </div>

                  {appointmentsState.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-300" />
                        Upcoming
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-300" />
                        Today
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-rose-700">
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-rose-300" />
                        Missed
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {(upcomingList.length > 0 || missedList.length > 0) && (
                <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-3 sm:px-5 lg:px-6">
                  <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setUpcomingModalOpen(true)}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-left shadow-sm transition hover:bg-emerald-100/70 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    >
                      <div>
                        <div className="text-[11px] font-medium uppercase tracking-wide text-emerald-700">
                          Upcoming / today
                        </div>
                        <div className="mt-0.5 text-xl font-semibold text-emerald-900">
                          {upcomingList.length}
                        </div>
                      </div>
                      <div className="text-right text-[10px] text-emerald-700/80">Tap to view</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMissedModalOpen(true)}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-left shadow-sm transition hover:bg-rose-100/70 focus:outline-none focus:ring-2 focus:ring-rose-300"
                    >
                      <div>
                        <div className="text-[11px] font-medium uppercase tracking-wide text-rose-700">
                          Missed schedules
                        </div>
                        <div className="mt-0.5 text-xl font-semibold text-rose-900">
                          {missedList.length}
                        </div>
                      </div>
                      <div className="text-right text-[10px] text-rose-700/80">Tap to view</div>
                    </button>
                  </div>
                </div>
              )}

              <div className="grid items-start gap-4 p-3 sm:p-4 lg:p-5 xl:grid-cols-[minmax(0,2.15fr)_minmax(360px,0.85fr)] 2xl:grid-cols-[minmax(0,2.55fr)_minmax(420px,0.9fr)]">
                <div ref={calendarColRef} className="min-w-0">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-2.5 sm:p-3 lg:p-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                        <div className="min-w-0">
                          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                            Current month
                          </div>
                          <div className="mt-1 text-base font-semibold text-slate-900 sm:text-lg lg:text-xl">
                            {monthLabel}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto] xl:grid-cols-[auto_auto] xl:items-center">
                          <div className="grid grid-cols-2 gap-2">
                            <label className="sr-only" htmlFor="calendar-month-select">
                              Select month
                            </label>
                            <select
                              id="calendar-month-select"
                              value={selectedMonth}
                              onChange={onMonthChange}
                              className="h-10 min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0F8A99]"
                              aria-label="Select month"
                            >
                              {monthOptions.map((label, idx) => (
                                <option key={label} value={idx}>
                                  {label}
                                </option>
                              ))}
                            </select>

                            <label className="sr-only" htmlFor="calendar-year-select">
                              Select year
                            </label>
                            <select
                              id="calendar-year-select"
                              value={selectedYear}
                              onChange={onYearChange}
                              className="h-10 min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0F8A99]"
                              aria-label="Select year"
                            >
                              {yearOptions.map((year) => (
                                <option key={year} value={year}>
                                  {year}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="inline-flex overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
                              <button
                                type="button"
                                onClick={() => moveMonth(-1)}
                                className="inline-flex h-10 w-10 items-center justify-center border-r border-slate-200 text-slate-600 transition hover:bg-slate-50"
                                aria-label="Previous month"
                              >
                                <IconChevron className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveMonth(1)}
                                className="inline-flex h-10 w-10 items-center justify-center text-slate-600 transition hover:bg-slate-50"
                                aria-label="Next month"
                              >
                                <IconChevron className="h-4 w-4 rotate-180" />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={goToday}
                              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                            >
                              Today
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl bg-white/80 p-2 sm:p-3">
                        <div className="grid grid-cols-7 gap-1 text-[9px] font-semibold uppercase tracking-wide text-slate-500 sm:gap-1.5 sm:text-[10px] md:text-[11px]">
                          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                            <div key={d} className="py-1 text-center">
                              {d}
                            </div>
                          ))}
                        </div>

                        <div className="mt-1.5 grid grid-cols-7 gap-1 sm:gap-1.5 md:gap-2">
                          {calendarCells.map(({ date, inMonth }, i) => {
                            const key = ymdLocal(date);
                            const dayAppts = calendarByDate.get(key) || [];
                            const any = dayAppts.length > 0;

                            const statuses = new Set(dayAppts.map((a) => normalizeStatus(String(a.status)) || "upcoming"));
                            const hasToday = statuses.has("today");
                            const hasMissed = statuses.has("missed");
                            const hasUpcoming = statuses.has("upcoming");

                            const isSelected = selectedDateKey === key;
                            const isTodayCell = key === todayKey;

                            const handleClick = () => {
                              setSelectedDateKey(key);
                              if (typeof window !== "undefined" && window.innerWidth < 640) {
                                setSelectedDayModalOpen(true);
                              }
                            };

                            return (
                              <button
                                key={key + "-" + i}
                                type="button"
                                onClick={handleClick}
                                className={[
                                  "calendar-cell-compact relative min-h-[62px] rounded-xl border px-1.5 py-1.5 text-left shadow-sm transition sm:min-h-[72px] sm:rounded-2xl sm:px-2 sm:py-2 lg:min-h-[92px] 2xl:min-h-[102px]",
                                  inMonth ? "bg-white hover:border-[#0F8A99]/60 hover:shadow-md" : "bg-slate-50 text-slate-400",
                                  any ? "border-[#0F8A99]/25" : "border-slate-200",
                                  isSelected ? "ring-2 ring-[#0F8A99] border-[#0F8A99]/40" : "",
                                  isTodayCell && !isSelected ? "ring-1 ring-amber-200" : "",
                                ].join(" ")}
                              >
                                <div className="flex items-start justify-between gap-1">
                                  <span
                                    className={[
                                      "calendar-day-badge inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold sm:h-7 sm:min-w-[1.75rem] sm:px-2 sm:text-[11px]",
                                      any
                                        ? "bg-[#0F8A99]/10 text-[#0F8A99]"
                                        : inMonth
                                        ? "text-slate-700"
                                        : "text-slate-400",
                                    ].join(" ")}
                                  >
                                    {date.getDate()}
                                  </span>

                                  {any && (
                                    <span className="flex items-center gap-0.5 pt-0.5 sm:gap-1">
                                      {hasUpcoming && <span className={"inline-flex h-2 w-2 rounded-full sm:h-2.5 sm:w-2.5 " + dotClass("upcoming")} />}
                                      {hasToday && <span className={"inline-flex h-2 w-2 rounded-full sm:h-2.5 sm:w-2.5 " + dotClass("today")} />}
                                      {hasMissed && <span className={"inline-flex h-2 w-2 rounded-full sm:h-2.5 sm:w-2.5 " + dotClass("missed")} />}
                                    </span>
                                  )}
                                </div>

                                {any && (
                                  <div className="calendar-schedule-text mt-1 hidden text-[10px] text-slate-500 md:block">
                                    {dayAppts.length} scheduled
                                  </div>
                                )}

                                {isTodayCell && (
                                  <div className="absolute bottom-1.5 left-1.5 text-[9px] font-medium text-amber-700 sm:bottom-2 sm:left-2 sm:text-[10px]">
                                    Today
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mobile / tablet selected day panel */}
                  <div className="mt-4 xl:hidden">
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                              Selected day
                            </div>
                            <div className="mt-1 text-sm font-semibold text-slate-900">
                              {selectedDateKey
                                ? formatYMDLong(selectedDateKey, {
                                    weekday: "short",
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })
                                : "None"}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={goToday}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                          >
                            Today
                          </button>
                        </div>
                      </div>

                      <div className="scroll-thin max-h-[380px] overflow-y-auto p-3">
                        {selectedAppointments.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-slate-200 px-4 py-4 text-xs text-slate-500">
                            No patients scheduled on this date.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {selectedAppointments
                              .slice()
                              .sort((a, b) => (getApptText(a) || "").localeCompare(getApptText(b) || ""))
                              .map((a) => {
                                const st = normalizeStatus(String(a.status)) || "upcoming";
                                const statusLabel =
                                  st === "today" ? "Today" : st === "upcoming" ? "Upcoming" : st === "missed" ? "Missed" : "Done";

                                const statusPillClass =
                                  st === "today"
                                    ? "bg-amber-50 text-amber-700"
                                    : st === "upcoming"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : st === "missed"
                                    ? "bg-rose-50 text-rose-700"
                                    : "bg-slate-100 text-slate-600";

                                const canReschedule = a.can_reschedule === true;
                                const missedClickable = st === "missed" && !!a.patient_id;

                                return (
                                  <div
                                    key={a.id}
                                    role={missedClickable ? "button" : undefined}
                                    tabIndex={missedClickable ? 0 : -1}
                                    onClick={() => missedClickable && openPatientRecordFromAppt(a)}
                                    onKeyDown={(e) => {
                                      if (!missedClickable) return;
                                      if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        openPatientRecordFromAppt(a);
                                      }
                                    }}
                                    className={[
                                      "rounded-2xl border-2 bg-white px-3 py-3 text-xs transition",
                                      borderClassForStatus(st),
                                      missedClickable ? "cursor-pointer hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-200" : "",
                                    ].join(" ")}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openPatientRecordFromAppt(a);
                                          }}
                                          className="font-semibold text-slate-800 hover:underline underline-offset-2"
                                        >
                                          {appointmentPatientName(a)}
                                        </button>

                                        {a.barangay && <div className="text-[11px] text-slate-400">{a.barangay}</div>}

                                        <div className="mt-1 text-[11px] text-slate-500">{getApptText(a)}</div>
                                      </div>

                                      <span className={["inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium", statusPillClass].join(" ")}>
                                        {statusLabel}
                                      </span>
                                    </div>

                                    {canReschedule && (
                                      <>
                                        {editingApptId === a.id ? (
                                          <form
                                            className="mt-3 flex flex-wrap items-center gap-2"
                                            onSubmit={(e) => {
                                              e.preventDefault();
                                              if (!editDate) return;
                                              submitReschedule(a as any, editDate);
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <input
                                              type="date"
                                              value={editDate}
                                              onChange={(e) => setEditDate(e.target.value)}
                                              min={todayKey}
                                              className="h-9 rounded-lg border border-slate-300 px-3 text-[12px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F8A99]"
                                            />
                                            <button
                                              type="submit"
                                              disabled={rescheduleBusyId === a.id}
                                              className="inline-flex h-9 items-center rounded-lg bg-[#0F8A99] px-3 text-[12px] font-medium text-white hover:bg-[#0b6d79] disabled:opacity-60"
                                            >
                                              {rescheduleBusyId === a.id ? "Saving..." : "Save"}
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setEditingApptId(null)}
                                              className="inline-flex h-9 items-center rounded-lg border border-slate-200 px-3 text-[12px] font-medium text-slate-600 hover:bg-slate-50"
                                              disabled={rescheduleBusyId === a.id}
                                            >
                                              Cancel
                                            </button>
                                          </form>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setEditingApptId(a.id);
                                              setEditDate(a.date);
                                            }}
                                            className="mt-3 inline-flex items-center text-[11px] font-medium text-[#0F8A99] hover:underline"
                                          >
                                            Reschedule
                                          </button>
                                        )}
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>

                      {pastTotal > 0 && (
                        <div className="border-t border-slate-100 bg-white px-4 py-3">
                          <p className="text-[10px] text-slate-500">
                            {pastTotal} past schedule{pastTotal === 1 ? "" : "s"} (missed or finished).
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Desktop side panel */}
                <aside className="hidden xl:block">
                  <div
                    className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                    style={{ height: calendarColHeight ? calendarColHeight : undefined }}
                  >
                    <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                            Selected day
                          </div>
                          <div className="mt-1 text-sm font-semibold text-slate-900">
                            {selectedDateKey
                              ? formatYMDLong(selectedDateKey, {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              : "None"}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={goToday}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                        >
                          Today
                        </button>
                      </div>
                    </div>

                    <div className="scroll-thin flex-1 overflow-y-auto p-3">
                      {selectedAppointments.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 px-4 py-4 text-xs text-slate-500">
                          No patients scheduled on this date.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {selectedAppointments
                            .slice()
                            .sort((a, b) => (getApptText(a) || "").localeCompare(getApptText(b) || ""))
                            .map((a) => {
                              const st = normalizeStatus(String(a.status)) || "upcoming";
                              const statusLabel =
                                st === "today" ? "Today" : st === "upcoming" ? "Upcoming" : st === "missed" ? "Missed" : "Done";

                              const statusPillClass =
                                st === "today"
                                  ? "bg-amber-50 text-amber-700"
                                  : st === "upcoming"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : st === "missed"
                                  ? "bg-rose-50 text-rose-700"
                                  : "bg-slate-100 text-slate-600";

                              const canReschedule = a.can_reschedule === true;
                              const missedClickable = st === "missed" && !!a.patient_id;

                              return (
                                <div
                                  key={a.id}
                                  role={missedClickable ? "button" : undefined}
                                  tabIndex={missedClickable ? 0 : -1}
                                  onClick={() => missedClickable && openPatientRecordFromAppt(a)}
                                  onKeyDown={(e) => {
                                    if (!missedClickable) return;
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      openPatientRecordFromAppt(a);
                                    }
                                  }}
                                  className={[
                                    "rounded-2xl border-2 bg-white px-3 py-3 text-xs transition",
                                    borderClassForStatus(st),
                                    missedClickable ? "cursor-pointer hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-200" : "",
                                  ].join(" ")}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openPatientRecordFromAppt(a);
                                        }}
                                        className="font-semibold text-slate-800 hover:underline underline-offset-2"
                                      >
                                        {appointmentPatientName(a)}
                                      </button>

                                      {a.barangay && <div className="text-[11px] text-slate-400">{a.barangay}</div>}

                                      <div className="mt-1 text-[11px] text-slate-500">{getApptText(a)}</div>
                                    </div>

                                    <span className={["inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium", statusPillClass].join(" ")}>
                                      {statusLabel}
                                    </span>
                                  </div>

                                  {canReschedule && (
                                    <>
                                      {editingApptId === a.id ? (
                                        <form
                                          className="mt-3 flex flex-wrap items-center gap-2"
                                          onSubmit={(e) => {
                                            e.preventDefault();
                                            if (!editDate) return;
                                            submitReschedule(a as any, editDate);
                                          }}
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <input
                                            type="date"
                                            value={editDate}
                                            onChange={(e) => setEditDate(e.target.value)}
                                            min={todayKey}
                                            className="h-9 rounded-lg border border-slate-300 px-3 text-[12px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F8A99]"
                                          />
                                          <button
                                            type="submit"
                                            disabled={rescheduleBusyId === a.id}
                                            className="inline-flex h-9 items-center rounded-lg bg-[#0F8A99] px-3 text-[12px] font-medium text-white hover:bg-[#0b6d79] disabled:opacity-60"
                                          >
                                            {rescheduleBusyId === a.id ? "Saving..." : "Save"}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setEditingApptId(null)}
                                            className="inline-flex h-9 items-center rounded-lg border border-slate-200 px-3 text-[12px] font-medium text-slate-600 hover:bg-slate-50"
                                            disabled={rescheduleBusyId === a.id}
                                          >
                                            Cancel
                                          </button>
                                        </form>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingApptId(a.id);
                                            setEditDate(a.date);
                                          }}
                                          className="mt-3 inline-flex items-center text-[11px] font-medium text-[#0F8A99] hover:underline"
                                        >
                                          Reschedule
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>

                    {pastTotal > 0 && (
                      <div className="border-t border-slate-100 bg-white px-4 py-3">
                        <p className="text-[10px] text-slate-500">
                          {pastTotal} past schedule{pastTotal === 1 ? "" : "s"} (missed or finished).
                        </p>
                      </div>
                    )}
                  </div>
                </aside>
              </div>
            </div>
          </section>

          <section className="mt-6 xl:mt-8">
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-slate-200 bg-white/95 px-4 py-3.5 backdrop-blur sm:px-5">
                <div>
                  <h2 className="text-base font-semibold text-[#203D7A]">Recent Activity</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Latest changes to patient records</p>
                </div>
                {activities.length > 0 && (
                  <span className="hidden sm:inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                    {activities.length} item{activities.length === 1 ? "" : "s"}
                  </span>
                )}
              </div>

              <div className="scroll-thin relative max-h-[620px] overflow-y-auto overscroll-contain px-4 py-3 sm:px-5 sm:py-4">
                {activities.length ? (
                  <div className="relative">
                    <ul className="space-y-2.5 sm:space-y-3">
                      {activities.map((a) => {
                        const prettyTime = fmt(a.at) || a.when || "";
                        const cleanDesc = a.description.replace(/\s*\(\d+\s+entries?\)/i, "");

                        return (
                          <li key={a.id}>
                            <article className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:px-3.5 sm:py-3">
                              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#0F8A99]/8 text-[#0F8A99]">
                                <IconActivity className="h-4 w-4" />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
                                  <p className="text-[13px] font-medium leading-snug text-slate-900 sm:text-[14px]">{cleanDesc}</p>
                                  {prettyTime && (
                                    <time className="mt-0.5 hidden shrink-0 text-[11px] text-slate-500 sm:mt-0 sm:inline" dateTime={a.at || ""}>
                                      {prettyTime}
                                    </time>
                                  )}
                                </div>

                                <div className="mt-1 flex flex-wrap gap-1.5">
                                  {a.patient && (
                                    <span className="inline-flex max-w-full items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-[2px] text-[11px] font-medium text-slate-700">
                                      <span className="max-w-[10rem] truncate md:max-w-[14rem]">{a.patient}</span>
                                    </span>
                                  )}
                                  {a.by && (
                                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-[2px] text-[11px] font-medium text-slate-600">
                                      By: {a.by}
                                    </span>
                                  )}
                                  {a.type && (
                                    <span className="inline-flex items-center rounded-full bg-slate-900/5 px-2 py-[2px] text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                      {a.type}
                                    </span>
                                  )}
                                </div>

                                {a.details ? (
                                  Array.isArray(a.details) ? (
                                    <ul className="mt-1.5 hidden space-y-0.5 text-[12px] text-slate-700 md:block">
                                      {a.details.map((d, i) => (
                                        <li key={i} className="flex gap-1">
                                          <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                                          <span className="flex-1">{d}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="mt-1.5 hidden text-[12px] text-slate-700 md:block">{a.details}</p>
                                  )
                                ) : null}
                              </div>
                            </article>
                          </li>
                        );
                      })}
                    </ul>

                    <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white to-transparent" />
                  </div>
                ) : (
                  <p className="text-sm text-slate-600">No recent items. Actions will appear here.</p>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>

      {announcementsOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 px-4" onClick={() => setAnnouncementsOpen(false)}>
          <div
            className="relative flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
              <div>
                <h2 className="text-base font-semibold text-[#203D7A]">Announcements</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {announcements.length
                    ? `${announcements.length} announcement${announcements.length > 1 ? "s" : ""} from admin`
                    : "No announcements yet"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAnnouncementsOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                aria-label="Close announcements"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-500" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="scroll-thin overflow-y-auto px-5 py-3 pb-4">
              {ownershipReqs.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-800">Ownership requests</h3>
                    <span className="text-[11px] text-slate-500">{ownershipReqs.length} pending</span>
                  </div>

                  <ul className="mt-2 space-y-2">
                    {ownershipReqs.map((r) => (
                      <li key={r.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                        <div className="break-words text-[13px] font-semibold text-slate-900">
                          {formatFormalPatientName(r.patient, `Patient #${r.patient.id}`)}
                        </div>
                        <div className="mt-0.5 text-[12px] text-slate-600">
                          Requested by <span className="font-medium">{r.requester.name ?? `User #${r.requester.id}`}</span>
                          {r.requester.barangay ? ` (${r.requester.barangay})` : ""}
                          {r.when ? ` · ${r.when}` : ""}
                        </div>
                        {r.message && <div className="mt-2 whitespace-pre-line text-[12px] text-slate-700">{r.message}</div>}

                        <div className="mt-3 flex items-center gap-2">
                          <button
                            type="button"
                            disabled={ownershipBusyId === r.id}
                            onClick={() => openOwnershipConfirm("approve", r)}
                            className="inline-flex items-center justify-center rounded-xl bg-[#0F8A99] px-3 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-60"
                          >
                            {ownershipBusyId === r.id ? "Approving…" : "Approve"}
                          </button>
                          <button
                            type="button"
                            disabled={ownershipBusyId === r.id}
                            onClick={() => openOwnershipConfirm("reject", r)}
                            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-60"
                          >
                            {ownershipBusyId === r.id ? "Working…" : "Reject"}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {announcements.length ? (
                <ul className="space-y-2">
                  {announcements.map((a) => {
                    const published = fmtDateShort(a.published_at);
                    const isSeen = seenAnnouncementIds.includes(a.id);

                    return (
                      <li key={a.id}>
                        <button
                          type="button"
                          onClick={() => handleOpenAnnouncementDetail(a)}
                          className={
                            "w-full rounded-2xl border px-4 py-3 text-left shadow-sm transition focus:outline-none focus:ring-2 focus:ring-teal-500 " +
                            (isSeen ? "border-slate-200 bg-white opacity-75" : "border-teal-200 bg-teal-50/80")
                          }
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className={"break-words text-[14px] font-semibold " + (isSeen ? "text-slate-600" : "text-slate-900")}>
                                  {a.title || "Announcement"}
                                </h3>
                                {!isSeen && <span className="inline-flex h-2.5 w-2.5 rounded-full bg-teal-500" />}
                                {a.is_pinned && (
                                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900">
                                    Pinned
                                  </span>
                                )}
                              </div>
                              {a.body && <p className={"mt-1 line-clamp-2 break-words text-xs " + (isSeen ? "text-slate-500" : "text-slate-700")}>{a.body}</p>}
                            </div>
                            {published && <span className="shrink-0 text-[11px] text-slate-500">{published}</span>}
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                            {a.audience && <span>Audience: {a.audience}</span>}
                            {isSeen && (
                              <span className="inline-flex items-center gap-1">
                                <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-300" />
                                <span>Read</span>
                              </span>
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-slate-600">No announcements yet. When admins post announcements, they’ll appear here.</p>
              )}
            </div>
          </div>
        </div>
      )}

      <SimpleModal
        open={ownershipConfirmOpen && !!ownershipConfirmReq}
        title={ownershipConfirmAction === "approve" ? "Confirm Transfer" : "Confirm Rejection"}
        onClose={() => setOwnershipConfirmOpen(false)}
      >
        <div className="space-y-3 text-sm text-slate-700">
          <p>
            {ownershipConfirmAction === "approve"
              ? "Are you sure you want to transfer this patient?"
              : "Are you sure you want to reject this ownership request?"}
          </p>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="font-semibold text-slate-900">{ownershipConfirmReq?.patient ? formatFormalPatientName(ownershipConfirmReq.patient, "Patient") : "Patient"}</div>
            <div className="text-xs text-slate-600">Request by: {ownershipConfirmReq?.requester?.name ?? "Health Worker"}</div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setOwnershipConfirmOpen(false)}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Cancel
            </button>

            {ownershipConfirmAction === "approve" ? (
              <button
                type="button"
                disabled={ownershipBusyId === ownershipConfirmReq?.id}
                onClick={() => ownershipConfirmReq && handleApproveOwnership(ownershipConfirmReq.id)}
                className="inline-flex items-center justify-center rounded-xl bg-[#0F8A99] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-60"
              >
                {ownershipBusyId === ownershipConfirmReq?.id ? "Transferring..." : "Yes, Transfer"}
              </button>
            ) : (
              <button
                type="button"
                disabled={ownershipBusyId === ownershipConfirmReq?.id}
                onClick={() => ownershipConfirmReq && handleRejectOwnership(ownershipConfirmReq.id)}
                className="inline-flex items-center justify-center rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-60"
              >
                {ownershipBusyId === ownershipConfirmReq?.id ? "Rejecting..." : "Yes, Reject"}
              </button>
            )}
          </div>
        </div>
      </SimpleModal>

      <SimpleModal
        open={announcementDetailOpen && !!selectedAnnouncement}
        onClose={() => {
          setAnnouncementDetailOpen(false);
          setSelectedAnnouncement(null);
        }}
        title={selectedAnnouncement?.title || "Announcement"}
      >
        {selectedAnnouncement && (
          <div className="space-y-2 text-sm text-slate-700">
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
              {selectedAnnouncement.is_pinned && (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900">
                  Pinned
                </span>
              )}
              {selectedAnnouncement.audience && <span>Audience: {selectedAnnouncement.audience}</span>}
              {selectedAnnouncement.published_at && (
                <span className="before:content-['·'] before:px-1">{fmtDateShort(selectedAnnouncement.published_at)}</span>
              )}
            </div>

            {selectedAnnouncement.body ? (
              <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-slate-800">{selectedAnnouncement.body}</p>
            ) : (
              <p className="mt-2 text-[13px] text-slate-500">No additional details for this announcement.</p>
            )}
          </div>
        )}
      </SimpleModal>

      <SimpleModal open={upcomingModalOpen} onClose={() => setUpcomingModalOpen(false)} title={`Upcoming / Today (${upcomingList.length})`}>
        {upcomingList.length === 0 ? (
          <p className="text-xs text-slate-600">No upcoming or today schedules.</p>
        ) : (
          <ul className="space-y-2 text-xs">
            {upcomingList
              .slice()
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((ev) => (
                <li key={ev.id} className="flex flex-col gap-1 rounded-lg border border-emerald-100 bg-emerald-50/70 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => openPatientRecordFromAppt(ev)}
                      className="font-semibold text-slate-800 hover:underline underline-offset-2"
                    >
                      {appointmentPatientName(ev)}
                    </button>
                    <span className="text-[11px] text-slate-500">
                      {formatYMDLong(ev.date, { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-700">{getApptText(ev)}</p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-500">{ev.barangay && <>Barangay: {ev.barangay}</>}</span>
                    <button
                      type="button"
                      disabled={!ev.patient_id}
                      onClick={() => openPatientRecordFromAppt(ev)}
                      className={
                        "rounded-md px-2 py-1 text-[11px] font-medium " +
                        (ev.patient_id ? "bg-emerald-500/90 text-white hover:bg-emerald-600" : "bg-slate-200 text-slate-500 cursor-not-allowed")
                      }
                    >
                      Go to record
                    </button>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </SimpleModal>

      <SimpleModal open={missedModalOpen} onClose={() => setMissedModalOpen(false)} title={`Missed schedules (${missedList.length})`}>
        {missedList.length === 0 ? (
          <p className="text-xs text-slate-600">No missed schedules. 🎉</p>
        ) : (
          <ul className="space-y-2 text-xs">
            {missedList
              .slice()
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((ev) => (
                <li key={ev.id} className="flex flex-col gap-1 rounded-lg border border-rose-100 bg-rose-50/70 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => openPatientRecordFromAppt(ev)}
                      className="font-semibold text-slate-800 hover:underline underline-offset-2"
                    >
                      {appointmentPatientName(ev)}
                    </button>
                    <span className="text-[11px] text-slate-500">
                      {formatYMDLong(ev.date, { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-700">{getApptText(ev)}</p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-500">{ev.barangay && <>Barangay: {ev.barangay}</>}</span>
                    <button
                      type="button"
                      disabled={!ev.patient_id}
                      onClick={() => openPatientRecordFromAppt(ev)}
                      className={
                        "rounded-md px-2 py-1 text-[11px] font-medium " +
                        (ev.patient_id ? "bg-rose-500/90 text-white hover:bg-rose-600" : "bg-slate-200 text-slate-500 cursor-not-allowed")
                      }
                    >
                      Go to record
                    </button>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </SimpleModal>

      <SimpleModal
        open={selectedDayModalOpen}
        onClose={() => setSelectedDayModalOpen(false)}
        title={
          selectedDateKey
            ? `Schedules for ${formatYMDLong(selectedDateKey, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}`
            : "Schedules"
        }
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="text-[11px] text-slate-500">Tap a patient to open record</div>
          <button
            type="button"
            onClick={goToday}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
          >
            Today
          </button>
        </div>

        {selectedAppointments.length === 0 ? (
          <p className="text-xs text-slate-600">No schedules for this day.</p>
        ) : (
          <ul className="space-y-2 text-xs">
            {selectedAppointments
              .slice()
              .sort((a, b) => (getApptText(a) || "").localeCompare(getApptText(b) || ""))
              .map((a) => {
                const st = normalizeStatus(String(a.status)) || "upcoming";
                const statusLabel =
                  st === "today" ? "Today" : st === "upcoming" ? "Upcoming" : st === "missed" ? "Missed" : "Done";

                const statusPillClass =
                  st === "today"
                    ? "bg-amber-50 text-amber-700"
                    : st === "upcoming"
                    ? "bg-emerald-50 text-emerald-700"
                    : st === "missed"
                    ? "bg-rose-50 text-rose-700"
                    : "bg-slate-100 text-slate-600";

                const canReschedule = a.can_reschedule === true;

                return (
                  <li key={a.id} className={["flex flex-col gap-1 rounded-lg border-2 bg-white px-3 py-2", borderClassForStatus(st)].join(" ")}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <button type="button" onClick={() => openPatientRecordFromAppt(a)} className="font-semibold text-slate-800 hover:underline underline-offset-2">
                          {appointmentPatientName(a)}
                        </button>
                        {a.barangay && <div className="text-[11px] text-slate-400">{a.barangay}</div>}
                        <div className="mt-0.5 text-[11px] text-slate-600">{getApptText(a)}</div>
                      </div>
                      <span className={["inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium", statusPillClass].join(" ")}>
                        {statusLabel}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-500">{formatYMDLong(a.date, { month: "short", day: "numeric", year: "numeric" })}</span>
                      <button
                        type="button"
                        disabled={!a.patient_id}
                        onClick={() => openPatientRecordFromAppt(a)}
                        className={
                          "rounded-md px-2 py-1 text-[11px] font-medium " +
                          (a.patient_id ? "bg-[#0F8A99] text-white hover:bg-[#0b6d79]" : "bg-slate-200 text-slate-500 cursor-not-allowed")
                        }
                      >
                        Go to record
                      </button>
                    </div>

                    {canReschedule && (
                      <div className="mt-2">
                        {editingApptId === a.id ? (
                          <form
                            className="flex flex-wrap items-center gap-2"
                            onSubmit={(e) => {
                              e.preventDefault();
                              if (!editDate) return;
                              submitReschedule(a as any, editDate);
                            }}
                          >
                            <input
                              type="date"
                              value={editDate}
                              onChange={(e) => setEditDate(e.target.value)}
                              min={todayKey}
                              className="h-9 rounded-lg border border-slate-300 px-3 text-[12px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F8A99]"
                            />
                            <button
                              type="submit"
                              disabled={rescheduleBusyId === a.id}
                              className="inline-flex h-9 items-center rounded-lg bg-[#0F8A99] px-3 text-[12px] font-semibold text-white hover:bg-[#0b6d79] disabled:opacity-60"
                            >
                              {rescheduleBusyId === a.id ? "Saving..." : "Save"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingApptId(null)}
                              disabled={rescheduleBusyId === a.id}
                              className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                            >
                              Cancel
                            </button>
                          </form>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingApptId(a.id);
                              setEditDate(a.date);
                            }}
                            className="inline-flex items-center text-[12px] font-semibold text-[#0F8A99] hover:underline"
                          >
                            Reschedule
                          </button>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
          </ul>
        )}
      </SimpleModal>
    </div>
  );
}

/** ─────────────────────────────────────────────────────────────────────────────
 * Components
 * ────────────────────────────────────────────────────────────────────────────*/
function CardLink({
  href,
  title,
  subtitle,
  icon,
}: {
  href: string;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
}) {
  return (
    <Link href={href} preserveScroll className="group">
      <div className="relative rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(16,24,40,0.10)] focus-within:ring-2 focus-within:ring-[#0F8A99]">
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {icon ? <div className="grid h-9 w-9 place-items-center rounded-[10px] bg-[#0F8A99]/10">{icon}</div> : null}
            <div className="text-[15px] font-semibold text-slate-900">{title}</div>
          </div>
          <RightArrow className="h-5 w-5 text-slate-400 transition group-hover:text-[#0F8A99]" />
        </div>
        {subtitle && <div className="relative mt-1 text-sm text-slate-500">{subtitle}</div>}
      </div>
    </Link>
  );
}

/** Inline SVG glyphs */
function SearchGlyph(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" {...props}>
      <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5a6.5 6.5 0 1 0-6.5 6.5 6.47 6.47 0 0 0 4.21-1.57l.27.28h.79L20 21.5 21.5 20zM9.5 14A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z" />
    </svg>
  );
}
function RightArrow(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}
function IconChevron(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconRecords(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props}>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 7h8M8 11h8M8 15h5" />
    </svg>
  );
}
function IconAccounts(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M15 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
      <path d="M3 21a6 6 0 0 1 12 0M13 21a6 6 0 0 1 8-5" />
    </svg>
  );
}
function IconReports(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props}>
      <path d="M4 21h16" />
      <rect x="6" y="10" width="3" height="7" rx="1" />
      <rect x="11" y="6" width="3" height="11" rx="1" />
      <rect x="16" y="13" width="3" height="4" rx="1" />
    </svg>
  );
}
function IconBell(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props}>
      <path d="M12 3a4 4 0 0 0-4 4v1.1c0 .46-.16.91-.45 1.27L6.3 11.2A2 2 0 0 0 6 12.4V14h12v-1.6a2 2 0 0 0-.3-1.2l-1.25-1.83A2 2 0 0 1 16 8.1V7a4 4 0 0 0-4-4z" />
      <path d="M10 17a2 2 0 0 0 4 0" />
    </svg>
  );
}
function IconActivity(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props}>
      <path d="M4 12h3l2 7 4-14 2 7h3" />
      <circle cx="4" cy="12" r="1.3" />
      <circle cx="20" cy="12" r="1.3" />
    </svg>
  );
}

/** ─────────────────────────────────────────────────────────────────────────────
 * Date helpers
 * ────────────────────────────────────────────────────────────────────────────*/
function ymdLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfDayLocal(d: Date) {
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  return t;
}

function compareLocal(a: Date, b: Date) {
  const A = +startOfDayLocal(a);
  const B = +startOfDayLocal(b);
  return A < B ? -1 : A > B ? 1 : 0;
}

function parseYMDLocal(ymd: string) {
  const m = String(ymd || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return new Date(NaN);
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  return new Date(y, mo, d, 0, 0, 0, 0);
}

function formatYMDLong(ymd: string, options: Intl.DateTimeFormatOptions) {
  const d = parseYMDLocal(String(ymd).slice(0, 10));
  return Number.isNaN(d.getTime()) ? String(ymd) : d.toLocaleDateString(undefined, options);
}

function normalizeStatus(s: string | null | undefined): CenterApptStatus | null {
  if (!s) return null;
  const v = String(s).trim().toLowerCase();
  if (v === "today") return "today";
  if (v === "upcoming") return "upcoming";
  if (v === "missed") return "missed";
  if (v === "done") return "done";
  return null;
}

function deriveStatus(appt: { date: string; status?: any; has_record?: boolean | null; given_date?: string | null }, today: Date): CenterApptStatus {
  const todayStart = startOfDayLocal(today);
  const sched = startOfDayLocal(parseYMDLocal(String(appt.date).slice(0, 10)));

  if (normalizeStatus(String(appt.status)) === "done") return "done";

  const hasRecordFlag = typeof appt.has_record === "boolean" ? appt.has_record : undefined;
  const hasRecord = hasRecordFlag ?? (appt.given_date != null && appt.given_date !== "");

  if (hasRecord) return "done";

  const cmp = compareLocal(sched, todayStart);
  if (cmp === 0) return "today";
  if (cmp < 0) return "missed";
  return "upcoming";
}

function dotClass(s: CenterApptStatus) {
  switch (s) {
    case "today":
      return "bg-amber-300";
    case "missed":
      return "bg-rose-300";
    case "done":
      return "bg-slate-300";
    default:
      return "bg-emerald-300";
  }
}