// resources/js/pages/center/reports/index.tsx
import * as React from "react";
import { Head, usePage, router } from "@inertiajs/react";
import Logo from "/public/build/assets/LOGO.svg";
import BackIcon from "/public/build/assets/back-outline-svgrepo-com.svg";

type Filters = {
  from?: string | null;
  to?: string | null;
  month?: string | null;
  year?: string | null;
  health_center_id?: string | number | null;
};

type PatientsByTypeRow = {
  patient_type: string | null;
  total: number;
};

type PatientsByBarangayRow = {
  barangay: string | null;
  total: number;
};

type ImmunizationByVaccineRow = {
  vaccine: string;
  total_doses: number;
  patients: number;
};

type PrenatalByTrimesterRow = {
  trimester: string | null;
  patients: number;
};

type Summary = {
  patients: {
    total: number;
    by_type: PatientsByTypeRow[];
    by_barangay: PatientsByBarangayRow[];
  };
  immunization: {
    total_records: number;
    total_patients: number;
    by_vaccine: ImmunizationByVaccineRow[];
    fully_immunized_patients: number;
    dose_counts?: Record<string, number>;
    dose_sex_counts?: Record<string, { male: number; female: number }>;

    cpab_total?: number;
    bcg_total?: number;
    hepB_total?: number;
    penta1_total?: number;
    penta2_total?: number;
    penta3_total?: number;
    opv1_total?: number;
    opv2_total?: number;
    opv3_total?: number;
    ipv1_total?: number;
    ipv2_routine_total?: number;
    ipv2_catchup_total?: number;
    pcv1_total?: number;
    pcv2_total?: number;
    pcv3_total?: number;
    mcv1_total?: number;
    mcv2_total?: number;

    fic_total?: number;
    cic_total?: number;

    td_grade1_total?: number;
    mr_grade1_total?: number;
    td_grade7_total?: number;
    mr_grade7_total?: number;
  };
  prenatal: {
    total_pregnant_patients: number;
    total_visits: number;
    patients_with_4plus_visits: number;
    by_trimester: PrenatalByTrimesterRow[];

    fourplus_10_14_total?: number;
    fourplus_15_19_total?: number;
    fourplus_20_49_total?: number;

    bmi_assessed_10_14_total?: number;
    bmi_assessed_15_19_total?: number;
    bmi_assessed_20_49_total?: number;

    first_trimester_patients?: number;
    tt2_plus_patients?: number;
    tt3_plus_patients?: number;
    prenatal_vit_a_patients?: number;

    bmi_assessed_total?: number;
    bmi_normal_total?: number;
    bmi_low_total?: number;
    bmi_high_total?: number;

    calcium_completed_total?: number;
    iodine_capsule_total?: number;
    deworm_tablet_total?: number;

    screened_syphilis_total?: number;
    positive_syphilis_total?: number;
    screened_hepb_total?: number;
    positive_hepb_total?: number;
    screened_hiv_total?: number;
    tested_cbc_total?: number;
    anemia_total?: number;
    screened_gdm_total?: number;
    positive_gdm_total?: number;

    iron_folate_completed_total?: number;
  };
  postnatal: {
    total_records: number;
    exclusive_breastfeeding: number;
    with_2plus_checkups?: number;
    vitamin_a_patients?: number;
    iron_folate_patients?: number;
  };
  hbm_current: {
    total_records: number;
  };
  child_nutrition?: {
    bf_initiated_early_total?: number;
    preterm_iron_total?: number;
    ebf_0_5_total?: number;

    comp_feed_with_bf_total?: number;
    comp_feed_no_bf_total?: number;
    vitA_6_11_total?: number;
    vitA_12_59_total?: number;
    mnp_6_11_completed_total?: number;
    mnp_12_23_completed_total?: number;
    stunted_total?: number;
    wasted_total?: number;
    mam_total?: number;
    mam_sft_admitted_total?: number;
    mam_sft_cured_total?: number;
    mam_sft_defaulted_total?: number;
    mam_sft_died_total?: number;
    sam_total?: number;
    sam_oct_admitted_total?: number;
    sam_oct_cured_total?: number;
    sam_oct_defaulted_total?: number;
    sam_oct_died_total?: number;
    overweight_obese_total?: number;
    normal_total?: number;
  };
  child_deworming?: {
    overall_1_19_2doses_total?: number;
    psac_1_4_2doses_total?: number;
    sac_5_9_2doses_total?: number;
    adolescents_10_19_2doses_total?: number;
    younger_total?: number;
    older_total?: number;
  };
  child_sick?: {
    sick_6_11_seen_total?: number;
    sick_6_11_vita_total?: number;
    sick_12_59_seen_total?: number;
    sick_12_59_vita_total?: number;
    diarrhea_total?: number;
    diarrhea_ors_total?: number;
    diarrhea_ors_zinc_total?: number;
    pneumonia_total?: number;
    pneumonia_completed_total?: number;
    other_conditions_total?: number;
  };
  delivery?: {
    deliveries_total?: number;
    livebirths_total?: number;
    livebirths_male?: number;
    livebirths_female?: number;
    normal_birth_weight_total?: number;
    low_birth_weight_total?: number;
    unknown_birth_weight_total?: number;
    facility_deliveries_total?: number;
    public_facility_deliveries_total?: number;
    private_facility_deliveries_total?: number;
    non_facility_deliveries_total?: number;
    skilled_birth_attendant_total?: number;
    attended_by_doctor_total?: number;
    attended_by_nurse_total?: number;
    attended_by_midwife_total?: number;
    vaginal_deliveries_total?: number;
    cesarean_deliveries_total?: number;
    fullterm_births_total?: number;
    preterm_births_total?: number;
    fetal_deaths_total?: number;
    abortions_miscarriages_total?: number;
  };
};

type PageProps = {
  filters: Filters;
  summary: Summary;
};

type HealthCenter = {
  id: string | number;
  name: string;
};

