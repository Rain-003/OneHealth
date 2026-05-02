  // resources/js/pages/patients/dashboard.tsx
import * as React from "react";
import { Head, Link, usePage } from "@inertiajs/react";

// 🖼️ Brand
import Logo from "/public/build/assets/LOGO.svg";
import BackIcon from "/public/build/assets/back-outline-svgrepo-com.svg";

type Patient = {
  id: number | string;
  full_name?: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  suffix?: string | null;
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

function cleanNamePart(v?: string | null) {
  return String(v ?? "").trim().replace(/\s+/g, " ");
}

function middleInitial(v?: string | null) {
  const middle = cleanNamePart(v);
  if (!middle) return "";
  const firstMiddleWord = middle.split(" ").find(Boolean) ?? "";
  const firstLetter = firstMiddleWord.charAt(0);
  return firstLetter ? `${firstLetter.toUpperCase()}.` : "";
}

function splitLegacyFullName(fullName?: string | null) {
  const raw = cleanNamePart(fullName);
  if (!raw) return { first_name: "", middle_name: "", last_name: "", suffix: "" };

  const suffixSet = new Set(["JR", "SR", "II", "III", "IV", "V"]);
  const parts = raw.split(" ").filter(Boolean);

  let suffix = "";
  const lastToken = parts[parts.length - 1]?.replace(/\./g, "").toUpperCase();
  if (lastToken && suffixSet.has(lastToken)) {
    suffix = parts.pop() ?? "";
  }

  if (parts.length === 1) {
    return { first_name: parts[0] ?? "", middle_name: "", last_name: "", suffix };
  }

  if (parts.length === 2) {
    return { first_name: parts[0] ?? "", middle_name: "", last_name: parts[1] ?? "", suffix };
  }

  return {
    first_name: parts[0] ?? "",
    middle_name: parts.slice(1, -1).join(" "),
    last_name: parts[parts.length - 1] ?? "",
    suffix,
  };
}

function formatPatientDisplayName(patient?: Patient | null) {
  if (!patient) return "PATIENT";

  const fallback = splitLegacyFullName(patient.full_name);
  const first = cleanNamePart(patient.first_name) || fallback.first_name;
  const middle = cleanNamePart(patient.middle_name) || fallback.middle_name;
  const last = cleanNamePart(patient.last_name) || fallback.last_name;
  const suffix = cleanNamePart(patient.suffix) || fallback.suffix;

  if (last && first) {
    return [
      `${last},`,
      first,
      middleInitial(middle),
      suffix ? `, ${suffix}` : "",
    ]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+,/g, ",")
      .toUpperCase();
  }

  return cleanNamePart(patient.full_name).toUpperCase() || "PATIENT";
}

