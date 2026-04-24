import { Head, Link, usePage, router } from '@inertiajs/react';
import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import AddPatientWizard from '@/components/add-patient-wizard';

// Dropdown profile menu (same as dashboard)
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

// 🖼️ Brand & icons
import Logo from '/public/build/assets/LOGO.svg';
import BackIcon from '/public/build/assets/back-outline-svgrepo-com.svg';
import SyringeIcon from '/public/build/assets/syringe-vaccine-svgrepo-com.svg';
import NewbornIcon from '/public/build/assets/pregnant_icon.svg';

type PatientType = 'immunization' | 'pregnancy';

// ✅ include left_without_notice explicitly (keep string for forward-compat)
type PatientStatus =
  | 'active'
  | 'transferred'
  | 'deceased'
  | 'left_without_notice'
  | string;

type Patient = {
  id: number;
  full_name?: string | null;
  birthdate?: string | null;
  barangay?: string | null;
  family_no?: string | null;
  status?: PatientStatus | null;
  patient_type?: PatientType | null;
  can_edit?: boolean;
  owner?: { id: number; name?: string | null; barangay?: string | null } | null;
};

type Pagination<T> = {
  data: T[];
  links: { url: string | null; label: string; active: boolean }[];
  current_page: number;
  last_page: number;
  total: number;
};

type SortKey =
  | 'created_new'
  | 'created_old'
  | 'name_asc'
  | 'name_desc'
  | 'birth_new'
  | 'birth_old';

type PageFilters = {
  q?: string;
  type?: PatientType | 'all';
  sort?: SortKey;
  scope?: 'mine' | 'all';
};

type PageProps = {
  patients: Pagination<Patient>;
  counts: Record<number, number>;
  filters: PageFilters;
  dashboardUrl?: string;
  auth?: { user?: { id?: number | string; name?: string; email?: string; role?: string | null } };
  csrf?: string;
  transferTargets?: { id: number; name?: string | null; barangay?: string | null }[];
  flash?: { status?: string | null; error?: string | null; message?: string | null; flash_id?: string | number | null };
};

const PER_PAGE = 20;
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'created_new', label: 'Recently added' },
  { value: 'created_old', label: 'Oldest added' },
  { value: 'name_asc', label: 'Name A–Z' },
  { value: 'name_desc', label: 'Name Z–A' },
  { value: 'birth_new', label: 'Birthdate: Newest' },
  { value: 'birth_old', label: 'Birthdate: Oldest' },
];
const SORT_VALUES = SORT_OPTIONS.map((s) => s.value);

/** Format YYYY-MM-DD or ISO strings into a readable date (e.g., "Dec 12, 2000"). */
function fmtDate(v?: string | null): string {
  if (!v) return '—';
  const s = String(v).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime())
    ? s
    : d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      });
}

/**
 * Wrap a name into lines of ~maxLen characters, preferring breaks on spaces.
 * If a single word exceeds maxLen, it will be chunked.
 */
function wrapNameLines(name: string, maxLen = 20): string[] {
  const text = (name ?? '').toString().trim();
  if (!text) return ['—'];

  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';

  const pushCur = () => {
    if (cur.trim()) lines.push(cur.trim());
    cur = '';
  };

  const pushWordOrChunk = (w: string) => {
    if (w.length <= maxLen) {
      cur = w;
      return;
    }
    let i = 0;
    while (i < w.length) {
      const chunk = w.slice(i, i + maxLen);
      if (chunk.length === maxLen) lines.push(chunk);
      else cur = chunk;
      i += maxLen;
    }
  };

  for (const w of words) {
    if (!cur) {
      pushWordOrChunk(w);
      continue;
    }

    if (cur.length + 1 + w.length <= maxLen) {
      cur = `${cur} ${w}`;
    } else {
      pushCur();
      pushWordOrChunk(w);
    }
  }

  pushCur();
  return lines.length ? lines : [text];
}

/**
 * Display patient names formally as: SURNAME, GIVEN NAME M., SUFFIX.
 * Existing records are stored as "FIRST MIDDLE LAST SUFFIX", so this only changes
 * how the name is shown on the records page without changing saved patient data.
 */