const BAYANI_CLUSTER_HEALTH_CENTERS: HealthCenter[] = [
  { id: "Acacia", name: "Acacia" },
  { id: "Adlas", name: "Adlas" },
  { id: "Anahaw I", name: "Anahaw I" },
  { id: "Anahaw II", name: "Anahaw II" },
  { id: "Balite I", name: "Balite I" },
  { id: "Balite II", name: "Balite II" },
  { id: "Balubad", name: "Balubad" },
  { id: "Banaba", name: "Banaba" },
  { id: "Batas", name: "Batas" },
  { id: "Biga I", name: "Biga I" },
  { id: "Biga II", name: "Biga II" },
  { id: "Biluso", name: "Biluso" },
  { id: "Bucal", name: "Bucal" },
  { id: "Buho", name: "Buho" },
  { id: "Bulihan", name: "Bulihan" },
  { id: "Cabangaan", name: "Cabangaan" },
  { id: "Carmen", name: "Carmen" },
  { id: "Hoyo", name: "Hoyo" },
  { id: "Hukay", name: "Hukay" },
  { id: "Iba", name: "Iba" },
  { id: "Inchican", name: "Inchican" },
  { id: "Ipil I", name: "Ipil I" },
  { id: "Ipil II", name: "Ipil II" },
  { id: "Kalubkob", name: "Kalubkob" },
  { id: "Kaong", name: "Kaong" },
  { id: "Lalaan I", name: "Lalaan I" },
  { id: "Lalaan II", name: "Lalaan II" },
  { id: "Litlit", name: "Litlit" },
  { id: "Lucsuhin", name: "Lucsuhin" },
  { id: "Lumil", name: "Lumil" },
  { id: "Maguyam", name: "Maguyam" },
  { id: "Malabag", name: "Malabag" },
  { id: "Mataas na Burol", name: "Mataas na Burol" },
  { id: "Malaking Tatiao", name: "Malaking Tatiao" },
  { id: "Munting Ilog", name: "Munting Ilog" },
  { id: "Narra I", name: "Narra I" },
  { id: "Narra II", name: "Narra II" },
  { id: "Narra III", name: "Narra III" },
  { id: "Paligawan", name: "Paligawan" },
  { id: "Pasong Langka", name: "Pasong Langka" },
  { id: "Poblacion I", name: "Poblacion I" },
  { id: "Poblacion II", name: "Poblacion II" },
  { id: "Poblacion III", name: "Poblacion III" },
  { id: "Poblacion IV", name: "Poblacion IV" },
  { id: "Poblacion V", name: "Poblacion V" },
  { id: "Pooc I", name: "Pooc I" },
  { id: "Pooc II", name: "Pooc II" },
  { id: "Pulong Bunga", name: "Pulong Bunga" },
  { id: "Pulong Saging", name: "Pulong Saging" },
  { id: "Puting Kahoy", name: "Puting Kahoy" },
  { id: "Sabutan", name: "Sabutan" },
  { id: "San Miguel I", name: "San Miguel I" },
  { id: "San Miguel II", name: "San Miguel II" },
  { id: "San Vicente I", name: "San Vicente I" },
  { id: "San Vicente II", name: "San Vicente II" },
  { id: "Santol", name: "Santol" },
  { id: "Tartaria", name: "Tartaria" },
  { id: "Tibig", name: "Tibig" },
  { id: "Toledo", name: "Toledo" },
  { id: "Tubuan I", name: "Tubuan I" },
  { id: "Tubuan II", name: "Tubuan II" },
  { id: "Tubuan III", name: "Tubuan III" },
  { id: "Ulat", name: "Ulat" },
  { id: "Yakal", name: "Yakal" },
];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatValue(value: React.ReactNode) {
  return value ?? "—";
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(media.matches);

    onChange();
    media.addEventListener?.("change", onChange);
    return () => media.removeEventListener?.("change", onChange);
  }, []);

  return reduced;
}

function useRevealClass() {
  const reduced = usePrefersReducedMotion();
  return reduced ? "" : "animate-[fadeInUp_.35s_ease-out]";
}

function useIsSmallScreen(breakpoint = 640) {
  const [isSmall, setIsSmall] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const media = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onChange = () => setIsSmall(media.matches);

    onChange();
    media.addEventListener?.("change", onChange);
    return () => media.removeEventListener?.("change", onChange);
  }, [breakpoint]);

  return isSmall;
}

const PageShell = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-[linear-gradient(to_bottom,#f8fafc,#f1f5f9)] text-slate-900">
    {children}
  </div>
);

const GlassCard = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => (
  <div
    className={cn(
      "rounded-xl border border-white/60 bg-white/90 shadow-[0_10px_40px_rgba(15,23,42,0.06)] backdrop-blur sm:rounded-2xl",
      className
    )}
  >
    {children}
  </div>
);

const SectionCard = ({
  id,
  title,
  subtitle,
  right,
  children,
  className,
}: {
  id?: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) => (
  <section id={id} className={cn("scroll-mt-28 sm:scroll-mt-32", className)}>
    <GlassCard className="overflow-hidden">
      <div className="border-b border-slate-200/80 px-3 py-3 sm:px-5 sm:py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900 sm:text-lg">{title}</h2>
            {subtitle ? (
              <p className="mt-1 text-[11px] leading-5 text-slate-500 sm:text-sm">{subtitle}</p>
            ) : null}
          </div>
          {right ? <div className="shrink-0">{right}</div> : null}
        </div>
      </div>
      <div className="p-3 sm:p-5">{children}</div>
    </GlassCard>
  </section>
);

const CollapsibleSection = ({
  title,
  subtitle,
  open,
  onToggle,
  children,
}: {
  title: string;
  subtitle?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) => (
  <GlassCard className="overflow-hidden">
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition hover:bg-slate-50 sm:px-5 sm:py-4"
      aria-expanded={open}
    >
      <div className="min-w-0 pr-2">
        <h2 className="text-sm font-semibold text-slate-900 sm:text-lg">{title}</h2>
        {subtitle ? <p className="mt-1 text-[11px] text-slate-500 sm:text-sm">{subtitle}</p> : null}
      </div>

      <span
        className={cn(
          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-transform sm:h-10 sm:w-10",
          open ? "rotate-180" : ""
        )}
      >
        <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 7.5 10 12.5 15 7.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </button>

    {open && <div className="border-t border-slate-200 px-3 py-3 sm:px-5 sm:py-4">{children}</div>}
  </GlassCard>
);

const StatCard = ({
  label,
  value,
  hint,
  accent = "teal",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  accent?: "teal" | "blue" | "emerald" | "amber";
}) => {
  const accentMap: Record<string, string> = {
    teal: "from-teal-500/10 to-cyan-500/10 border-teal-100",
    blue: "from-blue-500/10 to-indigo-500/10 border-blue-100",
    emerald: "from-emerald-500/10 to-green-500/10 border-emerald-100",
    amber: "from-amber-500/10 to-orange-500/10 border-amber-100",
  };

  return (
    <div
      className={cn(
        "rounded-xl border bg-gradient-to-br p-3 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 sm:rounded-2xl sm:p-4",
        accentMap[accent]
      )}
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:text-[11px]">
        {label}
      </div>
      <div className="mt-2 text-xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        {formatValue(value)}
      </div>
      {hint ? <div className="mt-2 text-[11px] leading-5 text-slate-500 sm:text-xs">{hint}</div> : null}
    </div>
  );
};

const FilterField = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <label className="flex min-w-0 flex-col gap-1.5">
    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:text-[11px]">
      {label}
    </span>
    {children}
  </label>
);

const SelectBaseClass =
  "h-10 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/15 sm:h-11";

const Tabs = ({
  value,
  onChange,
  items,
}: {
  value: string;
  onChange: (v: string) => void;
  items: { value: string; label: string; hint?: string }[];
}) => (
  <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm sm:rounded-2xl">
    <div
      role="tablist"
      aria-label="Report views"
      className="grid grid-cols-1 gap-2 sm:grid-cols-2"
    >
      {items.map((it) => {
        const active = it.value === value;
        return (
          <button
            key={it.value}
            id={`tab-${it.value}`}
            role="tab"
            aria-selected={active}
            aria-controls={`panel-${it.value}`}
            type="button"
            onClick={() => onChange(it.value)}
            className={cn(
              "flex min-h-[44px] items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition sm:min-h-[48px] sm:px-4 sm:py-3",
              active
                ? "bg-teal-600 text-white shadow-sm"
                : "bg-slate-50 text-slate-700 hover:bg-slate-100"
            )}
          >
            <span className="font-semibold">{it.label}</span>
            {it.hint ? (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold sm:px-2.5 sm:py-1 sm:text-[11px]",
                  active ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                )}
              >
                {it.hint}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  </div>
);

const TableWrap = ({
  children,
  caption,
}: {
  children: React.ReactNode;
  caption?: string;
}) => (
  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white sm:rounded-2xl">
    {caption ? (
      <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500 sm:px-4">
        {caption}
      </div>
    ) : null}
    <div className="overflow-x-auto">{children}</div>
  </div>
);

const SimpleTable = ({
  columns,
  rows,
  emptyLabel,
}: {
  columns: { key: string; label: string; className?: string }[];
  rows: any[];
  emptyLabel: string;
}) => {
  return (
    <TableWrap>
      <table className="min-w-full border-collapse text-sm">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "whitespace-nowrap px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:px-4 sm:text-[11px]",
                  col.className
                )}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                className="px-3 py-8 text-center text-sm text-slate-500 sm:px-4"
              >
                {emptyLabel}
              </td>
            </tr>
          )}
          {rows.map((row, idx) => (
            <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn("px-3 py-3 text-sm text-slate-800 sm:px-4", col.className)}
                >
                  {row[col.key] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </TableWrap>
  );
};

const BigReportTable = ({
  columns,
  rows,
  groupHeaders,
}: {
  columns: { key: string; label: string; className?: string }[];
  rows: any[];
  groupHeaders?: { index: number; label: string }[];
}) => {
  const groupMap = new Map<number, string>();
  (groupHeaders ?? []).forEach((g) => groupMap.set(g.index, g.label));

  return (
    <TableWrap>
      <table className="min-w-[780px] w-full border-collapse text-sm sm:min-w-[880px]">
        <thead className="sticky top-0 z-[1] bg-slate-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:px-4 sm:text-[11px]",
                  col.className
                )}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <React.Fragment key={row.__key ?? idx}>
              {groupMap.has(idx) ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="bg-slate-100 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-700 sm:px-4 sm:text-[11px]"
                  >
                    {groupMap.get(idx)}
                  </td>
                </tr>
              ) : null}
              <tr className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}>
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-3 py-3 align-top text-sm text-slate-800 sm:px-4",
                      col.className
                    )}
                  >
                    {row[col.key] ?? "—"}
                  </td>
                ))}
              </tr>
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </TableWrap>
  );
};

