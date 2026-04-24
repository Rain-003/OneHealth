import * as React from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';

type PatientType = 'immunization' | 'pregnancy';
type RecordType = 'mother' | 'infant';

type Record = {
  id: number;
  patient_id: number;
  visit_date: string;
  title: string;
  record_type: RecordType;
  patient?: {
    full_name?: string | null;
    patient_type?: PatientType | null;
    barangay?: string | null;
    owner?: { name?: string | null; barangay?: string | null } | null;
  };
};

type Props = {
  records: {
    data: Record[];
    links: { url: string | null; label: string; active: boolean }[];
  };
  filters: { record_type?: RecordType | ''; sort?: 'latest' | 'oldest' };
  dashboardUrl: string;
};

export default function AllRecords() {
  const { props } = usePage<Props>();
  const { records, filters } = props;

  const [type, setType] = React.useState<RecordType | ''>(filters.record_type ?? '');
  const [sort, setSort] = React.useState<'latest' | 'oldest'>(filters.sort ?? 'latest');

  // Inertia visit/reload options — cast to any to avoid TS mismatches on older packages
  const visitOpts = { preserveScroll: true, preserveState: true, replace: true } as any;
  const reloadOpts = { only: ['records'], preserveScroll: true, preserveState: true } as any;

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    router.visit('/center/records', { replace: true } as any);
  };

  React.useEffect(() => {
    const onVis = () => { if (document.visibilityState === 'visible') router.reload(reloadOpts); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const push = (next: { record_type?: RecordType | ''; sort?: 'latest' | 'oldest' }) => {
    router.get(
      '/center/records/all',
      { record_type: (next.record_type ?? type) || undefined, sort: next.sort ?? sort },
      visitOpts
    );
  };

  const Badge = ({ children }: { children: React.ReactNode }) => (
    <span className="ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-wide text-slate-600">
      {children}
    </span>
  );

  return (
    <>
      <Head title="All Patient Records" />
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6 min-h-screen bg-slate-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button type="button" onClick={goBack} className="underline text-sm inline-flex items-center gap-1">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Back
            </button>
            <h1 className="text-2xl font-semibold">All Patient Records</h1>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm">Filter by type</span>
            <select
              value={type}
              onChange={(e) => { const v = e.target.value as RecordType | ''; setType(v); push({ record_type: v }); }}
              className="rounded border px-3 py-2 text-sm"
            >
              <option value="">All</option>
              <option value="mother">Mother</option>
              <option value="infant">Infant</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm">Sort</span>
            <select
              value={sort}
              onChange={(e) => { const v = e.target.value as 'latest' | 'oldest'; setSort(v); push({ sort: v }); }}
              className="rounded border px-3 py-2 text-sm"
            >
              <option value="latest">Latest</option>
              <option value="oldest">Oldest</option>
            </select>
          </div>
        </div>

        {/* Table */}
        {records.data.length === 0 ? (
          <div className="rounded-xl border bg-white p-6 text-sm text-slate-600">No records found.</div>
        ) : (
          <div className="bg-white rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Visit Date</th>
                  <th className="text-left p-3">Patient</th>
                  <th className="text-left p-3">Title</th>
                  <th className="text-left p-3">Record Type</th>
                </tr>
              </thead>
              <tbody>
                {records.data.map((r) => (
                  <tr key={r.id} className="border-b last:border-b-0">
                    <td className="p-3">{r.visit_date}</td>

                    <td className="p-3">
                      {r.patient ? (
                        <>
                          <Link href={`/center/records/${r.patient_id}`} className="underline">
                            {r.patient.full_name ?? '—'}
                          </Link>
                          {r.patient.patient_type && (
                            <Badge>{r.patient.patient_type}</Badge>
                          )}
                          {(r.patient.owner?.name || r.patient.barangay) && (
                            <div className="mt-1 text-[11px] text-slate-500">
                              {r.patient.owner?.name ? (
                                <>Owner: <span className="font-medium text-slate-600">{r.patient.owner.name}</span>{r.patient.owner.barangay ? ` (${r.patient.owner.barangay})` : ''}</>
                              ) : null}
                              {!r.patient.owner?.name && r.patient.barangay ? (
                                <>Barangay: <span className="font-medium text-slate-600">{r.patient.barangay}</span></>
                              ) : null}
                            </div>
                          )}
                        </>
                      ) : (
                        '—'
                      )}
                    </td>

                    <td className="p-3">
                      <Link href={`/center/records/${r.patient_id}`} className="underline">
                        {r.title}
                      </Link>
                    </td>

                    <td className="p-3 capitalize">{r.record_type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex flex-wrap gap-2">
          {records.links.map((l, i) => (
            <Link
              key={i}
              href={l.url ?? '#'}
              className={
                'px-3 py-1 rounded border ' +
                (l.active ? 'bg-black text-white' : 'bg-white text-gray-800')
              }
            >
              <span dangerouslySetInnerHTML={{ __html: l.label }} />
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
