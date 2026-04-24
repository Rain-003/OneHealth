import React from "react";
import { Head, Link, usePage } from "@inertiajs/react";
import { type SharedData } from "@/types";

type Activity = {
  id: number;
  type: string;
  description: string;
  patient?: string | null;
  by?: string | null;
  when?: string | null;
  at?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  details?: string | null;
};

type PaginationLinks = { url: string | null; label: string; active: boolean };

type PageProps = SharedData & {
  activities: Activity[] | { data: Activity[]; links: PaginationLinks[] };
  filters?: {
    who?: "me" | "team";
    type?: string;
    patient_id?: string | number;
    user_id?: string | number;
  };
  typeCounts?: { type: string; c: number }[];
  patients?: { id: number; full_name: string }[];
  users?: { id: number; name: string; email: string; role?: string }[];
  flash?: { error?: string | null; message?: string | null; status?: string | null };
};

function formatDateTime(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default function ActivityIndex() {
  const props = usePage<PageProps>().props;
  const isAdmin = (props.auth?.user as any)?.role === "admin";

  const rawActivities = props.activities ?? [];

  // Support both paginator ({data,links}) and plain array
  const activities: Activity[] = Array.isArray((rawActivities as any).data)
    ? (rawActivities as any).data
    : Array.isArray(rawActivities)
    ? (rawActivities as any)
    : [];

  const links: PaginationLinks[] = Array.isArray((rawActivities as any).links)
    ? (rawActivities as any).links
    : [];

  const filters = {
    who: props.filters?.who ?? "me",
    type: props.filters?.type ?? "",
    patient_id: props.filters?.patient_id ?? "",
    user_id: props.filters?.user_id ?? "",
  };

  const typeCounts = props.typeCounts ?? [];
  const patients = props.patients ?? [];
  const users = props.users ?? [];

  const today = new Date();
  const toDefault = today.toISOString().slice(0, 10);
  const fromDefault = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  return (
    <div className="p-6 space-y-6">
      <Head title="Activity" />

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Activity</h1>
        <Link href="/center/dashboard" className="text-sm underline">
          Back to Dashboard
        </Link>
      </div>

      {!!props.flash?.error && (
        <div className="border rounded-md px-4 py-3 text-sm text-red-700 bg-red-50">
          {props.flash.error}
        </div>
      )}

      {/* Filters */}
      <form method="get" className="grid grid-cols-1 md:grid-cols-6 gap-3">
        {isAdmin ? (
          <select
            name="who"
            defaultValue={filters.who}
            className="border rounded-md px-3 py-2"
          >
            <option value="me">My activity</option>
            <option value="team">Team activity</option>
          </select>
        ) : (
          <input type="hidden" name="who" value="me" />
        )}

        {isAdmin ? (
          <select
            name="user_id"
            defaultValue={String(filters.user_id ?? "")}
            className="border rounded-md px-3 py-2"
          >
            <option value="">All accounts</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email})
              </option>
            ))}
          </select>
        ) : null}

        <select
          name="type"
          defaultValue={filters.type}
          className="border rounded-md px-3 py-2"
        >
          <option value="">All types</option>
          {typeCounts.map((t) => (
            <option key={t.type} value={t.type}>
              {t.type} ({t.c})
            </option>
          ))}
        </select>

        <select
          name="patient_id"
          defaultValue={String(filters.patient_id ?? "")}
          className="border rounded-md px-3 py-2"
        >
          <option value="">All patients</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name}
            </option>
          ))}
        </select>

        <button className="border rounded-md px-3 py-2">Apply</button>
      </form>

      {/* Admin export */}
      {isAdmin ? (
        <div className="rounded-md border p-4 space-y-3">
          <div className="text-sm font-medium">Download activity logs (CSV)</div>
          <form
            method="get"
            action="/center/activity/export"
            className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end"
          >
            <div className="space-y-1">
              <div className="text-xs text-slate-600">From</div>
              <input
                type="date"
                name="from"
                defaultValue={fromDefault}
                className="border rounded-md px-3 py-2 w-full"
              />
            </div>

            <div className="space-y-1">
              <div className="text-xs text-slate-600">To</div>
              <input
                type="date"
                name="to"
                defaultValue={toDefault}
                className="border rounded-md px-3 py-2 w-full"
              />
            </div>

            {/* Reuse current page filters (apply filters first, then export) */}
            <input type="hidden" name="who" value={filters.who} />
            <input type="hidden" name="type" value={filters.type} />
            <input
              type="hidden"
              name="patient_id"
              value={String(filters.patient_id ?? "")}
            />
            <input
              type="hidden"
              name="user_id"
              value={String(filters.user_id ?? "")}
            />

            <button className="border rounded-md px-3 py-2">Download CSV</button>

            <div className="md:col-span-6 text-xs text-slate-500">
              Tip: Apply your filters first, then export. (Export range is limited to 90 days.)
            </div>
          </form>
        </div>
      ) : null}

      {/* List */}
      <ul className="divide-y rounded-md border">
        {activities.map((a) => (
          <li key={a.id} className="p-4">
            <div className="font-medium">{a.description}</div>
            <div className="text-sm text-slate-600 mt-1">
              {a.patient ? <>Patient: {a.patient} · </> : null}
              {a.by ? <>By: {a.by} · </> : null}
              {a.when}
              {a.at ? <> · {formatDateTime(a.at)}</> : null}
            </div>
            <div className="text-xs text-slate-500 mt-1">{a.type}</div>
            {(a.ip_address || a.user_agent) && (
              <div className="text-xs text-slate-500 mt-1">
                {a.ip_address ? <>IP: {a.ip_address}</> : null}
                {a.ip_address && a.user_agent ? " · " : null}
                {a.user_agent ? <>Device: {a.user_agent}</> : null}
              </div>
            )}
          </li>
        ))}

        {!activities.length && (
          <li className="p-8 text-center text-slate-500">
            No activity found.
          </li>
        )}
      </ul>

      {/* Pagination – only if we actually have links */}
      {!!links.length && (
        <div className="flex gap-2 flex-wrap mt-2">
          {links.map((l, i) => (
            <Link
              key={i}
              href={l.url ?? "#"}
              className={`px-3 py-1 rounded border ${
                l.active ? "bg-slate-100" : ""
              } ${!l.url ? "opacity-50 pointer-events-none" : ""}`}
              dangerouslySetInnerHTML={{ __html: l.label }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
