import { Head, Link, usePage, router } from '@inertiajs/react';
import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import AddPatientWizard from '@/components/add-patient-wizard';

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

import Logo from '/public/build/assets/LOGO.svg';
import BackIcon from '/public/build/assets/back-outline-svgrepo-com.svg';
import SyringeIcon from '/public/build/assets/syringe-vaccine-svgrepo-com.svg';
import NewbornIcon from '/public/build/assets/pregnant_icon.svg';

type PatientType = 'immunization' | 'pregnancy';

type PatientStatus =
  | 'active'
  | 'transferred'
  | 'deceased'
  | 'left_without_notice'
  | string;

type Patient = {
  id: number;
  full_name?: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  suffix?: string | null;
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
  { value: 'name_asc', label: 'Name A-Z' },
  { value: 'name_desc', label: 'Name Z-A' },
  { value: 'birth_new', label: 'Birthdate: Newest' },
  { value: 'birth_old', label: 'Birthdate: Oldest' },
];

const SORT_VALUES = SORT_OPTIONS.map((s) => s.value);

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

function formatFormalPatientName(
  parts: {
    id?: number | string;
    full_name?: string | null;
    first_name?: string | null;
    middle_name?: string | null;
    last_name?: string | null;
    suffix?: string | null;
  },
  fallback = '—'
): string {
  const clean = (v?: string | null) => String(v ?? '').replace(/\s+/g, ' ').trim();
  const suffixes = new Set(['JR', 'JR.', 'SR', 'SR.', 'II', 'III', 'IV', 'V']);

  const first = clean(parts.first_name);
  const middle = clean(parts.middle_name);
  const last = clean(parts.last_name);
  const suffix = clean(parts.suffix);

  if (first || middle || last || suffix) {
    const middleInitial = middle ? `${middle.charAt(0).toUpperCase()}.` : '';
    const givenBlock = [first, middleInitial].filter(Boolean).join(' ');
    return [last || fallback, givenBlock, suffix].filter(Boolean).join(', ');
  }

  const text = clean(parts.full_name);
  if (!text) return parts.id != null ? `Patient #${parts.id}` : fallback;

  if (text.includes(',')) {
    const [surnamePart, ...restParts] = text.split(',');
    const surname = surnamePart.trim();
    const restText = restParts.join(',').trim();
    if (!surname || !restText) return text;

    const rest = restText.split(' ').filter(Boolean);
    let detectedSuffix = '';
    const lastRestPart = rest[rest.length - 1]?.toUpperCase().replace(/\.$/, '');
    if (lastRestPart && (suffixes.has(lastRestPart) || suffixes.has(`${lastRestPart}.`))) {
      detectedSuffix = rest.pop() ?? '';
    }

    const given = rest.shift() ?? '';
    const middleInitial = rest.length > 0 ? `${rest[0].charAt(0).toUpperCase()}.` : '';
    return [surname, [given, middleInitial].filter(Boolean).join(' '), detectedSuffix]
      .filter(Boolean)
      .join(', ');
  }

  const nameParts = text.split(' ').filter(Boolean);
  if (nameParts.length <= 1) return text;

  let detectedSuffix = '';
  const lastPart = nameParts[nameParts.length - 1].toUpperCase().replace(/\.$/, '');
  if (suffixes.has(lastPart) || suffixes.has(`${lastPart}.`)) {
    detectedSuffix = nameParts.pop() ?? '';
  }

  if (nameParts.length <= 1) return detectedSuffix ? `${nameParts[0]}, ${detectedSuffix}` : nameParts[0];

  const given = nameParts.shift() ?? '';
  const surname = nameParts.pop() ?? '';
  const middleInitial = nameParts.length > 0 ? `${nameParts[0].charAt(0).toUpperCase()}.` : '';
  return [surname, [given, middleInitial].filter(Boolean).join(' '), detectedSuffix]
    .filter(Boolean)
    .join(', ');
}

