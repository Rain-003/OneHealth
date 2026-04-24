import * as React from "react";
import { Head, useForm, router } from "@inertiajs/react";
import InputError from "@/components/input-error";

export default function PatientLogin() {
  const { data, setData, post, processing, errors } = useForm({
    barangay: "",
    family_no: "",
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post("/patient/login"); // relies on server redirect
  };

  const goHome = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    router.visit("/", { replace: true, preserveScroll: false });
  };

  return (
    <div className="relative min-h-dvh bg-white text-slate-900">
      <Head title="Patient Login" />

      {/* Ambient blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-teal-200/15 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-cyan-200/15 blur-3xl" />
      </div>

      {/* Top brand row with Back */}
      <header className="relative z-10">
        <div className="mx-auto max-w-7xl px-4 pt-6 md:pt-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#0D8B8F] text-sm font-bold text-white">
                OH
              </div>
              <div>
                <div className="text-xl md:text-2xl font-semibold tracking-wide text-[#203D7A]">
                  ONE HEALTH
                </div>
                <div className="text-xs text-slate-500">Community Health Access</div>
              </div>
            </div>

            <button
              type="button"
              onClick={goHome}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-semibold text-slate-800 shadow-sm hover:-translate-y-0.5 hover:border-teal-400/60 hover:shadow-[0_10px_24px_rgba(13,139,143,0.12)] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
              aria-label="Back to Home"
              title="Back to Home"
            >
              ← <span className="tracking-wide">Home</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10">
        <div className="mx-auto max-w-7xl px-4 py-10 md:py-14">
          {/* Title */}
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-xl md:text-2xl font-semibold text-[#203D7A]">Patient Login</h1>
            <p className="mt-2 text-sm md:text-[15px] text-slate-600">
              Enter your details to access your dashboard.
            </p>
          </div>

          {/* Card */}
          <div className="mx-auto mt-8 max-w-xl">
            <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_16px_50px_rgba(16,24,40,0.08)]">
              <div aria-hidden className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rotate-12 rounded-2xl bg-teal-50" />

              <form onSubmit={submit} className="relative">
                {/* Barangay */}
                <div className="mb-5">
                  <label htmlFor="barangay" className="block text-[13px] font-medium text-slate-700">
                    Barangay
                  </label>
                  <input
                    id="barangay"
                    name="barangay"
                    type="text"
                    placeholder="Enter Barangay"
                    value={data.barangay}
                    onChange={(e) => setData("barangay", e.target.value)}
                    className="mt-1 w-full h-12 rounded-xl border border-slate-300 px-3 text-[15px] transition focus:outline-none focus:ring-2 focus:ring-[#0D8B8F]"
                    required
                  />
                  <InputError message={errors.barangay} />
                </div>

                {/* Family no. */}
                <div className="mb-6">
                  <label htmlFor="family_no" className="block text-[13px] font-medium text-slate-700">
                    Family no.
                  </label>
                  <input
                    id="family_no"
                    name="family_no"
                    type="text"
                    placeholder="Enter Family no."
                    value={data.family_no}
                    onChange={(e) => setData("family_no", e.target.value)}
                    className="mt-1 w-full h-12 rounded-xl border border-slate-300 px-3 text-[15px] transition focus:outline-none focus:ring-2 focus:ring-[#0D8B8F]"
                    required
                  />
                  <InputError message={errors.family_no} />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={processing}
                  className="inline-flex w-full items-center justify-center h-12 rounded-xl bg-[#0D8B8F] text-white text-[15px] font-medium shadow-sm transition hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D8B8F] disabled:opacity-60"
                >
                  {processing ? "Logging in..." : "Login"}
                </button>

                {/* Secondary / alt access */}
                <div className="mt-4 text-center text-sm text-slate-600">
                  Forgot your family number?{" "}
                  <a href="/patient/access-with-info" className="font-medium text-[#0D8B8F] underline">
                    Access with name & birthdate
                  </a>
                </div>

                {/* Extra back to home */}
                <div className="mt-3 text-center">
                  <button
                    type="button"
                    onClick={goHome}
                    className="text-[13px] font-semibold text-[#0D8B8F] hover:underline"
                  >
                    ← Back to Home
                  </button>
                </div>
              </form>
            </section>
          </div>

          {/* Footer micro-brand */}
          <div className="mx-auto mt-12 flex max-w-2xl items-center justify-between border-t border-slate-200 pt-6">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#0D8B8F] text-[11px] font-bold text-white">
                OH
              </div>
              <span className="text-sm font-semibold tracking-wide text-[#203D7A]">ONE HEALTH</span>
            </div>
            <span className="text-xs text-slate-500">
              © {new Date().getFullYear()} OneHealth. All rights reserved.
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
