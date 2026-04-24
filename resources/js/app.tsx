import "../css/app.css";

import React from "react";
import { createInertiaApp, router } from "@inertiajs/react";
import { resolvePageComponent } from "laravel-vite-plugin/inertia-helpers";
import { createRoot } from "react-dom/client";
import { initializeTheme } from "./hooks/use-appearance";
import { ConfirmProvider } from "./components/confirm-kit";
import axios from "axios";

/* ---------------- CSRF wiring for axios + fetch ---------------- */

// Start with whatever is in the meta tag (first page load)
let csrfToken =
  document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? "";

// Configure axios defaults
axios.defaults.withCredentials = true;
axios.defaults.headers.common["X-Requested-With"] = "XMLHttpRequest";
axios.defaults.headers.common["Accept"] = "application/json";
if (csrfToken) {
  axios.defaults.headers.common["X-CSRF-TOKEN"] = csrfToken;
}

// Expose for debugging / other code that reads from window
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).__CSRF_TOKEN__ = csrfToken;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).axios = axios;

// Helper: keep axios CSRF header in sync with Inertia page props
function syncCsrfFromPage(page: any) {
  const newToken = page?.props?.csrf;
  if (typeof newToken === "string" && newToken && newToken !== csrfToken) {
    csrfToken = newToken;
    axios.defaults.headers.common["X-CSRF-TOKEN"] = csrfToken;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__CSRF_TOKEN__ = csrfToken;
  }
}

// Only attach listeners if router.on exists (older @inertiajs/react compatibility)
if (typeof (router as any).on === "function") {
  (router as any).on("success", (event: any) => {
    syncCsrfFromPage(event?.detail?.page);
  });

  (router as any).on("error", (event: any) => {
    const status = event?.detail?.visit?.response?.status;

    // If it's a 419, the session really expired: reload to get fresh session+CSRF
    if (status === 419) {
      window.location.reload();
      return;
    }

    const page = event?.detail?.page;
    if (page) syncCsrfFromPage(page);
  });
}

/** Helper for using fetch() with CSRF */
export function csrfFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("X-Requested-With", "XMLHttpRequest");
  headers.set("Accept", "application/json");
  if (csrfToken) headers.set("X-CSRF-TOKEN", csrfToken);
  return fetch(input, { ...init, headers, credentials: "same-origin" });
}

/* --------------------------------------------------------------- */

/** 👇 Default app name used in the browser tab */
const appName = import.meta.env.VITE_APP_NAME || "ONE HEALTH";

// Set light/dark early to avoid FOUC
initializeTheme();

createInertiaApp({
  /** 👇 Tab title: "Page Title · OneHealth" or just "OneHealth" */
  title: (title) => (title ? `${title} • ONE HEALTH` : "ONE HEALTH"),

  resolve: (name) =>
    resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob("./pages/**/*.tsx")),
  setup({ el, App, props }) {
    const root = createRoot(el);
    root.render(
      <React.StrictMode>
        <ConfirmProvider>
          <App {...props} />
        </ConfirmProvider>
      </React.StrictMode>
    );
  },
  progress: { color: "#4B5563" },
});
