import * as React from "react";
import { createPortal } from "react-dom";
import { Link, useForm, router } from "@inertiajs/react";

type Announcement = {
  id: number;
  title: string | null;
  body: string | null;
  is_active?: boolean | number | null;
  created_at?: string | null;
};

type LinkItem = { url: string | null; label: string; active: boolean };

type Pagination<T> = {
  data: T[];
  links: LinkItem[];
  current_page: number;
  last_page: number;
  total: number;
};

type AnnouncementFilters = {
  q?: string | null;
};

type AnnouncementTabProps = {
  announcements?: Pagination<Announcement>;
  filters?: AnnouncementFilters;
  flash?: { success?: string; error?: string };
};

type StatusFilter = "" | "published" | "draft";
type SortOption = "latest" | "oldest" | "title_asc" | "title_desc";

const EMPTY_PAGINATION: Pagination<Announcement> = {
  data: [],
  links: [],
  current_page: 1,
  last_page: 1,
  total: 0,
};

const searchInputBase =
  "w-full h-11 rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-[14px] text-slate-800 outline-none focus:ring-2 focus:ring-[#0F8A99]";
const selectBase =
  "w-full h-11 rounded-lg border border-slate-300 bg-white px-3 pr-8 text-[14px] text-slate-800 outline-none focus:ring-2 focus:ring-[#0F8A99] appearance-none";
const miniButtonBase =
  "inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-[12px] font-medium h-9 min-w-[92px] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F8A99]";
const pillBase =
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold border";

function fmtDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString();
}

function getStatusTone(isActive?: boolean | number | null) {
  return !!isActive
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : "border-slate-200 bg-slate-100 text-slate-700";
}

function getStatusLabel(isActive?: boolean | number | null) {
  return !!isActive ? "Published" : "Draft";
}