function patientDisplayName(patient: Pick<Patient, 'id' | 'full_name' | 'first_name' | 'middle_name' | 'last_name' | 'suffix'>): string {
  return formatFormalPatientName(patient, `Patient #${patient.id}`);
}

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
  const role = auth?.user?.role ?? null;
  const isAdmin = role === 'admin';

  const status = flash?.status ?? flash?.message ?? null;
  const error = flash?.error ?? null;

  const csrf =
    sharedCsrf ?? ((document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '');

  const [openAdd, setOpenAdd] = React.useState(false);
  const [q, setQ] = React.useState(filters?.q ?? '');
  const lastQRef = React.useRef<string | null>(filters?.q ?? '');
  const [typeFilter, setTypeFilter] = React.useState<PageFilters['type']>(filters?.type ?? 'all');
  const [scope, setScope] = React.useState<'mine' | 'all'>((filters?.scope as any) === 'all' ? 'all' : 'mine');

  const initialSort: SortKey =
    (filters?.sort && SORT_VALUES.includes(filters.sort) ? filters.sort : 'created_new') as SortKey;
  const [sort, setSort] = React.useState<SortKey>(initialSort);

  const [toastSuccess, setToastSuccess] = React.useState(true);
  const [toastMsg, setToastMsg] = React.useState<string | null>(null);
  const lastFlashSigRef = React.useRef<string | null>(null);
  const suppressFlashUntilRef = React.useRef<number>(0);
  const toastTimersRef = React.useRef<number[]>([]);

  const [legendOpenMobile, setLegendOpenMobile] = React.useState(false);

  const [statusDialog, setStatusDialog] = React.useState<{
    open: boolean;
    patient: Patient | null;
    targetStatus: 'active' | 'deceased' | 'left_without_notice' | null;
  }>({
    open: false,
    patient: null,
    targetStatus: null,
  });

  const [ownershipDialog, setOwnershipDialog] = React.useState<{
    open: boolean;
    patient: Patient | null;
    newOwnerId: string;
  }>({
    open: false,
    patient: null,
    newOwnerId: '',
  });

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
  const ownershipPatient = ownershipDialog.patient;
  const ownershipDisabled = !ownershipDialog.newOwnerId;

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

  React.useEffect(() => {
    return () => {
      toastTimersRef.current.forEach((t) => window.clearTimeout(t));
      toastTimersRef.current = [];
    };
  }, []);

  React.useEffect(() => {
    if (q === (lastQRef.current ?? '')) return;

    const handle = window.setTimeout(() => {
      applyFilters({ q });
      lastQRef.current = q;
    }, 400);

    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  React.useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if ((e as any)?.persisted) refreshRecords();
    };
    window.addEventListener('pageshow', onPageShow as any);
    return () => window.removeEventListener('pageshow', onPageShow as any);
  }, []);

  React.useEffect(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (nav && nav.type === 'back_forward') refreshRecords();
  }, []);

  React.useEffect(() => {
    if (!openAdd) {
      const t = window.setTimeout(refreshRecords, 350);
      return () => window.clearTimeout(t);
    }
  }, [openAdd]);

  const formatRole = React.useCallback((r: string | null | undefined) => {
    if (!r) return 'User';
    return r.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }, []);

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

  function submitStatusUpdate(p: Patient, status: 'active' | 'deceased' | 'left_without_notice') {
    suppressFlashUntilRef.current = Date.now() + 700;
    router.post(
      `/center/records/${p.id}/status`,
      { status },
      {
        preserveScroll: true,
        onSuccess: () => showToast('Patient status updated.', 'success'),
        onError: () => showToast('Unable to update patient status.', 'error'),
        onFinish: () => {
          refreshRecords();
          setStatusDialog({ open: false, patient: null, targetStatus: null });
        },
      }
    );
  }

  function openStatusDialogFromList(p: Patient, status: 'active' | 'deceased' | 'left_without_notice') {
    setStatusDialog({ open: true, patient: p, targetStatus: status });
  }

  function openOwnershipFromList(p: Patient) {
    setOwnershipDialog({ open: true, patient: p, newOwnerId: '' });
  }

  function submitOwnershipTransfer(p: Patient, newOwnerId: string) {
    suppressFlashUntilRef.current = Date.now() + 700;
    router.post(
      `/center/patients/${p.id}/ownership-transfer`,
      { new_owner_id: Number(newOwnerId) },
      {
        preserveScroll: true,
        onSuccess: () => showToast('Patient ownership transferred.', 'success'),
        onError: () => showToast('Unable to transfer ownership.', 'error'),
        onFinish: () => {
          refreshRecords();
          setOwnershipDialog({ open: false, patient: null, newOwnerId: '' });
          setConfirmTransfer({ open: false, patient: null, newOwnerId: '', targetLabel: '', targetBarangay: null });
        },
      }
    );
  }

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
      ? 'This will mark the patient as deceased and disable their online access.'
      : statusDialog.targetStatus === 'left_without_notice'
      ? 'This will mark the patient as left without notice. Online access is still allowed.'
      : 'This will mark the patient as active again.';

  return (
    <div
      className="relative min-h-dvh overflow-x-hidden bg-white text-slate-900"
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

      <form id="logout-form" method="post" action="/logout" className="hidden">
        <input type="hidden" name="_token" value={csrf} />
      </form>

      <AddPatientWizard open={openAdd} onOpenChange={setOpenAdd} />

      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-teal-200/15 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-cyan-200/15 blur-3xl" />
        <div className="absolute -top-10 right-10 h-20 w-20 rotate-6 rounded-2xl bg-teal-50/50" />
        <div className="absolute bottom-6 left-10 h-24 w-24 -rotate-6 rounded-2xl bg-cyan-50/50" />
      </div>

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-screen-2xl items-center justify-between gap-3 px-3 sm:px-5 md:px-6 lg:px-8">
          <Link href={dashboardUrl || '/center'} preserveScroll className="group flex min-w-0 items-center gap-3">
            <img src={Logo} alt="OneHealth logo" className="h-10 w-10 shrink-0 select-none rounded-xl" draggable={false} />
            <div className="min-w-0 leading-tight">
              <div className="truncate text-base font-semibold tracking-wide text-[#203D7A] md:text-lg">ONE HEALTH</div>
              <div className="truncate text-[11px] uppercase tracking-wider text-slate-500">Patient Records</div>
            </div>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="inline-flex h-10 shrink-0 items-center gap-3 rounded-xl border border-slate-300 bg-white px-2.5 shadow-sm transition hover:shadow-md active:translate-y-[1px] focus:outline-none focus:ring-2 focus:ring-teal-600 md:h-11 md:px-3"
                aria-label="Open profile menu"
              >
                <div className="grid size-8 place-items-center rounded-full bg-[#0F8A99] text-xs text-white shadow-sm md:text-sm">
                  {name.charAt(0).toUpperCase()}
                </div>
                <span className="hidden max-w-[160px] truncate text-sm font-medium text-slate-800 sm:block">{name}</span>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-64 bg-white shadow-sm">
              <DropdownMenuLabel className="truncate">
                <div className="font-semibold">{name}</div>
                <div className="mt-0.5 truncate text-xs font-normal text-slate-500">{email}</div>
                <div className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-600">
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
      </header>

      <div className="relative z-10">
        <div className="mx-auto w-full max-w-screen-2xl px-3 pt-4 sm:px-5 md:px-6 lg:px-8">
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:gap-3">
            <Link
              href={dashboardUrl || '/center'}
              preserveScroll
              aria-label="Back to dashboard"
              className="inline-flex h-10 min-w-[44px] items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-400/60 hover:shadow-[0_10px_24px_rgba(15,138,153,0.12)] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 sm:min-w-[82px]"
            >
              <img src={BackIcon} alt="" className="h-4 w-4 sm:-ml-0.5" aria-hidden="true" draggable={false} />
              <span className="hidden sm:inline">Back</span>
            </Link>

            <h1 className="min-w-0 truncate text-center text-[18px] font-semibold tracking-tight text-[#203D7A] min-[380px]:text-[20px] md:text-[24px]">
              Patient Records
            </h1>

            <button
              type="button"
              onClick={() => setOpenAdd(true)}
              className="inline-flex h-10 min-w-[44px] items-center justify-center gap-2 rounded-lg border border-teal-300 bg-[#0F8A99] px-3 text-[14px] font-medium text-white shadow-sm transition hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F8A99] sm:min-w-[96px] xl:min-w-[124px] xl:px-4"
              aria-label="Add patient"
            >
              <PlusGlyph className="h-4 w-4 text-white" />
              <span className="hidden sm:inline xl:hidden">Add</span>
              <span className="hidden xl:inline">Add Record</span>
            </button>
          </div>
        </div>
      </div>

      <main className="relative z-10">
        <div className="mx-auto w-full max-w-screen-2xl px-3 pb-10 pt-5 sm:px-5 md:px-6 lg:px-8">
          <form
            onSubmit={onSearch}
            className="grid grid-cols-[minmax(0,1fr)_48px] gap-2 sm:grid-cols-[minmax(0,1fr)_52px] sm:gap-3 xl:grid-cols-[minmax(360px,1fr)_56px_minmax(180px,260px)_minmax(180px,260px)] xl:items-center"
          >
            <label className="sr-only" htmlFor="records-search">
              Search patients, family no., or barangay
            </label>

            <div className="relative min-w-0">
              <Input
                id="records-search"
                placeholder="Search by name, family no., or barangay"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0F8A99] min-[390px]:text-[15px] sm:h-[52px]"
              />
              <SearchGlyph className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
            </div>

            <Button
              type="submit"
              className="h-12 w-12 min-w-0 rounded-xl border border-teal-300 bg-[#0F8A99] p-0 text-white shadow-sm hover:opacity-95 focus-visible:ring-2 focus-visible:ring-[#0F8A99] sm:h-[52px] sm:w-[52px] xl:w-14"
              aria-label="Search"
              title="Search"
            >
              <SearchGlyph className="h-5 w-5" />
            </Button>

            <div className="col-span-2 grid grid-cols-1 gap-2 min-[460px]:grid-cols-2 sm:gap-3 xl:contents">
              <div className="relative min-w-0">
                <label htmlFor="typeFilter" className="sr-only">
                  Filter by type
                </label>
                <select
                  id="typeFilter"
                  value={typeFilter ?? 'all'}
                  onChange={(e) => onTypeChange(e.target.value as PageFilters['type'])}
                  className="h-12 w-full min-w-0 appearance-none rounded-xl border border-slate-300 bg-white px-3 pr-8 text-[13px] text-slate-800 outline-none focus:ring-2 focus:ring-[#0F8A99] min-[390px]:text-[14px] sm:h-[52px] sm:text-[15px]"
                  title="Filter by type"
                >
                  <option value="all">All patients</option>
                  <option value="immunization">Immunization</option>
                  <option value="pregnancy">Pregnancy</option>
                </select>
                <ChevronDownGlyph className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              </div>

              <div className="relative min-w-0">
                <label htmlFor="sortSelect" className="sr-only">
                  Sort records
                </label>
                <select
                  id="sortSelect"
                  value={sort}
                  onChange={(e) => onSortChange(e.target.value as SortKey)}
                  className="h-12 w-full min-w-0 appearance-none rounded-xl border border-slate-300 bg-white px-3 pr-8 text-[13px] text-slate-800 outline-none focus:ring-2 focus:ring-[#0F8A99] min-[390px]:text-[14px] sm:h-[52px] sm:text-[15px]"
                  title="Sort records"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDownGlyph className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              </div>
            </div>
          </form>

          <div className="mt-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">Legends</div>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:hidden"
                onClick={() => setLegendOpenMobile((v) => !v)}
                aria-expanded={legendOpenMobile ? 'true' : 'false'}
              >
                {legendOpenMobile ? 'Hide' : 'Show'}
                <ChevronDownGlyph className={`h-4 w-4 transition ${legendOpenMobile ? 'rotate-180' : ''}`} />
              </button>
            </div>

            <div
              className={[
                'mt-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm sm:px-4',
                legendOpenMobile ? 'block' : 'hidden',
                'sm:block',
              ].join(' ')}
            >
              <div className="grid gap-4 lg:grid-cols-[auto_1fr] lg:items-start xl:flex xl:items-center xl:gap-8">
                <div className="min-w-0 xl:flex xl:items-center xl:gap-2">
                  <span className="mb-2 block text-xs font-semibold text-slate-600 xl:mb-0 xl:shrink-0">Type:</span>
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center xl:flex-nowrap">
                    <LegendPill title="Immunization" tone="teal">
                      <img src={SyringeIcon} alt="" className="h-4 w-4" aria-hidden draggable={false} />
                    </LegendPill>
                    <LegendPill title="Pregnancy" tone="rose">
                      <img src={NewbornIcon} alt="" className="h-4 w-4" aria-hidden draggable={false} />
                    </LegendPill>
                  </div>
                </div>

                <div className="min-w-0 xl:flex xl:flex-1 xl:items-center xl:gap-2">
                  <span className="mb-2 block text-xs font-semibold text-slate-600 xl:mb-0 xl:shrink-0">Status:</span>
                  <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 min-[560px]:grid-cols-4 sm:flex sm:flex-wrap sm:items-center xl:flex-nowrap">
                    <LegendDot label="Active" kind="active" />
                    <LegendDot label="Deceased" kind="deceased" />
                    <LegendDot label="Transferred" kind="transferred" />
                    <LegendDot label="Without notice" kind="left_without_notice" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {!isAdmin && (
            <div className="mt-4 inline-grid w-full grid-cols-2 rounded-xl border border-slate-200 bg-white p-1 shadow-sm sm:w-auto sm:inline-flex">
              <button
                type="button"
                onClick={() => {
                  setScope('mine');
                  applyFilters({ scope: 'mine' });
                }}
                className={
                  'rounded-lg px-4 py-2 text-sm transition ' +
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
                  'rounded-lg px-4 py-2 text-sm transition ' +
                  (scope === 'all' ? 'bg-[#0F8A99] text-white' : 'text-slate-700 hover:bg-slate-50')
                }
              >
                View all
              </button>
            </div>
          )}

          {patients.data.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-[15px] text-slate-700 shadow-sm">
              <div className="mb-1 font-semibold">No patients found</div>
              <p className="text-sm text-slate-500">Try changing your search, clearing filters, or adding a new patient record.</p>
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-3 min-[520px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 sm:gap-4">
              {patients.data.map((p) => {
                const birth = fmtDate(p.birthdate);
                const isImm = p.patient_type === 'immunization';
                const isPreg = p.patient_type === 'pregnancy';
                const canEdit = isAdmin || p.can_edit !== false;
                const normalizedStatus = (p.status ? String(p.status).toLowerCase() : 'active') as PatientStatus;
                const safeDisplayName = patientDisplayName(p);

                return (
                  <Link
                    key={p.id}
                    href={`/center/records/${p.id}?tab=card`}
                    preserveScroll
                    aria-label={`Open ${safeDisplayName}`}
                    className={anyModalOpen ? 'pointer-events-none block min-w-0' : 'group block min-w-0'}
                  >
                    <article
                      className={[
                        'relative flex h-full min-h-[128px] min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white',
                        'p-3 shadow-[0_8px_20px_rgba(16,24,40,0.07)] transition sm:p-4',
                        'group-hover:-translate-y-0.5 group-hover:shadow-[0_16px_42px_rgba(16,24,40,0.12)]',
                      ].join(' ')}
                    >
                      <div className="absolute right-2.5 top-2.5 z-10 flex shrink-0 flex-col items-end gap-1.5">
                        {!anyModalOpen && canEdit && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-500 shadow-sm hover:bg-slate-50 hover:text-slate-700"
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
                              className="w-60 border border-slate-200 bg-white shadow-md"
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
                                  <ActionIcon tone="emerald">✓</ActionIcon>
                                  <div className="flex min-w-0 flex-col">
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
                                  <ActionIcon tone="rose">!</ActionIcon>
                                  <div className="flex min-w-0 flex-col">
                                    <span className="font-medium text-slate-800">Mark as deceased</span>
                                    <span className="text-[11px] text-slate-500">Disable online access</span>
                                  </div>
                                </DropdownMenuItem>
                              )}

                              {normalizedStatus === 'left_without_notice' ? (
                                <DropdownMenuItem
                                  className="flex items-center gap-2 text-sm"
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    openStatusDialogFromList(p, 'active');
                                  }}
                                >
                                  <ActionIcon tone="emerald">✓</ActionIcon>
                                  <div className="flex min-w-0 flex-col">
                                    <span className="font-medium text-slate-800">Mark as active</span>
                                    <span className="text-[11px] text-slate-500">Return patient to active status</span>
                                  </div>
                                </DropdownMenuItem>
                              ) : (
                                normalizedStatus !== 'deceased' && (
                                  <DropdownMenuItem
                                    className="flex items-center gap-2 text-sm"
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      openStatusDialogFromList(p, 'left_without_notice');
                                    }}
                                  >
                                    <ActionIcon tone="amber">?</ActionIcon>
                                    <div className="flex min-w-0 flex-col">
                                      <span className="font-medium text-slate-800">Mark as without notice</span>
                                      <span className="text-[11px] text-slate-500">Patient left without notice</span>
                                    </div>
                                  </DropdownMenuItem>
                                )
                              )}

                              {!isAdmin && transferTargets.length > 0 && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="flex items-center gap-2 text-sm"
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      openOwnershipFromList(p);
                                    }}
                                  >
                                    <ActionIcon tone="teal">⇄</ActionIcon>
                                    <div className="flex min-w-0 flex-col">
                                      <span className="font-medium text-slate-800">Transfer ownership</span>
                                      <span className="text-[11px] text-slate-500">Move record to another worker</span>
                                    </div>
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}

                        <div
                          className={[
                            'grid h-8 w-8 place-items-center rounded-full border shadow-sm',
                            isImm
                              ? 'border-teal-200 bg-teal-50 text-teal-700'
                              : isPreg
                              ? 'border-rose-200 bg-rose-50 text-rose-700'
                              : 'border-slate-200 bg-slate-50 text-slate-500',
                          ].join(' ')}
                          title={isImm ? 'Immunization' : isPreg ? 'Pregnancy' : 'Unspecified'}
                        >
                          {isImm ? (
                            <img src={SyringeIcon} alt="" className="h-4 w-4" aria-hidden draggable={false} />
                          ) : isPreg ? (
                            <img src={NewbornIcon} alt="" className="h-4 w-4" aria-hidden draggable={false} />
                          ) : (
                            <UserGlyph className="h-4 w-4" />
                          )}
                        </div>
                      </div>

                      <div className="min-w-0 pr-10 sm:pr-12">
                        <div className="mb-2 flex min-w-0 items-center gap-1.5">
                          <div className="inline-flex max-w-full items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            #{p.id}
                          </div>
                          <StatusDot kind={normalizedStatus} />
                        </div>

                        <h2 className="min-w-0 overflow-hidden break-words text-[15px] font-semibold leading-snug text-slate-900 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] [overflow-wrap:anywhere] sm:text-[16px]">
                          {safeDisplayName}
                        </h2>
                      </div>

                      <div className="mt-3 grid min-w-0 grid-cols-1 gap-1.5 text-xs min-[380px]:grid-cols-2">
                        <InfoRow label="Birth" value={birth} />
                        <InfoRow label="Brgy" value={p.barangay || '—'} />
                      </div>
                    </article>
                  </Link>
                );
              })}
            </div>
          )}

          {patients.links?.length > 1 && (
            <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="Pagination">
              {patients.links.map((link, i) => {
                const text = labelText(link.label);
                if (!link.url) {
                  return (
                    <span
                      key={`${link.label}-${i}`}
                      className="inline-flex h-10 min-w-10 cursor-not-allowed items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-400"
                      dangerouslySetInnerHTML={{ __html: text }}
                    />
                  );
                }

                return (
                  <Link
                    key={`${link.label}-${i}`}
                    href={link.url}
                    preserveScroll
                    preserveState
                    className={[
                      'inline-flex h-10 min-w-10 items-center justify-center rounded-xl border px-3 text-sm font-semibold transition',
                      link.active
                        ? 'border-[#0F8A99] bg-[#0F8A99] text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-teal-300 hover:bg-teal-50',
                    ].join(' ')}
                    dangerouslySetInnerHTML={{ __html: text }}
                  />
                );
              })}
            </nav>
          )}
        </div>
      </main>

      {toastMsg && (
        <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 sm:bottom-6">
          <div
            className={[
              'rounded-2xl border bg-white px-4 py-3 text-sm font-medium shadow-[0_18px_45px_rgba(15,23,42,0.18)]',
              toastSuccess ? 'border-emerald-200 text-emerald-800' : 'border-rose-200 text-rose-800',
            ].join(' ')}
          >
            {toastMsg}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={statusDialog.open}
        title={targetVerb}
        description={
          statusDialog.patient
            ? `${targetDescription} Patient: ${patientDisplayName(statusDialog.patient)}`
            : targetDescription
        }
        confirmLabel={targetVerb}
        confirmTone={statusDialog.targetStatus === 'deceased' ? 'danger' : 'primary'}
        onCancel={() => setStatusDialog({ open: false, patient: null, targetStatus: null })}
        onConfirm={() => {
          if (statusDialog.patient && statusDialog.targetStatus) {
            submitStatusUpdate(statusDialog.patient, statusDialog.targetStatus);
          }
        }}
      />

      <SimpleModal
        open={ownershipDialog.open}
        title="Transfer ownership"
        onClose={() => setOwnershipDialog({ open: false, patient: null, newOwnerId: '' })}
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-slate-600">
            Select the health worker who should own{' '}
            <span className="font-semibold text-slate-900">
              {ownershipPatient ? patientDisplayName(ownershipPatient) : 'this patient'}
            </span>
            .
          </p>

          <div>
            <label htmlFor="new-owner" className="mb-1.5 block text-sm font-semibold text-slate-700">
              New owner
            </label>
            <select
              id="new-owner"
              value={ownershipDialog.newOwnerId}
              onChange={(e) => setOwnershipDialog((v) => ({ ...v, newOwnerId: e.target.value }))}
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#0F8A99]"
            >
              <option value="">Choose a health worker</option>
              {transferTargets.map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {t.name || `User #${t.id}`}{t.barangay ? ` - ${t.barangay}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setOwnershipDialog({ open: false, patient: null, newOwnerId: '' })}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={ownershipDisabled || !ownershipPatient}
              onClick={() => {
                const selected = transferTargets.find((t) => String(t.id) === ownershipDialog.newOwnerId);
                setConfirmTransfer({
                  open: true,
                  patient: ownershipPatient,
                  newOwnerId: ownershipDialog.newOwnerId,
                  targetLabel: selected?.name || `User #${ownershipDialog.newOwnerId}`,
                  targetBarangay: selected?.barangay ?? null,
                });
              }}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-[#0F8A99] px-4 text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        </div>
      </SimpleModal>

      <ConfirmDialog
        open={confirmTransfer.open}
        title="Confirm ownership transfer"
        description={
          confirmTransfer.patient
            ? `Transfer ${patientDisplayName(confirmTransfer.patient)} to ${confirmTransfer.targetLabel}${
                confirmTransfer.targetBarangay ? ` (${confirmTransfer.targetBarangay})` : ''
              }?`
            : 'Transfer this patient?'
        }
        confirmLabel="Transfer"
        confirmTone="primary"
        onCancel={() => setConfirmTransfer({ open: false, patient: null, newOwnerId: '', targetLabel: '', targetBarangay: null })}
        onConfirm={() => {
          if (confirmTransfer.patient && confirmTransfer.newOwnerId) {
            submitOwnershipTransfer(confirmTransfer.patient, confirmTransfer.newOwnerId);
          }
        }}
      />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5 rounded-lg bg-slate-50/80 px-2 py-1.5">
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}:</span>
      <span className="min-w-0 truncate text-[11px] font-medium text-slate-800" title={typeof value === 'string' ? value : undefined}>
        {value}
      </span>
    </div>
  );
}

