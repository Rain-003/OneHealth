import { Head, useForm, Link, usePage } from '@inertiajs/react';
import * as React from 'react';
import InputError from '@/components/input-error';

// 🖼️ SVG assets (URL imports; Vite will handle them)
import Logo from '/public/build/assets/LOGO.svg';
import LogoLoading from '/public/build/assets/LOGO_LOADING.svg';
import BackIcon from '/public/build/assets/back-svgrepo-com.svg';

type FormShape = { email: string; password: string; remember?: boolean };
type PageProps = { flash?: { status?: string } };

export default function Login() {
  const { flash } = usePage<PageProps>().props as any;
  const { data, setData, processing, errors, post } = useForm<FormShape>({
    email: '',
    password: '',
    remember: true,
  });

  const [showPassword, setShowPassword] = React.useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/login', {
      preserveScroll: true,
    });
  };

  return (
    <div
      className="relative min-h-dvh bg-white text-slate-900"
      style={{
        fontFamily:
          "'Poppins', ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'",
      }}
    >
      <Head title="Health Worker Login">
        {/* Load Poppins */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* Simple keyframes for the loading screen */}
        <style>{`
          @keyframes gentle-pulse { 
            0% { transform: scale(1); opacity: 0.85; }
            50% { transform: scale(1.04); opacity: 1; }
            100% { transform: scale(1); opacity: 0.85; }
          }
        `}</style>
      </Head>

      {/* Ambient, subtle background accents */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-teal-200/15 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-cyan-200/15 blur-3xl" />
      </div>

      {/* Top brand */}
      <header className="relative z-10">
        <div className="mx-auto max-w-7xl px-4 pt-6 md:pt-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* System logo (LOGO.svg) */}
              <img
                src={Logo}
                alt="OneHealth logo"
                className="h-11 w-11 shrink-0 select-none"
                draggable={false}
              />
              <div>
                <div className="text-xl md:text-2xl font-semibold tracking-wide text-[#203D7A]">
                  ONE HEALTH
                </div>
                <div className="text-xs text-slate-500">Health Worker Portal</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10">
        <div className="mx-auto max-w-7xl px-4 py-10 md:py-14">
          {/* Title */}
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-xl md:text-2xl font-semibold text-[#203D7A]">
              Health Worker Login
            </h1>
            <p className="mt-2 text-sm md:text-[15px] text-slate-600">
              Sign in to manage accounts, records, and reports.
            </p>
          </div>

          {/* Card */}
          <div className="mx-auto mt-8 max-w-md">
            <section className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-[0_16px_50px_rgba(16,24,40,0.08)]">
              {/* top row: mini brand + Home button (with new icon) */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img
                    src={Logo}
                    alt="OneHealth logo"
                    className="h-8 w-8 rounded-lg shrink-0 select-none"
                    draggable={false}
                  />
                  <span className="text-sm font-semibold tracking-wide text-[#203D7A]">
                    ONE HEALTH
                  </span>
                </div>

                <Link
                  href="/"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-semibold text-slate-800 shadow-sm hover:-translate-y-0.5 hover:border-teal-400/60 hover:shadow-[0_10px_24px_rgba(15,138,153,0.12)] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                  aria-label="Back to Home"
                >
                  <img
                    src={BackIcon}
                    alt=""
                    className="h-4 w-4 -ml-0.5"
                    aria-hidden="true"
                    draggable={false}
                  />
                  <span className="tracking-wide">Home</span>
                </Link>
              </div>

              {flash?.status && (
                <div className="mb-3 rounded-xl bg-green-50 text-green-700 px-3 py-2 text-sm">
                  {flash.status}
                </div>
              )}

              <form onSubmit={submit} noValidate>
                {/* Username / Email */}
                <label htmlFor="email" className="block text-sm font-medium mb-1">
                  Username
                </label>
                <input
                  id="email"
                  autoComplete="username"
                  value={data.email}
                  onChange={(e) => setData('email', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 py-2.5 px-3 text-[15px] bg-white focus:outline-none focus:ring-2 focus:ring-[#0F8A99]"
                  placeholder="Worker username"
                />
                <InputError message={errors.email} className="mt-1" />

                {/* Password with show/hide toggle */}
                <label htmlFor="password" className="block text-sm font-medium mt-4 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={data.password}
                    onChange={(e) => setData('password', e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-2.5 pl-3 pr-10 text-[15px] bg-white focus:outline-none focus:ring-2 focus:ring-[#0F8A99]"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-700 focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      // Eye-off icon
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.8}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M17.94 17.94A9.77 9.77 0 0 1 12 20c-5 0-9.27-3.11-11-8 0-1.37.35-2.66.97-3.8" />
                        <path d="M6.1 6.1A9.77 9.77 0 0 1 12 4c5 0 9.27 3.11 11 8-.51 1.55-1.34 2.94-2.42 4.09" />
                        <path d="M14.12 14.12A3 3 0 0 1 9.88 9.88" />
                        <path d="M1 1l22 22" />
                      </svg>
                    ) : (
                      // Eye icon
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.8}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M1 12s3.5-7 11-7 11 7 11 7-3.5 7-11 7S1 12 1 12Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                <InputError message={errors.password} className="mt-1" />

                {/* Remember + helper row */}
                <div className="mt-4 flex items-center justify-between">
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={!!data.remember}
                      onChange={(e) => setData('remember', e.target.checked)}
                      className="h-4 w-4 rounded-[6px] border-slate-300 text-[#0F8A99] focus:ring-[#0F8A99]"
                    />
                    Remember me
                  </label>
                  <span className="text-[13px] text-slate-500 select-none"> </span>
                </div>

                {/* Submit */}
                <button
                  disabled={processing}
                  className="mt-6 w-full rounded-lg bg-[#0F8A99] py-2.5 px-4 text-white text-[15px] font-medium shadow-sm transition hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F8A99] disabled:opacity-60"
                >
                  {processing ? 'Please wait…' : 'Log in'}
                </button>
              </form>
            </section>
          </div>

          {/* Footer micro-brand */}
          <div className="mx-auto mt-12 flex max-w-2xl items-center justify-between border-t border-slate-200 pt-6">
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

      {/* Full-screen loading overlay when posting the login form */}
      {processing && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-white/80 backdrop-blur-sm">
          <div className="flex flex-col items-center">
            <img
              src={LogoLoading}
              alt="Signing you in…"
              className="h-50 w-50 select-none"
              style={{ animation: 'gentle-pulse 1.6s ease-in-out infinite' }}
              draggable={false}
            />
            <p className="mt-4 text-sm text-slate-700">Signing you in…</p>
          </div>
        </div>
      )}
    </div>
  );
}
