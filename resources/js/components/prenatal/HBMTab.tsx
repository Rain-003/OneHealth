// resources/js/components/prenatal/HBMTab.tsx
import * as React from "react";
import { router } from "@inertiajs/react";
import { AnimatePresence, motion } from "framer-motion";
import HBMHistory from "./HBMHistory";
import HBMCurrent from "./HBMCurrent";
import HBMAfter from "./HBMAfter";

export type HBMTabProps = {
  patient: { id: number | string };
  baseUrl: string;
  sub: "history" | "current" | "after";
  token?: string | null;
  history: any | null;
  current: any[];
  plan: any;
  visits: any[];
  itr_visits?: any[];   // add this
  postnatal?: any[];
  itr?: any;
  after?: any;
};


/* ───────── tiny outline icons ───────── */
const IconDoc = (p: any) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...p} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5" />
  </svg>
);
const IconPulse = (p: any) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...p} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M3 12h4l2-5 4 10 2-5h6" />
  </svg>
);
const IconBaby = (p: any) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...p} fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="7" r="3" /><path d="M5 22a7 7 0 0 1 14 0" />
  </svg>
);

/* brand teal to match ITR active bg */
const TEAL = "#0F8A99";

const items = [
  { key: "history", label: "History", icon: <IconDoc className="h-4 w-4" /> },
  { key: "current", label: "Current", icon: <IconPulse className="h-4 w-4" /> },
  { key: "after",   label: "After",   icon: <IconBaby className="h-4 w-4" /> },
] as const;

export default function HBMTab(props: HBMTabProps) {
  const { baseUrl, sub } = props;

  const gotoSub = (s: HBMTabProps["sub"]) => {
    if (s === sub) return;
    const qs = new URLSearchParams({ tab: "hbm", sub: s }).toString();
    router.visit(`${baseUrl}?${qs}`, {
      preserveScroll: true,
      preserveState: false,
      replace: true,
    });
  };

  return (
    <div className="space-y-3">
      {/* Tabs rail — centered, with teal active pill */}
      <div className="px-1 sm:px-0">
        <div className="mt-1">
          <HBMTabs items={items} value={sub} onChange={gotoSub} />
        </div>
      </div>

      {/* Animated content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={sub}
          id={`panel-${sub}`}
          role="tabpanel"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
          className="rounded-md bg-white p-3 sm:p-4 shadow-sm"
        >
          {sub === "history" && <HBMHistory key="hbm-history" {...props} itr={props.itr} />}
          {sub === "current" && <HBMCurrent key="hbm-current" {...props} />}
          {sub === "after"   && <HBMAfter   key="hbm-after"   {...props} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------ Centered Tabs ------------------------------ */

function HBMTabs({
  items,
  value,
  onChange,
}: {
  items: readonly { key: "history" | "current" | "after"; label: string; icon: React.ReactNode }[];
  value: "history" | "current" | "after";
  onChange: (k: "history" | "current" | "after") => void;
}) {
  return (
    <div role="tablist" aria-label="HBM sections" className="w-full overflow-x-auto">
      {/* Center when narrow; still scrollable if too wide */}
      <div className="w-max mx-auto">
        <div className="inline-flex rounded-md bg-slate-100 p-1">
          {items.map((i) => {
            const active = i.key === value;
            return (
              <button
                key={i.key}
                role="tab"
                aria-selected={active}
                aria-controls={`panel-${i.key}`}
                tabIndex={active ? 0 : -1}
                onClick={() => onChange(i.key)}
                className="relative select-none whitespace-nowrap px-3 py-1.5 text-sm font-semibold rounded-[6px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal,_#0F8A99)]/40"
                style={{ ["--teal" as any]: TEAL }}
              >
                {/* teal active background (only the active tab) */}
                {active && (
                  <motion.span
                    layoutId="hbmSubPillTeal"
                    className="absolute inset-0 rounded-[6px] shadow-sm"
                    style={{ backgroundColor: TEAL }}
                    transition={{ type: "spring", bounce: 0.25, duration: 0.35 }}
                  />
                )}
                <span className={`relative inline-flex items-center gap-2 ${active ? "text-white" : "text-slate-700 hover:text-slate-900"}`}>
                  <span className={active ? "text-white" : "text-slate-500"}>{i.icon}</span>
                  {i.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
