  // resources/js/pages/patients/dashboard.tsx
import * as React from "react";
import { Head, Link, usePage } from "@inertiajs/react";

// 🖼️ Brand
import Logo from "/public/build/assets/LOGO.svg";
import BackIcon from "/public/build/assets/back-outline-svgrepo-com.svg";

type Patient = {
  id: number | string;
  full_name?: string | null;
  birthdate?: string | null;
  patient_type?: string | null;
};

type Appointment = {
  id: number | string;
  date: string; // ISO date "YYYY-MM-DD" (or full ISO)
  title: string;
  status?: "upcoming" | "today" | "done";
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
  patient?: Patient;
  appointments?: Appointment[];
  announcements?: Announcement[];
};

/* --------------------- Local date helpers (avoid UTC drift) --------------------- */
function startOfDayLocal(d: Date) {
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  return t;
}
function ymdLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function compareLocal(a: Date, b: Date) {
  const A = +startOfDayLocal(a);
  const B = +startOfDayLocal(b);
  return A < B ? -1 : A > B ? 1 : 0;
}
function statusFor(dateStr: string): "upcoming" | "today" | "done" {
  const today = startOfDayLocal(new Date());
  const d = startOfDayLocal(new Date(dateStr + "T00:00:00"));
  if (+d === +today) return "today";
  return compareLocal(d, today) < 0 ? "done" : "upcoming";
}

// Status → color dot class
function statusDotClass(s?: Appointment["status"]) {
  return s === "today"
    ? "bg-amber-400"
    : s === "done"
    ? "bg-slate-300"
    : "bg-emerald-500";
}

function fmtLongUpper(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d
    .toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    .toUpperCase();
}

function fmtAnnDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

/* --------------------- Cohesive outline icons (no fills) --------------------- */
const IconCalendar = (props: any) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    {...props}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <path d="M16 2v4M8 2v4M3 9h18" />
    <path d="M8 13h4M8 17h8" />
  </svg>
);

const IconInbox = (props: any) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    {...props}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 13h5l2 3h4l2-3h5" />
  </svg>
);

const IconFileStack = (props: any) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    {...props}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <path d="M14 2H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M10 13h6M10 17h6M10 9h2" />
  </svg>
);

const IconBell = (props: any) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    {...props}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <path d="M12 3a4 4 0 0 0-4 4v1.1c0 .46-.16.91-.45 1.27L6.3 11.2A2 2 0 0 0 6 12.4V14h12v-1.6a2 2 0 0 0-.3-1.2l-1.25-1.83A2 2 0 0 1 16 8.1V7a4 4 0 0 0-4-4z" />
    <path d="M10 17a2 2 0 0 0 4 0" />
  </svg>
);

