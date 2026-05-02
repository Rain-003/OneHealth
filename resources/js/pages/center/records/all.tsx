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
    first_name?: string | null;
    middle_name?: string | null;
    last_name?: string | null;
    suffix?: string | null;
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

const KNOWN_SUFFIXES = new Set(['JR', 'SR', 'II', 'III', 'IV', 'V']);

function cleanNamePart(value?: string | null): string {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function middleInitial(value?: string | null): string {
  const middle = cleanNamePart(value);
  if (!middle) return '';

  const firstMiddleWord = middle.split(/\s+/).find(Boolean);
  if (!firstMiddleWord) return '';

  const letter = firstMiddleWord.replace(/[^A-Za-zÀ-ÖØ-öø-ÿÑñ]/g, '').charAt(0);
  return letter ? `${letter.toUpperCase()}.` : '';
}

function splitFullNameFallback(fullName?: string | null) {
  const raw = cleanNamePart(fullName);
  if (!raw) {
    return { first_name: '', middle_name: '', last_name: '', suffix: '' };
  }

  const parts = raw.split(/\s+/).filter(Boolean);

  let suffix = '';
  if (parts.length > 1) {
    const lastToken = parts[parts.length - 1].replace(/\./g, '').toUpperCase();
    if (KNOWN_SUFFIXES.has(lastToken)) {
      suffix = parts.pop() ?? '';
    }
  }

  if (parts.length === 1) {
    return {
      first_name: parts[0] ?? '',
      middle_name: '',
      last_name: '',
      suffix,
    };
  }

  if (parts.length === 2) {
    return {
      first_name: parts[0] ?? '',
      middle_name: '',
      last_name: parts[1] ?? '',
      suffix,
    };
  }

  return {
    first_name: parts[0] ?? '',
    middle_name: parts.slice(1, -1).join(' '),
    last_name: parts[parts.length - 1] ?? '',
    suffix,
  };
}

function formatPatientDisplayName(patient?: Record['patient'] | null): string {
  if (!patient) return '—';

  const hasSplitName = Boolean(
    cleanNamePart(patient.first_name) ||
      cleanNamePart(patient.middle_name) ||
      cleanNamePart(patient.last_name) ||
      cleanNamePart(patient.suffix)
  );

  const parts = hasSplitName
    ? {
        first_name: cleanNamePart(patient.first_name),
        middle_name: cleanNamePart(patient.middle_name),
        last_name: cleanNamePart(patient.last_name),
        suffix: cleanNamePart(patient.suffix),
      }
    : splitFullNameFallback(patient.full_name);

  const last = cleanNamePart(parts.last_name);
  const first = cleanNamePart(parts.first_name);
  const middle = middleInitial(parts.middle_name);
  const suffix = cleanNamePart(parts.suffix);

  if (!last && !first && !middle && !suffix) {
    return cleanNamePart(patient.full_name) || '—';
  }

  const firstLine = [first, middle].filter(Boolean).join(' ');
  const main = last && firstLine ? `${last}, ${firstLine}` : last || firstLine;

  return suffix ? `${main}, ${suffix}` : main;
}

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
                            {formatPatientDisplayName(r.patient)}
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
