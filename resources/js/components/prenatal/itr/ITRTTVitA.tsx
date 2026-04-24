// resources/js/components/prenatal/ITRTTVitA.tsx
import * as React from "react";
import { usePage, router } from "@inertiajs/react";
import { Label, inputLg } from "./itr-shared";
import { TTVITA_URL, postFlat, toYMD, todayYMD } from "./itr-api";
import { useConfirm } from "../../confirm-kit";

/* Colors */
const TEAL = "#0F8A99";

/* HBM-style save icon */
const IconSave = (p: any) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    {...p}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
    <path d="M17 21v-8H7v8M7 3v5h8" />
  </svg>
);

/* Lock / unlock icons (same as Pregnancy Details) */
const IconLock = (p: any) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    {...p}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

const IconUnlock = (p: any) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    {...p}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M9 11V8a4 4 0 0 1 7.3-2.5" />
  </svg>
);

/* ───────── Centered result popup ───────── */
type ResultKind = "success" | "error";
function ResultDialog({
  open,
  onClose,
  kind,
  title,
  message,
  autoHideMs = 2200,
}: {
  open: boolean;
  onClose: () => void;
  kind: ResultKind;
  title: string;
  message?: string;
  autoHideMs?: number;
}) {
  React.useEffect(() => {
    if (!open) return;
    const id = setTimeout(onClose, autoHideMs);
    return () => clearTimeout(id);
  }, [open, autoHideMs, onClose]);

  const iconClass = kind === "success" ? "text-emerald-600" : "text-rose-600";
  const ringClass = kind === "success" ? "ring-emerald-200" : "ring-rose-200";

  return (
    <div
      aria-hidden={open ? "false" : "true"}
      className={[
        "fixed inset-0 z-[200]",
        open ? "pointer-events-auto" : "pointer-events-none",
      ].join(" ")}
    >
      <div
        className={[
          "absolute inset-0 bg-black/40 transition-opacity",
          open ? "opacity-100" : "opacity-0",
        ].join(" ")}
      />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ttva-result-title"
          className={[
            "w-full max-w-lg rounded-2xl bg-white shadow-xl ring-1 ring-black/10 outline-none",
            "transition-all duration-200",
            open ? "scale-100 opacity-100" : "scale-95 opacity-0",
          ].join(" ")}
        >
          <div
            className={["p-4 sm:p-5 rounded-2xl ring-1", ringClass].join(" ")}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-1 shrink-0 ${iconClass}`}>
                {kind === "success" ? (
                  <svg
                    viewBox="0 0 24 24"
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M15 9 9 15M9 9l6 6" />
                  </svg>
                )}
              </div>
              <div className="min-w-0">
                <h2
                  id="ttva-result-title"
                  className="text-base font-semibold text-slate-900"
                >
                  {title}
                </h2>
                {message ? (
                  <p className="mt-1 text-sm text-slate-600">{message}</p>
                ) : null}
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                onClick={onClose}
                className="h-10 rounded-md border border-slate-300 bg-white px-4 text-[15px] text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type TTData = {
  tt1_date: string;
  tt2_date: string;
  tt3_date: string;
  tt4_date: string;
  tt5_date: string;
  vitamin_a_date: string;
};

const TT_KEYS: (keyof TTData)[] = [
  "tt1_date",
  "tt2_date",
  "tt3_date",
  "tt4_date",
  "tt5_date",
  "vitamin_a_date",
];

export default function ITRTTVitA({ patientId }: { patientId: number }) {
  const { canEdit = false } = usePage<any>().props;
  const confirm = useConfirm();
  const page = usePage<any>();
  const itr = (page?.props?.itr as any) ?? {};

  /* ---------- localStorage draft helpers ---------- */
  const LS_KEY = (pid: number | string) => `itr_draft:${pid}`;
  const readDraft = React.useCallback(() => {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY(patientId)) || "{}");
    } catch {
      return {};
    }
  }, [patientId]);
  const writeDraft = React.useCallback(
    (vals: Record<string, any>) => {
      try {
        const prev = readDraft();
        localStorage.setItem(
          LS_KEY(patientId),
          JSON.stringify({ ...prev, ...vals })
        );
      } catch {}
    },
    [patientId, readDraft]
  );
  // Remove our keys entirely after a successful save
  const clearDraft = React.useCallback(() => {
    try {
      const prev = readDraft();
      TT_KEYS.forEach((k) => {
        if (k in prev) delete (prev as any)[k];
      });
      if (Object.keys(prev).length === 0)
        localStorage.removeItem(LS_KEY(patientId));
      else localStorage.setItem(LS_KEY(patientId), JSON.stringify(prev));
    } catch {}
  }, [patientId, readDraft]);

  // Ignore empty-string values from draft so they don't override server props
  const sanitizedDraft = React.useCallback(() => {
    const raw = readDraft();
    const out: Partial<TTData> = {};
    TT_KEYS.forEach((k) => {
      const v = (raw as any)[k];
      if (typeof v === "string" && v.trim() !== "") (out as any)[k] = toYMD(v);
    });
    return out;
  }, [readDraft]);

  /* ---------- controlled form state ---------- */
  const computeInitial = React.useCallback((): TTData => {
    const base: TTData = {
      tt1_date: toYMD(itr?.tt1_date ?? ""),
      tt2_date: toYMD(itr?.tt2_date ?? ""),
      tt3_date: toYMD(itr?.tt3_date ?? ""),
      tt4_date: toYMD(itr?.tt4_date ?? ""),
      tt5_date: toYMD(itr?.tt5_date ?? ""),
      vitamin_a_date: toYMD(itr?.vitamin_a_date ?? ""),
    };
    return { ...base, ...sanitizedDraft() };
  }, [itr, sanitizedDraft]);

  const [form, setForm] = React.useState<TTData>(computeInitial);
  const [locked, setLocked] = React.useState<boolean>(true); // 🔒

  // Rehydrate when props change (including after reload) or patient changes
  React.useEffect(() => {
    setForm(computeInitial());
    setStatus("");
    setError(null);
    dirtyRef.current = false;
  }, [
    computeInitial,
    patientId,
    itr?.tt1_date,
    itr?.tt2_date,
    itr?.tt3_date,
    itr?.tt4_date,
    itr?.tt5_date,
    itr?.vitamin_a_date,
  ]);

  /* ---------- unsaved/dirty + status ---------- */
  const dirtyRef = React.useRef(false);
  const markDirty = React.useCallback(() => {
    if (!dirtyRef.current) {
      dirtyRef.current = true;
      window.dispatchEvent(new CustomEvent("itr:dirty"));
    }
  }, []);

  const [saving, setSaving] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);
  const statusRef = React.useRef<HTMLSpanElement>(null);
  const errorRef = React.useRef<HTMLDivElement>(null);
  const [resultOpen, setResultOpen] = React.useState(false);
  const [resultKind, setResultKind] = React.useState<ResultKind>("success");
  const [resultTitle, setResultTitle] = React.useState("");
  const [resultMsg, setResultMsg] = React.useState<string | undefined>();
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const setStatus = (t: string) => {
    if (statusRef.current) statusRef.current.textContent = t;
  };
  const setError = (t: string | null) => {
    if (!errorRef.current) return;
    errorRef.current.textContent = t || "";
    errorRef.current.style.display = t ? "block" : "none";
  };

  function touch<K extends keyof TTData>(k: K, v: TTData[K]) {
    if (locked) return; // don't edit when locked
    markDirty();
    if (timer.current) clearTimeout(timer.current);
    setForm((prev) => {
      const next = { ...prev, [k]: toYMD(v as string) };
      timer.current = setTimeout(() => {
        writeDraft({ [k]: next[k] });
        setStatus("Draft ✓");
        setTimeout(() => {
          if ((statusRef.current?.textContent || "") === "Draft ✓")
            setStatus("");
        }, 800);
      }, 400);
      return next;
    });
  }

  const setToday = (name: keyof TTData) => touch(name, todayYMD());
  const clearField = (name: keyof TTData) => touch(name, "");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (locked) return; // ignore submit when locked

    const ok = await confirm({
      title: "Save TT/Vitamin A dates?",
      message: "Please confirm you want to save these entries.",
      confirmText: "Yes, save",
      cancelText: "Cancel",
    });
    if (!ok) return;

    setError(null);
    setSaving(true);
    setStatus("Saving…");
    try {
      await postFlat(TTVITA_URL(patientId), { ...form });

      // Remove our draft keys BEFORE reload so fresh props win
      clearDraft();

      // Re-hydrate only 'itr' props; keep scroll & tab state
      await new Promise<void>((resolve) => {
        const url =
          window.location.pathname +
          window.location.search +
          window.location.hash;
        router.get(url, {}, {
          only: ["itr"],
          preserveScroll: true,
          preserveState: true,
          replace: true,
          onFinish: () => resolve(),
        });
      });

      setStatus("Saved ✓");
      setTimeout(() => setStatus(""), 900);
      dirtyRef.current = false;
      window.dispatchEvent(new CustomEvent("itr:saved"));

      setResultKind("success");
      setResultTitle("Saved successfully");
      setResultMsg("TT/Vitamin A dates have been updated.");
      setResultOpen(true);
    } catch (err: any) {
      setStatus("");
      setError(err?.message || "Save failed");
      setTimeout(() => setError(null), 1500);

      setResultKind("error");
      setResultTitle("Save failed");
      setResultMsg(err?.message || "Please try again.");
      setResultOpen(true);
    } finally {
      setSaving(false);
    }
  };

  // Small helper component uses `locked` from closure
  const FieldDate = ({
    label,
    name,
  }: {
    label: string;
    name: keyof TTData;
  }) => (
    <div>
      <Label className="mb-1">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={form[name] || ""}
          onInput={(e) => touch(name, (e.target as HTMLInputElement).value)}
          className={inputLg}
          disabled={locked}
        />
        <button
          type="button"
          onClick={() => setToday(name)}
          className="h-11 rounded-md border border-slate-300 px-3 text-[14px] hover:bg-slate-50 disabled:opacity-60"
          disabled={locked}
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => clearField(name)}
          className="h-11 rounded-md border border-slate-300 px-3 text-[14px] hover:bg-slate-50 disabled:opacity-60"
          disabled={locked}
        >
          Clear
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-[100dvh] flex flex-col w-full max-w-full">
      <div className="mx-auto w-full max-w-screen-2xl px-2 sm:px-3 lg:px-6 flex-1 overflow-x-hidden">
        {/* Header like Pregnancy Details / Birth Plan, with teal square lock */}
        <div className="mt-1 mb-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <h2 className="text-[18px] sm:text-[20px] font-semibold text-slate-900 tracking-tight">
                Tetanus Toxoid &amp; Vitamin A
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span
                ref={statusRef}
                className="text-[11px] sm:text-[12px] text-slate-600"
                aria-live="polite"
              />
              {canEdit && (<button
                type="button"
                onClick={() => setLocked((prev) => !prev)}
                className={[
                  "inline-flex h-9 w-9 items-center justify-center rounded-lg border text-slate-700 shadow-sm transition",
                locked
                  ? "border-slate-300 bg-white hover:bg-slate-50"
                  : "border-[#0F8A99] bg-[#0F8A99] text-white hover:bg-[#0d7481]",
                ].join(" ")}
                style={
                  locked
                    ? undefined
                    : { backgroundColor: TEAL, borderColor: TEAL }
                }
                title={locked ? "Click to enable editing" : "Click to lock"}
                aria-pressed={!locked ? "true" : "false"}
              >
                {locked ? (
                  <IconLock className="h-4 w-4" />
                ) : (
                  <IconUnlock className="h-4 w-4" />
                )}
              </button>)}
            </div>
          </div>
          <div className="mt-2 h-px w-full bg-slate-200" />
        </div>

        {/* 🔒 LOCKED BANNER (like the other pages) */}
        {locked && (
          <div className="mt-3 mb-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs sm:text-[13px] text-slate-700">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-slate-600">
              <IconLock className="h-3 w-3" />
            </span>
            <p>
              Record is currently{" "}
              <span className="font-semibold">LOCKED</span>. Tap the square on the right to enable editing.
            </p>
          </div>
        )}

        {/* Error banner */}
        <div
          ref={errorRef}
          style={{ display: "none" }}
          className="mx-3 sm:mx-4 mt-3 rounded-[6px] border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700"
        />

        {/* Dimming + blocking when locked */}
        <div
          className={
            locked ? "opacity-50 transition-opacity" : "transition-opacity"
          }
        >
          <div className={locked ? "pointer-events-none" : ""}>
            {/* Shell */}
            <section className="mt-2 rounded-md bg-white shadow-sm divide-y divide-slate-200 overflow-hidden">
              <form
                ref={formRef}
                onSubmit={onSubmit}
                className="p-3 sm:p-4 space-y-4"
              >
                <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
                  <FieldDate name="tt1_date" label="TT1" />
                  <FieldDate name="tt2_date" label="TT2" />
                  <FieldDate name="tt3_date" label="TT3" />
                  <FieldDate name="tt4_date" label="TT4" />
                  <FieldDate name="tt5_date" label="TT5" />
                  <FieldDate
                    name="vitamin_a_date"
                    label="Post-partum Vitamin A"
                  />
                </div>
                <div className="h-14 sm:h-0" />
              </form>
            </section>
          </div>
        </div>
      </div>

      {/* Sticky bottom actions — same style as the other ITR tabs */}
      <footer className="fixed bottom-0 inset-x-0 z-[30] pointer-events-none">
        <div className="mx-auto w-full max-w-screen-2xl px-0 sm:px-4 lg:px-8 flex justify-end">
          <div
            className="
              mb-0.5
              inline-flex
              w-full sm:w-auto                
              rounded-t-md border border-slate-200
              bg-white/95 backdrop-blur shadow-sm
              px-3 sm:px-4 py-2
              pointer-events-auto
            "
          >
            <button
              type="button"
              onClick={() => !locked && formRef.current?.requestSubmit()}
              className="w-full sm:w-auto h-10 rounded-md bg-oh-teal px-5 text-[14px] text-white hover:bg-oh-tealDark disabled:opacity-60 inline-flex items-center justify-center gap-1.5"
              disabled={saving || locked}
            >
              <IconSave className="h-4 w-4" />
              {locked ? "Locked" : saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </footer>

      {/* Result popup */}
      <ResultDialog
        open={resultOpen}
        onClose={() => setResultOpen(false)}
        kind={resultKind}
        title={resultTitle}
        message={resultMsg}
      />
    </div>
  );
}