function LegendPill({
  title,
  tone,
  children,
}: {
  title: string;
  tone: 'teal' | 'rose';
  children: React.ReactNode;
}) {
  const toneClass =
    tone === 'teal'
      ? 'border-teal-200 bg-teal-50 text-teal-800'
      : 'border-rose-200 bg-rose-50 text-rose-800';

  return (
    <div className={`inline-flex min-w-0 items-center justify-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${toneClass}`}>
      <span className="shrink-0">{children}</span>
      <span className="truncate">{title}</span>
    </div>
  );
}

function LegendDot({ label, kind }: { label: string; kind: PatientStatus }) {
  return (
    <div className="inline-flex min-w-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700">
      <StatusDot kind={kind} />
      <span className="truncate">{label}</span>
    </div>
  );
}

function StatusDot({ kind }: { kind?: PatientStatus | null }) {
  const k = String(kind || 'active').toLowerCase();
  const cls =
    k === 'deceased'
      ? 'bg-rose-500 ring-rose-100'
      : k === 'transferred'
      ? 'bg-blue-500 ring-blue-100'
      : k === 'left_without_notice'
      ? 'bg-amber-500 ring-amber-100'
      : 'bg-emerald-500 ring-emerald-100';

  return <span aria-hidden="true" className={`inline-flex h-3 w-3 shrink-0 rounded-full ring-4 ${cls}`} />;
}

