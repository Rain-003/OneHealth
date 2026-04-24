import * as React from "react";

/* ---------- Tiny UI primitives ---------- */

export type BtnVariant = "default" | "outline" | "pill";

export const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }
> = ({ variant = "default", className = "", ...props }) => {
  const base =
    "inline-flex items-center justify-center h-10 px-3 text-sm font-medium transition";
  const rounded = variant === "pill" ? "rounded-full" : "rounded-xl";
  const styles =
    variant === "default"
      ? "bg-teal-600 text-white hover:bg-teal-700"
      : variant === "outline"
      ? "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
      : "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50";
  return <button className={`${base} ${rounded} ${styles} ${className}`} {...props} />;
};

export const Label: React.FC<React.LabelHTMLAttributes<HTMLLabelElement>> = ({
  className = "",
  ...props
}) => (
  <label
    className={`block text-sm sm:text-[0.95rem] font-medium text-slate-800 ${className}`}
    {...props}
  />
);

/* Inputs — cohesive look with immunization */
export const inputLg =
  "h-10 sm:h-11 w-full rounded-xl border-2 border-slate-300 bg-white px-2 sm:px-3 text-sm sm:text-base outline-none focus:ring-2 focus:ring-teal-600/30";
export const inputSm =
  "h-9 w-full rounded-xl border-2 border-slate-300 bg-white px-2 text-sm outline-none focus:ring-2 focus:ring-teal-600/30";

export const TextInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> =
  (p) => <input {...p} className={`${inputLg} ${p.className || ""}`} />;

export const SmallInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> =
  (p) => <input {...p} className={`${inputSm} ${p.className || ""}`} />;

export const Field: React.FC<{
  label: string;
  children: React.ReactNode;
  className?: string;
}> = ({ label, children, className }) => (
  <div className={className}>
    <Label className="mb-1">{label}</Label>
    {children}
  </div>
);

/* Segmented control (Visits -> Trimester) */
export function SegTrimester({
  value,
  onChange,
}: {
  value: "1st" | "2nd" | "3rd" | "" | null | undefined;
  onChange: (v: "1st" | "2nd" | "3rd" | null) => void;
}) {
  const [curr, setCurr] = React.useState<"1st" | "2nd" | "3rd" | null>(
    (value as any) || null
  );
  React.useEffect(() => setCurr((value as any) || null), [value]);

  const base =
    "px-3 h-10 inline-flex items-center justify-center text-sm border transition";
  const active = "bg-teal-600 text-white border-teal-600 shadow-sm";
  const idle = "bg-white text-slate-800 border-slate-300 hover:bg-slate-50";

  return (
    <div role="group" className="inline-flex overflow-hidden rounded-xl border border-slate-300">
      {(["1st", "2nd", "3rd"] as const).map((opt, i) => (
        <button
          key={opt}
          type="button"
          className={`${base} ${i ? "border-l-0" : ""} ${
            curr === opt ? active : idle
          }`}
          onClick={() => {
            setCurr(opt);
            onChange(opt);
          }}
          aria-pressed={curr === opt}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

/* ---------- Bubble layout bits you already use ---------- */
export const PageWrap: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => (
  <div className={`w-full max-w-full overflow-x-hidden ${className}`}>
    <div className="max-sm:w-[100vw] max-sm:ml-[calc(50%-50vw)] max-sm:mr-[calc(50%-50vw)] px-2 sm:px-3">
      {children}
    </div>
  </div>
);

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => (
  <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
    {children}
  </section>
);

export const SectionHeader: React.FC<{
  title: string;
  right?: React.ReactNode;
  className?: string;
}> = ({ title, right, className = "" }) => (
  <header
    className={`flex items-center justify-between gap-3 border-b border-slate-200 px-3 py-2 sm:px-4 ${className}`}
  >
    <h2 className="text-base sm:text-lg font-semibold text-slate-900">{title}</h2>
    {right}
  </header>
);


/* ---------- NEW: Minimal underline TabBar (no container bubble) ---------- */
export function TabBar<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { key: T; label: string }[];
}) {
  return (
    <nav className="mt-2 flex flex-wrap items-end gap-4 border-b border-slate-200">
      {items.map((t) => {
        const active = value === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={[
              "relative -mb-[1px] pb-2 pt-1 text-sm md:text-[15px] transition-colors",
              active
                ? "border-b-2 border-teal-600 text-teal-700 font-semibold"
                : "border-b-2 border-transparent text-slate-600 hover:text-slate-800",
            ].join(" ")}
            aria-current={active ? "page" : undefined}
          >
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}
