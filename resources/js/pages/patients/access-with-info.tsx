import * as React from 'react';
import { Head, useForm, Link, usePage } from '@inertiajs/react';
import InputError from '@/components/input-error';

// SVG assets
import Logo from '/public/build/assets/LOGO.svg';
import LogoLoading from '/public/build/assets/LOGO_LOADING.svg';
import BackIcon from '/public/build/assets/back-outline-svgrepo-com.svg';

/** Must match your web.php routes */
const POST_URL = '/patient/access-with-info';
const RESEND_URL = '/patient/access-with-info/resend';
const RESEND_COOLDOWN_SECONDS = 60;

/* BAYANI cluster options */
const BAYANI_BARANGAYS = [
  'ACACIA',
  'ANAHAW I',
  'ANAHAW II',
  'BANABA',
  'BULIHAN',
  'IPIL I',
  'IPIL II',
  'NARRA I',
  'NARRA II',
  'NARRA III',
  'YAKAL',
] as const;

const OTHER_VALUE = '__OTHER__';

type FormData = {
  full_name: string;
  birthdate: string;
  barangay: string;
  access: string;
};

type FlashBag = {
  otp_sent?: boolean;
  phone_masked?: string;
  otp_message?: string;
  otp_cooldown?: number;
};

type PageProps = {
  flash?: FlashBag;
};

