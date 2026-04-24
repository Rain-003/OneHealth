import * as React from "react";
import { Head, Link, usePage } from "@inertiajs/react";

// Brand
import Logo from "/public/build/assets/LOGO.svg";
import BackIcon from "/public/build/assets/back-outline-svgrepo-com.svg";

import AccountsTab from "./AccountsTab";
import ActivityTab from "./ActivityTab";
import ArchiveTab from "./ArchiveTab";
import AnnouncementTab from "./AnnouncementTab";

const csrfToken =
  (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null)
    ?.content ?? "";

type AdminTab = "accounts" | "activity" | "announcements" | "archives";

type Activity = {
  id: number;
  user_id?: number | null;
  patient_id?: number | null;
  type: string;
  description: string;
  patient?: string | null;
  by?: string | null;
  at?: string | null;
  when?: string | null;
  details?: string | string[] | null;
  barangay?: string | null;
};

type AnnouncementRow = {
  id: number;
  title: string | null;
  body: string | null;
  is_active?: boolean | number | null;
  created_at?: string | null;
};

type UserRow = {
  id: number;
  name: string | null;
  email: string | null;
  role: "admin" | "health_worker" | null;
  email_verified_at?: string | null;
  created_at?: string | null;
};

type ArchiveRow = {
  id: number;
  item_type?: string | null;
  item_label?: string | null;
  reason?: string | null;
  deleted_by?: string | null;
  patient_name?: string | null;
  created_at?: string | null;
  deleted_at?: string | null;
};

type LinkItem = { url: string | null; label: string; active: boolean };

