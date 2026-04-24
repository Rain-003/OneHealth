import { Head } from '@inertiajs/react';
import Logo from '/public/build/assets/LOGO.svg';
import PatientIcon from '/public/build/assets/clean-cut-svgrepo-com.svg';
import DoctorIcon from '/public/build/assets/doctor-m-svgrepo-com.svg';

export default function Home() {
  return (
    <div
      className="relative min-h-dvh bg-white text-slate-900"
      style={{
        fontFamily:
          "'Poppins', ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'",
      }}
    >
      <Head title="OneHealth — Choose Access">
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>

      {/* Subtle ambient shapes */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-teal-200/15 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-cyan-200/15 blur-3xl" />
      </div>

      {/* Header / Brand */}
      <header className="relative z-10">
        <div className="mx-auto max-w-7xl px-4 pt-8 md:pt-12">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src={Logo}
                alt="OneHealth logo"
                className="h-11 w-11 shrink-0 select-none"
                draggable={false}
              />
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold tracking-wide text-[#203D7A]">
                  ONE HEALTH
                </h1>
                <p className="mt-0.5 text-xs md:text-sm text-slate-500">
                  Community Health Access
                </p>
              </div>
            </div>

            <a
              href="/about"
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-[#203D7A] shadow-sm transition hover:border-teal-400/60 hover:text-[#0F8A99] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
            >
              About
            </a>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10">
        <div className="mx-auto max-w-7xl px-4 py-10 md:py-14">
          {/* Hero */}
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-xl md:text-2xl font-semibold text-[#203D7A]">
              Choose how you want to continue
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm md:text-[15px] text-slate-600">
              Access your records or manage health data securely. Pick the portal that applies to
              you.
            </p>
          </div>

          {/* Options */}
          <section className="mx-auto mt-8 grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-2">
            {/* Patient Access */}
            <a
              href="/patient/access-with-info"
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 transition
                         hover:-translate-y-0.5 hover:border-teal-400/60 hover:shadow-[0_12px_30px_rgba(13,139,143,0.12)]
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
              aria-label="Continue to Patient Access"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rotate-12 rounded-2xl bg-teal-50"
              />
              <div className="relative">
                <div className="mb-4 inline-flex h-28 w-28 items-center justify-center rounded-2xl bg-[#0F8A99]/10 transition group-hover:scale-[1.03]">
                  <img
                    src={PatientIcon}
                    alt=""
                    aria-hidden="true"
                    className="h-14 w-14 select-none"
                    draggable={false}
                  />
                </div>
                <h3 className="text-lg font-semibold text-[#203D7A]">Patient Access</h3>
                <p className="mt-1 text-sm text-slate-600">View records, appointments, and more.</p>
                <div className="mt-4 inline-flex items-center gap-2 text-[13px] font-semibold text-[#0F8A99]">
                  Continue <span className="transition-transform group-hover:translate-x-1">→</span>
                </div>
              </div>
            </a>

            {/* Health Worker */}
            <a
              href="/login"
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 transition
                         hover:-translate-y-0.5 hover:border-teal-400/60 hover:shadow-[0_12px_30px_rgba(13,139,143,0.12)]
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
              aria-label="Continue to Health Worker login"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -left-6 -bottom-6 h-28 w-28 -rotate-12 rounded-2xl bg-cyan-50"
              />
              <div className="relative">
                <div className="mb-4 inline-flex h-28 w-28 items-center justify-center rounded-2xl bg-[#0F8A99]/10 transition group-hover:scale-[1.03]">
                  <img
                    src={DoctorIcon}
                    alt=""
                    aria-hidden="true"
                    className="h-14 w-14 select-none"
                    draggable={false}
                  />
                </div>
                <h3 className="text-lg font-semibold text-[#203D7A]">Health Worker</h3>
                <p className="mt-1 text-sm text-slate-600">Manage accounts, records &amp; reports.</p>
                <div className="mt-4 inline-flex items-center gap-2 text-[13px] font-semibold text-[#0F8A99]">
                  Continue <span className="transition-transform group-hover:translate-x-1">→</span>
                </div>
              </div>
            </a>
          </section>

          {/* Footer / micro brand */}
          <div className="mx-auto mt-12 flex max-w-4xl items-center justify-between border-t border-slate-200 pt-6">
            <div className="flex items-center gap-2">
              <img src={Logo} alt="OneHealth logo" className="h-8 w-8 rounded-lg" />
              <span className="text-sm font-semibold tracking-wide text-[#203D7A]">
                ONE HEALTH
              </span>
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