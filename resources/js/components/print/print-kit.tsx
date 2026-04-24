// resources/js/components/print/print-kit.tsx
import * as React from "react";

/* ───────── Types ───────── */
export type TableSection = {
  kind: "table";
  title: string;
  rows: Array<Record<string, any>>;
  /** Optional: explicit column order/labels; fallback = auto from rows */
  columns?: string[];
};

export type KVSection = {
  kind: "kv";
  title: string;
  data: Record<string, any>;
};

export type PrintSection = TableSection | KVSection;

/* ───────── Context ───────── */
type Ctx = {
  sections: PrintSection[];
  register: (s: PrintSection) => () => void; // returns unregister
  clearAll: () => void;
};

const PrintCtx = React.createContext<Ctx | null>(null);

export function PrintRegistryProvider({ children }: { children: React.ReactNode }) {
  const [sections, setSections] = React.useState<PrintSection[]>([]);

  const register = React.useCallback((s: PrintSection) => {
    setSections((prev) => [...prev, s]);
    return () => setSections((prev) => prev.filter((x) => x !== s));
  }, []);

  const clearAll = React.useCallback(() => setSections([]), []);

  return (
    <PrintCtx.Provider value={{ sections, register, clearAll }}>
      {children}
    </PrintCtx.Provider>
  );
}

export function usePrintRegistry() {
  const ctx = React.useContext(PrintCtx);
  if (!ctx) throw new Error("usePrintRegistry must be used inside <PrintRegistryProvider>.");
  return ctx;
}

export function useRegisterPrintable(section: PrintSection | null | undefined) {
  const { register } = usePrintRegistry();
  React.useEffect(() => {
    if (!section) return;
    return register(section);
  }, [register, section]);
}

/* ───────── HTML generation ───────── */
const isDateKey = (k: string) => /(^|_)(date|dated|dob|dos|lmp|edd|edc)$/i.test(k);
const toMDY = (v: any) => {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yy = d.getFullYear();
  return `${mm}/${dd}/${yy}`;
};
const esc = (s: any) =>
  String(s ?? "—").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const collectCols = (rows: Array<Record<string, any>>): string[] => {
  const set = new Set<string>();
  rows?.forEach((r) => Object.keys(r || {}).forEach((k) => set.add(k)));
  return Array.from(set);
};

function renderTable(title: string, rows: Array<Record<string, any>>, columns?: string[]) {
  if (!rows || rows.length === 0) return "";
  const cols = (columns && columns.length ? columns : collectCols(rows));
  if (cols.length === 0) return "";
  const ths = cols.map((c) => `<th>${esc(c.replace(/_/g, " ").toUpperCase())}</th>`).join("");
  const trs = rows
    .map((row) => {
      const tds = cols
        .map((c) => {
          const val = row?.[c];
          const out = isDateKey(c) ? toMDY(val) : esc(val);
          return `<td>${out}</td>`;
        })
        .join("");
      return `<tr>${tds}</tr>`;
    })
    .join("");
  return `
    <section class="sec">
      <h3 class="sec-title">${esc(title)}</h3>
      <table class="grid">
        <thead><tr>${ths}</tr></thead>
        <tbody>${trs}</tbody>
      </table>
    </section>`;
}

function renderKV(title: string, obj: Record<string, any>) {
  if (!obj || typeof obj !== "object" || Object.keys(obj).length === 0) return "";
  const rows = Object.entries(obj)
    .map(([k, v]) => {
      const val = isDateKey(k) ? toMDY(v) : esc(v);
      return `<tr><th>${esc(k.replace(/_/g, " ").toUpperCase())}</th><td>${val}</td></tr>`;
    })
    .join("");
  return `
    <section class="sec">
      <h3 class="sec-title">${esc(title)}</h3>
      <table class="kv"><tbody>${rows}</tbody></table>
    </section>`;
}

