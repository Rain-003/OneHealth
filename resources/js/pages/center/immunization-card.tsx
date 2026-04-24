// resources/js/pages/center/immunization-edit.tsx
import * as React from 'react';
import { usePage, router } from '@inertiajs/react';
import { route } from 'ziggy-js';

/* ───────── Types ───────── */
type Dose = {
  id?: number;
  vaccine: string;
  dose_label: string;
  date_given: string | null;
  remarks?: string | null;
};
type PageProps = {
  patient: {
    id: number | string;
    full_name?: string | null;
    birthdate?: string | null;
    mother_name?: string | null;
    father_name?: string | null;
    barangay?: string | null;
    address?: string | null;
    sex?: string | null;
    phone?: string | null;
    contact_no?: string | null;
    mobile?: string | null;
    health_center?: string | null;
    family_no?: string | null;
  };
  matrix: Record<string, string[]>;
  doses: Dose[];
};

/* ───────── Small helpers ───────── */
const dateOnly = (v?: string | null) => {
  if (!v) return '—';
  const s = String(v);
  if (s.includes('T')) return s.split('T')[0];
  if (/^\d{4}-\d{2}-\d{2}Z$/.test(s)) return s.slice(0, 10);
  return s;
};
const formatPhonePH = (v?: string | null) => {
  if (!v) return '—';
  const d = v.replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('09')) return `${d.slice(0,4)}-${d.slice(4,7)}-${d.slice(7)}`;
  if (d.length === 10 && d.startsWith('9')) {
    const z = `0${d}`;
    return `${z.slice(0,4)}-${z.slice(4,7)}-${z.slice(7)}`;
  }
  return v;
};
const todayStr = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};
const clampDateYear = (v: string | null) => {
  if (!v) return null;
  const m = v.match(/^(\d+)(-\d{2}-\d{2})$/);
  if (!m) return v;
  let y = Number(m[1]);
  if (!Number.isFinite(y)) return v;
  if (y < 1900) y = 1900;
  if (y > 2099) y = 2099;
  return `${String(y).padStart(4, '0').slice(0, 4)}${m[2]}`;
};

/* ───────── Icons (outline) ───────── */
const IconChevronLeft = (p: any) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...p} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M15 18l-6-6 6-6"/></svg>
);
const IconInfo = (p: any) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...p} fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h2v5h-2"/></svg>
);
const IconSave = (p: any) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...p} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M7 21h10a2 2 0 0 0 2-2V7l-4-4H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2"/><path d="M7 3v6h8"/></svg>
);

/* ───────── Abbrev legend (shown near header) ───────── */
const ABBR_MAP: Record<string, string> = {
  BCG: 'Bacillus Calmette-Guérin',
  HepB: 'Hepatitis B Vaccine',
  OPV: 'Oral Polio Vaccine',
  IPV: 'Inactivated Polio Vaccine',
  PCV: 'Pneumococcal Conjugate Vaccine',
  MMR: 'Measles • Mumps • Rubella',
  DPT_HepB_Hib: 'Pentavalent (DPT–HepB–Hib)',
};

/** Try to map a matrix key to a short label */
function toAbbrev(full: string) {
  const f = full.toLowerCase();
  if (f.includes('pentavalent')) return 'DPT-HepB-Hib';
  if (f.includes('pneumococcal')) return 'PCV';
  if (f.includes('inactivated polio')) return 'IPV';
  if (f.includes('oral polio')) return 'OPV';
  if (f.includes('measles') || f.includes('mumps') || f.includes('rubella')) return 'MMR';
  if (f.includes('hepatitis b')) return 'HepB';
  if (f.includes('bcg')) return 'BCG';
  return full; // fallback
}
function legendMeaning(abbrev: string) {
  if (ABBR_MAP[abbrev as keyof typeof ABBR_MAP]) return ABBR_MAP[abbrev as keyof typeof ABBR_MAP];
  // simple expansions
  if (abbrev === 'DPT-HepB-Hib') return ABBR_MAP.DPT_HepB_Hib;
  return '';
}

