import * as React from "react";
import { Field, Label, inputLg } from "./itr-shared";

/**
 * Props contract:
 * - valuesRef: a ref object that contains risk_*_flag and risk_*_date (a..e),
 *   exactly the keys the parent ITRPregnancyDetails posts.
 * - onTouch(k,v): notify parent to persist to local draft & enable Save.
 */
export default function RiskCodeSection({
  valuesRef,
  onTouch,
}: {
  valuesRef: React.MutableRefObject<Record<string, any>>;
  onTouch: (key: string, val: any) => void;
}) {
  type RC = {
    key: "a" | "b" | "c" | "d" | "e";
    title: string;
    desc: string;
  };

  const groups: RC[] = [
    { key: "a", title: "Risk A", desc: "Age (<20 or >35), short stature, etc." },
    { key: "b", title: "Risk B", desc: "History of obstetric complication." },
    { key: "c", title: "Risk C", desc: "Current conditions/complications (e.g., PIH)." },
    { key: "d", title: "Risk D", desc: "Danger signs/emergency conditions identified." },
    { key: "e", title: "Risk E", desc: "Other medical conditions." },
  ];

  const minDate = "1900-01-01";
  const maxDate = "2100-12-31";

  return (
    <section className="rounded-xl border border-slate-200">
      <header className="border-b border-slate-200 px-3 py-2 sm:px-4">
        <h3 className="text-[15px] sm:text-base font-semibold text-slate-900">Risk Codes</h3>
      </header>

      <div className="grid gap-3 p-3 sm:grid-cols-2 sm:gap-4 sm:p-4">
        {groups.map(({ key, title, desc }) => {
          const flagKey = `risk_${key}_flag`;
          const dateKey = `risk_${key}_date`;
          const flag = !!valuesRef.current[flagKey];
          const date = valuesRef.current[dateKey] || "";

          return (
            <article key={key} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-slate-900">{title}</div>
                  <div className="text-xs text-slate-600 mt-0.5">{desc}</div>
                </div>
                <label className="inline-flex items-center gap-2 text-[15px]">
                  <input
                    type="checkbox"
                    defaultChecked={flag}
                    onChange={(e) => {
                      valuesRef.current[flagKey] = e.currentTarget.checked;
                      onTouch(flagKey, e.currentTarget.checked);
                    }}
                  />
                  <span className="text-sm">Flag</span>
                </label>
              </div>

              <div className="mt-3">
                <Label className="mb-1 text-sm">Date noted</Label>
                <input
                  type="date"
                  min={minDate}
                  max={maxDate}
                  defaultValue={date}
                  onInput={(e) => {
                    const v = (e.target as HTMLInputElement).value;
                    valuesRef.current[dateKey] = v;
                    onTouch(dateKey, v);
                  }}
                  className={inputLg}
                />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
