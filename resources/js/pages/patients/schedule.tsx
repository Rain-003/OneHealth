import * as React from "react";
import { Head, Link, usePage } from "@inertiajs/react";
import Logo from "/public/build/assets/LOGO.svg";
import BackIcon from "/public/build/assets/back-outline-svgrepo-com.svg";

type ApptStatus = "upcoming" | "today" | "done" | "missed";

type Appt = {
  id: number | string;
  date: string;
  title: string;
  display?: string;
  status?: ApptStatus;
  source_type?: string | null;
};

type Patient = {
  id: number | string;
  full_name?: string | null;
  patient_type?: string | null;
};

type Announcement = {
  id: number | string;
  title: string;
  body?: string | null;
  audience?: string | null;
  is_pinned?: boolean;
  is_active?: boolean;
  published_at?: string | null;
};

type PageProps = {
  csrf?: string;
  appointments?: Appt[];
  announcements?: Announcement[];
  patient?: Patient;
};

/* -------------------- Date helpers (LOCAL timezone, no UTC drift) -------------------- */
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
  const m = String(ymd || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
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

function statusFor(dateStr: string): ApptStatus {
  const today = startOfDayLocal(new Date());
  const d = startOfDayLocal(parseYMDLocal(String(dateStr).slice(0, 10)));
  if (Number.isNaN(d.getTime())) return "upcoming";
  if (+d === +today) return "today";
  return compareLocal(d, today) < 0 ? "missed" : "upcoming";
}

function displayTitle(a: Appt): string {
  return (a.display && String(a.display).trim()) || a.title || "Clinic Visit";
}

function appointmentText(a: Appt): string {
  return `${a.display ?? ""} ${a.title ?? ""} ${a.source_type ?? ""}`.trim();
}

function isImmunizationSchedule(a: Appt): boolean {
  const text = appointmentText(a).toLowerCase();
  return (
    text.includes("immunization") ||
    text.includes("immunisation") ||
    text.includes("vaccine") ||
    text.includes("vaccination") ||
    text.includes("bcg") ||
    text.includes("hepb") ||
    text.includes("hepatitis") ||
    text.includes("pentavalent") ||
    text.includes("opv") ||
    text.includes("pcv") ||
    text.includes("ipv") ||
    text.includes("mmr") ||
    text.includes("measles")
  );
}

function immunizationDoseOrder(a: Appt): number {
  const text = appointmentText(a).toLowerCase().replace(/\s+/g, " ");

  const weekMatch = text.match(/\b(6|10|14)\s*(?:w|wk|wks|week|weeks)\b/);
  if (weekMatch) return Number(weekMatch[1]);

  const monthMatch = text.match(/\b(6|9|12|15|18|24)\s*(?:m|mo|mos|month|months)\b/);
  if (monthMatch) return Number(monthMatch[1]) * 4.345;

  if (
    /\bat\s*birth\b|\bbirth\b|newborn/.test(text) ||
    /\bbcg(?:\s+vaccine)?\b/.test(text) ||
    /\bhepatitis\s*b(?:\s+vaccine)?\b/.test(text) ||
    /\bhep\s*b(?:\s+vaccine)?\b/.test(text)
  ) {
    return 0;
  }

  const doseMatch = text.match(/\b(?:dose|visit)\s*(\d+)\b|\b(\d+)(?:st|nd|rd|th)\s*(?:dose|visit)\b/);
  if (doseMatch) return 100 + Number(doseMatch[1] || doseMatch[2]);

  return 1000 + parseYMDLocal(String(a.date).slice(0, 10)).getTime() / 86400000;
}

function normalizeAppointment(a: Appt): Appt {
  const date = String(a.date || "").slice(0, 10);
  return {
    ...a,
    date,
    status: (a.status as ApptStatus | undefined) ?? statusFor(date),
  };
}

function getProgressiveVisibleAppointments(raw: Appt[]): Appt[] {
  const normalized = (raw || []).map(normalizeAppointment);
  const immunization = normalized.filter(isImmunizationSchedule);
  const otherAppointments = normalized.filter((a) => !isImmunizationSchedule(a));

  const groups = new Map<number, Appt[]>();
  for (const appt of immunization) {
    const order = immunizationDoseOrder(appt);
    if (!groups.has(order)) groups.set(order, []);
    groups.get(order)!.push(appt);
  }

  const orders = Array.from(groups.keys()).sort((a, b) => a - b);
  let visibleImmunization: Appt[] = [];

  for (const order of orders) {
    const group = groups.get(order) ?? [];
    const groupIsFinished = group.every((appt) => {
      const status = appt.status ?? statusFor(appt.date);
      return status === "done" || status === "missed";
    });

    if (!groupIsFinished) {
      visibleImmunization = group;
      break;
    }
  }

  if (visibleImmunization.length === 0 && orders.length > 0) {
    visibleImmunization = groups.get(orders[orders.length - 1]) ?? [];
  }

  return [...visibleImmunization, ...otherAppointments].sort((a, b) => {
    const byDate = compareLocal(parseYMDLocal(a.date), parseYMDLocal(b.date));
    if (byDate !== 0) return byDate;
    return immunizationDoseOrder(a) - immunizationDoseOrder(b);
  });
}

function labelFor(a: Appt): string {
  const base = displayTitle(a);
  const m = /^Immunization:\s*(.+?)(\s+—|\s*$)/i.exec(base);
  if (m && m[1]) {
    return m[1]
      .replace(/Vaccine/i, "")
      .replace(/\(.*?\)/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .slice(0, 2)
      .join(" ");
  }
  return base.split(" ")[0] || "Visit";
}

function dotClass(s: ApptStatus) {
  return s === "today"
    ? "bg-amber-400"
    : s === "done"
      ? "bg-slate-300"
      : s === "missed"
        ? "bg-rose-500"
        : "bg-emerald-500";
}

function statusLabel(s: ApptStatus) {
  if (s === "today") return "Today";
  if (s === "done") return "Done";
  if (s === "missed") return "Missed";
  return "Upcoming";
}

function statusBadgeClass(s: ApptStatus) {
  if (s === "today") return "bg-amber-50 text-amber-700 ring-amber-200";
  if (s === "done") return "bg-slate-50 text-slate-600 ring-slate-200";
  if (s === "missed") return "bg-rose-50 text-rose-700 ring-rose-200";
  return "bg-emerald-50 text-emerald-700 ring-emerald-200";
}

/* -------------------- Icons -------------------- */
const IconBell = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...props} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 3a4 4 0 0 0-4 4v1.1c0 .46-.16.91-.45 1.27L6.3 11.2A2 2 0 0 0 6 12.4V14h12v-1.6a2 2 0 0 0-.3-1.2l-1.25-1.83A2 2 0 0 1 16 8.1V7a4 4 0 0 0-4-4z" />
    <path d="M10 17a2 2 0 0 0 4 0" />
  </svg>
);