/* ───────── Page ───────── */
export default function ImmunizationEdit() {
  const { patient, matrix, doses } = usePage<PageProps>().props;

  const vaccines = React.useMemo(() => Object.keys(matrix), [matrix]);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const activeKey = vaccines[activeIndex] ?? vaccines[0];
  const total = vaccines.length;

  /** staged edits like the redesigned card */
  const keyFor = (v: string, l: string) => `${v}||${l}`;
  const getDate = (v: string, l: string) =>
    doses.find((d) => d.vaccine === v && d.dose_label === l)?.date_given ?? '';
  const getRemarks = (v: string, l: string) =>
    doses.find((d) => d.vaccine === v && d.dose_label === l)?.remarks ?? '';

  const [dateBuf, setDateBuf] = React.useState<Record<string, string>>({});
  const [remBuf, setRemBuf] = React.useState<Record<string, string>>({});
  const [dirty, setDirty] = React.useState<Record<string, boolean>>({});
  const [errorsByKey, setErrorsByKey] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const [flash, setFlash] = React.useState<string | null>(null);
  const [openRemarks, setOpenRemarks] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    setDateBuf({});
    setRemBuf({});
    setDirty({});
    setErrorsByKey({});
  }, [doses]);

  const readRow = (v: string, l: string) => {
    const k = keyFor(v, l);
    const curDate = getDate(v, l) || '';
    const curRem = getRemarks(v, l) || '';
    return {
      k,
      bufDate: dateBuf[k] ?? curDate,
      bufRem: remBuf[k] ?? curRem,
      isDirty: !!dirty[k],
      hasErr: !!errorsByKey[k],
    };
  };
  const stageDate = (v: string, l: string, val: string) => {
    const k = keyFor(v, l);
    setDateBuf((s) => ({ ...s, [k]: val }));
    setDirty((d) => ({ ...d, [k]: true }));
  };
  const stageRem = (v: string, l: string, val: string) => {
    const k = keyFor(v, l);
    setRemBuf((s) => ({ ...s, [k]: val }));
    setDirty((d) => ({ ...d, [k]: true }));
  };
  const toggleRemarks = (k: string) => setOpenRemarks((m) => ({ ...m, [k]: !m[k] }));

  const dirtyCountActive = (matrix[activeKey] || []).reduce(
    (a, L) => a + (dirty[keyFor(activeKey, L)] ? 1 : 0),
    0
  );

  async function saveActive() {
    const labels = matrix[activeKey] || [];
    const hasDirty = labels.some((L) => dirty[keyFor(activeKey, L)]);
    if (!hasDirty) return false;

    setSaving(true);
    setErrorsByKey({});

    for (const dose_label of labels) {
      const k = keyFor(activeKey, dose_label);
      if (!dirty[k]) continue;

      const bufDate = dateBuf[k] ?? getDate(activeKey, dose_label) ?? '';
      const bufRem = remBuf[k] ?? getRemarks(activeKey, dose_label) ?? '';

      await new Promise<void>((resolve) => {
        router.post(
          route('center.immunization.upsert', { patient: patient.id }),
          {
            vaccine: activeKey,
            dose_label,
            date_given: clampDateYear((bufDate || '').trim() === '' ? null : bufDate),
            remarks: (bufRem || '').trim() === '' ? null : bufRem,
          },
          {
            preserveScroll: true,
            onError: () =>
              setErrorsByKey((e) => ({ ...e, [k]: 'Failed to save. Check your connection.' })),
            onFinish: () => resolve(),
          }
        );
      });
      await new Promise((r) => setTimeout(r, 20)); // slight yield
    }

    // clear staged state for the active vaccine
    setDirty((d) => {
      const n = { ...d };
      for (const L of labels) delete n[keyFor(activeKey, L)];
      return n;
    });
    setDateBuf((b) => {
      const n = { ...b };
      for (const L of labels) delete n[keyFor(activeKey, L)];
      return n;
    });
    setRemBuf((b) => {
      const n = { ...b };
      for (const L of labels) delete n[keyFor(activeKey, L)];
      return n;
    });

    setSaving(false);
    setFlash('Saved.');
    setTimeout(() => setFlash(null), 900);
    return true;
  }

  async function onSaveAutoNext() {
    const did = await saveActive();
    if (activeIndex < total - 1) {
      setActiveIndex((i) => i + 1);
      window.scrollTo({ top: 0, behavior: 'instant' as any });
    } else if (!did) {
      setFlash('Up to date.');
      setTimeout(() => setFlash(null), 900);
    }
  }
  function onPrev() {
    if (activeIndex > 0) {
      setActiveIndex((i) => i - 1);
      window.scrollTo({ top: 0, behavior: 'instant' as any });
    }
  }

  const phoneValue = patient?.phone ?? patient?.contact_no ?? patient?.mobile ?? '';

  return (
    <div
      className="relative min-h-dvh bg-white text-slate-900"
      style={{
        fontFamily:
          "'Poppins', ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
      }}
    >
      {/* subtle global hardening for very small phones */}
      <style>{`
        @media (max-width: 380px){
          html,body{overflow-x:hidden!important}
          .oh-wrap{padding-left:8px;padding-right:8px}
        }
      `}</style>

      {/* Sticky header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8 h-12 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => (history.length > 1 ? history.back() : (window.location.href = '/center/records'))}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <IconChevronLeft className="h-5 w-5" />
            Back
          </button>

          <div className="text-[15px] sm:text-[16px] font-semibold tracking-tight text-slate-900">
            Immunization — Edit
          </div>

          <span className="opacity-0 select-none">sp</span>
        </div>
      </header>

      {/* MAIN */}
      <main className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8 py-6">
        {/* Patient info (always visible for clarity) */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            <KV label="Child’s Name" value={patient?.full_name} />
            <KV label="Date of Birth" value={dateOnly(patient?.birthdate)} />
            <KV label="Sex" value={patient?.sex} />
            <KV label="Mother’s Name" value={patient?.mother_name} />
            <KV label="Father’s Name" value={patient?.father_name} />
            <KV label="Barangay" value={patient?.barangay} />
            <div className="md:col-span-2">
              <KV label="Address" value={patient?.address} />
            </div>
            <KV label="Phone" value={formatPhonePH(phoneValue)} />
            <KV label="Health Center" value={patient?.health_center} />
            <KV label="Family no." value={patient?.family_no} />
          </div>
        </section>

        {/* Header controls & progress */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="min-w-0">
              <div className="text-[15px] font-semibold text-[#203D7A]">Immunization</div>
              <div className="mt-1 h-1.5 w-full max-w-[360px] bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-1.5 bg-[#0F8A99]"
                  style={{ width: `${(((activeIndex + 1) / Math.max(total, 1)) * 100).toFixed(0)}%` }}
                />
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                {activeIndex + 1} / {total}
              </div>
            </div>

            {/* Always a dropdown (no chips) */}
            <div className="w-full sm:w-auto">
              <label htmlFor="vaxSelect" className="sr-only">
                Select vaccine
              </label>
              <select
                id="vaxSelect"
                className="w-full sm:w-[340px] h-10 rounded-xl border border-slate-300 px-3 text-[14px] bg-white"
                value={activeIndex}
                onChange={(e) => {
                  setActiveIndex(Number(e.target.value));
                  window.scrollTo({ top: 0, behavior: 'instant' as any });
                }}
                title="Choose vaccine"
              >
                {vaccines.map((v, i) => {
                  const short = toAbbrev(v);
                  return (
                    <option key={v} value={i}>
                      {short}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Legend / meanings for acronyms */}
            <details className="ml-auto group w-full sm:w-auto">
              <summary className="inline-flex items-center gap-2 cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
                <IconInfo className="h-4 w-4" />
                Legend
              </summary>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[13px] text-slate-700">
                {vaccines.map((v) => {
                  const ab = toAbbrev(v);
                  const full = legendMeaning(ab);
                  if (!full || ab === v) return null;
                  return (
                    <div key={v} className="flex items-baseline gap-2">
                      <span className="inline-flex items-center rounded-md bg-teal-50 border border-teal-200 text-teal-900 px-2 py-0.5 text-[11px]">
                        {ab}
                      </span>
                      <span>{full}</span>
                    </div>
                  );
                })}
              </div>
            </details>
          </div>
        </section>

        {/* Active vaccine card */}
        <section className="mt-4 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <header className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="font-semibold text-slate-800 text-[15px] sm:text-[16px] truncate">{activeKey}</div>
            <div className="text-[11px] text-slate-500 uppercase tracking-wide">
              {activeIndex + 1} of {total}
            </div>
          </header>

          <div className="p-3 sm:p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {(matrix[activeKey] || []).map((label) => {
                const { k, bufDate, bufRem, isDirty, hasErr } = readRow(activeKey, label);
                const isOpen = !!openRemarks[k];

                return (
                  <article
                    key={label}
                    className={[
                      'rounded-lg border p-3 min-w-0 focus-within:ring-1',
                      isDirty ? 'border-amber-300 bg-amber-50/40 ring-amber-300' : 'border-slate-200 bg-white',
                    ].join(' ')}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-medium text-slate-800 text-[14px] truncate">{label}</h3>
                      <div className="space-x-1 shrink-0">
                        <button
                          type="button"
                          className="inline-flex items-center rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold hover:bg-slate-50"
                          onClick={() => stageDate(activeKey, label, todayStr())}
                        >
                          Today
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          onClick={() => stageDate(activeKey, label, '')}
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {/* Date */}
                    <input
                      type="date"
                      value={bufDate ?? ''}
                      min="1900-01-01"
                      max="2099-12-31"
                      onChange={(e) => stageDate(activeKey, label, e.target.value)}
                      className="mt-2 h-10 w-full rounded-lg border border-slate-300 px-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0F8A99]"
                      aria-label={`Date for ${activeKey} ${label}`}
                    />
                    {hasErr && <div className="mt-1 text-xs text-red-600">Failed to save</div>}

                    {/* Remarks toggle + field */}
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => toggleRemarks(k)}
                        className="text-[12px] font-semibold text-[#0F8A99] hover:underline"
                        aria-expanded={isOpen}
                      >
                        {isOpen ? 'Hide remarks' : (bufRem ? 'Edit remarks' : 'Add remarks')}
                      </button>
                      {isOpen && (
                        <textarea
                          value={bufRem ?? ''}
                          onChange={(e) => stageRem(activeKey, label, e.target.value)}
                          placeholder="Type notes (e.g., missed due to fever)…"
                          className="mt-2 w-full min-h-[56px] rounded-lg border border-slate-300 p-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0F8A99]"
                        />
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          {/* Footer actions — Previous + Save (auto-next) */}
          <footer className="sticky bottom-0 bg-white border-t border-slate-200">
            <div className="w-full px-3 sm:px-4 py-2 flex items-center gap-2">
              <button
                type="button"
                onClick={onPrev}
                disabled={activeIndex === 0 || saving}
                className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-2 text-[13px] font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
              >
                Previous
              </button>
              <div className="grow" />
              <button
                type="button"
                onClick={onSaveAutoNext}
                disabled={saving || (dirtyCountActive === 0 && activeIndex === total - 1)}
                className={[
                  'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-semibold',
                  saving || (dirtyCountActive === 0 && activeIndex === total - 1)
                    ? 'bg-slate-200 text-slate-600 cursor-not-allowed'
                    : 'bg-[#0F8A99] text-white hover:opacity-95',
                ].join(' ')}
                title={activeIndex < total - 1 ? 'Save and go to next' : 'Save'}
              >
                <IconSave className="h-4 w-4" />
                {saving ? 'Saving…' : activeIndex < total - 1 ? 'Save & Next' : 'Save'}
              </button>
            </div>
          </footer>
        </section>

        {flash && (
          <div className="mt-3 text-emerald-700 text-sm" role="status" aria-live="polite">
            {flash}
          </div>
        )}
      </main>
    </div>
  );
}

/* ───────── Small KV row ───────── */
function KV({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 text-[14px]">
      <div className="text-slate-600">{label}</div>
      <div className="font-medium text-slate-900 break-words">{value ?? '—'}</div>
    </div>
  );
}
