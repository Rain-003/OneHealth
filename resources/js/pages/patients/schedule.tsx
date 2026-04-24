import * as React from "react";
import { Head, Link, usePage } from "@inertiajs/react";
import Logo from "/public/build/assets/LOGO.svg";
import BackIcon from "/public/build/assets/back-outline-svgrepo-com.svg";

type ApptStatus = "upcoming" | "today" | "done" | "missed";

type Appt = {
  id: number | string;
  date: string; // YYYY-MM-DD from server
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

/* -------------------- Tiny label from title ("stamps") -------------------- */
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

/* -------------------- Status → dot color & label -------------------- */
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

/* ------------------------------ Navbar ------------------------------ */
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
      if (Array.isArray(parsed)) {
        setSeenAnnouncementIds(parsed.map((x) => String(x)));
      }
    } catch {
      //
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
  const unseenLabel = unseenCount > 9 ? "9+" : unseenCount.toString();

  const saveSeenAnnouncements = React.useCallback(
    (ids: string[]) => {
      if (!patientKey || typeof window === "undefined") return;
      try {
        const key = `onehealth_patient_seen_announcements_${patientKey}`;
        window.localStorage.setItem(key, JSON.stringify(ids));
      } catch {
        //
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

  const upcomingAppointments = React.useMemo(() => {
    const list = rawAppointments || [];
    return list
      .map((a) => ({ ...a, status: a.status ?? statusFor(a.date) }))
      .filter((a) => {
        const s = a.status ?? statusFor(a.date);
        return s === "upcoming" || s === "today" || s === "missed";
      })
      .sort((a, b) =>
        compareLocal(
          parseYMDLocal(String(a.date).slice(0, 10)),
          parseYMDLocal(String(b.date).slice(0, 10))
        )
      );
  }, [rawAppointments]);

  const nextAppointment = upcomingAppointments[0];
  const upcomingCount = upcomingAppointments.length;
  const upcomingLabel = upcomingCount > 9 ? "9+" : upcomingCount.toString();

  const type = String(patient?.patient_type || "").trim().toLowerCase();
  const isImmunization = ["immunization", "immunisation", "immunize"].includes(type);
  const recordsHref = isImmunization ? "/patient/immunization-card" : "/patient/prenatal-card";

  const monthUpper = (iso: string) => {
    const d = parseYMDLocal(String(iso).slice(0, 10));
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).toUpperCase();
  };

  const Shell = () => (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow backdrop-blur">
      <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
        <Link
          href="/patient/dashboard"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[14px] font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-400/60 hover:shadow-[0_10px_24px_rgba(15,138,153,0.12)] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 md:text-[15px]"
          aria-label="Back to dashboard"
          title="Back to dashboard"
        >
          <img
            src={BackIcon}
            alt=""
            className="h-6 w-6 -ml-0.5"
            aria-hidden="true"
            draggable={false}
          />
          <span className="tracking-wide hidden xs:inline">Back</span>
        </Link>

        <button
          type="button"
          onClick={handleOpenAnnouncements}
          className="relative grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md active:translate-y-[1px] focus:outline-none focus:ring-2 focus:ring-teal-600 md:h-10 md:w-10"
          aria-label="View announcements"
        >
          <IconBell className="h-4 w-4 text-slate-700 md:h-5 md:w-5" />
          {unseenCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-pink-400 px-[3px] text-[9px] font-semibold text-white ring-2 ring-white shadow-sm">
              {unseenLabel}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setScheduleOpen(true)}
          className="relative grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md active:translate-y-[1px] focus:outline-none focus:ring-2 focus:ring-teal-600 md:h-10 md:w-10"
          aria-label="View upcoming schedule"
        >
          <IconInbox className="h-4 w-4 text-slate-700 md:h-5 md:w-5" />
          {upcomingCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-pink-400 px-[3px] text-[9px] font-semibold text-white ring-2 ring-white shadow-sm">
              {upcomingLabel}
            </span>
          )}
        </button>

        <Link
          href={recordsHref}
          aria-label="Open records"
          className="relative grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md active:translate-y-[1px] focus:outline-none focus:ring-2 focus:ring-teal-600 md:h-10 md:w-10"
        >
          <IconFileStack className="h-4 w-4 text-slate-700 md:h-5 md:w-5" />
        </Link>
      </div>

      <nav className="mx-2 hidden flex-1 items-center justify-center gap-9 md:flex" />

      <Link href="/patient/dashboard" className="ml-auto flex items-center gap-2 sm:gap-3">
        <img
          src={Logo}
          alt="OneHealth logo"
          className="h-9 w-9 rounded-lg select-none"
          draggable={false}
        />
        <div className="hidden leading-tight sm:block">
          <div className="text-[16px] font-semibold tracking-wide text-[#203D7A] md:text-[18px]">
            ONE HEALTH
          </div>
          <div className="text-[11px] uppercase tracking-wider text-slate-500 md:text-[12px]">
            Patient
          </div>
        </div>
      </Link>
    </div>
  );

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 pt-3 pb-2">
          <Shell />
        </div>
      </header>

      {announcementsOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 px-4"
          onClick={() => setAnnouncementsOpen(false)}
        >
          <div
            className="relative flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
              <div>
                <h2 className="text-base font-semibold text-[#203D7A]">Announcements</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {announcements.length
                    ? `${announcements.length} announcement${announcements.length > 1 ? "s" : ""} from the health center`
                    : "No announcements yet"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAnnouncementsOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                aria-label="Close announcements"
              >
                <span className="sr-only">Close</span>
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-500" aria-hidden="true">
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <div className="scroll-thin overflow-y-auto px-5 py-3 pb-4">
              {announcements.length ? (
                <ul className="divide-y divide-slate-200">
                  {announcements.map((a) => {
                    const d = a.published_at ? new Date(a.published_at) : null;
                    const published = d
                      ? d.toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "2-digit",
                        })
                      : "";
                    return (
                      <li key={a.id} className="py-3 first:pt-0 last:pb-0">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-[14px] font-semibold text-slate-900">
                              {a.title || "Announcement"}
                            </h3>
                            {a.is_pinned && (
                              <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900">
                                Pinned
                              </span>
                            )}
                          </div>
                          {a.body && (
                            <p className="whitespace-pre-line text-sm text-slate-700">{a.body}</p>
                          )}
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                            {a.audience && <span>Audience: {a.audience}</span>}
                            {published && (
                              <span className="before:px-1 before:content-['·']">{published}</span>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-slate-600">
                  No announcements yet. When the health center posts one, it will appear here.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {scheduleOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 px-4"
          onClick={() => setScheduleOpen(false)}
        >
          <div
            className="relative flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
              <div>
                <h2 className="text-base font-semibold text-[#203D7A]">Next Schedule</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {upcomingCount > 0
                    ? `${upcomingCount} active schedule${upcomingCount > 1 ? "s" : ""}`
                    : "No active schedules"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setScheduleOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                aria-label="Close schedule"
              >
                <span className="sr-only">Close</span>
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-500" aria-hidden="true">
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <div className="px-5 py-4">
              {nextAppointment ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold tracking-wide text-slate-500">DATE</div>
                      <div className="text-[15px] font-semibold text-[#203D7A]">
                        {monthUpper(nextAppointment.date)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block h-2.5 w-2.5 rounded-full ${dotClass(
                          nextAppointment.status ?? statusFor(nextAppointment.date)
                        )}`}
                      />
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-600">
                        {statusLabel(nextAppointment.status ?? statusFor(nextAppointment.date))}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold tracking-wide text-slate-500">APPOINTMENT</div>
                    <div className="text-sm text-slate-800">{displayTitle(nextAppointment)}</div>
                  </div>

                  {upcomingCount > 1 && (
                    <p className="mt-1 text-xs text-slate-500">
                      You have {upcomingCount - 1} more active schedule
                      {upcomingCount - 1 > 1 ? "s" : ""}. View your full schedule on this page.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-600">
                  You don&apos;t have any schedules yet. Once a schedule is set, the details will
                  appear here.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ------------------------------ Page Component ------------------------------ */
export default function PatientSchedule() {
  const { appointments: rawAppointments = [], patient } = usePage<PageProps>().props;

  const appointments = React.useMemo(
    () =>
      (rawAppointments || []).map((a) => ({
        ...a,
        date: String(a.date).slice(0, 10),
        status: (a.status as ApptStatus | undefined) ?? statusFor(String(a.date).slice(0, 10)),
      })),
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

  React.useEffect(() => {
    setSelectedDateKey((prev) => prev || defaultDateKey);
    setCursor((prev) => {
      if (prev) return prev;
      const base = parseYMDLocal(defaultDateKey);
      base.setDate(1);
      return startOfDayLocal(base);
    });
  }, [defaultDateKey]);

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

  const [detailDate, setDetailDate] = React.useState<string | null>(null);

  const openDetailForDate = React.useCallback((dateKey: string) => {
    setSelectedDateKey(dateKey);
    setDetailDate(dateKey);
  }, []);

  const closeDetail = React.useCallback(() => setDetailDate(null), []);

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
    const last = calendarCells[calendarCells.length - 1].date;
    const d = new Date(last);
    d.setDate(d.getDate() + 1);
    calendarCells.push({ date: d, inMonth: false });
  }

  const monthLabel = usedCursor.toLocaleString(undefined, { month: "long", year: "numeric" });

  const detailAppointments = React.useMemo(
    () => (detailDate ? calendarByDate.get(detailDate) ?? [] : []),
    [detailDate, calendarByDate]
  );

  return (
    <div
      className="relative min-h-dvh bg-white text-slate-900"
      style={{
        fontFamily:
          "'Poppins', ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial",
      }}
    >
      <Head title="Schedule" />

      <PatientNavbar username={username} />

      <style>{`
        .scroll-thin { scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent; }
        .scroll-thin::-webkit-scrollbar { width: 8px; height: 8px; }
        .scroll-thin::-webkit-scrollbar-track { background: transparent; }
        .scroll-thin::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 9999px;
          border: 2px solid transparent;
          background-clip: padding-box;
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

      <div className="mx-auto max-w-7xl px-4 pt-4">
        <h1 className="text-[22px] font-semibold tracking-tight text-[#203D7A] md:text-[28px] lg:text-[32px]">
          Schedule
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Your calendar only shows schedules assigned to your account. Tap a date or item to see
          the full details.
        </p>
      </div>

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-4">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
          <section className="lg:col-span-1">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-[18px] font-semibold text-[#203D7A]">Upcoming Schedules</h2>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  Upcoming
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  Today
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                  Missed
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  Done
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:h-[700px] lg:max-h-[700px]">
              {upcomingList.length === 0 ? (
                <div className="rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-600">
                  No schedules yet.
                </div>
              ) : (
                <div className="scroll-thin lg:h-full lg:overflow-y-auto lg:pr-1">
                  <ul className="space-y-3">
                    {upcomingList.map((a) => {
                      const s = a.status ?? statusFor(a.date);
                      return (
                        <li key={a.id}>
                          <button
                            type="button"
                            onClick={() => openDetailForDate(a.date)}
                            className={[
                              "w-full rounded-xl border px-3 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-teal-600",
                              selectedDateKey === a.date
                                ? "border-teal-300 bg-teal-50/70"
                                : "border-slate-200 hover:border-teal-300/80 hover:bg-teal-50/50",
                            ].join(" ")}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-[13px] font-semibold text-[#203D7A]">
                                  {formatYMDLong(a.date, {
                                    month: "long",
                                    day: "numeric",
                                    year: "numeric",
                                  }).toUpperCase()}
                                </div>
                                <div className="mt-1 text-sm text-slate-700">{displayTitle(a)}</div>
                                <div className="mt-1 text-[11px] text-slate-500">{labelFor(a)}</div>
                              </div>

                              <div className="mt-1 flex flex-col items-end gap-1">
                                <span className={`h-2.5 w-2.5 rounded-full ${dotClass(s)}`} />
                                <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
                                  {statusLabel(s)}
                                </span>
                              </div>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </section>

          <section className="lg:col-span-2">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="rounded-2xl bg-slate-50/70 p-2.5 sm:p-3 lg:p-4">
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

                        const statuses = new Set(
                          dayAppts.map((a) => (a.status ?? statusFor(a.date)) as ApptStatus)
                        );
                        const hasUpcoming = statuses.has("upcoming");
                        const hasToday = statuses.has("today");
                        const hasDone = statuses.has("done");
                        const hasMissed = statuses.has("missed");

                        const isSelected = selectedDateKey === key;
                        const isTodayCell = key === todayKey;

                        return (
                          <button
                            key={key + "-" + i}
                            type="button"
                            onClick={() => {
                              setSelectedDateKey(key);
                              if (any) setDetailDate(key);
                            }}
                            className={[
                              "calendar-cell-compact relative min-h-[62px] rounded-xl border px-1.5 py-1.5 text-left shadow-sm transition sm:min-h-[72px] sm:rounded-2xl sm:px-2 sm:py-2 lg:min-h-[84px]",
                              inMonth ? "bg-white" : "bg-slate-50 text-slate-400",
                              any
                                ? "border-[#0F8A99]/25 hover:border-[#0F8A99]/60 hover:shadow-md"
                                : "border-slate-200",
                              isSelected ? "ring-2 ring-[#0F8A99] border-[#0F8A99]/40" : "",
                              isTodayCell && !isSelected ? "ring-1 ring-amber-200" : "",
                            ].join(" ")}
                            title={any ? dayAppts.map((a) => displayTitle(a)).join(" • ") : undefined}
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
                                  {hasUpcoming && (
                                    <span
                                      className={
                                        "inline-flex h-2 w-2 rounded-full sm:h-2.5 sm:w-2.5 " +
                                        dotClass("upcoming")
                                      }
                                    />
                                  )}
                                  {hasToday && (
                                    <span
                                      className={
                                        "inline-flex h-2 w-2 rounded-full sm:h-2.5 sm:w-2.5 " +
                                        dotClass("today")
                                      }
                                    />
                                  )}
                                  {hasMissed && (
                                    <span
                                      className={
                                        "inline-flex h-2 w-2 rounded-full sm:h-2.5 sm:w-2.5 " +
                                        dotClass("missed")
                                      }
                                    />
                                  )}
                                  {hasDone && (
                                    <span
                                      className={
                                        "inline-flex h-2 w-2 rounded-full sm:h-2.5 sm:w-2.5 " +
                                        dotClass("done")
                                      }
                                    />
                                  )}
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

              <div className="border-t border-slate-200 px-4 py-3 sm:px-5">
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
                    <div className="mt-1 text-xs text-slate-500">
                      {selectedAppointments.length > 0
                        ? `${selectedAppointments.length} appointment${
                            selectedAppointments.length > 1 ? "s" : ""
                          } on this date`
                        : "No appointment on this date"}
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
            </div>
          </section>
        </div>
      </main>

      {detailDate && detailAppointments.length > 0 && (
        <div
          className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-900/40 px-4"
          onClick={closeDetail}
        >
          <div
            className="relative flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
              <div>
                <h2 className="text-base font-semibold text-[#203D7A]">Schedule Details</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {formatYMDLong(detailDate, {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <button
                type="button"
                onClick={closeDetail}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                aria-label="Close details"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-500" aria-hidden="true">
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <div className="scroll-thin space-y-3 overflow-y-auto px-5 py-4">
              {detailAppointments.map((a) => {
                const s = a.status ?? statusFor(a.date);
                return (
                  <div
                    key={a.id}
                    className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-3"
                  >
                    <span className={`mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full ${dotClass(s)}`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-slate-900">{displayTitle(a)}</h3>
                        <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                          {statusLabel(s)}
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500">{labelFor(a)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}