function formatPatientGreetingName(patient?: Patient | null) {
  if (!patient) return "PATIENT";
  const fallback = splitLegacyFullName(patient.full_name);
  return (cleanNamePart(patient.first_name) || fallback.first_name || cleanNamePart(patient.full_name) || "PATIENT").toUpperCase();
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
  const [logoutConfirmOpen, setLogoutConfirmOpen] = React.useState(false);

  // Which announcement is currently selected (for detail view)
  const [activeAnnouncementId, setActiveAnnouncementId] =
    React.useState<string | null>(null);

  // Close modals with Escape key
  React.useEffect(() => {
    if (!announcementsOpen && !scheduleOpen && !logoutConfirmOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setAnnouncementsOpen(false);
        setScheduleOpen(false);
        setLogoutConfirmOpen(false);
        setActiveAnnouncementId(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [announcementsOpen, scheduleOpen, logoutConfirmOpen]);

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

  const submitLogout = React.useCallback(() => {
    const form = document.getElementById("patient-logout-form") as HTMLFormElement | null;
    form?.submit();
  }, []);

  const Shell = () => {
    const navBtn =
      "relative inline-flex h-10 min-w-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-400/60 hover:bg-teal-50/40 hover:shadow-[0_16px_40px_rgba(15,138,153,0.12)] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 sm:h-11 md:min-w-[120px]";

    return (
      <div className="grid min-h-[58px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 px-2 py-1.5 shadow-sm backdrop-blur sm:px-3 lg:px-4">
        <form id="patient-logout-form" method="post" action="/patient/logout" className="hidden">
          <input type="hidden" name="_token" value={csrf} />
        </form>

        {/* Exit stays on the far-left side of the navbar. */}
        <div className="flex min-w-0 items-center justify-start">
          <button
            type="button"
            onClick={() => setLogoutConfirmOpen(true)}
            className={navBtn}
            aria-label="Exit to Home"
            title="Exit"
          >
            <img
              src={BackIcon}
              alt=""
              className="h-5 w-5 shrink-0 md:h-6 md:w-6"
              aria-hidden="true"
              draggable={false}
            />
            <span className="hidden tracking-wide md:inline">Exit</span>
          </button>
        </div>

        {/* Centered navigation. Mobile keeps icons compact; larger screens show full button names. */}
        <nav className="flex min-w-0 items-center justify-center gap-1.5 overflow-x-auto px-1 sm:gap-2 md:overflow-visible md:px-0">
          <button
            type="button"
            onClick={handleOpenAnnouncements}
            className={navBtn}
            aria-label="Bell Announcements"
            title="Announcements"
          >
            <IconBell className="h-5 w-5 shrink-0 text-slate-700" />
            <span className="hidden whitespace-nowrap md:inline">Announcements</span>
            {unseenCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-pink-500 px-[3px] text-[9px] font-semibold text-white ring-2 ring-white shadow-sm">
                {unseenLabel}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={handleOpenSchedule}
            className={navBtn}
            aria-label="Inbox"
            title="Inbox"
          >
            <IconInbox className="h-5 w-5 shrink-0 text-slate-700" />
            <span className="hidden whitespace-nowrap md:inline">Inbox</span>
            {upcomingCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-pink-500 px-[3px] text-[9px] font-semibold text-white ring-2 ring-white shadow-sm">
                {upcomingLabel}
              </span>
            )}
          </button>
        </nav>

        <Link
          href="/patient/dashboard"
          className="ml-auto flex min-w-0 items-center justify-end gap-2 sm:gap-3"
          aria-label="One Health Patient Dashboard"
        >
          <img
            src={Logo}
            alt="OneHealth logo"
            className="h-9 w-9 shrink-0 rounded-xl select-none sm:h-10 sm:w-10"
            draggable={false}
          />
          <div className="hidden min-w-0 leading-tight sm:block">
            <div className="truncate text-[15px] font-semibold tracking-wide text-[#203D7A] md:text-[18px]">
              ONE HEALTH
            </div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 md:text-[12px]">
              Patient
            </div>
          </div>
        </Link>
      </div>
    );
  };

  return (
    <>
      {/* Sticky navbar (like schedule page) */}
      <header className="sticky top-0 z-50 bg-transparent">
        <div className="mx-auto w-full max-w-7xl px-3 pt-2 pb-1.5 sm:px-4 lg:px-6">
          <Shell />
        </div>
      </header>

      {/* Exit / Logout Confirmation Modal */}
      {logoutConfirmOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 px-4"
          onClick={() => setLogoutConfirmOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="patient-exit-title"
            className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 id="patient-exit-title" className="text-base font-semibold text-[#203D7A]">
                Exit patient portal?
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                You will need to access your account again to view your records.
              </p>
            </div>

            <div className="flex flex-col-reverse gap-2 px-5 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setLogoutConfirmOpen(false)}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                Stay here
              </button>
              <button
                type="button"
                onClick={submitLogout}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[#0F8A99] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#0c7480] focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                Yes, exit
              </button>
            </div>
          </div>
        </div>
      )}

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
  const username = formatPatientDisplayName(patient);
  const greetingName = formatPatientGreetingName(patient);
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
        className="group flex w-full min-h-[132px] flex-col items-center justify-center rounded-2xl bg-white p-4 text-[#203D7A] shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:ring-[#0F8A99]/30 hover:shadow-[0_16px_40px_rgba(16,24,40,0.10)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F8A99] sm:min-h-[148px] lg:min-h-[176px]"
      >
        <div className="mb-2 grid h-14 w-14 place-items-center rounded-2xl bg-[#0F8A99]/10 transition group-hover:bg-[#0F8A99]/15 sm:mb-3 sm:h-16 sm:w-16">
          <Icon className="h-8 w-8 sm:h-9 sm:w-9" />
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
        className="group flex w-full min-h-[132px] flex-col items-center justify-center rounded-2xl bg-white p-4 text-[#203D7A] shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:ring-[#0F8A99]/30 hover:shadow-[0_16px_40px_rgba(16,24,40,0.10)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F8A99] sm:min-h-[148px] lg:min-h-[176px]"
      >
        <div className="mb-2 grid h-14 w-14 place-items-center rounded-2xl bg-[#0F8A99]/10 transition group-hover:bg-[#0F8A99]/15 sm:mb-3 sm:h-16 sm:w-16">
          <Icon className="h-8 w-8 sm:h-9 sm:w-9" />
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
      className="group flex w-full min-h-[132px] flex-col items-center justify-center rounded-2xl bg-white p-4 text-[#203D7A] shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:ring-[#0F8A99]/30 hover:shadow-[0_16px_40px_rgba(16,24,40,0.10)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F8A99] sm:min-h-[148px] lg:min-h-[176px]"
    >
      <div className="mb-2 grid h-14 w-14 place-items-center rounded-2xl bg-[#0F8A99]/10 transition group-hover:bg-[#0F8A99]/15 sm:mb-3 sm:h-16 sm:w-16">
        <IconFileStack className="h-8 w-8 sm:h-9 sm:w-9" />
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
      className="relative flex min-h-dvh flex-col bg-white text-slate-900"
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
      <main className="relative z-10 mx-auto flex w-full flex-1 flex-col px-3 pb-6 pt-3 sm:px-4 md:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center py-4 sm:py-6 lg:py-10 xl:py-12">
        {/* Page heading */}
        <header className="mx-auto mb-4 w-full max-w-5xl text-center sm:mb-5">
          <p className="text-[13px] font-medium uppercase tracking-[0.22em] text-slate-500 sm:text-[14px]">
            Welcome
          </p>
          <h1 className="mt-1 break-words text-[26px] font-bold leading-tight tracking-tight text-[#203D7A] sm:text-[34px] md:text-[42px] lg:text-[48px]">
            {username}
          </h1>
        </header>

        <h2 className="mb-3 text-center text-[12px] font-medium tracking-[0.18em] text-[#2F3E9A] sm:mb-4 sm:text-[13px]">
          Below are your records
        </h2>

        {/* Action tiles */}
        <section className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:gap-6">
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
          className="mx-auto mt-4 w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 sm:mt-5"
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-5 sm:py-4">
            <h3 className="text-[18px] font-semibold text-[#203D7A] sm:text-[20px] md:text-[22px]">
              Schedule
            </h3>
            <Link
              href="/patient/schedule"
              className="text-sm font-medium text-[#0F8A99] hover:underline"
            >
              View all
            </Link>
          </div>

          <div className="max-h-[340px] overflow-y-auto px-4 py-3 scroll-thin sm:px-5 sm:py-4 lg:max-h-[420px]">
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

        </div>

        {/* Footer micro-brand */}
        <div className="mx-auto mt-4 flex w-full max-w-3xl flex-col items-center justify-between gap-3 border-t border-slate-200 pt-5 sm:flex-row md:mt-auto">
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
