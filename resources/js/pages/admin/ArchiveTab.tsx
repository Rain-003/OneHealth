import * as React from "react";
import { createPortal } from "react-dom";
import { Link, router } from "@inertiajs/react";

type ArchiveItem = {
  id: number;
  item_type?: string | null;
  item_id?: number | null;
  item_label?: string | null;
  reason?: string | null;
  archived_at?: string | null;
  restored_at?: string | null;
  patient?: {
    id: number;
    full_name?: string | null;
    first_name?: string | null;
    middle_name?: string | null;
    last_name?: string | null;
    suffix?: string | null;
  } | null;
  user?: { id: number; name?: string | null } | null;
  patient_name?: string | null;
  deleted_by?: string | null;
  created_at?: string | null;
  deleted_at?: string | null;
};

type ArchiveFilters = {
  q?: string | null;
  type?: string | null;
  sort?: string | null;
  search?: string | null;
};

type ArchiveTabProps = {
  archives?: ArchiveItem[];
  filters?: ArchiveFilters;
  flash?: { success?: string; error?: string };
};

type TypeOption = { value: string; label: string };

const searchInputBase =
  "w-full h-11 rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-[14px] text-slate-800 outline-none focus:ring-2 focus:ring-[#0F8A99]";
const selectBase =
  "w-full h-11 rounded-lg border border-slate-300 bg-white px-3 pr-8 text-[14px] text-slate-800 outline-none focus:ring-2 focus:ring-[#0F8A99] appearance-none";
const miniButtonBase =
  "inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-[12px] font-medium h-9 min-w-[92px] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F8A99]";
const pillBase =
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold border";

