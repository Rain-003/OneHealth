// confirm-kit.tsx
import * as React from "react";
import { createPortal } from "react-dom";

/* ───────── Types ───────── */
export type ConfirmOptions = {
  title?: string;
  message?: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  /** "default" | "destructive" affects button styling */
  variant?: "default" | "destructive";
  /** Close when pressing ESC (default: true) */
  escapeToClose?: boolean;
  /** Close when clicking backdrop (default: true) */
  backdropToClose?: boolean;
  /** Auto-focus which button first (default: "confirm") */
  autoFocus?: "confirm" | "cancel";
  /** Optional custom content above buttons */
  headerExtra?: React.ReactNode;
  /** Optional custom content below message (e.g., warnings) */
  bodyExtra?: React.ReactNode;
  /** Optional className overrides */
  classNames?: {
    dialog?: string;
    title?: string;
    message?: string;
    confirmBtn?: string;
    cancelBtn?: string;
  };
};

type InternalItem = {
  options: ConfirmOptions;
  resolve: (v: boolean) => void;
};

type Ctx = (opts?: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = React.createContext<Ctx | null>(null);

/* ───────── Provider ───────── */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = React.useState<InternalItem[]>([]);
  const [open, setOpen] = React.useState(false);

  const push = React.useCallback((options: ConfirmOptions = {}) => {
    return new Promise<boolean>((resolve) => {
      setQueue((q) => [...q, { options, resolve }]);
      setOpen(true);
    });
  }, []);

  const current = queue[0];

  const close = React.useCallback(
    (val: boolean) => {
      if (!current) return;
      current.resolve(val);
      setQueue((q) => q.slice(1));
      // if more in queue, keep open; else close
      setOpen((_) => queue.length > 1);
    },
    [current, queue.length]
  );

  // Lock body scroll while any dialog is open
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <ConfirmContext.Provider value={push}>
      {children}
      <ConfirmRoot
        open={open && !!current}
        options={current?.options}
        onCancel={() => close(false)}
        onConfirm={() => close(true)}
      />
    </ConfirmContext.Provider>
  );
}

/* ───────── Hook ───────── */
export function useConfirm(): Ctx {
  const ctx = React.useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used inside <ConfirmProvider>.");
  }
  return ctx;
}

/* ───────── Dialog UI (Portal) ───────── */
function ConfirmRoot({
  open,
  options,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  options?: ConfirmOptions;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const {
    title = "Are you sure?",
    message = "Please confirm your action.",
    confirmText = "Confirm",
    cancelText = "Cancel",
    variant = "default",
    escapeToClose = true,
    backdropToClose = true,
    autoFocus = "confirm",
    headerExtra,
    bodyExtra,
    classNames,
  } = options || {};

  const dialogRef = React.useRef<HTMLDivElement>(null);
  const confirmBtnRef = React.useRef<HTMLButtonElement>(null);
  const cancelBtnRef = React.useRef<HTMLButtonElement>(null);

  // Focus handling when open
  React.useEffect(() => {
    if (!open) return;
    const toFocus = autoFocus === "confirm" ? confirmBtnRef.current : cancelBtnRef.current;
    setTimeout(() => toFocus?.focus(), 0);
  }, [open, autoFocus]);

  // ESC to close
  React.useEffect(() => {
    if (!open || !escapeToClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      // simple focus trap
      if (e.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, escapeToClose, onCancel]);

  if (!open) return null;

  return createPortal(
    <div
      aria-hidden={open ? "false" : "true"}
      className="fixed inset-0 z-[200]"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 opacity-100"
        onClick={() => (backdropToClose ? onCancel() : undefined)}
      />
      {/* Dialog */}
      <div className="absolute inset-0 grid place-items-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ck-title"
          aria-describedby="ck-desc"
          ref={dialogRef}
          className={[
            "w-full max-w-lg rounded-2xl bg-white shadow-xl ring-1 ring-black/10 outline-none",
            "transition-all duration-200 scale-100 opacity-100",
            classNames?.dialog || "",
          ].join(" ")}
        >
          <div className="p-4 sm:p-5">
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className={variant === "destructive" ? "mt-1 shrink-0 text-rose-600" : "mt-1 shrink-0 text-amber-500"}>
                {variant === "destructive" ? (
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M15 9 9 15M9 9l6 6" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8h.01M12 12v4" />
                  </svg>
                )}
              </div>
              <div className="min-w-0">
                <h2 id="ck-title" className={["text-base font-semibold text-slate-900", classNames?.title || ""].join(" ")}>
                  {title}
                </h2>
                {typeof message === "string" ? (
                  <p id="ck-desc" className={["mt-1 text-sm text-slate-600", classNames?.message || ""].join(" ")}>
                    {message}
                  </p>
                ) : (
                  <div id="ck-desc" className={["mt-1 text-sm text-slate-600", classNames?.message || ""].join(" ")}>
                    {message}
                  </div>
                )}
                {headerExtra}
              </div>
            </div>

            {bodyExtra ? <div className="mt-3">{bodyExtra}</div> : null}

            {/* Actions */}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                ref={cancelBtnRef}
                onClick={onCancel}
                className={[
                  "h-10 rounded-md border border-slate-300 bg-white px-4 text-[15px] text-slate-700 hover:bg-slate-50",
                  classNames?.cancelBtn || "",
                ].join(" ")}
              >
                {cancelText}
              </button>
              <button
                ref={confirmBtnRef}
                onClick={onConfirm}
                className={[
                  "h-10 rounded-md px-4 text-[15px] text-white",
                  variant === "destructive"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-oh-teal hover:bg-oh-tealDark",
                  "rounded-md",
                  classNames?.confirmBtn || "",
                ].join(" ")}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
