// resources/js/components/prenatal/ITRTab.tsx
import * as React from "react";
import { motion } from "framer-motion";
import { PageWrap } from "./itr/itr-shared";
import ITRPregnancyDetails from "./itr/ITRPregnancyDetails";
import ITRTTVitA from "./itr/ITRTTVitA";
import ITRVisits from "./itr/ITRVisits";
import ITRBirthPlan from "./itr/ITRBirthPlan";

/* ───────── Tiny outline icons ───────── */
const IconDetails = (p: any) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    {...p}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <path d="M8 7h8M8 12h8M8 17h5" />
  </svg>
);
const IconSyringe = (p: any) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    {...p}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <path d="M18 2l4 4M2 22l7-7M14 6l4 4M3 21l6-6M10 8l6 6M7 11l6 6" />
    <path d="M16 8l2-2M11 13l2-2" />
  </svg>
);
const IconCalendarCheck = (p: any) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    {...p}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
    <path d="M9 15l2 2 4-4" />
  </svg>
);
const IconPlan = (p: any) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    {...p}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <path d="M3 6l7-3 7 3 4-2v14l-4 2-7-3-7 3V4z" />
    <path d="M10 8h4M10 12h4M10 16h4" />
  </svg>
);

/* ───────── Types / theme ───────── */
type TabKey = "details" | "tt" | "visits" | "plan";
const TEAL = "#0F8A99";

type ITRTabProps = {
  patientId: number;
  itr?: any; // optional hydration snapshot
  plan: any | null;
  visits: any[];
  token?: string | null;
  onDirtyChange?: (dirty: boolean) => void;
};

// Read initial ITR sub-tab from ?itr_sub=... in the URL
const getInitialTabFromUrl = (): TabKey => {
  if (typeof window === "undefined") return "details";

  try {
    const url = new URL(window.location.href);
    const raw = url.searchParams.get("itr_sub");

    if (raw === "details" || raw === "tt" || raw === "visits" || raw === "plan") {
      return raw;
    }
  } catch {
    // ignore – fall back to default
  }

  return "details";
};

export default function ITRTab({
  patientId,
  itr,
  plan,
  visits,
  token,
  onDirtyChange,
}: ITRTabProps) {
  // Initialize from ?itr_sub=... so refresh keeps the current sub-tab
  const [tab, setTab] = React.useState<TabKey>(() => getInitialTabFromUrl());
  const [dirty, setDirty] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement | null>(null);

  // Notify parent when dirty state changes
  React.useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  // Keep ?itr_sub=... in the URL in sync with the current ITR sub-tab
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const url = new URL(window.location.href);

      if (tab === "details") {
        // For the default tab we can drop the param to keep URL clean
        url.searchParams.delete("itr_sub");
      } else {
        url.searchParams.set("itr_sub", tab);
      }

      // Replace current history entry without reloading the page
      window.history.replaceState({}, "", url.toString());
    } catch {
      // ignore URL errors
    }
  }, [tab]);

  // Mark dirty on any input/change inside the ITR area
  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const markDirty = () => setDirty(true);
    el.addEventListener("input", markDirty, { passive: true });
    el.addEventListener("change", markDirty, { passive: true });

    return () => {
      el.removeEventListener("input", markDirty as any);
      el.removeEventListener("change", markDirty as any);
    };
  }, []);

  // Allow children to reset via: window.dispatchEvent(new CustomEvent("itr:saved"))
  React.useEffect(() => {
    const handler = () => setDirty(false);
    window.addEventListener("itr:saved", handler as EventListener);
    window.addEventListener("itr:clean", handler as EventListener);
    return () => {
      window.removeEventListener("itr:saved", handler as EventListener);
      window.removeEventListener("itr:clean", handler as EventListener);
    };
  }, []);

  const items: ReadonlyArray<{
    key: TabKey;
    label: string;
    abbr: string;
    icon: React.ReactNode;
  }> = [
    { key: "details", label: "Pregnancy Details", abbr: "PD", icon: <IconDetails className="h-4 w-4" /> },
    {
      key: "tt",
      label: "Tetanus Toxoid & Vitamin A",
      abbr: "TT/VitA",
      icon: <IconSyringe className="h-4 w-4" />,
    },
    { key: "visits", label: "Visits", abbr: "VIS", icon: <IconCalendarCheck className="h-4 w-4" /> },
    { key: "plan", label: "Birth Plan", abbr: "BP", icon: <IconPlan className="h-4 w-4" /> },
  ];

  const titleOf = (k: TabKey) => items.find((i) => i.key === k)?.label ?? k;
  const iconOf = (k: TabKey) => items.find((i) => i.key === k)?.icon ?? null;

  return (
    <PageWrap>
      {/* Sub-tabs */}
      <div className="px-1 sm:px-0">
        <div className="mt-2 sticky top-[64px] z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
          <TabsBar items={items} value={tab} onChange={setTab} />
        </div>
      </div>

      {/* Content */}
      <div
        ref={wrapRef}
        className="mt-3 space-y-4 text-[15px] leading-[1.55]"
        aria-live="polite"
      >
        {tab === "details" && (
          <CardSection title={titleOf("details")} icon={iconOf("details")}>
            <div className="w-full overflow-x-auto">
              {/* If your details component supports it, you may pass initial={itr} */}
              <ITRPregnancyDetails patientId={patientId} />
            </div>
          </CardSection>
        )}

        {tab === "tt" && (
          <CardSection title={titleOf("tt")} icon={iconOf("tt")}>
            <div className="w-full overflow-x-auto">
              <ITRTTVitA patientId={patientId} />
            </div>
          </CardSection>
        )}

        {tab === "visits" && (
          <CardSection title={titleOf("visits")} icon={iconOf("visits")}>
            <div className="w-full overflow-x-auto">
              <ITRVisits patientId={patientId} rows={visits} />
            </div>
          </CardSection>
        )}

        {tab === "plan" && (
          <CardSection title={titleOf("plan")} icon={iconOf("plan")}>
            <div className="w-full overflow-x-auto">
              <ITRBirthPlan patientId={patientId} plan={plan} />
            </div>
          </CardSection>
        )}
      </div>
    </PageWrap>
  );
}

