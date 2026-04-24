import * as React from "react";
import { createPortal } from "react-dom";
import { Link } from "@inertiajs/react";

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

type SortOrder = "newest" | "oldest";
type QuickRange = "" | "today" | "week" | "month";

const BARANGAYS = [
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
] as const;

const inputBase =
  "w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-800 outline-none transition focus:border-[#0F8A99] focus:ring-2 focus:ring-[#0F8A99]/10";
const selectBase =
  "w-full h-10 rounded-lg border border-slate-200 bg-white px-3 pr-9 text-[13px] text-slate-800 outline-none transition focus:border-[#0F8A99] focus:ring-2 focus:ring-[#0F8A99]/10 appearance-none";
const searchInputBase =
  "w-full h-10 rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-[13px] text-slate-800 outline-none transition focus:border-[#0F8A99] focus:ring-2 focus:ring-[#0F8A99]/10";

type Props = {
  activities: Activity[];
};

export default function ActivityTab({ activities: rawActivities }: Props) {
  const [qActivity, setQActivity] = React.useState("");
  const [sortActivity, setSortActivity] = React.useState<SortOrder>("newest");
  const [quickRange, setQuickRange] = React.useState<QuickRange>("");
  const [typeFilter, setTypeFilter] = React.useState("");
  const [barangayFilter, setBarangayFilter] = React.useState("");
  const [staffFilter, setStaffFilter] = React.useState("");
  const [viewTarget, setViewTarget] = React.useState<Activity | null>(null);

  const [isDownloadModalOpen, setIsDownloadModalOpen] = React.useState(false);
  const [downloadFromDate, setDownloadFromDate] = React.useState("");
  const [downloadToDate, setDownloadToDate] = React.useState("");

  const fmtDateTime = React.useCallback((iso?: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleString();
  }, []);

  const availableTypes = React.useMemo(() => {
    const s = new Set<string>();
    for (const a of rawActivities) {
      if (a?.type) s.add(a.type);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [rawActivities]);

  const staffOptions = React.useMemo(() => {
    const s = new Set<string>();
    for (const a of rawActivities) {
      if (a.by) s.add(a.by);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [rawActivities]);

  const resetActivityFilters = React.useCallback(() => {
    setQActivity("");
    setTypeFilter("");
    setBarangayFilter("");
    setStaffFilter("");
    setSortActivity("newest");
    setQuickRange("");
  }, []);

  const applyQuickRange = React.useCallback((range: QuickRange) => {
    setQuickRange(range);
  }, []);

  const activities = React.useMemo(() => {
    let list = [...rawActivities];

    const needle = qActivity.trim().toLowerCase();
    if (needle) {
      list = list.filter((a) => {
        const haystack = `${a.description || ""} ${a.patient || ""} ${a.by || ""} ${
          Array.isArray(a.details) ? a.details.join(" ") : a.details || ""
        }`;
        return haystack.toLowerCase().includes(needle);
      });
    }

    if (typeFilter) {
      list = list.filter((a) => a.type === typeFilter);
    }

    const selectedBarangay = barangayFilter.trim().toUpperCase();
    if (selectedBarangay) {
      list = list.filter((a) => {
        if (a.barangay) {
          return a.barangay.trim().toUpperCase() === selectedBarangay;
        }
        const pool = `${a.description || ""} ${
          Array.isArray(a.details) ? a.details.join(" ") : a.details || ""
        }`.toUpperCase();
        return pool.includes(selectedBarangay);
      });
    }

    if (staffFilter) {
      list = list.filter((a) => a.by === staffFilter);
    }

    if (quickRange) {
      const today = new Date();
      const start = new Date();

      if (quickRange === "today") {
        start.setHours(0, 0, 0, 0);
      } else if (quickRange === "week") {
        start.setDate(today.getDate() - 6);
        start.setHours(0, 0, 0, 0);
      } else if (quickRange === "month") {
        start.setMonth(today.getMonth() - 1);
        start.setHours(0, 0, 0, 0);
      }

      const end = new Date();
      end.setHours(23, 59, 59, 999);

      list = list.filter((a) => {
        if (!a.at) return false;
        const d = new Date(a.at);
        if (Number.isNaN(d.getTime())) return false;
        return d >= start && d <= end;
      });
    }

    list.sort((a, b) => {
      const aTime = a.at ? new Date(a.at).getTime() : 0;
      const bTime = b.at ? new Date(b.at).getTime() : 0;
      return sortActivity === "newest" ? bTime - aTime : aTime - bTime;
    });

    return list;
  }, [
    rawActivities,
    qActivity,
    sortActivity,
    typeFilter,
    barangayFilter,
    staffFilter,
    quickRange,
  ]);

  const activityStats = React.useMemo(() => {
    const total = activities.length;
    const workers = new Set<string>();
    const brgyCount = new Map<string, number>();
    const typeCount = new Map<string, number>();

    for (const a of activities) {
      if (a.by) workers.add(a.by);
      if (a.barangay) {
        brgyCount.set(a.barangay, (brgyCount.get(a.barangay) ?? 0) + 1);
      }
      if (a.type) {
        typeCount.set(a.type, (typeCount.get(a.type) ?? 0) + 1);
      }
    }

    const topBarangay =
      [...brgyCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
    const topType =
      [...typeCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

    return {
      total,
      distinctWorkers: workers.size,
      topBarangay,
      topType,
    };
  }, [activities]);

  const handleCopySummary = React.useCallback(
    (a: Activity) => {
      const pieces = [
        a.description,
        a.patient ? `Patient: ${a.patient}` : "",
        a.by ? `By: ${a.by}` : "",
        a.barangay ? `Barangay: ${a.barangay}` : "",
        a.when ? `When: ${a.when}` : a.at ? `When: ${fmtDateTime(a.at)}` : "",
      ].filter(Boolean);

      const text = pieces.join(" • ");

      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).catch(() => {});
      } else {
        window.prompt("Copy activity summary:", text);
      }
    },
    [fmtDateTime]
  );

  const downloadExportConfig = React.useMemo(() => {
    const maxDays = 90;

    let missingDates = false;
    let tooLarge = false;
    let invalidRange = false;

    if (!downloadFromDate || !downloadToDate) {
      missingDates = true;
    } else {
      const from = new Date(downloadFromDate + "T00:00:00");
      const to = new Date(downloadToDate + "T00:00:00");

      if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())) {
        if (from > to) {
          invalidRange = true;
        } else {
          const diffMs = to.getTime() - from.getTime();
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          tooLarge = diffDays > maxDays;
        }
      }
    }

    const params = new URLSearchParams();
    if (downloadFromDate) params.set("from", downloadFromDate);
    if (downloadToDate) params.set("to", downloadToDate);
    if (typeFilter) params.set("type", typeFilter);
    if (staffFilter) params.set("staff", staffFilter);
    if (barangayFilter) params.set("barangay", barangayFilter);
    if (qActivity.trim()) params.set("q", qActivity.trim());
    params.set("sort", sortActivity);

    const url =
      "/admin/activity/export" +
      (params.toString() ? `?${params.toString()}` : "");

    return {
      url,
      disabled: missingDates || tooLarge || invalidRange,
      missingDates,
      tooLarge,
      invalidRange,
      maxDays,
    };
  }, [
    downloadFromDate,
    downloadToDate,
    typeFilter,
    staffFilter,
    barangayFilter,
    qActivity,
    sortActivity,
  ]);

  const openDownloadModal = React.useCallback(() => {
    setDownloadFromDate("");
    setDownloadToDate("");
    setIsDownloadModalOpen(true);
  }, []);

  const handleDownloadCsv = React.useCallback(() => {
    if (downloadExportConfig.disabled) return;
    setIsDownloadModalOpen(false);
    window.location.href = downloadExportConfig.url;
  }, [downloadExportConfig]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-[19px] font-semibold tracking-tight text-[#203D7A] md:text-[20px]">
          Activity Log
        </h2>
        <p className="text-[13px] text-slate-600">
          View recent system activity with search and filters.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <SummaryCard label="Total actions" value={activityStats.total} />
        <SummaryCard
          label="Active health workers"
          value={activityStats.distinctWorkers}
        />
        <SummaryCard label="Top barangay" value={activityStats.topBarangay} />
        <SummaryCard label="Top activity" value={activityStats.topType} />
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h3 className="text-[14px] font-semibold text-[#203D7A]">
              Recent Activity
            </h3>
          </div>

          <div className="max-h-[70vh] overflow-y-auto px-3 py-3 md:px-4">
            {activities.length ? (
              <div className="space-y-2.5">
                {activities.map((a) => {
                  const prettyTime = fmtDateTime(a.at) || a.when || "";
                  const cleanDesc = (a.description || "").replace(
                    /\s*\(\d+\s+entries?\)/i,
                    ""
                  );

                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setViewTarget(a)}
                      className="block w-full rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-left transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F8A99]"
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={
                                "inline-block h-2 w-2 rounded-full " +
                                getActivityDotClass(a.type)
                              }
                            />
                            <h4 className="text-[14px] font-semibold text-slate-900">
                              {cleanDesc}
                            </h4>

                            <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-medium text-sky-700">
                              Click to view
                            </span>
                          </div>

                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[12px] text-slate-600">
                            {a.patient ? (
                              <MetaPill label={`Patient: ${a.patient}`} />
                            ) : null}
                            {a.by ? <MetaPill label={`By: ${a.by}`} /> : null}
                            {a.barangay ? (
                              <MetaPill label={`Barangay: ${a.barangay}`} />
                            ) : null}
                          </div>

                          {a.details ? (
                            Array.isArray(a.details) ? (
                              <ul className="mt-2 list-inside list-disc space-y-0.5 text-[12px] text-slate-700">
                                {a.details.slice(0, 2).map((d, i) => (
                                  <li key={i}>{d}</li>
                                ))}
                                {a.details.length > 2 ? (
                                  <li className="list-none text-[11px] text-slate-500">
                                    +{a.details.length - 2} more details
                                  </li>
                                ) : null}
                              </ul>
                            ) : (
                              <div className="mt-2 line-clamp-2 text-[12px] text-slate-700">
                                {a.details}
                              </div>
                            )
                          ) : null}
                        </div>

                        <div
                          className="flex shrink-0 flex-col items-start gap-2 md:items-end"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {prettyTime ? (
                            <div className="rounded-md bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200">
                              {prettyTime}
                            </div>
                          ) : null}

                          <div className="flex flex-wrap gap-2 md:justify-end">
                            {a.patient_id && (
                              <Link
                                href={`/center/records/${a.patient_id}`}
                                className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50"
                              >
                                View patient record
                              </Link>
                            )}

                            <button
                              type="button"
                              onClick={() => handleCopySummary(a)}
                              className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50"
                            >
                              Copy summary
                            </button>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                <div className="rounded-full bg-slate-100 p-2 text-base">🧐</div>
                <p className="text-[13px] text-slate-500">
                  No activity matches your filters.
                </p>
                <button
                  type="button"
                  onClick={resetActivityFilters}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        </section>

        <aside className="h-fit rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4">
            <h3 className="text-[14px] font-semibold text-[#203D7A]">Filters</h3>
            <p className="mt-1 text-[12px] text-slate-500">
              Refine the activity list using the options below.
            </p>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <input
                type="search"
                placeholder="Search description, patient, or user..."
                value={qActivity}
                onChange={(e) => setQActivity(e.target.value)}
                className={searchInputBase}
              />
              <SearchGlyph className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            </div>

            <div>
              <label className="mb-2 block text-[12px] font-medium text-slate-600">
                Quick range
              </label>
              <div className="flex flex-wrap gap-2">
                <QuickRangeChip
                  label="Today"
                  active={quickRange === "today"}
                  onClick={() =>
                    applyQuickRange(quickRange === "today" ? "" : "today")
                  }
                />
                <QuickRangeChip
                  label="This week"
                  active={quickRange === "week"}
                  onClick={() =>
                    applyQuickRange(quickRange === "week" ? "" : "week")
                  }
                />
                <QuickRangeChip
                  label="This month"
                  active={quickRange === "month"}
                  onClick={() =>
                    applyQuickRange(quickRange === "month" ? "" : "month")
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={openDownloadModal}
                className="w-full rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-[12px] font-medium text-[#0F8A99] transition hover:bg-teal-100"
              >
                Download CSV
              </button>

              <button
                type="button"
                onClick={resetActivityFilters}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Reset filters
              </button>
            </div>

            <div className="relative w-full">
              <label className="mb-1 block text-[12px] font-medium text-slate-600">
                Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className={selectBase}
                title="Filter by type"
              >
                <option value="">All types</option>
                {availableTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <SelectCaret />
            </div>

            <div className="relative w-full">
              <label className="mb-1 block text-[12px] font-medium text-slate-600">
                Staff
              </label>
              <select
                value={staffFilter}
                onChange={(e) => setStaffFilter(e.target.value)}
                className={selectBase}
                title="Filter by health worker"
              >
                <option value="">All staff</option>
                {staffOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <SelectCaret />
            </div>

            <div className="relative w-full">
              <label className="mb-1 block text-[12px] font-medium text-slate-600">
                Barangay
              </label>
              <select
                value={barangayFilter}
                onChange={(e) => setBarangayFilter(e.target.value)}
                className={selectBase}
                title="Filter by barangay"
              >
                <option value="">All barangays</option>
                {BARANGAYS.map((b) => (
                  <option key={b} value={b}>
                    {b}
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
                value={sortActivity}
                onChange={(e) => setSortActivity(e.target.value as SortOrder)}
                className={selectBase}
                title="Sort activity"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
              <SelectCaret />
            </div>
          </div>
        </aside>
      </div>

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
                        <ActivityGlyph className="h-5 w-5" />
                      </span>

                      <span
                        className={
                          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold " +
                          getActivityPillClass(viewTarget.type)
                        }
                      >
                        {viewTarget.type || "Activity"}
                      </span>
                    </div>

                    <h3 className="break-words text-[22px] font-semibold leading-tight text-slate-900">
                      {(viewTarget.description || "").replace(
                        /\s*\(\d+\s+entries?\)/i,
                        ""
                      ) || "Activity details"}
                    </h3>

                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                      {(fmtDateTime(viewTarget.at) || viewTarget.when) && (
                        <span>
                          When: {fmtDateTime(viewTarget.at) || viewTarget.when}
                        </span>
                      )}
                      {viewTarget.by && <span>By: {viewTarget.by}</span>}
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

              <div className="max-h-[65vh] space-y-4 overflow-y-auto px-6 py-6">
                {viewTarget.patient ? (
                  <InfoBlock label="Patient" value={viewTarget.patient} />
                ) : null}

                {viewTarget.barangay ? (
                  <InfoBlock label="Barangay" value={viewTarget.barangay} />
                ) : null}

                {viewTarget.by ? (
                  <InfoBlock label="Processed by" value={viewTarget.by} />
                ) : null}

                <InfoBlock
                  label="Full description"
                  value={viewTarget.description || "No description provided."}
                  multiline
                />

                {viewTarget.details ? (
                  Array.isArray(viewTarget.details) ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Details
                      </p>
                      <ul className="mt-2 list-inside list-disc space-y-1 text-[15px] leading-7 text-slate-700">
                        {viewTarget.details.map((detail, index) => (
                          <li key={index}>{detail}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <InfoBlock
                      label="Details"
                      value={viewTarget.details}
                      multiline
                    />
                  )
                ) : null}
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={() => setViewTarget(null)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-[14px] font-medium text-slate-800 transition hover:bg-slate-100"
                >
                  Close
                </button>

                {viewTarget.patient_id ? (
                  <Link
                    href={`/center/records/${viewTarget.patient_id}`}
                    className="rounded-xl border border-[#0F8A99]/20 bg-[#0F8A99] px-4 py-2.5 text-center text-[14px] font-medium text-white shadow-sm transition hover:opacity-95 hover:shadow-md"
                  >
                    View patient record
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {isDownloadModalOpen && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
            onClick={() => setIsDownloadModalOpen(false)}
          >
            <div
              className="w-full max-w-md rounded-3xl bg-white shadow-2xl ring-1 ring-black/5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b border-slate-200 px-6 py-5">
                <h3 className="text-[18px] font-semibold text-slate-900">
                  Download CSV
                </h3>
                <p className="mt-1 text-[13px] text-slate-500">
                  Select the date range for the activity logs you want to export.
                </p>
              </div>

              <div className="space-y-4 px-6 py-5">
                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-slate-600">
                    From
                  </label>
                  <input
                    type="date"
                    value={downloadFromDate}
                    onChange={(e) => setDownloadFromDate(e.target.value)}
                    className={inputBase}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-slate-600">
                    To
                  </label>
                  <input
                    type="date"
                    value={downloadToDate}
                    onChange={(e) => setDownloadToDate(e.target.value)}
                    className={inputBase}
                  />
                </div>

                {downloadExportConfig.missingDates ? (
                  <p className="text-[12px] text-amber-600">
                    Please select both From and To dates.
                  </p>
                ) : null}

                {downloadExportConfig.invalidRange ? (
                  <p className="text-[12px] text-rose-600">
                    The From date must not be later than the To date.
                  </p>
                ) : null}

                {downloadExportConfig.tooLarge ? (
                  <p className="text-[12px] text-rose-600">
                    Please select {downloadExportConfig.maxDays} days or less.
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsDownloadModalOpen(false)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-[13px] font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleDownloadCsv}
                  disabled={downloadExportConfig.disabled}
                  className={
                    "rounded-xl px-4 py-2.5 text-[13px] font-medium transition " +
                    (downloadExportConfig.disabled
                      ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                      : "border border-[#0F8A99]/20 bg-[#0F8A99] text-white hover:opacity-95")
                  }
                >
                  Download CSV
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
      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M7 10l5 5 5-5z" />
    </svg>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-[18px] font-semibold text-slate-900">
        {value || value === 0 ? value : "—"}
      </div>
    </div>
  );
}

function QuickRangeChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-lg px-3 py-1.5 text-[12px] font-medium transition " +
        (active
          ? "border border-[#0F8A99]/20 bg-[#0F8A99]/10 text-[#0F8A99]"
          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50")
      }
    >
      {label}
    </button>
  );
}

function MetaPill({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">
      {label}
    </span>
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

function getActivityDotClass(type?: string) {
  if (!type) return "bg-slate-400";
  const t = type.toLowerCase();
  if (t.includes("immunization")) return "bg-[#0F8A99]";
  if (t.includes("prenatal") || t.includes("pregnancy")) return "bg-rose-500";
  if (t.includes("account") || t.includes("user")) return "bg-sky-500";
  return "bg-slate-400";
}

function getActivityPillClass(type?: string) {
  if (!type) return "border-slate-200 bg-slate-100 text-slate-700";
  const t = type.toLowerCase();
  if (t.includes("immunization")) {
    return "border-teal-200 bg-teal-50 text-teal-800";
  }
  if (t.includes("prenatal") || t.includes("pregnancy")) {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }
  if (t.includes("account") || t.includes("user")) {
    return "border-sky-200 bg-sky-50 text-sky-800";
  }
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function ActivityGlyph(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M3.75 12A8.25 8.25 0 1 1 12 20.25 8.26 8.26 0 0 1 3.75 12Zm8.25-4.75a.75.75 0 0 0-.75.75v4.31c0 .2.08.39.22.53l2.75 2.75a.75.75 0 1 0 1.06-1.06l-2.53-2.53V8a.75.75 0 0 0-.75-.75Z" />
    </svg>
  );
}