const EmptyPanel = ({ label }: { label: string }) => (
  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500 sm:rounded-2xl">
    {label}
  </div>
);

const BackToTopButton = () => {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 320);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      className={cn(
        "fixed bottom-3 right-3 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full bg-teal-600 text-white shadow-lg transition-all hover:bg-teal-700 focus:outline-none focus:ring-4 focus:ring-teal-500/30 sm:bottom-6 sm:right-6 sm:h-14 sm:w-14",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      )}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M12 19V5" strokeLinecap="round" />
        <path d="m6 11 6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
};

export default function CenterReportsIndex() {
  const page = usePage<PageProps>();
  const { filters, summary } = page.props;
  const revealClass = useRevealClass();
  const isSmallScreen = useIsSmallScreen(640);

  const authAny = (page.props as any)?.auth;
  const userAny = authAny?.user;

  const loggedInHealthCenterIdRaw =
    userAny?.health_center_id ??
    userAny?.healthCenterId ??
    userAny?.health_center?.id ??
    userAny?.health_center?.name ??
    null;

  const loggedInHealthCenterId = loggedInHealthCenterIdRaw
    ? String(loggedInHealthCenterIdRaw)
    : filters.health_center_id
    ? String(filters.health_center_id)
    : "";

  const loggedInHealthCenterName =
    userAny?.health_center?.name ??
    userAny?.healthCenterName ??
    (loggedInHealthCenterId &&
    BAYANI_CLUSTER_HEALTH_CENTERS.find((x) => String(x.id) === loggedInHealthCenterId)
      ? BAYANI_CLUSTER_HEALTH_CENTERS.find((x) => String(x.id) === loggedInHealthCenterId)?.name
      : null) ??
    null;

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonthNum = today.getMonth() + 1;

  const initialYear = filters.year ? String(filters.year) : String(currentYear);
  const initialMonth = filters.month
    ? String(filters.month).padStart(2, "0")
    : String(currentMonthNum).padStart(2, "0");

  const [selectedYear, setSelectedYear] = React.useState<string>(initialYear);
  const [selectedMonth, setSelectedMonth] = React.useState<string>(initialMonth);

  type TabKey = "monthly" | "extras";
  const [tab, setTab] = React.useState<TabKey>("monthly");

  const [childHealthOpen, setChildHealthOpen] = React.useState(true);
  const [maternalCareOpen, setMaternalCareOpen] = React.useState(true);
  const [filtersOpen, setFiltersOpen] = React.useState(!isSmallScreen);

  React.useEffect(() => {
    setFiltersOpen(!isSmallScreen);
  }, [isSmallScreen]);

  const [extrasHealthCenterId, setExtrasHealthCenterId] = React.useState<string>(
    filters.health_center_id ? String(filters.health_center_id) : ""
  );

  const monthOptions = [
    { value: "01", label: "January" },
    { value: "02", label: "February" },
    { value: "03", label: "March" },
    { value: "04", label: "April" },
    { value: "05", label: "May" },
    { value: "06", label: "June" },
    { value: "07", label: "July" },
    { value: "08", label: "August" },
    { value: "09", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  const yearOptions = React.useMemo(() => {
    const years: string[] = [];
    for (let y = currentYear; y >= currentYear - 5; y--) {
      years.push(String(y));
    }
    return years;
  }, [currentYear]);

  const sortedPatientsByBarangay = React.useMemo(() => {
    return [...(summary.patients.by_barangay ?? [])].sort((a, b) => {
      const aName = (a.barangay ?? "").trim().toLowerCase();
      const bName = (b.barangay ?? "").trim().toLowerCase();

      if (!aName && !bName) return 0;
      if (!aName) return 1;
      if (!bName) return -1;

      return aName.localeCompare(bName);
    });
  }, [summary.patients.by_barangay]);

  const applyFiltersMonthly = React.useCallback(
    (monthValue: string, yearValue: string) => {
      const mInt = parseInt(monthValue, 10);
      const yInt = parseInt(yearValue, 10);
      if (!mInt || !yInt) return;

      const mm = String(mInt).padStart(2, "0");
      const from = `${yInt}-${mm}-01`;
      const lastDate = new Date(yInt, mInt, 0).getDate();
      const to = `${yInt}-${mm}-${String(lastDate).padStart(2, "0")}`;

      const params: Record<string, any> = {
        month: mm,
        year: String(yInt),
        from,
        to,
        health_center_id: loggedInHealthCenterId || undefined,
      };

      if (!loggedInHealthCenterId) delete params.health_center_id;

      router.get("/center/reports", params, {
        preserveScroll: true,
        preserveState: true,
        replace: true,
      });
    },
    [loggedInHealthCenterId]
  );

  const applyFiltersExtras = React.useCallback(
    (monthValue: string, yearValue: string, hcId: string) => {
      const mInt = parseInt(monthValue, 10);
      const yInt = parseInt(yearValue, 10);
      if (!mInt || !yInt) return;

      const mm = String(mInt).padStart(2, "0");
      const params: Record<string, any> = {
        month: mm,
        year: String(yInt),
      };

      if (hcId) {
        const from = `${yInt}-${mm}-01`;
        const lastDate = new Date(yInt, mInt, 0).getDate();
        const to = `${yInt}-${mm}-${String(lastDate).padStart(2, "0")}`;

        params.from = from;
        params.to = to;
        params.health_center_id = hcId;
      }

      router.get("/center/reports", params, {
        preserveScroll: true,
        preserveState: true,
        replace: true,
      });
    },
    []
  );

  const onTabChange = React.useCallback(
    (next: TabKey) => {
      setTab(next);

      if (next === "monthly") {
        applyFiltersMonthly(selectedMonth, selectedYear);
      } else {
        applyFiltersExtras(selectedMonth, selectedYear, extrasHealthCenterId);
      }
    },
    [applyFiltersMonthly, applyFiltersExtras, selectedMonth, selectedYear, extrasHealthCenterId]
  );

  const doseCounts = summary.immunization.dose_counts ?? {};
  const doseSexCounts =
    summary.immunization.dose_sex_counts ??
    ({} as Record<string, { male: number; female: number }>);

  const makeDoseKey = (vaccineKey: string, doseLabelKey: string) =>
    `${vaccineKey.trim()}|${doseLabelKey.trim()}`.toLowerCase();

  const getDoseTotal = (vaccineKey: string, doseLabelKey: string) => {
    const key = makeDoseKey(vaccineKey, doseLabelKey);
    const v = (doseCounts as Record<string, number>)[key];
    return typeof v === "number" ? v : 0;
  };

  const getDoseSex = (
    vaccineKey: string,
    doseLabelKey: string,
    sex: "male" | "female"
  ) => {
    const key = makeDoseKey(vaccineKey, doseLabelKey);
    const rec = doseSexCounts[key];
    if (!rec) return 0;
    return sex === "male" ? rec.male ?? 0 : rec.female ?? 0;
  };

  const c1ImmunizationDoseRows = [
    {
      code: "1.",
      label: "CPAB - Total",
      male: null,
      female: null,
      total: summary.immunization.cpab_total ?? null,
    },
    {
      code: "2.",
      label: "BCG - Total",
      male: getDoseSex("BCG Vaccine", "At birth", "male"),
      female: getDoseSex("BCG Vaccine", "At birth", "female"),
      total: summary.immunization.bcg_total ?? getDoseTotal("BCG Vaccine", "At birth"),
    },
    {
      code: "3.",
      label: "HepB, within 24 hours - Total",
      male: getDoseSex("Hepatitis B Vaccine", "At birth", "male"),
      female: getDoseSex("Hepatitis B Vaccine", "At birth", "female"),
      total:
        summary.immunization.hepB_total ??
        getDoseTotal("Hepatitis B Vaccine", "At birth"),
    },
    {
      code: "4.",
      label: "DPT-HiB-HepB 1 - Total",
      male: getDoseSex("Pentavalent (DPT-HepB-Hib)", "6w", "male"),
      female: getDoseSex("Pentavalent (DPT-HepB-Hib)", "6w", "female"),
      total:
        summary.immunization.penta1_total ??
        getDoseTotal("Pentavalent (DPT-HepB-Hib)", "6w"),
    },
    {
      code: "5.",
      label: "DPT-HiB-HepB 2 - Total",
      male: getDoseSex("Pentavalent (DPT-HepB-Hib)", "10w", "male"),
      female: getDoseSex("Pentavalent (DPT-HepB-Hib)", "10w", "female"),
      total:
        summary.immunization.penta2_total ??
        getDoseTotal("Pentavalent (DPT-HepB-Hib)", "10w"),
    },
    {
      code: "6.",
      label: "DPT-HiB-HepB 3 - Total",
      male: getDoseSex("Pentavalent (DPT-HepB-Hib)", "14w", "male"),
      female: getDoseSex("Pentavalent (DPT-HepB-Hib)", "14w", "female"),
      total:
        summary.immunization.penta3_total ??
        getDoseTotal("Pentavalent (DPT-HepB-Hib)", "14w"),
    },
    {
      code: "7.",
      label: "OPV 1 - Total",
      male: getDoseSex("Oral Polio Vaccine (OPV)", "6w", "male"),
      female: getDoseSex("Oral Polio Vaccine (OPV)", "6w", "female"),
      total: summary.immunization.opv1_total ?? getDoseTotal("Oral Polio Vaccine (OPV)", "6w"),
    },
    {
      code: "8.",
      label: "OPV 2 - Total",
      male: getDoseSex("Oral Polio Vaccine (OPV)", "10w", "male"),
      female: getDoseSex("Oral Polio Vaccine (OPV)", "10w", "female"),
      total: summary.immunization.opv2_total ?? getDoseTotal("Oral Polio Vaccine (OPV)", "10w"),
    },
    {
      code: "9.",
      label: "OPV 3 - Total",
      male: getDoseSex("Oral Polio Vaccine (OPV)", "14w", "male"),
      female: getDoseSex("Oral Polio Vaccine (OPV)", "14w", "female"),
      total: summary.immunization.opv3_total ?? getDoseTotal("Oral Polio Vaccine (OPV)", "14w"),
    },
    {
      code: "10.",
      label: "IPV 1 - Total",
      male: getDoseSex("Inactivated Polio Vaccine (IPV)", "14w", "male"),
      female: getDoseSex("Inactivated Polio Vaccine (IPV)", "14w", "female"),
      total:
        summary.immunization.ipv1_total ??
        getDoseTotal("Inactivated Polio Vaccine (IPV)", "14w"),
    },
    {
      code: "11.",
      label: "IPV 2 (routine) - Total",
      male: null,
      female: null,
      total: summary.immunization.ipv2_routine_total ?? null,
    },
    {
      code: "12.",
      label: "IPV 2 (catch up) - Total",
      male: null,
      female: null,
      total: summary.immunization.ipv2_catchup_total ?? null,
    },
    {
      code: "13.",
      label: "PCV 1 - Total",
      male: getDoseSex("Pneumococcal Conjugate Vaccine PCV", "6w", "male"),
      female: getDoseSex("Pneumococcal Conjugate Vaccine PCV", "6w", "female"),
      total:
        summary.immunization.pcv1_total ??
        getDoseTotal("Pneumococcal Conjugate Vaccine PCV", "6w"),
    },
    {
      code: "14.",
      label: "PCV 2 - Total",
      male: getDoseSex("Pneumococcal Conjugate Vaccine PCV", "10w", "male"),
      female: getDoseSex("Pneumococcal Conjugate Vaccine PCV", "10w", "female"),
      total:
        summary.immunization.pcv2_total ??
        getDoseTotal("Pneumococcal Conjugate Vaccine PCV", "10w"),
    },
    {
      code: "15.",
      label: "PCV 3 - Total",
      male: getDoseSex("Pneumococcal Conjugate Vaccine PCV", "14w", "male"),
      female: getDoseSex("Pneumococcal Conjugate Vaccine PCV", "14w", "female"),
      total:
        summary.immunization.pcv3_total ??
        getDoseTotal("Pneumococcal Conjugate Vaccine PCV", "14w"),
    },
    {
      code: "16.",
      label: "MCV 1 - Total",
      male: getDoseSex("Measles, Mumps, Rubella (MMR)", "9m", "male"),
      female: getDoseSex("Measles, Mumps, Rubella (MMR)", "9m", "female"),
      total:
        summary.immunization.mcv1_total ??
        getDoseTotal("Measles, Mumps, Rubella (MMR)", "9m"),
    },
    {
      code: "17.",
      label: "MCV 2 - Total",
      male: getDoseSex("Measles, Mumps, Rubella (MMR)", "12m", "male"),
      female: getDoseSex("Measles, Mumps, Rubella (MMR)", "12m", "female"),
      total:
        summary.immunization.mcv2_total ??
        getDoseTotal("Measles, Mumps, Rubella (MMR)", "12m"),
    },
    {
      code: "18.",
      label: "FIC - Total",
      male: null,
      female: null,
      total:
        summary.immunization.fic_total ??
        summary.immunization.fully_immunized_patients ??
        null,
    },
    {
      code: "19.",
      label: "CIC - Total",
      male: null,
      female: null,
      total: summary.immunization.cic_total ?? null,
    },
    {
      code: "20.",
      label: "Td, Grade 1 (Month) - Total",
      male: null,
      female: null,
      total: summary.immunization.td_grade1_total ?? null,
    },
    {
      code: "21.",
      label: "MR, Grade 1 (Month) - Total",
      male: null,
      female: null,
      total: summary.immunization.mr_grade1_total ?? null,
    },
    {
      code: "22.",
      label: "Td, Grade 7 (Month) - Total",
      male: null,
      female: null,
      total: summary.immunization.td_grade7_total ?? null,
    },
    {
      code: "23.",
      label: "MR, Grade 7 (Month) - Total",
      male: null,
      female: null,
      total: summary.immunization.mr_grade7_total ?? null,
    },
  ];

  const c2ChildNutritionRows = [
    {
      code: "24.",
      indicator:
        "Newborns initiated on breastfeeding immediately after birth lasting to 90 mins - Total",
      total: summary.child_nutrition?.bf_initiated_early_total ?? null,
    },
    {
      code: "25.",
      indicator:
        "Preterm / low-birth-weight infants given iron supplementation - Total",
      total: summary.child_nutrition?.preterm_iron_total ?? null,
    },
    {
      code: "26.",
      indicator:
        "Infants exclusively breastfed until 5th month and 29 days - Total",
      total: summary.child_nutrition?.ebf_0_5_total ?? null,
    },
    {
      code: "27.",
      indicator:
        "Infants 6 mos. old initiated to complementary feeding with continued breastfeeding - Total",
      total: summary.child_nutrition?.comp_feed_with_bf_total ?? null,
    },
    {
      code: "28.",
      indicator:
        "Infants 6 mos. old initiated to complementary feeding but no longer / never breastfed - Total",
      total: summary.child_nutrition?.comp_feed_no_bf_total ?? null,
    },
    {
      code: "29.",
      indicator:
        "Infants 6–11 mos. given 1 dose of Vitamin A 100,000 I.U. - Total",
      total: summary.child_nutrition?.vitA_6_11_total ?? null,
    },
    {
      code: "30.",
      indicator:
        "Children 12–59 mos. given 2 doses of Vitamin A 200,000 I.U. - Total",
      total: summary.child_nutrition?.vitA_12_59_total ?? null,
    },
    {
      code: "31.",
      indicator:
        "Infants 6–11 months old who completed MNP supplementation - Total",
      total: summary.child_nutrition?.mnp_6_11_completed_total ?? null,
    },
    {
      code: "32.",
      indicator:
        "Children 12–23 months old who completed MNP supplementation - Total",
      total: summary.child_nutrition?.mnp_12_23_completed_total ?? null,
    },
    { code: "33.", indicator: "Stunted - Total", total: summary.child_nutrition?.stunted_total ?? null },
    { code: "34.", indicator: "Wasted - Total", total: summary.child_nutrition?.wasted_total ?? null },
    { code: "34.a", indicator: "MAM - Total", total: summary.child_nutrition?.mam_total ?? null },
    {
      code: "34.a.1",
      indicator: "MAM - admitted in SFT - Total",
      total: summary.child_nutrition?.mam_sft_admitted_total ?? null,
    },
    {
      code: "34.a.2",
      indicator: "MAM - cured in SFT - Total",
      total: summary.child_nutrition?.mam_sft_cured_total ?? null,
    },
    {
      code: "34.a.3",
      indicator: "MAM - defaulted in SFT - Total",
      total: summary.child_nutrition?.mam_sft_defaulted_total ?? null,
    },
    {
      code: "34.a.4",
      indicator: "MAM - died in SFT - Total",
      total: summary.child_nutrition?.mam_sft_died_total ?? null,
    },
    { code: "34.b", indicator: "SAM - Total", total: summary.child_nutrition?.sam_total ?? null },
    {
      code: "34.b.1",
      indicator: "SAM - admitted in OCT - Total",
      total: summary.child_nutrition?.sam_oct_admitted_total ?? null,
    },
    {
      code: "34.b.2",
      indicator: "SAM - cured in OCT - Total",
      total: summary.child_nutrition?.sam_oct_cured_total ?? null,
    },
    {
      code: "34.b.3",
      indicator: "SAM - defaulted in OCT - Total",
      total: summary.child_nutrition?.sam_oct_defaulted_total ?? null,
    },
    {
      code: "34.b.4",
      indicator: "SAM - died in OCT - Total",
      total: summary.child_nutrition?.sam_oct_died_total ?? null,
    },
    {
      code: "35.",
      indicator: "Overweight and Obese - Total",
      total: summary.child_nutrition?.overweight_obese_total ?? null,
    },
    { code: "36.", indicator: "Normal - Total", total: summary.child_nutrition?.normal_total ?? null },
  ];

  const c3ChildDewormingRows = [
    {
      code: "37.",
      indicator: "1–19 y/o given 2 doses of deworming drug - Total",
      total: summary.child_deworming?.overall_1_19_2doses_total ?? null,
    },
    {
      code: "37.a",
      indicator: "PSAC, 1–4 y/o dewormed (2 doses) - Total",
      total: summary.child_deworming?.psac_1_4_2doses_total ?? null,
    },
    {
      code: "37.b",
      indicator: "SAC, 5–9 y/o dewormed (2 doses) - Total",
      total: summary.child_deworming?.sac_5_9_2doses_total ?? null,
    },
    {
      code: "37.c",
      indicator: "Adolescents, 10–19 y/o dewormed (2 doses) - Total",
      total: summary.child_deworming?.adolescents_10_19_2doses_total ?? null,
    },
  ];

  const c4SickChildRows = [
    {
      code: "38.",
      indicator: "Sick infants 6–11 mos. old seen - Total",
      total: summary.child_sick?.sick_6_11_seen_total ?? null,
    },
    {
      code: "39.",
      indicator: "Sick infants 6–11 mos. old received Vitamin A - Total",
      total: summary.child_sick?.sick_6_11_vita_total ?? null,
    },
    {
      code: "40.",
      indicator: "Sick children 12–59 mos. old seen - Total",
      total: summary.child_sick?.sick_12_59_seen_total ?? null,
    },
    {
      code: "41.",
      indicator: "Sick children 12–59 mos. old received Vitamin A - Total",
      total: summary.child_sick?.sick_12_59_vita_total ?? null,
    },
    {
      code: "42.",
      indicator: "Diarrhea cases 0–59 months old seen - Total",
      total: summary.child_sick?.diarrhea_total ?? null,
    },
    {
      code: "43.",
      indicator: "Diarrhea cases 0–59 months old received ORS - Total",
      total: summary.child_sick?.diarrhea_ors_total ?? null,
    },
    {
      code: "44.",
      indicator: "Diarrhea cases 0–59 months old received ORS with zinc - Total",
      total: summary.child_sick?.diarrhea_ors_zinc_total ?? null,
    },
    {
      code: "45.",
      indicator: "Pneumonia cases 0–59 months old seen - Total",
      total: summary.child_sick?.pneumonia_total ?? null,
    },
    {
      code: "46.",
      indicator: "Pneumonia cases 0–59 months old completed treatment - Total",
      total: summary.child_sick?.pneumonia_completed_total ?? null,
    },
  ];

  type M1Row = {
    code: string;
    indicator: string;
    age10_14?: number | null;
    age15_19?: number | null;
    age20_49?: number | null;
    total?: number | null;
  };

  const m1B1PrenatalRows: M1Row[] = [
    {
      code: "1.",
      indicator:
        "No. of pregnant women who gave birth with at least 4 prenatal check-ups - Total",
      age10_14: summary.prenatal.fourplus_10_14_total ?? null,
      age15_19: summary.prenatal.fourplus_15_19_total ?? null,
      age20_49: summary.prenatal.fourplus_20_49_total ?? null,
      total: summary.prenatal.patients_with_4plus_visits ?? null,
    },
    {
      code: "2.",
      indicator:
        "No. of pregnant women seen of their nutritional status during the 1st trimester - Total",
      age10_14: summary.prenatal.bmi_assessed_10_14_total ?? null,
      age15_19: summary.prenatal.bmi_assessed_15_19_total ?? null,
      age20_49: summary.prenatal.bmi_assessed_20_49_total ?? null,
      total: summary.prenatal.bmi_assessed_total ?? null,
    },
    {
      code: "a.",
      indicator:
        "No. of pregnant women seen in their first trimester who have normal BMI - Total",
      total: summary.prenatal.bmi_normal_total ?? null,
    },
    {
      code: "b.",
      indicator:
        "No. of pregnant women seen in their first trimester who have low BMI - Total",
      total: summary.prenatal.bmi_low_total ?? null,
    },
    {
      code: "c.",
      indicator:
        "No. of pregnant women seen in their first trimester who have high BMI - Total",
      total: summary.prenatal.bmi_high_total ?? null,
    },
    {
      code: "4.",
      indicator:
        "No. of pregnant women for the 2nd or more times given at least 3 doses of Td vaccination (Td2 Plus) - Total",
      total: summary.prenatal.tt2_plus_patients ?? null,
    },
    {
      code: "5.",
      indicator:
        "No. of pregnant women who completed the dose of iron with folic acid supplementation - Total",
      total: summary.prenatal.iron_folate_completed_total ?? null,
    },
    {
      code: "6.",
      indicator:
        "No. of pregnant women who completed doses of calcium carbonate supplementation - Total",
      total: summary.prenatal.calcium_completed_total ?? null,
    },
    {
      code: "7.",
      indicator: "No. of pregnant women given iodine capsules - Total",
      total: summary.prenatal.iodine_capsule_total ?? null,
    },
    {
      code: "8.",
      indicator: "No. of pregnant women given one dose of deworming tablet - Total",
      total: summary.prenatal.deworm_tablet_total ?? null,
    },
    {
      code: "9.",
      indicator: "No. of pregnant women screened for syphilis - Total",
      total: summary.prenatal.screened_syphilis_total ?? null,
    },
    {
      code: "10.",
      indicator: "No. of pregnant women tested positive for syphilis - Total",
      total: summary.prenatal.positive_syphilis_total ?? null,
    },
    {
      code: "11.",
      indicator: "No. of pregnant women screened for Hepatitis B - Total",
      total: summary.prenatal.screened_hepb_total ?? null,
    },
    {
      code: "12.",
      indicator: "No. of pregnant women tested positive for Hepatitis B - Total",
      total: summary.prenatal.positive_hepb_total ?? null,
    },
    {
      code: "13.",
      indicator: "No. of pregnant women screened for HIV - Total",
      total: summary.prenatal.screened_hiv_total ?? null,
    },
    {
      code: "14.",
      indicator: "No. of pregnant women tested for CBC or Hgb & Hct count - Total",
      total: summary.prenatal.tested_cbc_total ?? null,
    },
    {
      code: "15.",
      indicator:
        "No. of pregnant women tested for CBC or Hgb & Hct count diagnosed with anemia - Total",
      total: summary.prenatal.anemia_total ?? null,
    },
    {
      code: "16.",
      indicator: "No. of pregnant women screened for gestational diabetes - Total",
      total: summary.prenatal.screened_gdm_total ?? null,
    },
    {
      code: "17.",
      indicator: "No. of pregnant women tested positive for gestational diabetes - Total",
      total: summary.prenatal.positive_gdm_total ?? null,
    },
  ];

  const m1B2DeliveryRows: M1Row[] = [
    { code: "18.", indicator: "No. of deliveries - Total", total: summary.delivery?.deliveries_total ?? null },
    { code: "19.", indicator: "No. of live births - Total", total: summary.delivery?.livebirths_total ?? null },
    { code: "19.a", indicator: "No. of live births with normal birth weight - Total", total: summary.delivery?.normal_birth_weight_total ?? null },
    { code: "19.b", indicator: "No. of live births with low birth weight - Total", total: summary.delivery?.low_birth_weight_total ?? null },
    { code: "19.c", indicator: "No. of live births with unknown birth weight - Total", total: summary.delivery?.unknown_birth_weight_total ?? null },
    { code: "20.", indicator: "No. of deliveries attended by skilled health professionals - Total", total: summary.delivery?.skilled_birth_attendant_total ?? null },
    { code: "20.a", indicator: "No. of deliveries attended by a doctor - Total", total: summary.delivery?.attended_by_doctor_total ?? null },
    { code: "20.b", indicator: "No. of deliveries attended by a nurse - Total", total: summary.delivery?.attended_by_nurse_total ?? null },
    { code: "20.c", indicator: "No. of deliveries attended by midwives - Total", total: summary.delivery?.attended_by_midwife_total ?? null },
    { code: "21.", indicator: "No. of health facility-based deliveries - Total", total: summary.delivery?.facility_deliveries_total ?? null },
    { code: "21.a", indicator: "No. of deliveries in public health facility - Total", total: summary.delivery?.public_facility_deliveries_total ?? null },
    { code: "21.b", indicator: "No. of deliveries in private health facility - Total", total: summary.delivery?.private_facility_deliveries_total ?? null },
    { code: "22.", indicator: "No. of non-facility-based deliveries - Total", total: summary.delivery?.non_facility_deliveries_total ?? null },
    { code: "23.a", indicator: "No. of vaginal deliveries - Total", total: summary.delivery?.vaginal_deliveries_total ?? null },
    { code: "23.b", indicator: "No. of deliveries by caesarean section - Total", total: summary.delivery?.cesarean_deliveries_total ?? null },
    { code: "24.a", indicator: "No. of full-term births - Total", total: summary.delivery?.fullterm_births_total ?? null },
    { code: "24.b", indicator: "No. of pre-term births - Total", total: summary.delivery?.preterm_births_total ?? null },
    { code: "24.c", indicator: "No. of fetal deaths - Total", total: summary.delivery?.fetal_deaths_total ?? null },
    { code: "24.d", indicator: "No. of abortion / miscarriage - Total", total: summary.delivery?.abortions_miscarriages_total ?? null },
  ];

  const m1B3PostpartumRows: M1Row[] = [
    {
      code: "25.",
      indicator:
        "No. of postpartum women together with their newborn who completed at least 2 postpartum check-ups - Total",
      total: summary.postnatal.with_2plus_checkups ?? null,
    },
    {
      code: "26.",
      indicator:
        "No. of postpartum women who completed iron with folic acid supplementation - Total",
      total: summary.postnatal.iron_folate_patients ?? null,
    },
    {
      code: "27.",
      indicator: "No. of postpartum women with Vitamin A supplementation - Total",
      total: summary.postnatal.vitamin_a_patients ?? null,
    },
  ];

  const monthlyChildRows = [
    ...c1ImmunizationDoseRows.map((r) => ({ __key: `c1-${r.code}`, ...r })),
    ...c2ChildNutritionRows.map((r) => ({
      __key: `c2-${r.code}`,
      code: r.code,
      label: r.indicator,
      male: null,
      female: null,
      total: r.total,
    })),
    ...c3ChildDewormingRows.map((r) => ({
      __key: `c3-${r.code}`,
      code: r.code,
      label: r.indicator,
      male: null,
      female: null,
      total: r.total,
    })),
    ...c4SickChildRows.map((r) => ({
      __key: `c4-${r.code}`,
      code: r.code,
      label: r.indicator,
      male: null,
      female: null,
      total: r.total,
    })),
  ];

  const monthlyChildGroupHeaders = [
    { index: 0, label: "C1. Immunization Services for Newborns, Infants and School-Aged Children / Adolescents" },
    { index: c1ImmunizationDoseRows.length, label: "C2. Nutrition Services for Infants and Children" },
    { index: c1ImmunizationDoseRows.length + c2ChildNutritionRows.length, label: "C3. Deworming Services for Infants, Children and Adolescents" },
    { index: c1ImmunizationDoseRows.length + c2ChildNutritionRows.length + c3ChildDewormingRows.length, label: "C4. Management of Sick Infants and Children" },
  ];

  const maternalRows = [
    ...m1B1PrenatalRows.map((r) => ({ __key: `b1-${r.code}`, ...r })),
    ...m1B2DeliveryRows.map((r) => ({ __key: `b2-${r.code}`, ...r })),
    ...m1B3PostpartumRows.map((r) => ({ __key: `b3-${r.code}`, ...r })),
  ];

  const maternalGroupHeaders = [
    { index: 0, label: "B1. Prenatal Care" },
    { index: m1B1PrenatalRows.length, label: "B2. Intrapartum Care and Delivery Outcome" },
    { index: m1B1PrenatalRows.length + m1B2DeliveryRows.length, label: "B3. Postpartum and Newborn Care" },
  ];

  return (
    <>
      <Head title="Health Center Reports" />

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        html {
          scroll-behavior: smooth;
        }
        @media (prefers-reduced-motion: reduce) {
          html { scroll-behavior: auto; }
        }
      `}</style>

      <PageShell>
        <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
          <div className="mx-auto max-w-7xl px-3 py-3 sm:px-6 sm:py-4 lg:px-8">
            <div className="flex flex-col gap-3 sm:gap-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex items-start gap-2.5 sm:items-center sm:gap-3">
                    <button
                      type="button"
                      onClick={() => window.history.back()}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-teal-500/15 sm:h-10 sm:w-10"
                      aria-label="Go back"
                    >
                      <img src={BackIcon} alt="" className="h-4 w-4 opacity-80" />
                    </button>

                    <div className="flex min-w-0 items-start gap-2.5 sm:items-center sm:gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 ring-1 ring-teal-100 sm:h-12 sm:w-12 sm:rounded-2xl">
                        <img src={Logo} alt="ONE HEALTH" className="h-7 w-auto sm:h-8" />
                      </div>

                      <div className="min-w-0">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-700 sm:text-[11px]">
                          ONE HEALTH
                        </div>
                        <h1 className="truncate text-lg font-bold tracking-tight text-slate-900 sm:text-2xl">
                          Health Center Reports
                        </h1>
                        <p className="mt-0.5 max-w-2xl text-xs text-slate-500 sm:text-sm">
                          {tab === "monthly"
                            ? "Monthly report view for child and maternal health indicators."
                            : "Summary view with quick statistics and breakdown tables."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <div className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-2 text-[11px] font-medium text-slate-700 shadow-sm sm:text-xs">
                    <span className="mr-2 h-2 w-2 rounded-full bg-teal-500" />
                    {tab === "monthly" ? "Monthly Report" : "Extras Summary"}
                  </div>

                  {tab === "monthly" && (
                    <div className="inline-flex max-w-full items-center rounded-full border border-teal-200 bg-teal-50 px-3 py-2 text-[11px] font-semibold text-teal-800 shadow-sm sm:text-xs">
                      <span className="truncate">
                        Barangay: {loggedInHealthCenterName ?? loggedInHealthCenterId ?? "Logged-in"}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="sm:hidden">
                <button
                  type="button"
                  onClick={() => setFiltersOpen((prev) => !prev)}
                  aria-expanded={filtersOpen}
                  className="inline-flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm"
                >
                  <span>{filtersOpen ? "Hide filters" : "Show filters"}</span>
                  <svg
                    viewBox="0 0 20 20"
                    className={cn("h-5 w-5 transition-transform", filtersOpen ? "rotate-180" : "")}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M5 7.5 10 12.5 15 7.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>

              <GlassCard
                className={cn(
                  "overflow-hidden",
                  !filtersOpen && "hidden sm:block"
                )}
              >
                <div className="p-3 sm:p-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <FilterField label="Month">
                      <select
                        value={selectedMonth}
                        onChange={(e) => {
                          const value = e.target.value;
                          setSelectedMonth(value);
                          if (tab === "monthly") applyFiltersMonthly(value, selectedYear);
                          else applyFiltersExtras(value, selectedYear, extrasHealthCenterId);
                        }}
                        className={SelectBaseClass}
                        aria-label="Select month"
                      >
                        {monthOptions.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </FilterField>

                    <FilterField label="Year">
                      <select
                        value={selectedYear}
                        onChange={(e) => {
                          const value = e.target.value;
                          setSelectedYear(value);
                          if (tab === "monthly") applyFiltersMonthly(selectedMonth, value);
                          else applyFiltersExtras(selectedMonth, value, extrasHealthCenterId);
                        }}
                        className={SelectBaseClass}
                        aria-label="Select year"
                      >
                        {yearOptions.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </FilterField>

                    {tab === "extras" && (
                      <FilterField label="Health Center (Barangay)">
                        <select
                          value={extrasHealthCenterId}
                          onChange={(e) => {
                            const value = e.target.value;
                            setExtrasHealthCenterId(value);
                            applyFiltersExtras(selectedMonth, selectedYear, value);
                          }}
                          className={SelectBaseClass}
                          aria-label="Select health center"
                        >
                          <option value="">All health centers</option>
                          {BAYANI_CLUSTER_HEALTH_CENTERS.map((hc) => (
                            <option key={hc.id} value={hc.id}>
                              {hc.name}
                            </option>
                          ))}
                        </select>
                      </FilterField>
                    )}

                    <div className="flex items-end">
                      <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                        <div className="font-medium text-slate-900">Viewing period</div>
                        <div className="mt-1 break-words text-xs sm:text-sm">
                          {monthOptions.find((m) => m.value === selectedMonth)?.label} {selectedYear}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
          <div className={cn("space-y-4 sm:space-y-6", revealClass)}>
            <Tabs
              value={tab}
              onChange={(v) => onTabChange(v as TabKey)}
              items={[
                { value: "monthly", label: "Monthly Report", hint: "" },
                { value: "extras", label: "Extras", hint: "" },
              ]}
            />

            {tab === "monthly" && (
              <div
                id="panel-monthly"
                role="tabpanel"
                aria-labelledby="tab-monthly"
                className="space-y-4 sm:space-y-6"
              >
                <CollapsibleSection
                  title="Child Health (M2)"
                  subtitle="Monthly counts for child immunization, nutrition, deworming, and management of sick infants and children."
                  open={childHealthOpen}
                  onToggle={() => setChildHealthOpen((prev) => !prev)}
                >
                  <BigReportTable
                    columns={[
                      { key: "label", label: "Indicators", className: "min-w-[320px] sm:min-w-[380px]" },
                      { key: "male", label: "Male", className: "text-right whitespace-nowrap" },
                      { key: "female", label: "Female", className: "text-right whitespace-nowrap" },
                      { key: "total", label: "Total", className: "text-right whitespace-nowrap" },
                    ]}
                    rows={monthlyChildRows.map((r) => ({
                      ...r,
                      label: (
                        <div>
                          <span className="mr-2 font-semibold">{r.code}</span>
                          <span>{r.label}</span>
                        </div>
                      ),
                    }))}
                    groupHeaders={monthlyChildGroupHeaders}
                  />
                </CollapsibleSection>

                <CollapsibleSection
                  title="Maternal Care (M1)"
                  subtitle="Age-disaggregated where required, with totals for delivery and postpartum indicators."
                  open={maternalCareOpen}
                  onToggle={() => setMaternalCareOpen((prev) => !prev)}
                >
                  <BigReportTable
                    columns={[
                      { key: "indicator", label: "Indicators", className: "min-w-[340px] sm:min-w-[420px]" },
                      { key: "age10_14", label: "Age 10–14", className: "text-right whitespace-nowrap" },
                      { key: "age15_19", label: "Age 15–19", className: "text-right whitespace-nowrap" },
                      { key: "age20_49", label: "Age 20–49", className: "text-right whitespace-nowrap" },
                      { key: "total", label: "Total", className: "text-right whitespace-nowrap" },
                    ]}
                    rows={maternalRows.map((r) => ({
                      ...r,
                      indicator: (
                        <div>
                          <span className="mr-2 font-semibold">{r.code}</span>
                          <span>{r.indicator}</span>
                        </div>
                      ),
                    }))}
                    groupHeaders={maternalGroupHeaders}
                  />
                </CollapsibleSection>
              </div>
            )}

            {tab === "extras" && (
              <div
                id="panel-extras"
                role="tabpanel"
                aria-labelledby="tab-extras"
                className="space-y-4 sm:space-y-6"
              >
                <section className="grid grid-cols-1 gap-3 xs:grid-cols-2 xl:grid-cols-4">
                  <StatCard
                    label="Immunization Patients"
                    value={summary.immunization.total_patients}
                    hint="With at least one dose"
                    accent="teal"
                  />
                  <StatCard
                    label="Fully Immunized Patients"
                    value={summary.immunization.fully_immunized_patients}
                    hint="Full child schedule"
                    accent="emerald"
                  />
                  <StatCard
                    label="Immunization Doses Given"
                    value={summary.immunization.total_records}
                    hint="All recorded doses"
                    accent="blue"
                  />
                  <StatCard
                    label="Pregnant Patients"
                    value={summary.prenatal.total_pregnant_patients}
                    hint="Pregnant patient count"
                    accent="amber"
                  />
                  <StatCard
                    label="Prenatal Visits"
                    value={summary.prenatal.total_visits}
                    hint="Recorded prenatal visits"
                    accent="teal"
                  />
                  <StatCard
                    label="Patients with ≥4 Prenatal Visits"
                    value={summary.prenatal.patients_with_4plus_visits}
                    hint="DOH target coverage"
                    accent="emerald"
                  />
                  <StatCard
                    label="Postnatal Records"
                    value={summary.postnatal.total_records}
                    hint="After-delivery follow-ups"
                    accent="blue"
                  />
                  <StatCard
                    label="HBM Current Pregnancy"
                    value={summary.hbm_current.total_records}
                    hint="Current pregnancy records"
                    accent="amber"
                  />
                </section>

                <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                  <SectionCard
                    title="Patients Summary"
                    subtitle="Quick overview of patient types and barangay distribution for the selected period."
                  >
                    <div className="space-y-4 sm:space-y-5">
                      <div>
                        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          By patient type
                        </div>
                        <SimpleTable
                          columns={[
                            { key: "patient_type", label: "Type" },
                            { key: "total", label: "Total", className: "text-right" },
                          ]}
                          rows={summary.patients.by_type.map((r) => ({
                            patient_type: r.patient_type || "—",
                            total: r.total,
                          }))}
                          emptyLabel="No patient type data."
                        />
                      </div>

                      <div>
                        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          By barangay
                        </div>
                        <SimpleTable
                          columns={[
                            { key: "barangay", label: "Barangay" },
                            { key: "total", label: "Total", className: "text-right" },
                          ]}
                          rows={sortedPatientsByBarangay.map((r) => ({
                            barangay: r.barangay || "—",
                            total: r.total,
                          }))}
                          emptyLabel="No barangay data."
                        />
                      </div>
                    </div>
                  </SectionCard>

                  <div className="space-y-4 sm:space-y-6">
                    <SectionCard
                      title="Maternal Care Snapshot"
                      subtitle="Useful summary tables for prenatal and postpartum records."
                    >
                      <div className="space-y-4 sm:space-y-5">
                        <div>
                          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                            Prenatal visits by trimester
                          </div>
                          <SimpleTable
                            columns={[
                              { key: "trimester", label: "Trimester" },
                              { key: "patients", label: "Patients", className: "text-right" },
                            ]}
                            rows={summary.prenatal.by_trimester.map((r) => ({
                              trimester: r.trimester || "Not set",
                              patients: r.patients,
                            }))}
                            emptyLabel="No prenatal visit data for this period."
                          />
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:rounded-2xl sm:p-4">
                          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                            Postpartum & HBM snapshot
                          </h3>

                          <div className="mt-4 space-y-2.5 text-sm sm:space-y-3">
                            {[
                              {
                                label: "Total postnatal records",
                                value: summary.postnatal.total_records,
                              },
                              {
                                label: "Exclusive breastfeeding (yes)",
                                value: summary.postnatal.exclusive_breastfeeding,
                              },
                              {
                                label: "Postpartum with ≥2 check-ups",
                                value: summary.postnatal.with_2plus_checkups ?? "—",
                              },
                              {
                                label: "Postpartum Vit A given",
                                value: summary.postnatal.vitamin_a_patients ?? "—",
                              },
                              {
                                label: "Postpartum iron + folate",
                                value: summary.postnatal.iron_folate_patients ?? "—",
                              },
                              {
                                label: "HBM current pregnancy records",
                                value: summary.hbm_current.total_records,
                              },
                            ].map((item) => (
                              <div
                                key={item.label}
                                className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2.5"
                              >
                                <span className="text-xs text-slate-600 sm:text-sm">{item.label}</span>
                                <span className="text-sm font-semibold text-slate-900">{item.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </SectionCard>

                    {summary.immunization.by_vaccine?.length > 0 ? (
                      <SectionCard
                        title="Immunization by Vaccine"
                        subtitle="Recorded doses and unique patients by vaccine type."
                      >
                        <SimpleTable
                          columns={[
                            { key: "vaccine", label: "Vaccine" },
                            { key: "total_doses", label: "Total Doses", className: "text-right" },
                            { key: "patients", label: "Patients", className: "text-right" },
                          ]}
                          rows={summary.immunization.by_vaccine}
                          emptyLabel="No vaccine data."
                        />
                      </SectionCard>
                    ) : (
                      <EmptyPanel label="No immunization vaccine breakdown available for this period." />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        <BackToTopButton />
      </PageShell>
    </>
  );
}