export function buildPrintHTMLFromSections({
  patient,
  sections,
  title = "Prenatal Summary",
}: {
  patient: { full_name?: string | null; birthdate?: string | null; barangay?: string | null; address?: string | null; philhealth_no?: string | null; phone_number?: string | null };
  sections: PrintSection[];
  title?: string;
}) {
  const phone = (patient as any)?.phone_number ?? (patient as any)?.contact_no ?? null;
  const body = sections
    .map((s) => (s.kind === "table" ? renderTable(s.title, s.rows, s.columns) : renderKV(s.title, s.data)))
    .join("");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${esc(title)} — ${esc(patient.full_name || "Patient")}</title>
<meta name="viewport" content="width=device-width,initial-scale=1" />
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap" rel="stylesheet"/>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  :root { --ink:#0f172a; --mut:#475569; --teal:#0F8A99; --rule:#e2e8f0; }
  html,body { font-family:'Poppins',system-ui,-apple-system,Segoe UI,Roboto,Arial; color:var(--ink); }
  body { margin:0; }
  .brand { display:flex; align-items:center; gap:12px; }
  .logo { width:18mm; height:18mm; border-radius:5mm; background:var(--teal); color:#fff; font-weight:800; display:grid; place-items:center; font-size:12pt; }
  .title { font-size:16pt; font-weight:800; }
  .sub { font-size:9pt; letter-spacing:.08em; text-transform:uppercase; color:var(--mut) }
  .rule { height:3mm; background:linear-gradient(90deg,var(--teal),#16a39a,#22d3ee); border-radius:2mm; margin:6mm 0 4mm; }

  .patient { border:1px solid var(--rule); border-radius:6px; padding:6mm; display:grid;
             grid-template-columns:32mm 1fr 26mm 1fr; gap:3mm 6mm; font-size:10.5pt; }
  .patient .label { color:var(--mut) }
  .patient .value { font-weight:700 }
  .patient .span-3 { grid-column: span 3; }

  .sec { margin-top:7mm; page-break-inside: avoid; }
  .sec-title { font-size:12pt; font-weight:800; color:#0b3d48; margin:0 0 3mm; border-left:4px solid var(--teal); padding-left:6px; }

  .grid { width:100%; border-collapse:collapse; table-layout:fixed; font-size:10pt; }
  .grid th, .grid td { border:1.6px solid #0a6f7c40; padding:6px 8px; vertical-align:top; word-break:break-word; }
  .grid thead th { background:#e6f5f6; font-weight:700; color:#0b3d48; }

  .kv { width:100%; border-collapse:collapse; font-size:10pt; }
  .kv th { text-align:left; background:#f8fafc; color:#0b3d48; width:34%; }
  .kv th, .kv td { border:1.6px solid #0a6f7c40; padding:6px 8px; vertical-align:top; }

  .footer-note { margin-top:6mm; font-size:9pt; color:var(--mut); }
</style>
</head>
<body>
  <header>
    <div class="brand">
      <div class="logo">OH</div>
      <div>
        <div class="title">ONE HEALTH — ${esc(title)}</div>
        <div class="sub">Patient Records</div>
      </div>
    </div>
    <div class="rule"></div>
  </header>

  <section class="patient">
    <div class="label">Full name</div><div class="value">${esc(patient.full_name ?? "—")}</div>
    <div class="label">Birthday</div><div class="value">${toMDY(patient.birthdate ?? null)}</div>
    <div class="label">Barangay</div><div class="value">${esc(patient.barangay ?? "—")}</div>
    <div class="label">Phone</div><div class="value">${esc(phone ?? "—")}</div>
    <div class="label">Address</div><div class="value span-3">${esc(patient.address ?? "—")}</div>
    <div class="label">PhilHealth #</div><div class="value">${esc((patient as any).philhealth_no ?? "—")}</div>
  </section>

  ${body}

  <div class="footer-note">Generated via OneHealth • ${toMDY(new Date().toISOString())}</div>
  <script>window.addEventListener('load',()=>setTimeout(()=>window.print(),0));</script>
</body>
</html>`;
}