function formatSurnameFirstName(name?: string | null, fallback = '—'): string {
  const text = (name ?? '').toString().replace(/\s+/g, ' ').trim();
  if (!text) return fallback;

  const suffixes = new Set(['JR', 'JR.', 'SR', 'SR.', 'II', 'III', 'IV', 'V']);

  // Already formatted names should still be normalized to middle initial when possible.
  if (text.includes(',')) {
    const [surnamePart, ...restParts] = text.split(',');
    const surname = surnamePart.trim();
    const restText = restParts.join(',').trim();
    if (!surname || !restText) return text;

    const rest = restText.split(' ').filter(Boolean);
    let suffix = '';
    const lastRestPart = rest[rest.length - 1]?.toUpperCase().replace(/\.$/, '');
    if (lastRestPart && (suffixes.has(lastRestPart) || suffixes.has(`${lastRestPart}.`))) {
      suffix = rest.pop() ?? '';
    }

    const given = rest.shift() ?? '';
    const middleInitial = rest.length > 0 ? `${rest[0].charAt(0).toUpperCase()}.` : '';

    return [
      surname,
      [given, middleInitial].filter(Boolean).join(' '),
      suffix,
    ]
      .filter(Boolean)
      .join(', ');
  }

  const parts = text.split(' ').filter(Boolean);
  if (parts.length <= 1) return text;

  let suffix = '';
  const lastPart = parts[parts.length - 1].toUpperCase().replace(/\.$/, '');
  if (suffixes.has(lastPart) || suffixes.has(`${lastPart}.`)) {
    suffix = parts.pop() ?? '';
  }

  if (parts.length <= 1) return suffix ? `${parts[0]}, ${suffix}` : parts[0];

  const given = parts.shift() ?? '';
  const surname = parts.pop() ?? '';
  const middleInitial = parts.length > 0 ? `${parts[0].charAt(0).toUpperCase()}.` : '';

  return [
    surname,
    [given, middleInitial].filter(Boolean).join(' '),
    suffix,
  ]
    .filter(Boolean)
    .join(', ');
}

function patientDisplayName(patient: Pick<Patient, 'id' | 'full_name'>): string {
  return formatSurnameFirstName(patient.full_name, `Patient #${patient.id}`);
}

/** Partial refresh for this page (patients + counts only). */
function refreshRecords() {
  const url = window.location.pathname + window.location.search;
  router.get(
    url,
    {},
    {
      only: ['patients', 'counts'],
      preserveScroll: true,
      preserveState: true,
      replace: true,
    }
  );
}

