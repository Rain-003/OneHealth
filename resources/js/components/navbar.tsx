import * as React from 'react';
import { useForm } from '@inertiajs/react';

/**
 * PatientNavbar
 * - Default (top of page): brand pill + welcome + "exit"
 * - On scroll: condenses into a fixed top navigation bar with section links
 *
 * Tailwind is already configured in the project, so classes below should work as‑is.
 */
export default function PatientNavbar({ username }: { username?: string }) {
  const { post } = useForm({});
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 120);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const logout = (e: React.MouseEvent) => {
    e.preventDefault();
    post('/patient/logout');
  };

  if (scrolled) {
    // Compact, fixed navbar (Image #2)
    return (
      <div className="fixed inset-x-0 top-0 z-50 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-6xl h-14 px-4 flex items-center gap-6">
          <div className="font-semibold tracking-wider text-slate-800">
            ONE HEALTH
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs md:text-sm font-medium tracking-wider">
            <a href="#patient-info" className="hover:text-teal-700">PATIENT INFORMATION</a>
            <a href="#schedule" className="hover:text-teal-700">SCHEDULE</a>
            <a href="#inbox" className="hover:text-teal-700">INBOX</a>
            <a href="#records" className="hover:text-teal-700">RECORDS</a>
          </nav>

          <button
            onClick={logout}
            className="ml-auto inline-flex items-center rounded-full border px-3 py-1 text-xs md:text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            exit
          </button>
        </div>
      </div>
    );
  }

  // Large, in-flow header (Image #1)
  return (
    <header className="pt-4">
      <div className="mx-auto max-w-6xl px-4 flex items-center justify-between">
        <div className="inline-flex items-center rounded-full border px-4 py-2">
          <span className="font-semibold tracking-wider text-slate-800">ONE HEALTH</span>
          <span className="mx-3 h-5 w-px bg-slate-300" aria-hidden="true" />
          <button
            onClick={logout}
            className="inline-flex items-center rounded-full border px-3 py-1 text-xs md:text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            exit
          </button>
        </div>

        <div className="text-sm text-slate-700">
          Welcome User:{' '}
          <span className="ml-1 inline-flex items-center rounded-full bg-teal-900 text-white px-2 py-0.5">
            {username ?? 'USERPATIENT1'}!
          </span>
        </div>
      </div>
    </header>
  );
}