function TypeBadge({ patientType }: { patientType?: PatientType | null }) {
  if (patientType === 'immunization') {
    return <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-700">Immunization</span>;
  }
  if (patientType === 'pregnancy') {
    return <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">Pregnancy</span>;
  }
  return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">Unspecified</span>;
}

function StatusBadge({ kind }: { kind?: PatientStatus | null }) {
  const k = String(kind || 'active').toLowerCase();
  if (k === 'deceased') {
    return <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">Deceased</span>;
  }
  if (k === 'transferred') {
    return <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">Transferred</span>;
  }
  if (k === 'left_without_notice') {
    return <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Without notice</span>;
  }
  return <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Active</span>;
}

function ActionIcon({ children, tone }: { children: React.ReactNode; tone: 'emerald' | 'rose' | 'amber' | 'teal' }) {
  const cls =
    tone === 'emerald'
      ? 'bg-emerald-50 text-emerald-700'
      : tone === 'rose'
      ? 'bg-rose-50 text-rose-700'
      : tone === 'amber'
      ? 'bg-amber-50 text-amber-700'
      : 'bg-teal-50 text-teal-700';

  return <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${cls}`}>{children}</span>;
}

function SimpleModal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4" role="dialog" aria-modal="true">
      <button type="button" aria-label="Close modal" onClick={onClose} className="absolute inset-0 bg-slate-950/40" />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  confirmTone,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  confirmTone: 'primary' | 'danger';
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4" role="dialog" aria-modal="true">
      <button type="button" aria-label="Close confirmation" onClick={onCancel} className="absolute inset-0 bg-slate-950/40" />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-5">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={[
              'inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white shadow-sm hover:opacity-95',
              confirmTone === 'danger' ? 'bg-rose-600' : 'bg-[#0F8A99]',
            ].join(' ')}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function PlusGlyph({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function SearchGlyph({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.2-3.2" />
    </svg>
  );
}

function KebabGlyph({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
    </svg>
  );
}

function ChevronDownGlyph({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M7 10l5 5 5-5z" />
    </svg>
  );
}

function UserGlyph({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