function prettifyType(type?: string | null) {
  if (!type) return "Other";
  if (type === "patient") return "Patient";
  if (type === "patient_record") return "Patient Record";
  if (type === "account") return "Account";
  if (type === "announcement") return "Announcement";

  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getArchiveTypeTone(type?: string | null) {
  const t = (type || "").toLowerCase();

  if (t.includes("patient")) {
    return "border-cyan-200 bg-cyan-50 text-cyan-800";
  }
  if (t.includes("record")) {
    return "border-violet-200 bg-violet-50 text-violet-800";
  }
  if (t.includes("account") || t.includes("user")) {
    return "border-sky-200 bg-sky-50 text-sky-800";
  }
  if (t.includes("announcement")) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-slate-200 bg-slate-100 text-slate-700";
}

function middleInitial(name?: string | null) {
  const cleaned = String(name ?? "").trim();
  if (!cleaned) return "";
  const firstPart = cleaned.split(/\s+/)[0] ?? "";
  const firstChar = firstPart.charAt(0).toUpperCase();
  return firstChar ? `${firstChar}.` : "";
}

function formatPatientDisplayName(patient?: ArchiveItem["patient"] | null, fallback?: string | null) {
  const last = String(patient?.last_name ?? "").trim();
  const first = String(patient?.first_name ?? "").trim();
  const middle = middleInitial(patient?.middle_name);
  const suffix = String(patient?.suffix ?? "").trim();

  if (last || first || middle || suffix) {
    const nameBeforeSuffix = last
      ? [last, [first, middle].filter(Boolean).join(" ")].filter(Boolean).join(", ")
      : [first, middle].filter(Boolean).join(" ");

    return [nameBeforeSuffix, suffix].filter(Boolean).join(", ").trim() || fallback || "";
  }

  return String(patient?.full_name ?? fallback ?? "").trim();
}

function getArchivePatientName(item: ArchiveItem) {
  return formatPatientDisplayName(item.patient, item.patient_name);
}

function getArchiveLabel(item: ArchiveItem) {
  const patientName = getArchivePatientName(item);
  const type = String(item.item_type ?? "").toLowerCase();

  if (type.includes("patient") && patientName) return patientName;

  return item.item_label || patientName || `Item #${item.item_id ?? item.id}`;
}

export default function ArchiveTab({
  archives = [],
  filters,
  flash,
}: ArchiveTabProps) {
  const [q, setQ] = React.useState(filters?.q ?? filters?.search ?? "");
  const [type, setType] = React.useState(filters?.type ?? "");
  const [sort, setSort] = React.useState(filters?.sort ?? "latest");

  const [toast, setToast] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [viewTarget, setViewTarget] = React.useState<ArchiveItem | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<ArchiveItem | null>(null);
  const [restoreTarget, setRestoreTarget] = React.useState<ArchiveItem | null>(null);

  const toastTimerRef = React.useRef<number | null>(null);

  const fmt = React.useCallback((iso?: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleString();
  }, []);

  React.useEffect(() => {
    setQ(filters?.q ?? filters?.search ?? "");
  }, [filters?.q, filters?.search]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const successMessage = flash?.success?.trim();
    const errorMessage = flash?.error?.trim();

    if (successMessage) {
      const key = `archive-flash-success:${successMessage}`;
      const alreadyShown = sessionStorage.getItem(key);

      if (!alreadyShown) {
        sessionStorage.setItem(key, "1");
        setToast({ type: "success", message: successMessage });
      }
    } else if (errorMessage) {
      const key = `archive-flash-error:${errorMessage}`;
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

  const dynamicTypes = React.useMemo(() => {
    return Array.from(new Set(archives.map((a) => a.item_type).filter(Boolean))) as string[];
  }, [archives]);

  const typeOptions: TypeOption[] = React.useMemo(() => {
    return [
      { value: "", label: "All types" },
      ...dynamicTypes.map((t) => ({
        value: t,
        label: prettifyType(t),
      })),
    ];
  }, [dynamicTypes]);

  const visibleItems = React.useMemo(() => {
    let list = [...archives];

    const needle = q.trim().toLowerCase();
    if (needle) {
      list = list.filter((a) => {
        const patientName = getArchivePatientName(a);
        const archivedBy = a.user?.name || a.deleted_by || "";
        const haystack = [
          a.item_label || "",
          a.reason || "",
          patientName,
          archivedBy,
          prettifyType(a.item_type),
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(needle);
      });
    }

    if (type) {
      list = list.filter((a) => (a.item_type || "") === type);
    }

    list.sort((a, b) => {
      const da = new Date(a.archived_at || a.deleted_at || a.created_at || 0).getTime();
      const db = new Date(b.archived_at || b.deleted_at || b.created_at || 0).getTime();

      if (sort === "oldest") return da - db;
      if (sort === "label_asc") {
        return (a.item_label || "").localeCompare(b.item_label || "");
      }
      if (sort === "label_desc") {
        return (b.item_label || "").localeCompare(a.item_label || "");
      }
      return db - da;
    });

    return list;
  }, [archives, q, type, sort]);

  const archiveStats = React.useMemo(() => {
    const total = visibleItems.length;
    const typeCount = new Map<string, number>();

    for (const item of visibleItems) {
      const key = item.item_type || "other";
      typeCount.set(key, (typeCount.get(key) ?? 0) + 1);
    }

    const topTypeEntry = [...typeCount.entries()].sort((a, b) => b[1] - a[1])[0];

    return {
      total,
      distinctTypes: typeCount.size,
      topType: topTypeEntry ? prettifyType(topTypeEntry[0]) : "—",
    };
  }, [visibleItems]);

  const handleApply = () => {
    router.get(
      "/admin",
      {
        tab: "archives",
        archive_q: q || undefined,
        archive_type: type || undefined,
        archive_sort: sort || undefined,
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
    setType("");
    setSort("latest");

    router.get(
      "/admin",
      { tab: "archives" },
      {
        preserveScroll: true,
        preserveState: true,
        replace: true,
      }
    );
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;

    router.delete(`/admin/archives/${deleteTarget.id}`, {
      preserveScroll: true,
      onSuccess: () => setDeleteTarget(null),
      onError: () => setDeleteTarget(null),
    });
  };

  const confirmRestore = () => {
    if (!restoreTarget) return;

    router.post(
      `/admin/archives/${restoreTarget.id}/restore`,
      {},
      {
        preserveScroll: true,
        onSuccess: () => setRestoreTarget(null),
        onError: () => setRestoreTarget(null),
      }
    );
  };

  return (
    <div className="w-full space-y-4 pb-8 pt-2">
      <div className="flex flex-col gap-1">
        <h2 className="text-[20px] font-semibold tracking-tight text-[#203D7A] md:text-[22px]">
          Archive
        </h2>
        <p className="text-sm text-slate-600">
          View and manage archived items. Filter by type, search archived entries,
          and restore or permanently delete them.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard label="Visible items" value={archiveStats.total} />
        <SummaryCard label="Archive types" value={archiveStats.distinctTypes} />
        <SummaryCard label="Top type" value={archiveStats.topType} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 md:px-5">
              <div>
                <h3 className="text-base font-semibold text-[#203D7A]">
                  Archived items
                </h3>
                <p className="text-[11px] text-slate-500">
                  Showing {visibleItems.length} entr{visibleItems.length === 1 ? "y" : "ies"}.
                </p>
              </div>
            </div>

            <div className="max-h-[72vh] overflow-y-auto scroll-thin">
              {visibleItems.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-slate-500 md:px-5">
                  No archived items found for the current filters.
                </div>
              ) : (
                <ul className="divide-y divide-slate-200">
                  {visibleItems.map((a) => {
                    const archived = fmt(a.archived_at || a.deleted_at || a.created_at);
                    const restored = fmt(a.restored_at);

                    const patientName = getArchivePatientName(a) || null;
                    const archivedBy = a.user?.name || a.deleted_by || null;

                    const label = getArchiveLabel(a);
                    const typeLabel = prettifyType(a.item_type);
                    const typeTone = getArchiveTypeTone(a.item_type);

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
                                  {label}
                                </span>

                                <span className={pillBase + " " + typeTone}>
                                  {typeLabel}
                                </span>

                                <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-medium text-sky-700">
                                  Click to view
                                </span>

                                {patientName && (
                                  <span
                                    className={
                                      pillBase +
                                      " border-teal-200 bg-teal-50 text-teal-800"
                                    }
                                  >
                                    Patient: {patientName}
                                  </span>
                                )}
                              </div>

                              {a.reason && (
                                <p className="mt-1 line-clamp-2 text-xs text-slate-600">
                                  Reason: {a.reason}
                                </p>
                              )}

                              <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-slate-500">
                                {archived && <span>Archived: {archived}</span>}
                                {restored && (
                                  <span className="before:px-1 before:content-['·']">
                                    Restored: {restored}
                                  </span>
                                )}
                                {archivedBy && (
                                  <span className="before:px-1 before:content-['·']">
                                    By: {archivedBy}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div
                              className="mt-1 flex flex-row gap-2 sm:mt-0 sm:flex-col sm:items-end"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => setRestoreTarget(a)}
                                className={
                                  miniButtonBase +
                                  " border border-teal-600 bg-[#0F8A99] text-white hover:bg-teal-700"
                                }
                              >
                                Restore
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
        </div>

        <aside className="h-fit self-start rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:sticky xl:top-4">
          <div className="mb-4">
            <h3 className="text-[14px] font-semibold text-[#203D7A]">Filters</h3>
            <p className="mt-1 text-[12px] text-slate-500">
              Refine the archive list using the options below.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-[12px] font-medium text-slate-600">
                Search archive
              </label>
              <div className="relative">
                <input
                  type="search"
                  placeholder="Search label, patient, reason, or user..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className={searchInputBase}
                />
                <SearchGlyph className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              </div>
            </div>

            <div className="relative w-full">
              <label className="mb-1 block text-[12px] font-medium text-slate-600">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className={selectBase}
              >
                {typeOptions.map((opt) => (
                  <option key={opt.value || "all"} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <SelectCaret />
            </div>

            <div className="relative w-full">
              <label className="mb-1 block text-[12px] font-medium text-slate-600">
                Sort
              </label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className={selectBase}
              >
                <option value="latest">Latest first</option>
                <option value="oldest">Oldest first</option>
                <option value="label_asc">Label A–Z</option>
                <option value="label_desc">Label Z–A</option>
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
          <div className="fixed inset-0 z-[140] flex items-center justify-center pointer-events-none p-4">
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
                        <ArchiveGlyph className="h-5 w-5" />
                      </span>

                      <span className={pillBase + " " + getArchiveTypeTone(viewTarget.item_type)}>
                        {prettifyType(viewTarget.item_type)}
                      </span>
                    </div>

                    <h3 className="break-words text-[22px] font-semibold leading-tight text-slate-900">
                      {getArchiveLabel(viewTarget)}
                    </h3>

                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                      {viewTarget.archived_at && <span>Archived: {fmt(viewTarget.archived_at)}</span>}
                      {viewTarget.restored_at && <span>Restored: {fmt(viewTarget.restored_at)}</span>}
                      {(viewTarget.user?.name || viewTarget.deleted_by) && (
                        <span>By: {viewTarget.user?.name || viewTarget.deleted_by}</span>
                      )}
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

              <div className="max-h-[65vh] overflow-y-auto px-6 py-6 space-y-4">
                <InfoBlock label="Type" value={prettifyType(viewTarget.item_type)} />

                {getArchivePatientName(viewTarget) ? (
                  <InfoBlock
                    label="Patient"
                    value={getArchivePatientName(viewTarget) || "—"}
                  />
                ) : null}

                {viewTarget.user?.name || viewTarget.deleted_by ? (
                  <InfoBlock
                    label="Archived by"
                    value={viewTarget.user?.name || viewTarget.deleted_by || "—"}
                  />
                ) : null}

                <InfoBlock
                  label="Archive reason"
                  value={viewTarget.reason?.trim() || "No reason provided."}
                  multiline
                />
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
                    if (current) setRestoreTarget(current);
                  }}
                  className="rounded-xl border border-teal-600 bg-[#0F8A99] px-4 py-2.5 text-[14px] font-medium text-white shadow-sm transition hover:bg-teal-700 hover:shadow-md"
                >
                  Restore Item
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {restoreTarget && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[121] flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]"
            onClick={() => setRestoreTarget(null)}
          >
            <div
              className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-teal-50 px-6 py-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-sm">
                    <RestoreGlyph className="h-6 w-6" />
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-[19px] font-semibold text-slate-900">
                      Restore archived item?
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      This will return the archived item to the active list.
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-6 py-5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Selected item
                  </p>
                  <p className="mt-1 break-words text-sm font-semibold text-slate-900">
                    {getArchiveLabel(restoreTarget)}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    Type: {prettifyType(restoreTarget.item_type)}
                  </p>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={() => setRestoreTarget(null)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-[14px] font-medium text-slate-800 transition hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmRestore}
                  className="rounded-xl border border-teal-600 bg-[#0F8A99] px-4 py-2.5 text-[14px] font-medium text-white shadow-sm transition hover:bg-teal-700 hover:shadow-md"
                >
                  Yes, Restore
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {deleteTarget && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[122] flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]"
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
                      Permanently delete archive entry?
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
                    Archive entry to delete
                  </p>
                  <p className="mt-1 break-words text-sm font-semibold text-slate-900">
                    {getArchiveLabel(deleteTarget)}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    Type: {prettifyType(deleteTarget.item_type)}
                  </p>
                  {deleteTarget.reason && (
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
                      Reason: {deleteTarget.reason}
                    </p>
                  )}
                </div>

                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Once deleted, this archive entry will no longer be recoverable.
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

function InfoBlock({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p
        className={
          "mt-1 text-[15px] text-slate-700 " +
          (multiline ? "whitespace-pre-wrap leading-7" : "break-words")
        }
      >
        {value}
      </p>
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

function RestoreGlyph(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 5a7 7 0 1 1-6.32 10H3.75a.75.75 0 0 1 0-1.5H7a.75.75 0 0 1 .75.75v3.25a.75.75 0 0 1-1.5 0v-1.39A8.5 8.5 0 1 0 12 3.5a.75.75 0 0 1 0 1.5Zm-.75 2.5a.75.75 0 0 1 1.5 0v3.44l2.22 1.28a.75.75 0 1 1-.75 1.3l-2.6-1.5a.75.75 0 0 1-.37-.65V7.5Z" />
    </svg>
  );
}

function ArchiveGlyph(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M3.75 5.5A2.75 2.75 0 0 1 6.5 2.75h11A2.75 2.75 0 0 1 20.25 5.5v1.19a2.73 2.73 0 0 1-.81 1.94l-.44.44v8.43a2.75 2.75 0 0 1-2.75 2.75h-8.5A2.75 2.75 0 0 1 5 17.5V9.07l-.44-.44a2.73 2.73 0 0 1-.81-1.94V5.5Zm2.75-1.25c-.69 0-1.25.56-1.25 1.25v1.19c0 .33.13.65.37.88l.66.66c.14.14.22.33.22.53v8.74c0 .69.56 1.25 1.25 1.25h8.5c.69 0 1.25-.56 1.25-1.25V8.76c0-.2.08-.39.22-.53l.66-.66c.24-.23.37-.55.37-.88V5.5c0-.69-.56-1.25-1.25-1.25h-11Zm2.75 6.5a.75.75 0 0 1 .75-.75h4a.75.75 0 0 1 0 1.5h-4a.75.75 0 0 1-.75-.75Z" />
    </svg>
  );
}