export default function AnnouncementTab({
  announcements = EMPTY_PAGINATION,
  filters,
  flash,
}: AnnouncementTabProps) {
  const [q, setQ] = React.useState(filters?.q ?? "");
  const [status, setStatus] = React.useState<StatusFilter>("");
  const [sort, setSort] = React.useState<SortOption>("latest");
  const [open, setOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<Announcement | null>(null);
  const [viewTarget, setViewTarget] = React.useState<Announcement | null>(null);

  const [toast, setToast] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const toastTimerRef = React.useRef<number | null>(null);

  const form = useForm({
    id: null as number | null,
    title: "",
    body: "",
    status: "draft" as "draft" | "published",
  });

  const isEdit = form.data.id !== null;

  React.useEffect(() => {
    setQ(filters?.q ?? "");
  }, [filters?.q]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const successMessage = flash?.success?.trim();
    const errorMessage = flash?.error?.trim();

    if (successMessage) {
      const key = `announcement-flash-success:${successMessage}`;
      const alreadyShown = sessionStorage.getItem(key);

      if (!alreadyShown) {
        sessionStorage.setItem(key, "1");
        setToast({ type: "success", message: successMessage });
      }
    } else if (errorMessage) {
      const key = `announcement-flash-error:${errorMessage}`;
      const alreadyShown = sessionStorage.getItem(key);

      if (!alreadyShown) {
        sessionStorage.setItem(key, "1");
        setToast({ type: "error", message: errorMessage });
      }
    }
  }, [flash?.success, flash?.error]);

  React.useEffect(() => {
    if (!toast) return;

    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
    }, 3000);

    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, [toast]);

  const visibleItems = React.useMemo(() => {
    let list = [...announcements.data];

    const needle = q.trim().toLowerCase();
    if (needle) {
      list = list.filter((a) => {
        const haystack = `${a.title || ""} ${a.body || ""}`.toLowerCase();
        return haystack.includes(needle);
      });
    }

    if (status === "published") {
      list = list.filter((a) => !!a.is_active);
    } else if (status === "draft") {
      list = list.filter((a) => !a.is_active);
    }

    list.sort((a, b) => {
      const da = new Date(a.created_at || 0).getTime();
      const db = new Date(b.created_at || 0).getTime();

      if (sort === "oldest") return da - db;
      if (sort === "title_asc") {
        return (a.title || "").localeCompare(b.title || "");
      }
      if (sort === "title_desc") {
        return (b.title || "").localeCompare(a.title || "");
      }
      return db - da;
    });

    return list;
  }, [announcements.data, q, status, sort]);

  const stats = React.useMemo(() => {
    const total = visibleItems.length;
    const published = visibleItems.filter((a) => !!a.is_active).length;
    const drafts = visibleItems.filter((a) => !a.is_active).length;

    return {
      total,
      published,
      drafts,
    };
  }, [visibleItems]);

  const handleApply = () => {
    router.get(
      "/admin",
      {
        tab: "announcements",
        announcement_q: q || undefined,
      },
      {
        preserveScroll: true,
        preserveState: true,
        replace: true,
      }
    );
  };

  const handleReset = () => {
    setQ("");
    setStatus("");
    setSort("latest");

    router.get(
      "/admin",
      { tab: "announcements" },
      {
        preserveScroll: true,
        preserveState: true,
        replace: true,
      }
    );
  };

  const openCreate = () => {
    form.setData({
      id: null,
      title: "",
      body: "",
      status: "draft",
    });
    form.clearErrors();
    setOpen(true);
  };

  const openEdit = (a: Announcement) => {
    form.setData({
      id: a.id,
      title: a.title ?? "",
      body: a.body ?? "",
      status: a.is_active ? "published" : "draft",
    });
    form.clearErrors();
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    form.transform((data) => ({
      title: data.title,
      body: data.body,
      is_visible: data.status === "published" ? 1 : 0,
    }));

    if (isEdit && form.data.id) {
      form.put(`/admin/announcements/${form.data.id}`, {
        preserveScroll: true,
        onSuccess: () => {
          setOpen(false);
          form.reset("id", "title", "body", "status");
          form.setData("status", "draft");
        },
      });
    } else {
      form.post("/admin/announcements", {
        preserveScroll: true,
        onSuccess: () => {
          setOpen(false);
          form.reset("id", "title", "body", "status");
          form.setData("status", "draft");
        },
      });
    }
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;

    router.delete(`/admin/announcements/${deleteTarget.id}`, {
      preserveScroll: true,
      onSuccess: () => setDeleteTarget(null),
      onError: () => setDeleteTarget(null),
    });
  };

  return (
    <div className="w-full space-y-4 pb-8 pt-2">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-[20px] font-semibold tracking-tight text-[#203D7A] md:text-[22px]">
            Announcements
          </h2>
          <p className="text-sm text-slate-600">
            View and manage announcements. Search posts, filter by status, and create or update announcement entries.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex h-11 items-center justify-center rounded-lg border border-teal-600 bg-[#0F8A99] px-4 text-[13px] font-medium text-white shadow-sm transition hover:bg-teal-700 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F8A99]"
        >
          + New Announcement
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard label="Visible items" value={stats.total} />
        <SummaryCard label="Published" value={stats.published} />
        <SummaryCard label="Drafts" value={stats.drafts} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 md:px-5">
              <div>
                <h3 className="text-base font-semibold text-[#203D7A]">
                  Announcement list
                </h3>
                <p className="text-[11px] text-slate-500">
                  Showing {visibleItems.length} entr{visibleItems.length === 1 ? "y" : "ies"}.
                </p>
              </div>
            </div>

            <div className="max-h-[72vh] overflow-y-auto scroll-thin">
              {visibleItems.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-slate-500 md:px-5">
                  No announcements found for the current filters.
                </div>
              ) : (
                <ul className="divide-y divide-slate-200">
                  {visibleItems.map((a) => {
                    const created = fmtDate(a.created_at);

                    return (
                      <li key={a.id} className="px-4 py-3 md:px-5">
                        <button
                          type="button"
                          onClick={() => setViewTarget(a)}
                          className="block w-full rounded-2xl border border-transparent text-left transition hover:border-slate-200 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F8A99]"
                        >
                          <div className="flex flex-col gap-3 rounded-2xl p-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="max-w-[250px] truncate text-[14px] font-semibold text-slate-900 sm:max-w-[360px]">
                                  {a.title || "Untitled announcement"}
                                </span>

                                <span
                                  className={
                                    pillBase + " " + getStatusTone(a.is_active)
                                  }
                                >
                                  {getStatusLabel(a.is_active)}
                                </span>

                                <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-medium text-sky-700">
                                  Click to view
                                </span>
                              </div>

                              {a.body && (
                                <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs text-slate-600">
                                  {a.body}
                                </p>
                              )}

                              <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-slate-500">
                                {created && <span>Created: {created}</span>}
                                <span className="before:px-1 before:content-['·']">
                                  Audience: All
                                </span>
                              </div>
                            </div>

                            <div
                              className="mt-1 flex flex-row gap-2 sm:mt-0 sm:flex-col sm:items-end"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => openEdit(a)}
                                className={
                                  miniButtonBase +
                                  " border border-teal-600 bg-[#0F8A99] text-white hover:bg-teal-700"
                                }
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() => setDeleteTarget(a)}
                                className={
                                  miniButtonBase +
                                  " border border-rose-600 bg-rose-600 text-white hover:bg-rose-700"
                                }
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          {announcements.links.length > 0 && (
            <nav className="mt-3 flex flex-wrap items-center gap-2" aria-label="Pagination">
              {announcements.links.map((l, i) => {
                const disabled = l.url === null;
                const active = l.active;
                const base =
                  "inline-flex items-center justify-center rounded-xl h-10 px-3 text-sm transition focus:outline-none focus:ring-2 focus:ring-[#0F8A99]";
                const visual = disabled
                  ? "cursor-not-allowed border border-slate-200 bg-white text-slate-400"
                  : active
                  ? "border border-teal-300 bg-white text-[#0F8A99]"
                  : "border border-slate-300 bg-white text-slate-800 shadow-sm hover:shadow-md active:translate-y-[1px]";

                if (disabled) {
                  return (
                    <span key={i} className={`${base} ${visual}`}>
                      <span dangerouslySetInnerHTML={{ __html: l.label }} />
                    </span>
                  );
                }

                return (
                  <Link
                    key={i}
                    href={l.url || "#"}
                    preserveScroll
                    className={`${base} ${visual}`}
                    dangerouslySetInnerHTML={{ __html: l.label }}
                  />
                );
              })}
            </nav>
          )}
        </div>

        <aside className="h-fit self-start rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:sticky xl:top-4">
          <div className="mb-4">
            <h3 className="text-[14px] font-semibold text-[#203D7A]">Filters</h3>
            <p className="mt-1 text-[12px] text-slate-500">
              Refine the announcement list using the options below.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-[12px] font-medium text-slate-600">
                Search announcements
              </label>
              <div className="relative">
                <input
                  type="search"
                  placeholder="Search title or body..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className={searchInputBase}
                />
                <SearchGlyph className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              </div>
            </div>

            <div className="relative w-full">
              <label className="mb-1 block text-[12px] font-medium text-slate-600">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusFilter)}
                className={selectBase}
              >
                <option value="">All statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
              <SelectCaret />
            </div>

            <div className="relative w-full">
              <label className="mb-1 block text-[12px] font-medium text-slate-600">
                Sort
              </label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                className={selectBase}
              >
                <option value="latest">Latest first</option>
                <option value="oldest">Oldest first</option>
                <option value="title_asc">Title A–Z</option>
                <option value="title_desc">Title Z–A</option>
              </select>
              <SelectCaret />
            </div>

            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={handleApply}
                className="inline-flex h-11 items-center justify-center rounded-lg border border-teal-600 bg-[#0F8A99] px-4 text-[13px] font-medium text-white shadow-sm transition hover:bg-teal-700 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F8A99]"
              >
                Apply filters
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-[12px] font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Reset filters
              </button>
            </div>
          </div>
        </aside>
      </div>

      {toast && (
        <ToastPortal>
          <div className="pointer-events-none fixed inset-0 z-[140] flex items-center justify-center p-4">
            <div
              className={
                "pointer-events-auto w-full max-w-md rounded-2xl border px-5 py-4 shadow-2xl " +
                (toast.type === "success"
                  ? "border-emerald-200 bg-white text-emerald-800"
                  : "border-rose-200 bg-white text-rose-800")
              }
              role="alert"
              aria-live="polite"
            >
              <div className="flex items-start gap-3">
                <div
                  className={
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full " +
                    (toast.type === "success"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-rose-100 text-rose-700")
                  }
                >
                  {toast.type === "success" ? "✓" : "!"}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {toast.type === "success" ? "Success" : "Error"}
                  </p>
                  <p className="mt-1 text-sm leading-5 text-slate-700">
                    {toast.message}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setToast(null)}
                  className="rounded-md px-2 py-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        </ToastPortal>
      )}

      {viewTarget && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[119] flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]"
            onClick={() => setViewTarget(null)}
          >
            <div
              className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b border-slate-200 bg-gradient-to-r from-sky-50 via-white to-teal-50 px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                        <AnnouncementGlyph className="h-5 w-5" />
                      </span>

                      <span
                        className={
                          pillBase + " " + getStatusTone(viewTarget.is_active)
                        }
                      >
                        {getStatusLabel(viewTarget.is_active)}
                      </span>
                    </div>

                    <h3 className="break-words text-[22px] font-semibold leading-tight text-slate-900">
                      {viewTarget.title || "Untitled announcement"}
                    </h3>

                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                      {viewTarget.created_at && (
                        <span>Created: {fmtDate(viewTarget.created_at)}</span>
                      )}
                      <span>Audience: All</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setViewTarget(null)}
                    className="rounded-xl p-2 text-slate-500 transition hover:bg-white/80 hover:text-slate-700"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="max-h-[65vh] overflow-y-auto px-6 py-6">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-5 shadow-sm">
                  <p className="whitespace-pre-wrap text-[15px] leading-7 text-slate-700">
                    {viewTarget.body?.trim() || "No announcement body provided."}
                  </p>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={() => setViewTarget(null)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-[14px] font-medium text-slate-800 transition hover:bg-slate-100"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const current = viewTarget;
                    setViewTarget(null);
                    if (current) openEdit(current);
                  }}
                  className="rounded-xl border border-teal-600 bg-[#0F8A99] px-4 py-2.5 text-[14px] font-medium text-white shadow-sm transition hover:bg-teal-700 hover:shadow-md"
                >
                  Edit Announcement
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {open && (
        <ModalPortal>
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4">
            <div
              className="w-full max-w-xl rounded-2xl bg-white shadow-xl ring-1 ring-black/5"
              onClick={(e) => e.stopPropagation()}
            >
              <form onSubmit={onSubmit}>
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                  <h3 className="text-[18px] font-semibold text-slate-900">
                    {isEdit ? "Edit Announcement" : "New Announcement"}
                  </h3>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100"
                  >
                    ✕
                  </button>
                </div>

                <div className="max-h-[60vh] space-y-4 overflow-y-auto px-5 py-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Title
                    </label>
                    <input
                      className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-[#0F8A99]"
                      value={form.data.title}
                      onChange={(e) => form.setData("title", e.target.value)}
                    />
                    {form.errors.title && (
                      <p className="mt-1 text-sm text-rose-600">{form.errors.title}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Body
                    </label>
                    <textarea
                      className="mt-1 block min-h-[140px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-[#0F8A99]"
                      placeholder="What would you like to announce?"
                      value={form.data.body}
                      onChange={(e) => form.setData("body", e.target.value)}
                    />
                    {form.errors.body && (
                      <p className="mt-1 text-sm text-rose-600">{form.errors.body}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Status
                    </label>
                    <select
                      className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-[#0F8A99]"
                      value={form.data.status}
                      onChange={(e) =>
                        form.setData("status", e.target.value as "draft" | "published")
                      }
                    >
                      <option value="draft">Draft (hidden)</option>
                      <option value="published">Published (visible)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-[14px] font-medium text-slate-800 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={form.processing}
                    className="rounded-lg border border-teal-600 bg-[#0F8A99] px-4 py-2.5 text-[14px] font-medium text-white hover:bg-teal-700 disabled:opacity-60"
                  >
                    {form.processing
                      ? "Saving…"
                      : isEdit
                      ? "Save Changes"
                      : "Create Announcement"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {deleteTarget && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[121] flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]"
            onClick={() => setDeleteTarget(null)}
          >
            <div
              className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b border-rose-100 bg-gradient-to-r from-rose-50 via-white to-red-50 px-6 py-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 shadow-sm">
                    <TrashGlyph className="h-6 w-6" />
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-[19px] font-semibold text-slate-900">
                      Delete announcement?
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      This action is permanent and cannot be undone.
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-6 py-5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Announcement to delete
                  </p>
                  <p className="mt-1 break-words text-sm font-semibold text-slate-900">
                    {deleteTarget.title || "Untitled announcement"}
                  </p>

                  {deleteTarget.body && (
                    <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {deleteTarget.body}
                    </p>
                  )}
                </div>

                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Once deleted, this announcement will no longer be recoverable.
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-[14px] font-medium text-slate-800 transition hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="rounded-xl border border-rose-600 bg-rose-600 px-4 py-2.5 text-[14px] font-medium text-white shadow-sm transition hover:bg-rose-700 hover:shadow-md"
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}

function ModalPortal({ children }: { children: React.ReactNode }) {
  if (typeof window === "undefined") return null;
  return createPortal(children, document.body);
}

function ToastPortal({ children }: { children: React.ReactNode }) {
  if (typeof window === "undefined") return null;
  return createPortal(children, document.body);
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold text-slate-900">
        {value || value === 0 ? value : "—"}
      </div>
    </div>
  );
}

function SearchGlyph(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" {...props}>
      <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5a6.5 6.5 0 1 0-6.5 6.5 6.47 6.47 0 0 0 4.21-1.57l.27.28h.79L20 21.5 21.5 20zM9.5 14A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z" />
    </svg>
  );
}

function SelectCaret() {
  return (
    <svg
      className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M7 10l5 5 5-5z" />
    </svg>
  );
}

function TrashGlyph(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M9 3.75A1.75 1.75 0 0 1 10.75 2h2.5A1.75 1.75 0 0 1 15 3.75V4h3.25a.75.75 0 0 1 0 1.5h-.63l-.74 12.02A2.5 2.5 0 0 1 14.38 20H9.62a2.5 2.5 0 0 1-2.5-2.48L6.38 5.5h-.63a.75.75 0 0 1 0-1.5H9v-.25Zm1.5.25h3v-.25a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25V4Zm-1.88 1.5.72 11.93a1 1 0 0 0 1 .94h4.76a1 1 0 0 0 1-.94l.72-11.93H8.62ZM10 8.25a.75.75 0 0 1 .75.75v5.5a.75.75 0 0 1-1.5 0V9A.75.75 0 0 1 10 8.25Zm4 .75a.75.75 0 0 0-1.5 0v5.5a.75.75 0 0 0 1.5 0V9Z" />
    </svg>
  );
}

function AnnouncementGlyph(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M4 6.75A2.75 2.75 0 0 1 6.75 4h7.19a3 3 0 0 1 2.12.88l2.06 2.06A3 3 0 0 1 19 9.06v8.19A2.75 2.75 0 0 1 16.25 20h-9.5A2.75 2.75 0 0 1 4 17.25v-10.5ZM14 5.56V8a1 1 0 0 0 1 1h2.44L14 5.56ZM8 11.25a.75.75 0 0 0 0 1.5h8a.75.75 0 0 0 0-1.5H8Zm0 3a.75.75 0 0 0 0 1.5h5a.75.75 0 0 0 0-1.5H8Z" />
    </svg>
  );
}