type Pagination<T> = {
  data: T[];
  links: LinkItem[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

const EMPTY_PAGINATION: Pagination<UserRow> = {
  data: [],
  links: [],
  current_page: 1,
  last_page: 1,
  per_page: 15,
  total: 0,
};

const EMPTY_ANNOUNCEMENT_PAGINATION: Pagination<AnnouncementRow> = {
  data: [],
  links: [],
  current_page: 1,
  last_page: 1,
  per_page: 10,
  total: 0,
};

type PageProps = {
  activities?: Activity[];
  announcements?: Pagination<AnnouncementRow>;
  announcementFilters?: {
    q?: string;
  };
  archives?: ArchiveRow[];
  archiveFilters?: {
    search?: string;
    sort?: string;
    type?: string;
    q?: string;
  };
  auth?: {
    user?: {
      name?: string;
      email?: string | null;
      role?: string | null;
    };
  };
  users?: Pagination<UserRow>;
  filters?: { q?: string; role?: string };
  flash?: { success?: string; error?: string };
  can?: { manageUsers?: boolean };
  tab?: AdminTab;
};

export default function AdminIndex() {
  const {
    activities: rawActivities = [],
    announcements = EMPTY_ANNOUNCEMENT_PAGINATION,
    announcementFilters = { q: "" },
    archives = [],
    archiveFilters = { search: "", sort: "latest", type: "", q: "" },
    auth,
    users = EMPTY_PAGINATION,
    filters = { q: "", role: "" },
    flash,
    can,
    tab: initialTab = "accounts",
  } = usePage<PageProps>().props;

  const name = auth?.user?.name ?? "Admin User";

  const [tab, setTab] = React.useState<AdminTab>(initialTab);
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);
  const [desktopSidebarExpanded, setDesktopSidebarExpanded] = React.useState(true);

  const [logoutConfirmOpen, setLogoutConfirmOpen] = React.useState(false);
  const [logoutProcessing, setLogoutProcessing] = React.useState(false);

  React.useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const handleConfirmLogout = () => {
    setLogoutProcessing(true);
    setLogoutConfirmOpen(false);

    const form = document.getElementById("logout-form") as HTMLFormElement | null;

    if (form) {
      form.submit();
    } else {
      window.location.href = "/logout";
    }
  };

  const sidebarTabs: {
    key: AdminTab;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      key: "accounts",
      label: "Accounts",
      icon: <EditUser3Icon className="h-5 w-5" />,
    },
    {
      key: "activity",
      label: "Activity Logs",
      icon: <ActivityIcon className="h-5 w-5" />,
    },
    {
      key: "announcements",
      label: "Announcements",
      icon: <AnnouncementIcon className="h-5 w-5" />,
    },
    {
      key: "archives",
      label: "Archive",
      icon: <ArchiveBoxIcon className="h-5 w-5" />,
    },
  ];

  return (
    <div
      className="relative min-h-dvh overflow-x-hidden bg-slate-50 text-slate-900"
      style={{
        fontFamily:
          "'Poppins', ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'",
      }}
    >
      <Head title="Admin Panel">
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-teal-200/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-cyan-200/10 blur-3xl" />
      </div>

      <style>{`
        .scroll-thin { scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent; }
        .scroll-thin::-webkit-scrollbar { width: 8px; }
        .scroll-thin::-webkit-scrollbar-track { background: transparent; }
        .scroll-thin::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 9999px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }
        .scroll-thin:hover::-webkit-scrollbar-thumb { background: #a8b3c3; }
      `}</style>

      <div className="relative z-10 flex min-h-dvh">
        {mobileSidebarOpen && (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Close sidebar overlay"
          />
        )}

        <aside
          className={[
            "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-200 bg-white text-slate-900 shadow-lg",
            "transition-all duration-200 ease-in-out",
            "w-72 lg:translate-x-0",
            desktopSidebarExpanded ? "lg:w-72" : "lg:w-[88px]",
            mobileSidebarOpen ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
        >
          <div
            className={
              "flex h-16 items-center border-b border-slate-200 px-4 " +
              (desktopSidebarExpanded ? "justify-between" : "justify-center lg:px-0")
            }
          >
            <Link
              href="/center/dashboard"
              preserveScroll
              className={
                "group flex items-center gap-3 " +
                (desktopSidebarExpanded ? "" : "lg:justify-center")
              }
            >
              <img
                src={Logo}
                alt="OneHealth logo"
                className="h-10 w-10 select-none rounded-xl"
                draggable={false}
              />
              {desktopSidebarExpanded && (
                <div className="leading-tight">
                  <div className="text-sm font-semibold tracking-wide text-[#0F8A99]">
                    ONE HEALTH
                  </div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-500">
                    Admin Panel
                  </div>
                </div>
              )}
            </Link>

            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md p-1 text-slate-500 hover:bg-slate-100 lg:hidden"
              onClick={() => setMobileSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-1 flex-col justify-between overflow-y-auto scroll-thin">
            <nav className="space-y-4 px-3 py-4">
              <Link
                href="/center/dashboard"
                preserveScroll
                className={
                  "inline-flex h-11 w-full items-center rounded-xl border border-teal-200 bg-teal-50 text-[13px] font-semibold text-[#0F8A99] shadow-sm transition hover:bg-teal-100 " +
                  (desktopSidebarExpanded
                    ? "justify-center gap-2 px-3"
                    : "justify-center px-0")
                }
                onClick={() => setMobileSidebarOpen(false)}
                title="Back to dashboard"
              >
                <img
                  src={BackIcon}
                  alt=""
                  className="h-4 w-4 shrink-0"
                  aria-hidden="true"
                  draggable={false}
                />
                {desktopSidebarExpanded && <span>Back to dashboard</span>}
              </Link>

              <div>
                {desktopSidebarExpanded && (
                  <div className="px-1 pb-2 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Navigation
                  </div>
                )}

                <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-2">
                  {sidebarTabs.map((item) => (
                    <TabButton
                      key={item.key}
                      label={item.label}
                      icon={item.icon}
                      active={tab === item.key}
                      expanded={desktopSidebarExpanded}
                      onClick={() => {
                        setTab(item.key);
                        setMobileSidebarOpen(false);
                      }}
                    />
                  ))}
                </div>
              </div>
            </nav>

            <div className="space-y-3 border-t border-slate-200 px-3 py-4">
              <div
                className={
                  "flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 " +
                  (desktopSidebarExpanded ? "" : "justify-center px-0")
                }
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0F8A99]/10 text-sm font-semibold text-[#0F8A99]">
                  {name.charAt(0).toUpperCase()}
                </div>

                {desktopSidebarExpanded && (
                  <div className="min-w-0 text-center">
                    <div className="truncate text-sm font-medium text-slate-900">
                      {name}
                    </div>
                    {auth?.user?.email && (
                      <div className="truncate text-xs text-slate-500">
                        {auth.user.email}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setLogoutConfirmOpen(true)}
                className={
                  "inline-flex h-11 w-full items-center rounded-xl border border-rose-300 bg-rose-600 text-[13px] font-semibold text-white shadow-sm transition hover:bg-rose-700 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 " +
                  (desktopSidebarExpanded ? "justify-center gap-2 px-3" : "justify-center px-0")
                }
                title="Log out"
              >
                <LogoutIcon className="h-5 w-5 shrink-0" />
                {desktopSidebarExpanded && <span>Log out</span>}
              </button>

              <form
                id="logout-form"
                method="post"
                action="/logout"
                className="hidden"
                aria-hidden="true"
              >
                <input type="hidden" name="_token" value={csrfToken} />
              </form>
            </div>
          </div>
        </aside>

        <div
          className={
            "flex min-h-dvh flex-1 flex-col transition-[padding-left] duration-200 " +
            (desktopSidebarExpanded ? "lg:pl-72" : "lg:pl-[88px]")
          }
        >
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="flex h-14 items-center justify-between px-4 md:px-6 lg:px-8">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white p-1.5 text-slate-700 hover:bg-slate-50 lg:hidden"
                  onClick={() => setMobileSidebarOpen((v) => !v)}
                  aria-label={mobileSidebarOpen ? "Close sidebar" : "Open sidebar"}
                >
                  <SidebarMenuIcon className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  className="hidden items-center justify-center rounded-md border border-slate-300 bg-white p-1.5 text-slate-700 hover:bg-slate-50 lg:inline-flex"
                  onClick={() => setDesktopSidebarExpanded((v) => !v)}
                  aria-label={desktopSidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
                  title={desktopSidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
                >
                  {desktopSidebarExpanded ? (
                    <SidebarCollapseIcon className="h-5 w-5" />
                  ) : (
                    <SidebarExpandIcon className="h-5 w-5" />
                  )}
                </button>

                <h1 className="text-[18px] font-semibold tracking-tight text-[#203D7A] md:text-[20px]">
                  Admin Panel
                </h1>
              </div>

              <div className="hidden max-w-xs items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 sm:flex">
                <span className="hidden text-slate-500 md:inline">
                  Signed in as
                </span>
                <span className="truncate font-medium text-slate-800">
                  {name}
                </span>
              </div>
            </div>
          </header>

          <main className="relative z-10 flex-1 overflow-x-hidden">
            {tab === "accounts" && (
              <div className="px-4 pb-10 pt-5 md:px-6 lg:px-8">
                <div className="mx-auto max-w-6xl">
                  <AccountsTab
                    users={users}
                    filters={filters}
                    flash={flash}
                    can={can}
                  />
                </div>
              </div>
            )}

            {tab === "activity" && (
              <div className="px-4 pb-10 pt-5 md:px-6 lg:px-8">
                <div className="mx-auto max-w-6xl">
                  <ActivityTab activities={rawActivities} />
                </div>
              </div>
            )}

            {tab === "announcements" && (
              <div className="px-4 pb-10 pt-5 md:px-6 lg:px-8">
                <div className="mx-auto max-w-6xl">
                  <AnnouncementTab
                    announcements={announcements}
                    filters={announcementFilters}
                    flash={flash}
                  />
                </div>
              </div>
            )}

            {tab === "archives" && (
              <div className="px-4 pb-10 pt-5 md:px-6 lg:px-8">
                <div className="mx-auto max-w-6xl">
                  <ArchiveTab
                    archives={archives}
                    filters={archiveFilters}
                    flash={flash}
                  />
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {logoutConfirmOpen && (
        <div className="fixed inset-0 z-[68] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-xl ring-1 ring-black/5">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-[17px] font-semibold text-slate-900">
                Sign out?
              </h3>
            </div>

            <div className="space-y-2 px-5 py-4 text-sm text-slate-700">
              <p>Are you sure you want to log out of the admin panel?</p>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button
                type="button"
                onClick={() => !logoutProcessing && setLogoutConfirmOpen(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-[14px] font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60"
                disabled={logoutProcessing}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="rounded-lg bg-rose-600 px-4 py-2.5 text-[14px] font-medium text-white hover:bg-rose-700 disabled:opacity-60"
                disabled={logoutProcessing}
              >
                {logoutProcessing ? "Signing out…" : "Log out"}
              </button>
            </div>
          </div>
        </div>
      )}

      {logoutProcessing && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 px-6 py-5 shadow-xl">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-[#0F8A99]" />
            <div className="text-sm font-medium text-slate-800">
              Signing you out…
            </div>
            <p className="text-xs text-slate-500">
              Please wait while we safely end your session.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({
  label,
  icon,
  active,
  expanded,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  expanded: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={!expanded ? label : undefined}
      className={
        "group flex w-full items-center rounded-xl text-[13px] font-medium transition " +
        (expanded
          ? "h-11 justify-between px-3"
          : "h-12 justify-center px-0") +
        " " +
        (active
          ? "bg-[#0F8A99] text-white shadow-sm"
          : "bg-transparent text-slate-700 hover:bg-slate-100")
      }
    >
      <span
        className={
          "flex items-center " + (expanded ? "gap-3" : "justify-center")
        }
      >
        <span className="shrink-0">{icon}</span>
        {expanded && <span>{label}</span>}
      </span>

      {expanded && active && <span className="ml-2 h-2 w-2 rounded-full bg-white/85" />}
    </button>
  );
}

function EditUser3Icon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M15.5 19.25H6.75A2.75 2.75 0 0 1 4 16.5v-.26c0-2.44 2.57-4.42 5.75-4.42 1.18 0 2.28.27 3.2.72"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="9.75"
        cy="7.75"
        r="3.25"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M14.75 16.25 18.9 12.1a1.06 1.06 0 0 1 1.5 0l.5.5a1.06 1.06 0 0 1 0 1.5l-4.15 4.15-2.25.5.25-2.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AnnouncementIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M5 10.5V7.75A2.75 2.75 0 0 1 7.75 5h4.1c.48 0 .94.18 1.29.5l3.86 3.56c.36.33.56.79.56 1.28v5.91A2.75 2.75 0 0 1 14.81 19H7.75A2.75 2.75 0 0 1 5 16.25V10.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M13 5.25V8a1 1 0 0 0 1 1h2.75"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.25 12.25h6.5M8.25 15.25h4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ArchiveBoxIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M4.75 7.25h14.5l-1 10a2 2 0 0 1-1.99 1.8H7.74a2 2 0 0 1-1.99-1.8l-1-10Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M3.75 5.25A1.25 1.25 0 0 1 5 4h14a1.25 1.25 0 0 1 1.25 1.25V7H3.75V5.25Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M9.25 11.75h5.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ActivityIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 7.5v4.25l2.75 2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LogoutIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M15.75 7.75V6.5A2.5 2.5 0 0 0 13.25 4h-5.5a2.5 2.5 0 0 0-2.5 2.5v11a2.5 2.5 0 0 0 2.5 2.5h5.5a2.5 2.5 0 0 0 2.5-2.5v-1.25"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M10.5 12h10m0 0-2.75-2.75M20.5 12l-2.75 2.75"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SidebarMenuIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M4 6h16M4 12h16M4 18h16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SidebarCollapseIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <rect
        x="3.5"
        y="4.5"
        width="17"
        height="15"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M9 4.75v14.5M14.75 9.25 11.5 12l3.25 2.75"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SidebarExpandIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <rect
        x="3.5"
        y="4.5"
        width="17"
        height="15"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M9 4.75v14.5M12.25 9.25 15.5 12l-3.25 2.75"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}