export default function PatientAccessWithInfo() {
  const page = usePage<PageProps>();
  const flash = page.props.flash ?? {};

  const { data, setData, post, processing, errors, reset } = useForm<FormData>({
    full_name: '',
    birthdate: '',
    barangay: '',
    access: '',
  });

  const otpForm = useForm<{ otp: string; trust_device: boolean }>({
    otp: '',
    trust_device: true,
  });

  const otpSent = !!flash.otp_sent;
  const phoneMasked = flash.phone_masked ?? '';
  const otpMessage = flash.otp_message ?? '';

  const flashCooldown = Math.max(
    0,
    Math.ceil(Number(flash.otp_cooldown ?? RESEND_COOLDOWN_SECONDS)),
  );

  const [otpModalOpen, setOtpModalOpen] = React.useState<boolean>(otpSent);
  const [resendCountdown, setResendCountdown] = React.useState<number>(
    otpSent ? flashCooldown : 0,
  );

  // Open modal whenever backend says OTP was sent.
  React.useEffect(() => {
    if (otpSent) {
      setOtpModalOpen(true);
    }
  }, [otpSent]);

  // Sync countdown from backend flash when a fresh OTP was sent/resend happened.
  React.useEffect(() => {
    if (!otpSent) return;
    setResendCountdown(flashCooldown);
  }, [otpSent, flashCooldown]);

  // Realtime countdown.
  React.useEffect(() => {
    if (!otpModalOpen || resendCountdown <= 0) return;

    const timer = window.setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [otpModalOpen, resendCountdown]);

  function submitInfo(e: React.FormEvent) {
    e.preventDefault();

    otpForm.clearErrors();
    reset('access');

    post(POST_URL, {
      preserveScroll: true,
    });
  }

  function submitOtp(e: React.FormEvent) {
    e.preventDefault();

    otpForm.post(POST_URL, {
      preserveScroll: true,
      onSuccess: () => {
        otpForm.reset('otp');
      },
    });
  }

  function resendOtp() {
    if (resendCountdown > 0 || otpForm.processing) return;

    // Restart countdown immediately so user cannot spam-click.
    setResendCountdown(RESEND_COOLDOWN_SECONDS);

    otpForm.post(RESEND_URL, {
      preserveScroll: true,
      preserveState: true,
      onSuccess: () => {
        otpForm.reset('otp');
        setResendCountdown(RESEND_COOLDOWN_SECONDS);
      },
      onError: () => {
        const nextCooldown = Math.max(
          0,
          Math.ceil(Number(page.props.flash?.otp_cooldown ?? 0)),
        );
        setResendCountdown(nextCooldown);
      },
    });
  }

  const [barangayChoice, setBarangayChoice] = React.useState<string>(() => {
    const b = (data.barangay || '').trim().toUpperCase();
    if (!b) return '';
    return BAYANI_BARANGAYS.includes(b as (typeof BAYANI_BARANGAYS)[number]) ? b : OTHER_VALUE;
  });

  const showOther = barangayChoice === OTHER_VALUE;

  const otherRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (showOther) otherRef.current?.focus();
  }, [showOther]);

  return (
    <div
      className="relative min-h-dvh bg-white text-slate-900"
      style={{
        fontFamily:
          "'Poppins', ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'",
      }}
    >
      <Head title="Patient Access">
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <style>{`
          @keyframes gentle-pulse {
            0% { transform: scale(1); opacity: 0.85; }
            50% { transform: scale(1.04); opacity: 1; }
            100% { transform: scale(1); opacity: 0.85; }
          }
          input[type="date"] { accent-color: #0F8A99; }
          input[type="date"]::-webkit-calendar-picker-indicator {
            filter: invert(43%) sepia(27%) saturate(1098%) hue-rotate(137deg) brightness(88%) contrast(92%);
            opacity: 0.95; cursor: pointer;
          }
        `}</style>
      </Head>

      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-teal-200/15 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-cyan-200/15 blur-3xl" />
      </div>

      <header className="relative z-10">
        <div className="mx-auto max-w-7xl px-4 pt-4 md:pt-6">
          <div className="flex items-center gap-3">
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
              <div className="text-xs text-slate-500">Community Health Access</div>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <div className="mx-auto max-w-7xl px-4 py-8 md:py-10">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-xl md:text-2xl font-semibold text-[#203D7A]">Patient Access</h1>
            <p className="mt-2 text-sm md:text-[15px] text-slate-600">
              Provide your identifying details to access your records dashboard.
            </p>
          </div>

          <div className="mx-auto mt-8 max-w-md">
            <section className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-[0_16px_50px_rgba(16,24,40,0.08)]">
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

              <form onSubmit={submitInfo} noValidate className="relative">
                {errors.access && (
                  <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                    {errors.access}
                  </div>
                )}

                <label htmlFor="full_name" className="mb-1 block text-sm font-medium">
                  Name or registered phone number
                </label>
                <input
                  id="full_name"
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  placeholder="e.g. MARIA CRUZ, CRUZ, MARIA, or 09123456789"
                  value={data.full_name}
                  onChange={(e) => setData('full_name', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#0F8A99]"
                  required
                />
                <p className="mt-1 text-[11px] leading-5 text-slate-500">
                  You may enter your full name, first name and last name, surname-first format,
                  or the mobile number registered in your record.
                </p>
                <InputError message={errors.full_name} className="mt-1" />

                <label htmlFor="birthdate" className="mt-4 mb-1 block text-sm font-medium">
                  Birthdate
                </label>
                <input
                  id="birthdate"
                  type="date"
                  value={data.birthdate}
                  onChange={(e) => setData('birthdate', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#0F8A99]"
                  required
                />
                <InputError message={errors.birthdate} className="mt-1" />

                <label htmlFor="barangay_select" className="mt-4 mb-1 block text-sm font-medium">
                  Barangay
                </label>
                <select
                  id="barangay_select"
                  value={barangayChoice}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBarangayChoice(val);
                    if (val === OTHER_VALUE) {
                      setData('barangay', '');
                    } else {
                      setData('barangay', val);
                    }
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#0F8A99]"
                  required
                >
                  <option value="" disabled>
                    Select barangay
                  </option>
                  {BAYANI_BARANGAYS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                  <option value={OTHER_VALUE}>Other...</option>
                </select>

                {showOther && (
                  <>
                    <label htmlFor="barangay_other" className="sr-only">
                      Enter barangay
                    </label>
                    <input
                      ref={otherRef}
                      id="barangay_other"
                      type="text"
                      placeholder="Type your barangay"
                      value={data.barangay}
                      onChange={(e) => setData('barangay', e.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#0F8A99]"
                      required={showOther}
                    />
                  </>
                )}

                <InputError message={errors.barangay} className="mt-1" />

                <button
                  type="submit"
                  disabled={processing}
                  className="mt-6 w-full rounded-lg bg-[#0F8A99] px-4 py-2.5 text-[15px] font-medium text-white shadow-sm transition hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F8A99] disabled:opacity-60"
                >
                  {processing ? 'Please wait...' : 'Access my records'}
                </button>
              </form>
            </section>
          </div>

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

      {otpModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 px-4">
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-[#203D7A]">Enter access code</h2>
                <p className="mt-1 text-xs text-slate-600">
                  We sent a 6-digit code to your registered mobile number
                  {phoneMasked ? (
                    <>
                      {' '}
                      ending in <span className="font-semibold">{phoneMasked.slice(-4)}</span>.
                    </>
                  ) : (
                    '.'
                  )}{' '}
                  Please enter it below to open your dashboard.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOtpModalOpen(false)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-500">
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            {otpMessage ? (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                {otpMessage}
              </div>
            ) : null}

            <form onSubmit={submitOtp} className="mt-4 space-y-3">
              <div>
                <label htmlFor="otp" className="mb-1 block text-xs font-medium text-slate-800">
                  6-digit code
                </label>
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpForm.data.otp}
                  onChange={(e) =>
                    otpForm.setData('otp', e.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-center text-[15px] font-semibold tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-[#0F8A99]"
                  placeholder="******"
                  autoFocus
                />
                <InputError message={otpForm.errors.otp} className="mt-1" />
              </div>

              <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <input
                  type="checkbox"
                  checked={otpForm.data.trust_device}
                  onChange={(e) => otpForm.setData('trust_device', e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0F8A99] focus:ring-[#0F8A99]"
                />
                <div>
                  <div className="text-sm font-medium text-slate-800">Trust this device</div>
                  <p className="mt-0.5 text-[11px] leading-5 text-slate-600">
                    On this phone or browser, future access can skip the SMS code unless the
                    device expires or is changed.
                  </p>
                </div>
              </label>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] text-slate-600">
                    {resendCountdown > 0
                      ? `Please wait ${resendCountdown} second${resendCountdown === 1 ? '' : 's'} to resend a new code.`
                      : `Didn't receive the code yet? You can request a new one now.`}
                  </p>

                  <button
                    type="button"
                    onClick={resendOtp}
                    disabled={resendCountdown > 0 || otpForm.processing}
                    className="inline-flex items-center justify-center rounded-lg px-2 py-1 text-xs font-semibold text-[#0F8A99] transition hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
                  >
                    {otpForm.processing ? 'Sending...' : 'Resend code'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={otpForm.processing || otpForm.data.otp.length !== 6}
                className="inline-flex w-full items-center justify-center rounded-lg bg-[#0F8A99] px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F8A99] disabled:opacity-60"
              >
                {otpForm.processing ? 'Verifying...' : 'Confirm code'}
              </button>
            </form>

            <p className="mt-3 text-[11px] text-slate-500">
              For your security, do not share this code with anyone.
            </p>
          </div>
        </div>
      )}

      {processing && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-white/80 backdrop-blur-sm">
          <div className="flex flex-col items-center">
            <img
              src={LogoLoading}
              alt="Submitting..."
              className="h-50 w-50 select-none"
              style={{ animation: 'gentle-pulse 1.6s ease-in-out infinite' }}
              draggable={false}
            />
            <p className="mt-4 text-xl text-slate-700">Checking your details...</p>
          </div>
        </div>
      )}
    </div>
  );
}