/* ------------------------------ Top Navigation (sticky, buttons left, logo right) ------------------------------ */
function PatientNavbar({ username }: { username?: string }) {
  const {
    csrf: csrfFromProps,
    announcements: rawAnnouncements = [],
    appointments: rawAppointments = [],
    patient,
  } = usePage<PageProps>().props;

  // Prefer CSRF from page props (controller), otherwise fall back to meta
  const csrfMeta =
    (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)
      ?.content ?? "";
  const csrf = csrfFromProps || csrfMeta || "";

  // For per-patient localStorage keys
  const patientKey = String(patient?.id ?? username ?? "anonymous");

  // Modals
  const [announcementsOpen, setAnnouncementsOpen] = React.useState(false);
  const [scheduleOpen, setScheduleOpen] = React.useState(false);

  // Which announcement is currently selected (for detail view)
  const [activeAnnouncementId, setActiveAnnouncementId] =
    React.useState<string | null>(null);

  // Close modals with Escape key
  React.useEffect(() => {
    if (!announcementsOpen && !scheduleOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setAnnouncementsOpen(false);
        setScheduleOpen(false);
        setActiveAnnouncementId(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [announcementsOpen, scheduleOpen]);

  // Active announcements only
  const announcements = React.useMemo(
    () => (rawAnnouncements || []).filter((a) => a.is_active !== false),
    [rawAnnouncements]
  );

  // 🔔 unified read-state hook (per patient)
  const {
    unreadCount,
    announcementsWithRead,
    markAsRead,
  } = usePatientAnnouncementReadState(announcements, patientKey);

  const unseenCount = unreadCount;
  const unseenLabel = unseenCount > 9 ? "9+" : unseenCount.toString();

  const activeAnnouncement = React.useMemo(
    () =>
      announcementsWithRead.find(
        (a) => String(a.id) === (activeAnnouncementId ?? "")
      ) ?? null,
    [announcementsWithRead, activeAnnouncementId]
  );

  // ✅ Only open modal; DON'T mark all as seen here
  const handleOpenAnnouncements = React.useCallback(() => {
    setAnnouncementsOpen(true);
    setActiveAnnouncementId(null);
  }, []);

  // Upcoming appointments (today or future)
  const upcomingAppointments = React.useMemo(() => {
    const list = rawAppointments || [];
    return list
      .filter((a) => statusFor(a.date) !== "done")
      .sort((a, b) =>
        compareLocal(
          new Date(a.date + "T00:00:00"),
          new Date(b.date + "T00:00:00")
        )
      );
  }, [rawAppointments]);

  const nextAppointment = upcomingAppointments[0];
  const upcomingCount = upcomingAppointments.length;
  const upcomingLabel = upcomingCount > 9 ? "9+" : upcomingCount.toString();

  const handleOpenSchedule = React.useCallback(() => {
    setScheduleOpen(true);
  }, []);

  const Shell = () => (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white/90 backdrop-blur px-4 py-3 shadow">
      {/* LEFT: actions (announcements, schedule, exit) */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Exit button (logout POST) */}
        <form method="post" action="/patient/logout">
          <input type="hidden" name="_token" value={csrf} />
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[14px] md:text-[15px] font-semibold text-slate-800 shadow-sm hover:-translate-y-0.5 hover:border-teal-400/60 hover:shadow-[0_16px_40px_rgba(15,138,153,0.12)] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
            aria-label="Exit to Home"
            title="Exit"
          >
            <img
              src={BackIcon}
              alt=""
              className="h-6 w-6 -ml-0.5"
              aria-hidden="true"
              draggable={false}
            />
            <span className="tracking-wide">Exit</span>
          </button>
        </form>

        {/* Announcements bell */}
        <button
          type="button"
          onClick={handleOpenAnnouncements}
          className="relative grid h-9 w-9 md:h-10 md:w-10 place-items-center rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md active:translate-y-[1px] transition focus:outline-none focus:ring-2 focus:ring-teal-600"
          aria-label="View announcements"
        >
          <IconBell className="h-4 w-4 md:h-5 md:w-5 text-slate-700" />
          {unseenCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-pink-400 px-[3px] text-[9px] font-semibold text-white ring-2 ring-white shadow-sm">
              {unseenLabel}
            </span>
          )}
        </button>

        {/* Inbox / schedule icon */}
        <button
          type="button"
          onClick={handleOpenSchedule}
          className="relative grid h-9 w-9 md:h-10 md:w-10 place-items-center rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md active:translate-y-[1px] transition focus:outline-none focus:ring-2 focus:ring-teal-600"
          aria-label="View upcoming schedule"
        >
          <IconInbox className="h-4 w-4 md:h-5 md:w-5 text-slate-700" />
          {upcomingCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-pink-400 px-[3px] text-[9px] font-semibold text-white ring-2 ring-white shadow-sm">
              {upcomingLabel}
            </span>
          )}
        </button>
      </div>

      {/* optional center nav placeholder */}
      <nav className="mx-2 hidden flex-1 items-center justify-center gap-9 md:flex" />

      {/* RIGHT: brand / logo */}
      <Link
        href="/patient/dashboard"
        className="ml-auto flex items-center gap-3"
      >
        <img
          src={Logo}
          alt="OneHealth logo"
          className="h-9 w-9 rounded-xl select-none"
          draggable={false}
        />
        <div className="leading-tight hidden sm:block">
          <div className="text-[16px] md:text-[18px] font-semibold tracking-wide text-[#203D7A]">
            ONE HEALTH
          </div>
          <div className="text-[11px] md:text-[12px] uppercase tracking-wider text-slate-500">
            Patient
          </div>
        </div>
      </Link>
    </div>
  );

  return (
    <>
      {/* Sticky navbar (like schedule page) */}
      <header className="sticky top-0 z-50 bg-transparent">
        <div className="mx-auto max-w-7xl px-4 pt-3 pb-2">
          <Shell />
        </div>
      </header>

      {/* Announcements Modal */}
      {announcementsOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 px-4"
          onClick={() => {
            setAnnouncementsOpen(false);
            setActiveAnnouncementId(null);
          }}
        >
          <div
            className="relative w-full max-w-2xl md:max-w-3xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-5 md:px-6 py-4">
              <div>
                <h2 className="text-lg md:text-xl font-semibold text-[#203D7A]">
                  Announcements
                </h2>
                <p className="mt-0.5 text-xs md:text-sm text-slate-500">
                  {activeAnnouncement
                    ? "Announcement details"
                    : announcementsWithRead.length
                    ? `${announcementsWithRead.length} announcement${
                        announcementsWithRead.length > 1 ? "s" : ""
                      } from the health center`
                    : "No announcements yet"}
                </p>
              </div>

              {/* Close button */}
              <button
                type="button"
                onClick={() => {
                  setAnnouncementsOpen(false);
                  setActiveAnnouncementId(null);
                }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                aria-label="Close announcements"
              >
                <span className="sr-only">Close</span>
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 text-slate-500"
                  aria-hidden="true"
                >
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="px-5 md:px-6 py-3 pb-5 md:pb-6 overflow-y-auto scroll-thin">
              {/* DETAIL VIEW */}
              {activeAnnouncement ? (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setActiveAnnouncementId(null)}
                    className="mb-1 inline-flex items-center gap-1 text-xs md:text-sm text-slate-500 hover:text-slate-700"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.7}
                    >
                      <path
                        d="M15 6l-6 6 6 6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>Back to all announcements</span>
                  </button>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/60 px-4 md:px-5 py-3.5 md:py-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-base md:text-lg font-semibold text-slate-900 break-words">
                          {activeAnnouncement.title || "Announcement"}
                        </h3>
                        {activeAnnouncement.published_at && (
                          <p className="mt-0.5 text-[11px] md:text-xs text-slate-500">
                            {fmtAnnDate(activeAnnouncement.published_at)}
                          </p>
                        )}
                      </div>
                      {activeAnnouncement.is_pinned && (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-medium text-amber-900">
                          Pinned
                        </span>
                      )}
                    </div>

                    {activeAnnouncement.body && (
                      <p className="mt-3 text-sm md:text-[15px] leading-relaxed text-slate-700 whitespace-pre-line break-words">
                        {activeAnnouncement.body}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] md:text-xs text-slate-500">
                      {activeAnnouncement.audience && (
                        <span>Audience: {activeAnnouncement.audience}</span>
                      )}
                    </div>
                  </div>
                </div>
              ) : /* LIST VIEW */ announcementsWithRead.length ? (
                <ul className="space-y-2.5">
                  {announcementsWithRead.map((a) => {
                    const published = fmtAnnDate(a.published_at);
                    const idStr = String(a.id);
                    const isSeen = a.is_read;

                    return (
                      <li key={a.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveAnnouncementId(idStr);
                            markAsRead(a.id);
                          }}
                          className={`w-full text-left rounded-2xl px-4 py-3 md:px-5 md:py-3.5 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-teal-500 border ${
                            isSeen
                              ? "bg-white border-slate-200 opacity-70"
                              : "bg-teal-50/80 border-teal-200"
                          }`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h3
                                  className={`text-[14px] md:text-[15px] font-semibold break-words ${
                                    isSeen ? "text-slate-600" : "text-slate-900"
                                  }`}
                                >
                                  {a.title || "Announcement"}
                                </h3>

                                {/* Unread dot indicator */}
                                {!isSeen && (
                                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-teal-500" />
                                )}

                                {a.is_pinned && (
                                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900">
                                    Pinned
                                  </span>
                                )}
                              </div>

                              {a.body && (
                                <p
                                  className={`mt-1 text-xs md:text-sm line-clamp-2 break-words ${
                                    isSeen
                                      ? "text-slate-500"
                                      : "text-slate-600"
                                  }`}
                                >
                                  {a.body}
                                </p>
                              )}
                            </div>

                            {published && (
                              <span className="text-[11px] md:text-xs text-slate-500 shrink-0">
                                {published}
                              </span>
                            )}
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] md:text-xs text-slate-500">
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
                <p className="text-sm text-slate-600">
                  No announcements yet. When the health center posts one, it
                  will appear here.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Next Schedule Modal (Inbox icon) */}
      {scheduleOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 px-4"
          onClick={() => setScheduleOpen(false)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-white shadow-xl flex flex-col max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
              <div>
                <h2 className="text-base font-semibold text-[#203D7A]">
                  Next Schedule
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {upcomingCount > 0
                    ? `${upcomingCount} upcoming appointment${
                        upcomingCount > 1 ? "s" : ""
                      }`
                    : "No upcoming appointments"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setScheduleOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                aria-label="Close schedule"
              >
                <span className="sr-only">Close</span>
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 text-slate-500"
                  aria-hidden="true"
                >
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
                      <div className="text-xs font-semibold tracking-wide text-slate-500">
                        DATE
                      </div>
                      <div className="text-[15px] font-semibold text-[#203D7A]">
                        {fmtLongUpper(nextAppointment.date)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block h-2.5 w-2.5 rounded-full ${statusDotClass(
                          nextAppointment.status ??
                            statusFor(nextAppointment.date)
                        )}`}
                      />
                      <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                        {nextAppointment.status ??
                          statusFor(nextAppointment.date)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold tracking-wide text-slate-500">
                      APPOINTMENT
                    </div>
                    <div className="text-sm text-slate-800">
                      {nextAppointment.title}
                    </div>
                  </div>

                  {upcomingCount > 1 && (
                    <p className="mt-1 text-xs text-slate-500">
                      You have {upcomingCount - 1} more upcoming appointment
                      {upcomingCount - 1 > 1 ? "s" : ""}. View your full
                      schedule in the Schedule section.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-600">
                  You don&apos;t have any upcoming appointments yet. Once a
                  schedule is set, the details will appear here.
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
export default function PatientDashboard({
  patient,
  appointments = [],
  announcements = [],
}: {
  patient: Patient;
  appointments?: Appointment[];
  announcements?: Announcement[];
}) {
  const username = patient?.full_name?.toUpperCase?.() ?? "USERPATIENT1";
  const type = String(patient?.patient_type || "").trim().toLowerCase();
  const isPrenatal = ["pregnancy", "prenatal", "pregnant"].includes(type);

  // Direct link to the correct card
  const recordsHref = isPrenatal
    ? "/patient/prenatal-card"
    : "/patient/immunization-card";
  const recordsSubLabel = isPrenatal ? "PRENATAL" : "IMMUNIZATION";

  // Upcoming preview list (sorted, first 8)
  const sorted = [...appointments].sort(
    (a, b) => +new Date(a.date) - +new Date(b.date)
  );
  const preview = sorted.slice(0, 8);

  /** Minimal tile: renders as Link when href is given; else as button */
  const TileBtn = ({
    href,
    onClick,
    icon: Icon,
    labelTop,
    subLabel,
    ariaLabel,
  }: {
    href?: string;
    onClick?: () => void;
    icon: React.ComponentType<any>;
    labelTop: string;
    subLabel?: string;
    ariaLabel?: string;
  }) =>
    href ? (
      <Link
        href={href}
        aria-label={ariaLabel || labelTop}
        className="group flex w-full min-h-[168px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white text-[#203D7A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(16,24,40,0.10)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F8A99]"
      >
        <div className="mb-3 grid h-16 w-16 place-items-center rounded-xl bg-[#0F8A99]/10">
          <Icon className="h-9 w-9" />
        </div>
        <div className="text-center text-[14px] md:text-[15px] font-medium tracking-wider opacity-90">
          {labelTop}
        </div>
        {subLabel && (
          <div className="mt-1 text-center text-[11px] md:text-[12px] tracking-wider opacity-70">
            {subLabel}
          </div>
        )}
      </Link>
    ) : (
      <button
        type="button"
        onClick={onClick}
        className="group flex w-full min-h-[168px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white text-[#203D7A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(16,24,40,0.10)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F8A99]"
      >
        <div className="mb-3 grid h-16 w-16 place-items-center rounded-xl bg-[#0F8A99]/10">
          <Icon className="h-9 w-9" />
        </div>
        <div className="text-center text-[14px] md:text-[15px] font-medium tracking-wider opacity-90">
          {labelTop}
        </div>
        {subLabel && (
          <div className="mt-1 text-center text-[11px] md:text-[12px] tracking-wider opacity-70">
            {subLabel}
          </div>
        )}
      </button>
    );

  const RecordsTile = () => (
    <Link
      href={recordsHref}
      aria-label={`Open ${recordsSubLabel.toLowerCase()} records`}
      className="group flex w-full min-h-[168px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white text-[#203D7A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(16,24,40,0.10)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F8A99]"
    >
      <div className="mb-3 grid h-16 w-16 place-items-center rounded-xl bg-[#0F8A99]/10">
        <IconFileStack className="h-9 w-9" />
      </div>
      <div className="text-center text-[14px] md:text-[15px] font-medium tracking-wider opacity-90">
        RECORDS
      </div>
      <div className="mt-1 text-center text-[11px] md:text-[12px] tracking-wider opacity-70">
        {recordsSubLabel}
      </div>
    </Link>
  );

  return (
    <div
      className="relative min-h-dvh bg-white text-slate-900"
      style={{
        fontFamily:
          "'Poppins', ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'",
      }}
    >
      <Head title="My Records">
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>

      {/* Ambient blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-teal-200/15 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-cyan-200/15 blur-3xl" />
      </div>

      <PatientNavbar username={username} />

      {/* MAIN */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 pb-20 pt-6">
        {/* Page heading */}
        <header className="mb-6">
          <h1 className="text-[22px] md:text-[28px] lg:text-[32px] font-semibold tracking-tight text-[#203D7A]">
            Welcome,{" "}
            <span className="whitespace-nowrap text-[22px] md:text-[28px] lg:text-[32px] font-semibold tracking-tight text-[#203D7A]">
              {username}
            </span>
          </h1>
          <div className="mt-2 inline-flex items-center rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-[12px] md:text-[13px] text-teal-900">
            Patient Portal
          </div>
        </header>

        <h2 className="mb-6 text-center text-[13px] md:text-[14px] tracking-wider text-[#2F3E9A]">
          Below are your records
        </h2>

        {/* Action tiles */}
        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <TileBtn
            href="/patient/schedule"
            icon={IconCalendar}
            labelTop="SCHEDULE"
            ariaLabel="Open schedule"
          />
          <RecordsTile />
        </section>

        {/* Schedule preview */}
        <div
          id="schedule"
          className="mt-12 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
        >
          <div className="px-6 py-4 border-b-2 border-slate-200 flex items-center justify-between">
            <h3 className="text-[20px] md:text-[22px] font-semibold text-[#203D7A]">
              Schedule
            </h3>
            <Link
              href="/patient/schedule"
              className="text-sm font-medium text-[#0F8A99] hover:underline"
            >
              View all
            </Link>
          </div>

          <div className="px-6 py-4 max-h-[360px] overflow-y-auto scroll-thin">
            {preview.length ? (
              <ul className="divide-y divide-slate-200">
                {preview.map((a) => {
                  const effectiveStatus = a.status ?? statusFor(a.date);
                  return (
                    <li key={a.id} className="py-3">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-[14px] font-extrabold tracking-wider text-[#203D7A]">
                            {fmtLongUpper(a.date)}
                          </div>
                          <div className="text-sm text-slate-600">
                            {a.title}
                          </div>
                        </div>
                        <span
                          className={`shrink-0 inline-block size-3 rounded-full ${statusDotClass(
                            effectiveStatus
                          )}`}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-slate-600">
                Your upcoming appointments will appear here.
              </p>
            )}
          </div>
        </div>

        {/* Footer micro-brand */}
        <div className="mx-auto mt-12 flex max-w-2xl items-center justify-between border-t border-slate-200 pt-6">
          <div className="flex items-center gap-2">
            <img src={Logo} alt="OneHealth logo" className="h-8 w-8 rounded-lg" />
            <span className="text-sm font-semibold tracking-wide text-[#203D7A]">
              ONE HEALTH
            </span>
          </div>
          <span className="text-xs text-slate-500">
            © {new Date().getFullYear()} OneHealth. All rights reserved.
          </span>
        </div>
      </main>

      {/* thin scrollbars */}
      <style>{`
        .scroll-thin { scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent; }
        .scroll-thin::-webkit-scrollbar { width: 8px; }
        .scroll-thin::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 9999px; }
        .scroll-thin:hover::-webkit-scrollbar-thumb { background: #a8b3c3; }
      `}</style>
    </div>
  );
}

/* ------------------------------ Announcements read-state hook (patient) ------------------------------ */

function usePatientAnnouncementReadState(
  announcements: Announcement[],
  patientKey: string
) {
  const storageKey = React.useMemo(
    () => `onehealth_patient_seen_announcements_${patientKey || "guest"}`,
    [patientKey]
  );

  // ⬇️ Load from localStorage synchronously on first render
  const [readIds, setReadIds] = React.useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return new Set();

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return new Set();

      const s = new Set<string>();
      for (const v of parsed) {
        if (typeof v === "string" || typeof v === "number") {
          s.add(String(v));
        }
      }
      return s;
    } catch {
      return new Set();
    }
  });

  // Persist to localStorage whenever readIds changes
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify(Array.from(readIds))
      );
    } catch {
      // ignore
    }
  }, [storageKey, readIds]);

  // Cleanup when announcements change (remove ids that no longer exist)
  React.useEffect(() => {
    setReadIds((prev) => {
      if (!prev.size) return prev;
      const valid = new Set(announcements.map((a) => String(a.id)));
      const next = new Set<string>();
      prev.forEach((id) => {
        if (valid.has(id)) next.add(id);
      });
      return next;
    });
  }, [announcements]);

  const markAsRead = React.useCallback((id: string | number) => {
    const key = String(id);
    setReadIds((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }, []);

  const unreadCount = announcements.reduce(
    (acc, a) => (readIds.has(String(a.id)) ? acc : acc + 1),
    0
  );

  const announcementsWithRead: (Announcement & { is_read: boolean })[] =
    React.useMemo(
      () =>
        announcements.map((a) => ({
          ...a,
          is_read: readIds.has(String(a.id)),
        })),
      [announcements, readIds]
    );

  return { unreadCount, announcementsWithRead, markAsRead };
}