const IconInbox = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...props} fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 13h5l2 3h4l2-3h5" />
  </svg>
);

const IconFileStack = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...props} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M14 2H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M10 13h6M10 17h6M10 9h2" />
  </svg>
);

function IconChevron(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconCalendar(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" {...props} fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M8 2v4M16 2v4M3 10h18" />
    </svg>
  );
}

/* ------------------------------ Navbar ------------------------------ */
function NavActionButton({
  icon,
  label,
  onClick,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  badge?: string | null;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-400/60 hover:shadow-[0_10px_24px_rgba(15,138,153,0.12)] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 sm:h-12 sm:px-4"
      aria-label={label}
      title={label}
    >
      <span className="text-slate-700">{icon}</span>
      <span className="hidden sm:inline">{label}</span>
      {badge ? (
        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-pink-500 px-1.5 text-[10px] font-bold text-white ring-2 ring-white">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function PatientNavbar({ username }: { username?: string }) {
  const {
    announcements: rawAnnouncements = [],
    appointments: rawAppointments = [],
    patient,
  } = usePage<PageProps>().props;

  const patientKey = String(patient?.id ?? username ?? "anonymous");
  const [announcementsOpen, setAnnouncementsOpen] = React.useState(false);
  const [scheduleOpen, setScheduleOpen] = React.useState(false);
  const [seenAnnouncementIds, setSeenAnnouncementIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (!patientKey || typeof window === "undefined") return;
    try {
      const key = `onehealth_patient_seen_announcements_${patientKey}`;
      const raw = window.localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) setSeenAnnouncementIds(parsed.map((x) => String(x)));
    } catch {
      // ignore localStorage errors
    }
  }, [patientKey]);

  React.useEffect(() => {
    if (!announcementsOpen && !scheduleOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setAnnouncementsOpen(false);
        setScheduleOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [announcementsOpen, scheduleOpen]);

  const announcements = React.useMemo(
    () => (rawAnnouncements || []).filter((a) => a.is_active !== false),
    [rawAnnouncements]
  );

  const unseenAnnouncements = React.useMemo(() => {
    if (!announcements.length) return [];
    const seenSet = new Set(seenAnnouncementIds);
    return announcements.filter((a) => !seenSet.has(String(a.id)));
  }, [announcements, seenAnnouncementIds]);

  const unseenCount = unseenAnnouncements.length;
  const unseenLabel = unseenCount > 9 ? "9+" : unseenCount > 0 ? unseenCount.toString() : null;

  const saveSeenAnnouncements = React.useCallback(
    (ids: string[]) => {
      if (!patientKey || typeof window === "undefined") return;
      try {
        const key = `onehealth_patient_seen_announcements_${patientKey}`;
        window.localStorage.setItem(key, JSON.stringify(ids));
      } catch {
        // ignore localStorage errors
      }
    },
    [patientKey]
  );

  const handleOpenAnnouncements = React.useCallback(() => {
    setAnnouncementsOpen(true);
    if (!announcements.length) return;

    setSeenAnnouncementIds((prev) => {
      const merged = new Set(prev);
      announcements.forEach((a) => merged.add(String(a.id)));
      const next = Array.from(merged);
      saveSeenAnnouncements(next);
      return next;
    });
  }, [announcements, saveSeenAnnouncements]);

  const visibleAppointments = React.useMemo(
    () => getProgressiveVisibleAppointments(rawAppointments || []),
    [rawAppointments]
  );

  const upcomingAppointments = React.useMemo(() => {
    return visibleAppointments
      .filter((a) => {
        const s = a.status ?? statusFor(a.date);
        return s === "upcoming" || s === "today" || s === "missed";
      })
      .sort((a, b) => compareLocal(parseYMDLocal(a.date), parseYMDLocal(b.date)));
  }, [visibleAppointments]);

  const nextAppointment = upcomingAppointments[0];
  const upcomingCount = upcomingAppointments.length;
  const upcomingLabel = upcomingCount > 9 ? "9+" : upcomingCount > 0 ? upcomingCount.toString() : null;

  const type = String(patient?.patient_type || "").trim().toLowerCase();
  const isImmunization = ["immunization", "immunisation", "immunize"].includes(type);
  const recordsHref = isImmunization ? "/patient/immunization-card" : "/patient/prenatal-card";

  const monthUpper = (iso: string) => {
    const d = parseYMDLocal(String(iso).slice(0, 10));
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }).toUpperCase();
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/70 px-3 pt-2 backdrop-blur sm:px-4 sm:pt-3">
        <div className="mx-auto w-full max-w-[1180px] rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 shadow-sm sm:px-4 sm:py-2.5">
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:gap-3">
            <Link
              href="/patient/dashboard"
              className="inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-400/60 hover:shadow-[0_10px_24px_rgba(15,138,153,0.12)] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 sm:h-12 sm:px-4"
              aria-label="Back to dashboard"
              title="Back to dashboard"
            >
              <img src={BackIcon} alt="" className="h-5 w-5" aria-hidden="true" draggable={false} />
              <span className="hidden sm:inline">Exit</span>
            </Link>

            <nav className="flex min-w-0 items-center justify-center gap-2 sm:gap-3">
              <NavActionButton
                icon={<IconBell className="h-4 w-4 sm:h-5 sm:w-5" />}
                label="Announcements"
                badge={unseenLabel}
                onClick={handleOpenAnnouncements}
              />
              <NavActionButton
                icon={<IconInbox className="h-4 w-4 sm:h-5 sm:w-5" />}
                label="Inbox"
                badge={upcomingLabel}
                onClick={() => setScheduleOpen(true)}
              />
              <Link
                href={recordsHref}
                className="relative inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-400/60 hover:shadow-[0_10px_24px_rgba(15,138,153,0.12)] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 sm:h-12 sm:px-4"
                aria-label="Records"
                title="Records"
              >
                <IconFileStack className="h-4 w-4 text-slate-700 sm:h-5 sm:w-5" />
                <span className="hidden md:inline">Records</span>
              </Link>
            </nav>

            <Link href="/patient/dashboard" className="flex items-center justify-end gap-2 sm:gap-3">
              <img src={Logo} alt="OneHealth logo" className="h-9 w-9 rounded-lg select-none sm:h-10 sm:w-10" draggable={false} />
              <div className="hidden leading-tight md:block">
                <div className="text-[16px] font-semibold tracking-wide text-[#203D7A] md:text-[18px]">ONE HEALTH</div>
                <div className="text-[11px] uppercase tracking-wider text-slate-500 md:text-[12px]">Patient</div>
              </div>
            </Link>
          </div>
        </div>
      </header>

      {announcementsOpen && (
        <ModalOverlay onClose={() => setAnnouncementsOpen(false)}>
          <div className="relative flex max-h-[82vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200">
            <ModalHeader
              title="Announcements"
              subtitle={
                announcements.length
                  ? `${announcements.length} announcement${announcements.length > 1 ? "s" : ""} from the health center`
                  : "No announcements yet"
              }
              onClose={() => setAnnouncementsOpen(false)}
            />
            <div className="scroll-thin overflow-y-auto px-4 py-3 pb-4 sm:px-5">
              {announcements.length ? (
                <ul className="divide-y divide-slate-100">
                  {announcements.map((a) => {
                    const d = a.published_at ? new Date(a.published_at) : null;
                    const published = d
                      ? d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" })
                      : "";
                    return (
                      <li key={a.id} className="py-3 first:pt-0 last:pb-0">
                        <div className="flex flex-col gap-1 rounded-xl bg-slate-50/60 p-3 ring-1 ring-slate-100">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-[14px] font-semibold text-slate-900">{a.title || "Announcement"}</h3>
                            {a.is_pinned && (
                              <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900">
                                Pinned
                              </span>
                            )}
                          </div>
                          {a.body && <p className="whitespace-pre-line text-sm text-slate-700">{a.body}</p>}
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                            {a.audience && <span>Audience: {a.audience}</span>}
                            {published && <span>{published}</span>}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-100">
                  No announcements yet. When the health center posts one, it will appear here.
                </p>
              )}
            </div>
          </div>
        </ModalOverlay>
      )}

      {scheduleOpen && (
        <ModalOverlay onClose={() => setScheduleOpen(false)}>
          <div className="relative flex max-h-[82vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200">
            <ModalHeader
              title="Next Schedule"
              subtitle={upcomingCount > 0 ? `${upcomingCount} active schedule${upcomingCount > 1 ? "s" : ""}` : "No active schedules"}
              onClose={() => setScheduleOpen(false)}
            />
            <div className="px-4 py-4 sm:px-5">
              {nextAppointment ? (
                <div className="space-y-3 rounded-2xl bg-slate-50/70 p-4 ring-1 ring-slate-100">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold tracking-wide text-slate-500">DATE</div>
                      <div className="text-[15px] font-semibold text-[#203D7A]">{monthUpper(nextAppointment.date)}</div>
                    </div>
                    <StatusBadge status={nextAppointment.status ?? statusFor(nextAppointment.date)} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold tracking-wide text-slate-500">APPOINTMENT</div>
                    <div className="text-sm text-slate-800">{displayTitle(nextAppointment)}</div>
                  </div>
                  {upcomingCount > 1 && (
                    <p className="mt-1 text-xs text-slate-500">
                      You have {upcomingCount - 1} more active schedule{upcomingCount - 1 > 1 ? "s" : ""}. Future immunization schedules will appear after the current one is done or missed.
                    </p>
                  )}
                </div>
              ) : (
                <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-100">
                  You don&apos;t have any schedules yet. Once a schedule is set, the details will appear here.
                </p>
              )}
            </div>
          </div>
        </ModalOverlay>
      )}
    </>
  );
}

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 px-3 py-4 backdrop-blur-[2px]" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, subtitle, onClose }: { title: string; subtitle?: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
      <div>
        <h2 className="text-base font-semibold text-[#203D7A]">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
      </div>
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
  );
}

function StatusBadge({ status }: { status: ApptStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ring-1 ${statusBadgeClass(status)}`}>
      <span className={`h-2 w-2 rounded-full ${dotClass(status)}`} />
      {statusLabel(status)}
    </span>
  );
}

/* ------------------------------ Page Component ------------------------------ */
export default function PatientSchedule() {
  const { appointments: rawAppointments = [], patient } = usePage<PageProps>().props;

  const appointments = React.useMemo(
    () => getProgressiveVisibleAppointments(rawAppointments || []),
    [rawAppointments]
  );

  const today = React.useMemo(() => startOfDayLocal(new Date()), []);
  const todayKey = React.useMemo(() => ymdLocal(today), [today]);

  const calendarByDate = React.useMemo(() => {
    const map = new Map<string, Appt[]>();
    for (const a of appointments) {
      const key = String(a.date).slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return map;
  }, [appointments]);

  const defaultDateKey = React.useMemo(() => {
    const next = appointments
      .filter((a) => {
        const s = a.status ?? statusFor(a.date);
        return s !== "done";
      })
      .sort((a, b) => compareLocal(parseYMDLocal(a.date), parseYMDLocal(b.date)))[0];
    return next?.date ?? todayKey;
  }, [appointments, todayKey]);

  const [cursor, setCursor] = React.useState<Date | null>(null);
  const [selectedDateKey, setSelectedDateKey] = React.useState<string>("");
  const [detailDate, setDetailDate] = React.useState<string | null>(null);

  React.useEffect(() => {
    setSelectedDateKey((prev) => prev || defaultDateKey);
    setCursor((prev) => {
      if (prev) return prev;
      const base = parseYMDLocal(defaultDateKey);
      base.setDate(1);
      return startOfDayLocal(base);
    });
  }, [defaultDateKey]);

  React.useEffect(() => {
    if (!detailDate) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDetailDate(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detailDate]);

  const usedCursor = cursor ?? today;
  const selectedAppointments = selectedDateKey ? calendarByDate.get(selectedDateKey) ?? [] : [];

  const upcomingList = React.useMemo(() => {
    return appointments
      .filter((a) => {
        const s = a.status ?? statusFor(a.date);
        return s === "upcoming" || s === "today" || s === "missed";
      })
      .sort((a, b) => compareLocal(parseYMDLocal(a.date), parseYMDLocal(b.date)));
  }, [appointments]);

  const username = patient?.full_name?.toUpperCase?.() ?? "USERPATIENT1";

  const openDetailForDate = React.useCallback((dateKey: string) => {
    setSelectedDateKey(dateKey);
    setDetailDate(dateKey);
  }, []);

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
    const d = new Date(firstDay);
    d.setDate(daysInMonth + (calendarCells.length % 7) + 1);
    calendarCells.push({ date: d, inMonth: false });
  }

  const monthTitle = usedCursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const detailAppointments = detailDate ? calendarByDate.get(detailDate) ?? [] : [];

  return (
    <div
      className="min-h-dvh overflow-x-hidden bg-white text-slate-900"
      style={{
        fontFamily:
          "'Poppins', ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
      }}
    >
      <Head title="Schedule">
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>

      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-28 h-80 w-80 rounded-full bg-teal-100/70 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-cyan-100/70 blur-3xl" />
      </div>

      <PatientNavbar username={username} />

      <main className="relative z-10 mx-auto flex w-full max-w-[1180px] flex-1 flex-col px-3 pb-6 pt-5 sm:px-4 md:pb-8 md:pt-8">
        <section className="mx-auto w-full max-w-3xl text-center">
          <div className="text-[11px] font-semibold uppercase tracking-[0.42em] text-slate-500 sm:text-xs">Schedule</div>
          <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight text-[#203D7A] sm:text-4xl md:text-5xl">
            Your appointments
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-[15px]">
            View active health center schedules, check appointment details, and track upcoming dates.
          </p>
        </section>

        <section className="mt-6 grid w-full grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)] lg:gap-5">
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-col gap-3 border-b border-slate-100 bg-white px-3 py-3 sm:px-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-[#203D7A] sm:text-xl">{monthTitle}</h2>
                <p className="mt-0.5 text-xs text-slate-500">Tap a highlighted day to see its schedule.</p>
              </div>

              <div className="grid grid-cols-[auto_minmax(0,1fr)_minmax(90px,auto)_auto] gap-2 sm:flex sm:flex-wrap sm:items-center">
                <button
                  type="button"
                  onClick={() => moveMonth(-1)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0F8A99]"
                  aria-label="Previous month"
                >
                  <IconChevron className="h-5 w-5" />
                </button>
                <select
                  value={selectedMonth}
                  onChange={onMonthChange}
                  className="h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0F8A99]"
                  aria-label="Month"
                >
                  {monthOptions.map((m, idx) => (
                    <option key={m} value={idx}>{m}</option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={onYearChange}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0F8A99]"
                  aria-label="Year"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => moveMonth(1)}
                  className="inline-flex h-11 w-11 rotate-180 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0F8A99]"
                  aria-label="Next month"
                >
                  <IconChevron className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-2.5 sm:p-4">
              <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400 sm:gap-2 sm:text-xs">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="py-1">{day}</div>
                ))}
              </div>

              <div className="mt-1.5 grid grid-cols-7 gap-1.5 sm:gap-2">
                {calendarCells.map(({ date, inMonth }, index) => {
                  const key = ymdLocal(date);
                  const items = calendarByDate.get(key) ?? [];
                  const hasItems = items.length > 0;
                  const isToday = key === todayKey;
                  const isSelected = key === selectedDateKey;

                  return (
                    <button
                      key={`${key}-${index}`}
                      type="button"
                      onClick={() => {
                        setSelectedDateKey(key);
                        if (hasItems) setDetailDate(key);
                      }}
                      className={[
                        "group min-h-[58px] rounded-xl border p-1.5 text-left transition focus:outline-none focus:ring-2 focus:ring-[#0F8A99] sm:min-h-[78px] sm:p-2",
                        inMonth ? "bg-white" : "bg-slate-50/70 text-slate-300",
                        isSelected ? "border-[#0F8A99] ring-1 ring-[#0F8A99]/25" : "border-slate-100 hover:border-teal-200",
                        hasItems ? "shadow-sm" : "",
                      ].join(" ")}
                      aria-label={`${formatYMDLong(key, { month: 'long', day: 'numeric', year: 'numeric' })}${hasItems ? `, ${items.length} schedule${items.length > 1 ? 's' : ''}` : ''}`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className={[
                          "inline-flex h-6 min-w-6 items-center justify-center rounded-full text-xs font-semibold sm:h-7 sm:min-w-7 sm:text-sm",
                          isToday ? "bg-[#0F8A99] text-white" : inMonth ? "text-slate-700" : "text-slate-300",
                        ].join(" ")}>{date.getDate()}</span>
                        {hasItems ? <span className="h-2 w-2 rounded-full bg-[#0F8A99]" /> : null}
                      </div>
                      {hasItems ? (
                        <div className="mt-1 hidden space-y-1 sm:block">
                          {items.slice(0, 2).map((item) => (
                            <div key={item.id} className="truncate rounded-md bg-teal-50 px-1.5 py-0.5 text-[10px] font-medium text-[#0F8A99]">
                              {labelFor(item)}
                            </div>
                          ))}
                          {items.length > 2 ? <div className="text-[10px] font-semibold text-slate-400">+{items.length - 2} more</div> : null}
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <section className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div>
                  <h2 className="text-lg font-bold text-[#203D7A]">Selected date</h2>
                  <p className="text-xs text-slate-500">{selectedDateKey ? formatYMDLong(selectedDateKey, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'No date selected'}</p>
                </div>
                <button
                  type="button"
                  onClick={goToday}
                  className="h-10 rounded-xl border border-teal-200 bg-teal-50 px-3 text-xs font-semibold text-[#0F8A99] hover:bg-teal-100 focus:outline-none focus:ring-2 focus:ring-[#0F8A99]"
                >
                  Today
                </button>
              </div>
              <div className="p-4">
                {selectedAppointments.length ? (
                  <div className="space-y-2">
                    {selectedAppointments.map((appt) => <AppointmentCard key={appt.id} appointment={appt} />)}
                  </div>
                ) : (
                  <EmptyCard title="No schedule on this date" body="Choose a highlighted date, or check your upcoming list below." />
                )}
              </div>
            </section>

            <section className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
              <div className="border-b border-slate-100 px-4 py-3">
                <h2 className="text-lg font-bold text-[#203D7A]">Upcoming</h2>
                <p className="text-xs text-slate-500">{upcomingList.length ? `${upcomingList.length} active schedule${upcomingList.length > 1 ? 's' : ''}` : 'No upcoming schedules'}</p>
              </div>
              <div className="max-h-[380px] overflow-y-auto p-4">
                {upcomingList.length ? (
                  <div className="space-y-2">
                    {upcomingList.map((appt) => (
                      <button
                        key={appt.id}
                        type="button"
                        onClick={() => openDetailForDate(appt.date)}
                        className="w-full text-left"
                      >
                        <AppointmentCard appointment={appt} compact />
                      </button>
                    ))}
                  </div>
                ) : (
                  <EmptyCard title="No active schedules" body="Once the health center adds a schedule, it will appear here." />
                )}
              </div>
            </section>
          </aside>
        </section>
      </main>

      <footer className="relative z-10 mx-auto mt-auto w-full max-w-[720px] px-4 pb-5 pt-2 md:pb-7">
        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 pt-5 text-center sm:flex-row sm:text-left">
          <div className="flex items-center gap-2">
            <img src={Logo} alt="OneHealth logo" className="h-8 w-8 rounded-lg" />
            <span className="text-sm font-semibold tracking-wide text-[#203D7A]">ONE HEALTH</span>
          </div>
          <span className="text-xs text-slate-500">© {new Date().getFullYear()} OneHealth. All rights reserved.</span>
        </div>
      </footer>

      {detailDate && (
        <ModalOverlay onClose={() => setDetailDate(null)}>
          <div className="relative flex max-h-[82vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200">
            <ModalHeader
              title="Schedule details"
              subtitle={formatYMDLong(detailDate, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              onClose={() => setDetailDate(null)}
            />
            <div className="overflow-y-auto p-4">
              {detailAppointments.length ? (
                <div className="space-y-2">
                  {detailAppointments.map((appt) => <AppointmentCard key={appt.id} appointment={appt} />)}
                </div>
              ) : (
                <EmptyCard title="No schedule" body="There are no appointments listed on this date." />
              )}
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}

function AppointmentCard({ appointment, compact = false }: { appointment: Appt; compact?: boolean }) {
  const status = appointment.status ?? statusFor(appointment.date);
  return (
    <div className="rounded-xl bg-slate-50/80 p-3 ring-1 ring-slate-100 transition hover:bg-white hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotClass(status)}`} />
            <div className="truncate text-sm font-semibold text-slate-900">{displayTitle(appointment)}</div>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
            <IconCalendar className="h-3.5 w-3.5" />
            <span>{formatYMDLong(appointment.date, compact ? { month: 'short', day: '2-digit', year: 'numeric' } : { weekday: 'short', month: 'long', day: '2-digit', year: 'numeric' })}</span>
          </div>
          {appointment.source_type ? <div className="mt-1 text-[11px] uppercase tracking-wide text-slate-400">{appointment.source_type}</div> : null}
        </div>
        <StatusBadge status={status} />
      </div>
    </div>
  );
}

function EmptyCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4 text-center ring-1 ring-slate-100">
      <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-xl bg-white text-[#0F8A99] ring-1 ring-slate-100">
        <IconCalendar className="h-5 w-5" />
      </div>
      <div className="text-sm font-semibold text-slate-800">{title}</div>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">{body}</p>
    </div>
  );
}
