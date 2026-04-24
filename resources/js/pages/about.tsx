import { Head } from '@inertiajs/react';
import Logo from '/public/build/assets/LOGO.svg';

const developers = [
  {
    initials: 'KA',
    name: 'Kraven Añonuevo',
    role: 'Developer',
    description: 'Handles system deployment and ensures everything runs smoothly and reliably for users.',
    linkedin: 'https://www.linkedin.com/in/kraven-anonuevo-318906249/',
    github: 'https://github.com/nagisa314',
    facebook: 'https://www.facebook.com/kraven.anonuevo ',
  },
  {
    initials: 'MG',
    name: 'Medge Guillermo',
    role: 'Developer',
    description: 'Designs and builds the interface, making the system easy to use and navigate.',
    linkedin: 'https://www.linkedin.com/in/medge-jhel-guillermo-3a5873343/',
    github: 'https://github.com/CRAEZIAN',
    facebook: 'https://www.facebook.com/medge.jhel.guillermo',
  },
  {
    initials: 'WM',
    name: 'Wrain Macalindong',
    role: 'Developer',
    description: 'Manages how information moves through the system and helps improve overall performance.',
    linkedin: 'https://www.linkedin.com/in/wrain-macalindong-767811400/',
    github: 'https://github.com/Rain-003',
    facebook: 'https://www.facebook.com/wrain.macalindong',
  },
];

function LinkedinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M6.94 8.5H3.56V20h3.38V8.5ZM5.25 3A1.97 1.97 0 1 0 5.3 6.94 1.97 1.97 0 0 0 5.25 3ZM20.44 13.02c0-3.46-1.85-5.07-4.31-5.07-1.99 0-2.88 1.1-3.37 1.88V8.5H9.38c.04.88 0 11.5 0 11.5h3.38v-6.42c0-.34.02-.68.12-.93.27-.68.88-1.38 1.91-1.38 1.35 0 1.89 1.03 1.89 2.54V20h3.38v-6.98Z" />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M12 2C6.48 2 2 6.58 2 12.24c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.5 0-.25-.01-1.08-.01-1.95-2.78.62-3.37-1.22-3.37-1.22-.46-1.18-1.11-1.5-1.11-1.5-.9-.64.07-.63.07-.63 1 .08 1.53 1.06 1.53 1.06.88 1.57 2.32 1.12 2.89.86.09-.66.35-1.12.63-1.38-2.22-.26-4.56-1.16-4.56-5.17 0-1.14.39-2.07 1.03-2.8-.1-.26-.45-1.33.1-2.77 0 0 .84-.28 2.75 1.07A9.33 9.33 0 0 1 12 6.86c.85 0 1.71.12 2.51.36 1.9-1.35 2.74-1.07 2.74-1.07.55 1.44.2 2.51.1 2.77.64.73 1.03 1.66 1.03 2.8 0 4.02-2.34 4.9-4.57 5.16.36.32.68.95.68 1.92 0 1.39-.01 2.5-.01 2.84 0 .28.18.61.69.5A10.27 10.27 0 0 0 22 12.24C22 6.58 17.52 2 12 2Z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.2 8.44 9.94v-7.03H7.9v-2.9h2.54V9.84c0-2.52 1.49-3.91 3.78-3.91 1.1 0 2.25.19 2.25.19V8.6H15.2c-1.25 0-1.64.78-1.64 1.58v1.89h2.8l-.45 2.9h-2.35V22c4.78-.74 8.44-4.92 8.44-9.94Z" />
    </svg>
  );
}

export default function About() {
  return (
    <div
      className="relative min-h-dvh bg-white text-slate-900"
      style={{
        fontFamily:
          "'Poppins', ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'",
      }}
    >
      <Head title="About OneHealth">
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-teal-200/15 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-cyan-200/15 blur-3xl" />
      </div>

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
              href="/"
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-[#203D7A] shadow-sm transition hover:border-teal-400/60 hover:text-[#0F8A99] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
            >
              Back to Home
            </a>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-semibold text-[#203D7A] md:text-4xl">
              About OneHealth
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm md:text-[15px] text-slate-600">
              Learn more about the system and the people behind it.
            </p>
          </div>

          <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
            <h3 className="text-xl font-semibold text-[#203D7A]">What is OneHealth?</h3>

            <div className="mt-5 rounded-2xl bg-slate-50 p-5">
              <p className="text-sm leading-8 text-slate-700 md:text-[15px]">
                OneHealth is a web-based immunization system developed for the
                barangays of the BAYANI Cluster. It helps digitize manual records,
                improve patient information management, support appointment scheduling,
                and provide easier access to health-related records through an online
                platform.
              </p>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-1 hover:shadow-sm">
                <h4 className="text-base font-semibold text-[#203D7A]">Admin Portal</h4>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Manages accounts, reports, and overall system monitoring.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-1 hover:shadow-sm">
                <h4 className="text-base font-semibold text-[#203D7A]">Health Worker Portal</h4>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Handles patient records, schedules, and immunization updates.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-1 hover:shadow-sm">
                <h4 className="text-base font-semibold text-[#203D7A]">Patient Portal</h4>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Lets patients view records, schedules, and announcements.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h3 className="text-xl font-semibold text-[#203D7A]">Developers</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Meet the team behind the OneHealth system.
                </p>
              </div>

              <span className="text-xs font-medium text-slate-400">
                Connect with the developers
              </span>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
              {developers.map((developer) => (
                <div
                  key={developer.name}
                  className="group rounded-3xl border border-slate-200 bg-white p-5 transition duration-300 hover:-translate-y-1 hover:border-teal-400/50 hover:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0F8A99]/10 text-sm font-semibold text-[#0F8A99] transition group-hover:scale-105">
                      {developer.initials}
                    </div>

                    <div className="flex gap-2">
                      <a
                        href={developer.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:border-[#0F8A99]/40 hover:text-[#0F8A99]"
                        aria-label={`${developer.name} LinkedIn`}
                      >
                        <LinkedinIcon />
                      </a>

                      <a
                        href={developer.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:border-[#0F8A99]/40 hover:text-[#0F8A99]"
                        aria-label={`${developer.name} GitHub`}
                      >
                        <GithubIcon />
                      </a>

                      <a
                        href={developer.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:border-[#0F8A99]/40 hover:text-[#0F8A99]"
                        aria-label={`${developer.name} Facebook`}
                      >
                        <FacebookIcon />
                      </a>
                    </div>
                  </div>

                  <h4 className="mt-5 text-xl font-semibold text-[#203D7A]">
                    {developer.name}
                  </h4>
                  <p className="mt-1 text-sm font-medium text-slate-600">{developer.role}</p>
                  <p className="mt-3 text-sm leading-7 text-slate-500">
                    {developer.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <div className="mt-12 flex flex-col gap-4 border-t border-slate-200 pt-6 md:flex-row md:items-center md:justify-between">
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