/* ------------------------------ Tabs Bar ------------------------------ */
function TabsBar({
  items,
  value,
  onChange,
}: {
  items: ReadonlyArray<{ key: TabKey; label: string; abbr: string; icon: React.ReactNode }>;
  value: TabKey;
  onChange: (k: TabKey) => void;
}) {
  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      className="w-full overflow-x-auto"
    >
      <div className="w-max mx-auto px-1 py-2">
        <div className="relative inline-flex gap-1 rounded-md bg-slate-100 p-1">
          {items.map((i) => {
            const active = i.key === value;
            return (
              <button
                key={i.key}
                role="tab"
                aria-selected={active}
                aria-label={i.label}
                tabIndex={active ? 0 : -1}
                onClick={() => onChange(i.key)}
                className="relative select-none whitespace-nowrap px-3 py-1.5 text-sm font-semibold rounded-[6px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal,_#0F8A99)]/40"
                style={{ ["--teal" as any]: TEAL }}
              >
                {active && (
                  <motion.span
                    layoutId="itrSubtabPillTeal"
                    className="absolute inset-0 rounded-[6px] shadow-sm"
                    style={{ backgroundColor: TEAL }}
                    transition={{ type: "spring", bounce: 0.25, duration: 0.35 }}
                  />
                )}
                <span
                  className={`relative inline-flex items-center gap-1 ${
                    active ? "text-white" : "text-slate-700 hover:text-slate-900"
                  }`}
                >
                  <span className={active ? "text-white" : "text-slate-500"}>
                    {i.icon}
                  </span>
                  <span className="sm:hidden">{i.abbr}</span>
                  <span className="hidden sm:inline">{i.label}</span>
                  <span className="sr-only">
                    {active ? " (current section)" : ""}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Section Shell ----------------------------- */
function CardSection({
  title,
  icon,
  children,
}: React.PropsWithChildren<{ title: string; icon?: React.ReactNode }>) {
  return (
    <section className="rounded-md border border-slate-300 bg-white shadow-sm">
      <div className="px-3 sm:px-4 py-3">{children}</div>
    </section>
  );
}