export default function RecordsIndex() {
  const { props } = usePage<PageProps>();
  const { patients, filters, dashboardUrl, auth, csrf: sharedCsrf, transferTargets = [], flash } = props;

  const name = auth?.user?.name ?? 'Health Worker';
  const email = auth?.user?.email ?? '';
  const userId = auth?.user?.id != null ? String(auth.user.id) : null;

  const status = flash?.status ?? flash?.message ?? null;
  const error = flash?.error ?? null;

  const [toastSuccess, setToastSuccess] = React.useState(true);
  const [toastMsg, setToastMsg] = React.useState<string | null>(null);

  // Prevent duplicate / stale flash toasts
  const lastFlashSigRef = React.useRef<string | null>(null);
  const suppressFlashUntilRef = React.useRef<number>(0);
  const toastTimersRef = React.useRef<number[]>([]);

  const showToast = React.useCallback((msg: string, kind: 'success' | 'error') => {
    toastTimersRef.current.forEach((t) => window.clearTimeout(t));
    toastTimersRef.current = [];

    setToastMsg(msg);
    setToastSuccess(kind === 'success');

    toastTimersRef.current.push(window.setTimeout(() => setToastMsg(null), 2600));
  }, []);

  React.useEffect(() => {
    const now = Date.now();
    if (now < suppressFlashUntilRef.current) return;

    const msg = status && String(status).trim() ? String(status) : null;
    const err = !msg && error && String(error).trim() ? String(error) : null;
    if (!msg && !err) return;

    const fid = (flash as any)?.flash_id ? String((flash as any).flash_id) : '';
    const sig = msg ? `s:${msg}|${fid}` : `e:${err}|${fid}`;
    if (lastFlashSigRef.current === sig) return;
    lastFlashSigRef.current = sig;

    showToast(msg ?? err!, msg ? 'success' : 'error');
  }, [status, error, flash, showToast]);

  const role = auth?.user?.role ?? null;

  const csrf =
    sharedCsrf ?? ((document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '');

  const [openAdd, setOpenAdd] = React.useState(false);
  const [q, setQ] = React.useState(filters?.q ?? '');
  const lastQRef = React.useRef<string | null>(filters?.q ?? '');
  const [typeFilter, setTypeFilter] = React.useState<PageFilters['type']>(filters?.type ?? 'all');

  const isAdmin = role === 'admin';
  const [scope, setScope] = React.useState<'mine' | 'all'>((filters?.scope as any) === 'all' ? 'all' : 'mine');

  const initialSort: SortKey =
    (filters?.sort && SORT_VALUES.includes(filters.sort) ? filters.sort : 'created_new') as SortKey;
  const [sort, setSort] = React.useState<SortKey>(initialSort);

  // ✅ Status dialog state (now supports left_without_notice)
  const [statusDialog, setStatusDialog] = React.useState<{
    open: boolean;
    patient: Patient | null;
    targetStatus: 'active' | 'deceased' | 'left_without_notice' | null;
  }>({
    open: false,
    patient: null,
    targetStatus: null,
  });

  // 🔁 Ownership transfer dialog state
  const [ownershipDialog, setOwnershipDialog] = React.useState<{
    open: boolean;
    patient: Patient | null;
    newOwnerId: string;
  }>({
    open: false,
    patient: null,
    newOwnerId: '',
  });

  // ✅ Confirmation dialog for transfers (custom modal, not browser alert)
  const [confirmTransfer, setConfirmTransfer] = React.useState<{
    open: boolean;
    patient: Patient | null;
    newOwnerId: string;
    targetLabel: string;
    targetBarangay?: string | null;
  }>({
    open: false,
    patient: null,
    newOwnerId: '',
    targetLabel: '',
    targetBarangay: null,
  });

  const confirmOpen = confirmTransfer.open;
  const anyModalOpen = statusDialog.open || ownershipDialog.open || confirmOpen;

  // ✅ Legends collapse on small devices
  const [legendOpenMobile, setLegendOpenMobile] = React.useState(false);

  const formatRole = React.useCallback((r: string | null | undefined) => {
    if (!r) return 'User';
    return r.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }, []);

  // 🔍 Auto-search as the user types (debounced)
  React.useEffect(() => {
    if (q === (lastQRef.current ?? '')) return;

    const handle = window.setTimeout(() => {
      applyFilters({ q });
      lastQRef.current = q;
    }, 400);

    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // 🔄 Refresh when returning via bfcache (pageshow.persisted)
  React.useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if ((e as any)?.persisted) refreshRecords();
    };
    window.addEventListener('pageshow', onPageShow as any);
    return () => window.removeEventListener('pageshow', onPageShow as any);
  }, []);

  // 🧭 Refresh on actual back/forward navigations (non-bfcache)
  React.useEffect(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (nav && nav.type === 'back_forward') {
      refreshRecords();
    }
  }, []);

  // 🚿 When the wizard closes, do a one-time refresh
  React.useEffect(() => {
    if (!openAdd) {
      const t = setTimeout(refreshRecords, 350);
      return () => clearTimeout(t);
    }
  }, [openAdd]);

  function applyFilters(next?: { q?: string; type?: PageFilters['type']; sort?: SortKey; scope?: 'mine' | 'all' }) {
    const query = next?.q ?? q;
    const type = next?.type ?? typeFilter;
    const srt = next?.sort ?? sort;
    const scp = next?.scope ?? scope;

    router.get(
      '/center/records',
      {
        page: 1,
        q: query || undefined,
        type: type === 'all' ? undefined : type,
        sort: srt,
        per_page: PER_PAGE,
        scope: isAdmin ? undefined : scp,
      },
      { preserveState: true, replace: true, preserveScroll: true }
    );
  }

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    applyFilters({ q, type: typeFilter, sort });
  }

  function onTypeChange(t: PageFilters['type']) {
    setTypeFilter(t);
    applyFilters({ type: t });
  }

  function onSortChange(s: SortKey) {
    setSort(s);
    applyFilters({ sort: s });
  }

  // ——— Card actions from list (status + ownership transfer) ———

  function submitStatusUpdate(p: Patient, status: 'active' | 'deceased' | 'left_without_notice') {
    router.post(
      `/center/records/${p.id}/status`,
      { status },
      {
        preserveScroll: true,
        onFinish: () => {
          refreshRecords();
          setStatusDialog({ open: false, patient: null, targetStatus: null });
        },
      }
    );
  }

  function openStatusDialogFromList(p: Patient, status: 'active' | 'deceased' | 'left_without_notice') {
    setStatusDialog({
      open: true,
      patient: p,
      targetStatus: status,
    });
  }

  function openOwnershipFromList(p: Patient) {
    setOwnershipDialog({
      open: true,
      patient: p,
      newOwnerId: '',
    });
  }

  function submitOwnershipTransfer(p: Patient, newOwnerId: string) {
    router.post(
      `/center/patients/${p.id}/ownership-transfer`,
      { new_owner_id: Number(newOwnerId) },
      {
        preserveScroll: true,
        onFinish: () => {
          refreshRecords();
          setOwnershipDialog({ open: false, patient: null, newOwnerId: '' });
        },
      }
    );
  }

  // Strip HTML from labels for aria, keep HTML for visual
  const labelText = (htmlLabel: string) =>
    htmlLabel
      .replace(/<[^>]+>/g, '')
      .replace(/&laquo;|&raquo;/g, (m) => (m === '&laquo;' ? '«' : '»'));

  const targetVerb =
    statusDialog.targetStatus === 'deceased'
      ? 'Mark as deceased'
      : statusDialog.targetStatus === 'left_without_notice'
      ? 'Mark as without notice'
      : 'Mark as active';

  const targetDescription =
    statusDialog.targetStatus === 'deceased'
      ? "This will mark the patient as deceased and disable their online access."
      : statusDialog.targetStatus === 'left_without_notice'
      ? 'This will mark the patient as left without notice. Online access is still allowed.'
      : 'This will mark the patient as active again.';

  const ownershipPatient = ownershipDialog.patient;
  const ownershipDisabled = !ownershipDialog.newOwnerId;

  return (
    <div
      className="relative min-h-dvh bg-white text-slate-900"
      style={{
        fontFamily:
          "'Poppins', ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'",
      }}
    >
      <Head title="Patient Records">
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>

      {/* Hidden real POST logout form */}
      <form id="logout-form" method="post" action="/logout" className="hidden">
        <input type="hidden" name="_token" value={csrf} />
      </form>

      <AddPatientWizard open={openAdd} onOpenChange={setOpenAdd} />

      {/* Ambient accents */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-teal-200/15 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-cyan-200/15 blur-3xl" />
        <div className="absolute -top-10 right-10 h-20 w-20 rounded-2xl bg-teal-50/50 rotate-6" />
        <div className="absolute bottom-6 left-10 h-24 w-24 rounded-2xl bg-cyan-50/50 -rotate-6" />
      </div>

      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6 lg:px-8">
          <Link href={dashboardUrl || '/center'} preserveScroll className="group flex items-center gap-3">
            <img src={Logo} alt="OneHealth logo" className="h-10 w-10 rounded-xl select-none" draggable={false} />
            <div className="leading-tight">
              <div className="text-base md:text-lg font-semibold tracking-wide text-[#203D7A]">ONE HEALTH</div>
              <div className="text-[11px] uppercase tracking-wider text-slate-500">Patient Records</div>
            </div>
          </Link>

          {/* Profile */}
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="inline-flex items-center gap-3 rounded-xl border border-slate-300 bg-white px-3 h-10 md:h-11 shadow-sm hover:shadow-md active:translate-y-[1px] transition focus:outline-none focus:ring-2 focus:ring-teal-600"
                  aria-label="Open profile menu"
                >
                  <div className="grid size-8 md:size-8 place-items-center rounded-[50%] bg-[#0F8A99] text-white text-xs md:text-sm shadow-sm">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-slate-800 max-w-[160px] truncate">
                    {name}
                  </span>
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-64 bg-white shadow-sm">
                <DropdownMenuLabel className="truncate">
                  <div className="font-semibold">{name}</div>
                  <div className="mt-0.5 text-xs font-normal text-slate-500 truncate">{email}</div>
                  <div className="mt-1 text-[11px] font-medium text-slate-600 uppercase tracking-wide">
                    {formatRole(role)}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    (document.getElementById('logout-form') as HTMLFormElement)?.submit();
                  }}
                >
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* SUB-HEADER */}
      <div className="relative z-10">
        <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href={dashboardUrl || '/center'}
              preserveScroll
              aria-label="Back to dashboard"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 h-10 text-[13px] font-semibold text-slate-800 shadow-sm hover:-translate-y-0.5 hover:border-teal-400/60 hover:shadow-[0_10px_24px_rgba(15,138,153,0.12)] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
            >
              <img src={BackIcon} alt="" className="h-4 w-4 -ml-0.5" aria-hidden="true" draggable={false} />
              Back
            </Link>

            <h1 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-[#203D7A]">Patient Records</h1>

            <button
              type="button"
              onClick={() => setOpenAdd(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-teal-300 bg-[#0F8A99] px-4 h-10 text-white text-[14px] font-medium shadow-sm transition hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F8A99]"
              aria-label="Add patient"
            >
              <PlusGlyph className="h-4 w-4 text-white" />
              Add patient
            </button>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <main className="relative z-10">
        <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8 pt-5 pb-10">
          {/* Search + Type + Sort */}
          <form onSubmit={onSearch} className="flex flex-wrap items-center gap-2 sm:gap-3">
            <label className="sr-only" htmlFor="records-search">
              Search patients, family no., or barangay
            </label>
            <div className="relative grow max-w-[900px]">
              <Input
                id="records-search"
                placeholder="Search by name, family no., or barangay"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full h-12 rounded-xl border border-slate-300 bg-white pl-11 pr-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#0F8A99]"
              />
              <SearchGlyph className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            </div>

            <Button
              type="submit"
              className="rounded-xl px-3 sm:px-5 h-12 bg-[#0F8A99] text-white border border-teal-300 shadow-sm hover:opacity-95 focus-visible:ring-2 focus-visible:ring-[#0F8A99] inline-flex items-center gap-2"
              aria-label="Search"
              title="Search"
            >
              <SearchGlyph className="h-5 w-5" />
              <span className="hidden sm:inline">Search</span>
            </Button>

            {/* Type dropdown */}
            <div className="relative">
              <label htmlFor="typeFilter" className="sr-only">
                Filter by type
              </label>
              <select
                id="typeFilter"
                value={typeFilter ?? 'all'}
                onChange={(e) => onTypeChange(e.target.value as PageFilters['type'])}
                className="h-12 rounded-xl border border-slate-300 bg-white px-3 pr-8 text-[15px] text-slate-800 outline-none focus:ring-2 focus:ring-[#0F8A99] appearance-none"
                title="Filter by type"
              >
                <option value="all">All patients</option>
                <option value="immunization">Immunization</option>
                <option value="pregnancy">Pregnancy</option>
              </select>
              <svg
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M7 10l5 5 5-5z" />
              </svg>
            </div>

            {/* Sort dropdown */}
            <div className="relative">
              <label htmlFor="sortSelect" className="sr-only">
                Sort records
              </label>
              <select
                id="sortSelect"
                value={sort}
                onChange={(e) => onSortChange(e.target.value as SortKey)}
                className="h-12 rounded-xl border border-slate-300 bg-white px-3 pr-8 text-[15px] text-slate-800 outline-none focus:ring-2 focus:ring-[#0F8A99] appearance-none"
                title="Sort records"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <svg
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M7 10l5 5 5-5z" />
              </svg>
            </div>
          </form>

          {/* Legends (below search bar) */}
          <div className="mt-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                Legends
              </div>

              {/* mobile toggle */}
              <button
                type="button"
                className="sm:hidden inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => setLegendOpenMobile((v) => !v)}
                aria-expanded={legendOpenMobile ? 'true' : 'false'}
              >
                {legendOpenMobile ? 'Hide' : 'Show'}
                <svg
                  viewBox="0 0 24 24"
                  className={`h-4 w-4 transition ${legendOpenMobile ? 'rotate-180' : ''}`}
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M7 10l5 5 5-5z" />
                </svg>
              </button>
            </div>

            <div
              className={[
                'mt-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm',
                legendOpenMobile ? 'block' : 'hidden',
                'sm:block',
              ].join(' ')}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {/* Type legend */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">Type:</span>
                  <LegendPill title="Immunization" tone="teal">
                    <img src={SyringeIcon} alt="" className="h-4 w-4" aria-hidden draggable={false} />
                  </LegendPill>
                  <LegendPill title="Pregnancy" tone="rose">
                    <img src={NewbornIcon} alt="" className="h-4 w-4" aria-hidden draggable={false} />
                  </LegendPill>
                </div>

                {/* Status legend */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">Status:</span>
                  <LegendDot label="Active" kind="active" />
                  <LegendDot label="Deceased" kind="deceased" />
                  <LegendDot label="Transferred" kind="transferred" />
                  <LegendDot label="Without notice" kind="left_without_notice" />
                </div>
              </div>
            </div>
          </div>

          {/* Scope toggle (Health worker): My patients vs View all */}
          {!isAdmin && (
            <div className="mt-4 inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => {
                  setScope('mine');
                  applyFilters({ scope: 'mine' });
                }}
                className={
                  'px-4 py-2 text-sm rounded-lg transition ' +
                  (scope === 'mine' ? 'bg-[#0F8A99] text-white' : 'text-slate-700 hover:bg-slate-50')
                }
              >
                My patients
              </button>
              <button
                type="button"
                onClick={() => {
                  setScope('all');
                  applyFilters({ scope: 'all' });
                }}
                className={
                  'px-4 py-2 text-sm rounded-lg transition ' +
                  (scope === 'all' ? 'bg-[#0F8A99] text-white' : 'text-slate-700 hover:bg-slate-50')
                }
              >
                View all
              </button>
            </div>
          )}

          {/* Patients grid */}
          {patients.data.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-[15px] text-slate-700 shadow-sm">
              <div className="font-semibold mb-1">No patients found</div>
              <p className="text-sm text-slate-500">
                Try changing your search, clearing filters, or adding a new patient record.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 auto-rows-[150px] items-stretch">
              {patients.data.map((p) => {
                const birth = fmtDate(p.birthdate);
                const isImm = p.patient_type === 'immunization';
                const isPreg = p.patient_type === 'pregnancy';
                const canEdit = isAdmin || p.can_edit !== false;

                const normalizedStatus = (p.status ? String(p.status).toLowerCase() : 'active') as PatientStatus;
                const safeDisplayName = patientDisplayName(p);
                const nameLines = wrapNameLines(safeDisplayName, 20);

                return (
                  <Link
                    key={p.id}
                    href={`/center/records/${p.id}?tab=card`}
                    preserveScroll
                    aria-label={`Open ${safeDisplayName}`}
                    className={anyModalOpen ? 'pointer-events-none block h-full' : 'group block h-full'}
                  >
                    <div
                      className={[
                        'relative h-full rounded-2xl border border-slate-200 bg-white p-5',
                        'shadow-[0_10px_26px_rgba(16,24,40,0.08)]',
                        'transition',
                        'group-hover:-translate-y-0.5',
                        'group-hover:shadow-[0_16px_42px_rgba(16,24,40,0.12)]',
                        'flex flex-col',
                      ].join(' ')}
                    >
                      {/* Top-right vertical stack: (1) kebab, (2) type icon capsule, (3) status dot */}
                      <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
                        {!anyModalOpen && canEdit && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-500 hover:bg-slate-50 hover:text-slate-700 shadow-sm"
                                aria-label="More actions"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                              >
                                <KebabGlyph className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-56 bg-white shadow-md border border-slate-200"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {normalizedStatus === 'deceased' ? (
                                <DropdownMenuItem
                                  className="flex items-center gap-2 text-sm"
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    openStatusDialogFromList(p, 'active');
                                  }}
                                >
                                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 text-xs">
                                    ✓
                                  </span>
                                  <div className="flex flex-col">
                                    <span className="font-medium text-slate-800">Mark as active</span>
                                    <span className="text-[11px] text-slate-500">Reactivate this patient</span>
                                  </div>
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  className="flex items-center gap-2 text-sm"
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    openStatusDialogFromList(p, 'deceased');
                                  }}
                                >
                                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-rose-50 text-rose-700 text-xs">
                                    !
                                  </span>
                                  <div className="flex flex-col">
                                    <span className="font-medium text-slate-800">Mark as deceased</span>
                                    <span className="text-[11px] text-slate-500">Disable patient&apos;s online access</span>
                                  </div>
                                </DropdownMenuItem>
                              )}

                              {normalizedStatus !== 'left_without_notice' ? (
                                <DropdownMenuItem
                                  className="flex items-center gap-2 text-sm"
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    openStatusDialogFromList(p, 'left_without_notice');
                                  }}
                                >
                                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-700 text-xs">
                                    ⎋
                                  </span>
                                  <div className="flex flex-col">
                                    <span className="font-medium text-slate-800">Mark as without notice</span>
                                    <span className="text-[11px] text-slate-500">Patient left without notice (access allowed)</span>
                                  </div>
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  className="flex items-center gap-2 text-sm"
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    openStatusDialogFromList(p, 'active');
                                  }}
                                >
                                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 text-xs">
                                    ✓
                                  </span>
                                  <div className="flex flex-col">
                                    <span className="font-medium text-slate-800">Mark as active</span>
                                    <span className="text-[11px] text-slate-500">Return to active status</span>
                                  </div>
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                className="flex items-center gap-2 text-sm"
                                onSelect={(e) => {
                                  e.preventDefault();
                                  openOwnershipFromList(p);
                                }}
                              >
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-50 text-sky-700 text-xs">
                                  ↔
                                </span>
                                <div className="flex flex-col">
                                  <span className="font-medium text-slate-800">Assign health worker</span>
                                  <span className="text-[11px] text-slate-500">Assign to another health worker</span>
                                </div>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}

                        {/* Type capsule: icon only */}
                        {(isImm || isPreg) && (
                          <div
                            className={
                              'inline-flex h-9 w-9 items-center justify-center rounded-full border ' +
                              (isImm
                                ? 'bg-teal-50 border-teal-200 text-teal-900'
                                : 'bg-rose-50 border-rose-200 text-rose-900')
                            }
                            title={isImm ? 'Immunization' : 'Pregnancy'}
                            aria-label={isImm ? 'Immunization' : 'Pregnancy'}
                          >
                            <img
                              src={isImm ? SyringeIcon : NewbornIcon}
                              alt=""
                              className="h-4 w-4 opacity-90"
                              aria-hidden
                              draggable={false}
                            />
                          </div>
                        )}

                        {/* Status dot: color only, same size as type capsule */}
                        <StatusDot status={normalizedStatus || 'active'} />
                      </div>

                      {/* Body content */}
                      <div className="flex-1 min-w-0 pr-16">
                        <div className="text-[16px] font-semibold text-slate-900 leading-tight">
                          {nameLines.map((ln, idx) => (
                            <span key={idx} className="block">
                              {ln}
                            </span>
                          ))}
                        </div>

                        <div className="mt-2 text-[14px] text-slate-700 leading-snug">
                          {p.birthdate ? `Born ${birth}` : 'Birthdate —'}
                          {p.barangay ? ` • ${p.barangay}` : ''}
                          {p.family_no ? ` • Family no. ${p.family_no}` : ''}
                        </div>

                        {scope === 'all' && p.owner?.name && (
                          <div className="mt-2 text-[12px] text-slate-500">
                            Owner: <span className="font-medium text-slate-700">{p.owner.name}</span>
                            {p.owner.barangay ? ` (${p.owner.barangay})` : ''}
                          </div>
                        )}
                      </div>

                      <div className="mt-2" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          <nav className="mt-8 flex flex-wrap items-center gap-2 sm:gap-3" aria-label="Pagination">
            {patients.links.map((l, i) => {
              const isDisabled = l.url === null;
              const isActive = l.active;
              const base =
                'inline-flex items-center justify-center rounded-xl h-11 px-4 text-sm transition focus:outline-none focus:ring-2 focus:ring-[#0F8A99]';
              const visual = isDisabled
                ? 'border border-slate-200 bg-white text-slate-400 cursor-not-allowed'
                : isActive
                ? 'border border-teal-300 bg-white text-[#0F8A99]'
                : 'border border-slate-300 bg-white text-slate-800 shadow-sm hover:shadow-md active:translate-y-[1px]';

              const content = <span dangerouslySetInnerHTML={{ __html: l.label }} />;

              if (isDisabled) {
                return (
                  <span
                    key={i}
                    className={`${base} ${visual}`}
                    aria-disabled="true"
                    aria-label={labelText(l.label)}
                  >
                    {content}
                  </span>
                );
              }

              const getTargetPage = (url: string) => {
                try {
                  const u = new URL(url, window.location.origin);
                  return u.searchParams.get('page') ?? '1';
                } catch {
                  return '1';
                }
              };

              const onClick = (e: React.MouseEvent) => {
                e.preventDefault();
                const page = getTargetPage(l.url!);
                router.get(
                  '/center/records',
                  {
                    page,
                    q: q || undefined,
                    type: (typeFilter ?? 'all') === 'all' ? undefined : typeFilter,
                    sort,
                    per_page: PER_PAGE,
                    scope: isAdmin ? undefined : scope,
                  },
                  { preserveScroll: true, preserveState: true, replace: true }
                );
              };

              return (
                <a
                  key={i}
                  href={l.url ?? '#'}
                  onClick={onClick}
                  className={`${base} ${visual}`}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={labelText(l.label)}
                >
                  {content}
                </a>
              );
            })}
          </nav>

          {/* Footer micro-brand */}
          <div className="mx-auto mt-10 flex max-w-2xl items-center justify-between border-t border-slate-200 pt-6">
            <div className="flex items-center gap-2">
              <img src={Logo} alt="OneHealth logo" className="h-8 w-8 rounded-lg" />
              <span className="text-sm font-semibold tracking-wide text-[#203D7A]">ONE HEALTH</span>
            </div>
            <span className="text-xs text-slate-500">© {new Date().getFullYear()} OneHealth. All rights reserved.</span>
          </div>
        </div>
      </main>

      {/* Centered status confirmation modal */}
      {statusDialog.open && statusDialog.patient && statusDialog.targetStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200" role="dialog" aria-modal="true">
            <div className="px-6 pt-5 pb-4">
              <div className="flex items-start gap-3">
                <div
                  className={
                    'mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full ' +
                    (statusDialog.targetStatus === 'deceased'
                      ? 'bg-rose-50 text-rose-600'
                      : statusDialog.targetStatus === 'left_without_notice'
                      ? 'bg-slate-100 text-slate-700'
                      : 'bg-emerald-50 text-emerald-600')
                  }
                >
                  {statusDialog.targetStatus === 'deceased' ? (
                    <span className="text-lg">!</span>
                  ) : statusDialog.targetStatus === 'left_without_notice' ? (
                    <span className="text-lg">⎋</span>
                  ) : (
                    <span className="text-lg">✓</span>
                  )}
                </div>
                <div className="space-y-1">
                  <h2 className="text-[15px] font-semibold text-slate-900">{targetVerb}</h2>
                  <p className="text-sm text-slate-600">{targetDescription}</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Patient:&nbsp;
                    <span className="font-medium text-slate-800">
                      {patientDisplayName(statusDialog.patient)}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-3">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-600"
                onClick={() => setStatusDialog({ open: false, patient: null, targetStatus: null })}
              >
                Cancel
              </button>
              <button
                type="button"
                className={
                  'inline-flex items-center justify-center rounded-lg px-3.5 py-1.5 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-offset-0 ' +
                  (statusDialog.targetStatus === 'deceased'
                    ? 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-600'
                    : statusDialog.targetStatus === 'left_without_notice'
                    ? 'bg-slate-700 hover:bg-slate-800 focus:ring-slate-700'
                    : 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-600')
                }
                onClick={() => submitStatusUpdate(statusDialog.patient as Patient, statusDialog.targetStatus as any)}
              >
                {targetVerb}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ownership transfer modal */}
      {ownershipDialog.open && ownershipPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200" role="dialog" aria-modal="true">
            <div className="px-6 pt-5 pb-4">
              <div className="flex items-start gap-3">
                <div className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full bg-sky-50 text-sky-700">
                  ↔
                </div>
                <div className="space-y-1 w-full">
                  <h2 className="text-[15px] font-semibold text-slate-900">Assign health worker</h2>
                  <p className="text-sm text-slate-600">
                    Assign this patient to another health worker. The new owner will be able to edit this record.
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Patient:&nbsp;
                    <span className="font-medium text-slate-800">
                      {patientDisplayName(ownershipPatient)}
                    </span>
                  </p>

                  <div className="mt-3 space-y-1.5">
                    <label htmlFor="ownership-user" className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                      New owner
                    </label>
                    <select
                      id="ownership-user"
                      value={ownershipDialog.newOwnerId}
                      onChange={(e) =>
                        setOwnershipDialog((prev) => ({
                          ...prev,
                          newOwnerId: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="">Select health worker…</option>
                      {transferTargets
                        .filter((u) => {
                          const ownerId = ownershipPatient.owner?.id != null ? String(ownershipPatient.owner.id) : null;
                          const uid = userId;
                          const id = String(u.id);
                          if (ownerId && id === ownerId) return false;
                          if (uid && id === uid) return false;
                          return true;
                        })
                        .map((u) => (
                          <option key={u.id} value={String(u.id)}>
                            {u.name ?? `User #${u.id}`}
                            {u.barangay ? ` — ${u.barangay}` : ''}
                          </option>
                        ))}
                    </select>
                    {transferTargets.length === 0 && <p className="text-xs text-slate-500 mt-1">No eligible users found.</p>}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-3">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-600"
                onClick={() => setOwnershipDialog({ open: false, patient: null, newOwnerId: '' })}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={ownershipDisabled}
                className={
                  'inline-flex items-center justify-center rounded-lg px-3.5 py-1.5 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:opacity-60 disabled:cursor-not-allowed ' +
                  'bg-sky-600 hover:bg-sky-700 focus:ring-sky-600'
                }
                onClick={() => {
                  if (!ownershipPatient || ownershipDisabled) return;

                  const target = transferTargets.find((u) => String(u.id) === String(ownershipDialog.newOwnerId));
                  const targetLabel = target?.name ?? `User #${ownershipDialog.newOwnerId}`;

                  setConfirmTransfer({
                    open: true,
                    patient: ownershipPatient,
                    newOwnerId: ownershipDialog.newOwnerId,
                    targetLabel,
                    targetBarangay: target?.barangay ?? null,
                  });
                }}
              >
                Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm transfer modal */}
      {confirmTransfer.open && confirmTransfer.patient && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div
            className="mx-4 w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200"
            role="dialog"
            aria-modal="true"
            aria-label="Confirm transfer"
          >
            <div className="px-6 pt-5 pb-4">
              <div className="flex items-start gap-3">
                <div className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-50 text-amber-700">
                  !
                </div>

                <div className="w-full">
                  <h2 className="text-[15px] font-semibold text-slate-900">Confirm transfer</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Are you sure you want to transfer this patient to the selected health worker?
                  </p>

                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="grid gap-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Patient</div>
                          <div className="text-sm font-medium text-slate-900">
                            {patientDisplayName(confirmTransfer.patient)}
                          </div>
                        </div>
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-[3px] text-[11px] font-semibold text-slate-700">
                          Transfer
                        </span>
                      </div>

                      <div className="h-px bg-slate-200/70" />

                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">New owner</div>
                        <div className="text-sm font-medium text-slate-900">
                          {confirmTransfer.targetLabel}
                          {confirmTransfer.targetBarangay ? (
                            <span className="text-slate-600 font-normal"> — {confirmTransfer.targetBarangay}</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                    <p className="text-xs text-amber-900">
                      After transferring, the new owner will be able to edit the record. You may lose edit access depending on your role.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-3">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-600"
                onClick={() =>
                  setConfirmTransfer({
                    open: false,
                    patient: null,
                    newOwnerId: '',
                    targetLabel: '',
                    targetBarangay: null,
                  })
                }
              >
                Back
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-600"
                onClick={() => {
                  const p = confirmTransfer.patient;
                  const newOwnerId = confirmTransfer.newOwnerId;
                  if (!p || !newOwnerId) return;

                  setConfirmTransfer({
                    open: false,
                    patient: null,
                    newOwnerId: '',
                    targetLabel: '',
                    targetBarangay: null,
                  });

                  submitOwnershipTransfer(p, newOwnerId);
                }}
              >
                Yes, transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts (centered) */}
      {toastMsg && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center px-4 pointer-events-none">
          <div
            className={
              'pointer-events-auto max-w-md w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-xl text-sm ' +
              (toastSuccess ? 'text-[#0F8A99]' : 'text-rose-600')
            }
          >
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide ">
              {toastSuccess ? 'Success' : 'Error'}
            </div>
            <div className="text-sm leading-snug">{toastMsg}</div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Legends helpers ───────────────────────── */

function LegendPill({
  children,
  title,
  tone,
}: {
  children: React.ReactNode;
  title: string;
  tone: 'teal' | 'rose';
}) {
  const cls =
    tone === 'teal'
      ? 'bg-teal-50 border-teal-200 text-teal-900'
      : 'bg-rose-50 border-rose-200 text-rose-900';

  return (
    <div className="inline-flex items-center gap-2">
      <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full border ${cls}`} title={title}>
        {children}
      </span>
      <span className="text-xs text-slate-700">{title}</span>
    </div>
  );
}

function LegendDot({ label, kind }: { label: string; kind: PatientStatus }) {
  return (
    <div className="inline-flex items-center gap-2">
      <StatusDot status={kind} />
      <span className="text-xs text-slate-700">{label}</span>
    </div>
  );
}

/* ───────────────────────── Status dot (color only) ───────────────────────── */

function StatusDot({ status }: { status?: PatientStatus | null }) {
  const normalized = (status ? String(status).toLowerCase() : 'active') as PatientStatus;

  let title = 'Active';
  let cls = 'border-emerald-200 bg-emerald-50 text-emerald-700';

  if (normalized === 'deceased') {
    title = 'Deceased';
    cls = 'border-rose-200 bg-rose-50 text-rose-700';
  } else if (normalized === 'transferred') {
    title = 'Transferred';
    cls = 'border-amber-200 bg-amber-50 text-amber-700';
  } else if (normalized === 'left_without_notice') {
    title = 'Left without notice';
    cls = 'border-slate-200 bg-slate-100 text-slate-700';
  }

  return (
    <div
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border ${cls}`}
      title={title}
      aria-label={title}
    >
      <span className="sr-only">{title}</span>
      <span className="h-3.5 w-3.5 rounded-full bg-current opacity-80" aria-hidden />
    </div>
  );
}

/* ───────────────────────── Icons ───────────────────────── */

function SearchGlyph(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" {...props}>
      <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5a6.5 6.5 0 1 0-6.5 6.5 6.47 6.47 0 0 0 4.21-1.57l.27.28h.79L20 21.5 21.5 20zM9.5 14A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z" />
    </svg>
  );
}

function PlusGlyph(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" {...props}>
      <path d="M11 11V5a1 1 0 1 1 2 0v6h6a1 1 0 0 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 0 1 0-2h6z" />
    </svg>
  );
}

function KebabGlyph(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" {...props}>
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </svg>
  );
}