import * as React from 'react';
import { Head, useForm, Link } from '@inertiajs/react';

type FormShape = { barangay: string; houseNumber: string; };

export default function PatientLogin() {
  const { data, setData, post, processing, errors } = useForm<FormShape>({
    barangay: '', houseNumber: ''
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/patient/login'); // PatientsController@store
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <Head title="Patient Login" />
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-[0_18px_40px_rgba(14,30,37,.12)] relative">
        <a href="/" className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-4">
          <svg viewBox="0 0 24 24" className="w-5 h-5"><path fill="currentColor" d="m10 19l-7-7l7-7v4h8v6h-8z"/></svg>
          <span>Back</span>
        </a>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-[#0F8A99] text-white flex items-center justify-center font-bold">OH</div>
          <div className="text-[#203D7A] font-semibold">ONE&nbsp;HEALTH</div>
          <Link href="/login" className="ml-auto text-sm underline text-slate-600 hover:text-slate-800">
            Staff / Admin login
          </Link>
        </div>

        <h2 className="text-lg font-semibold text-[#203D7A] mb-3">Patient Login</h2>

        <form onSubmit={submit}>
          <label className="block text-sm font-medium mb-1">Barangay</label>
          <input
            className="w-full rounded-xl border border-slate-200 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-[#0F8A99] bg-white"
            value={data.barangay}
            onChange={(e)=>setData('barangay', e.target.value)}
            placeholder="Barangay name"
          />
          {errors?.barangay && <p className="text-sm text-red-600 mt-1">{errors.barangay}</p>}

          <label className="block text-sm font-medium mt-4 mb-1">House Number</label>
          <input
            className="w-full rounded-xl border border-slate-200 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-[#0F8A99] bg-white"
            value={data.houseNumber}
            onChange={(e)=>setData('houseNumber', e.target.value)}
            placeholder="e.g., 123-A"
          />
          {errors?.houseNumber && <p className="text-sm text-red-600 mt-1">{errors.houseNumber}</p>}

          <button
            disabled={processing}
            className="bg-[#0F8A99] hover:bg-[#0B6F7A] text-white font-medium py-2.5 px-4 rounded-xl transition-colors w-full mt-6 disabled:opacity-60"
          >
            {processing ? 'Checking…' : 'View my records'}
          </button>
        </form>

        <div className="mt-4 text-center text-sm">
          <Link href="/patient/access-with-info" className="text-[#203D7A] underline">
            Use personal info instead
          </Link>
        </div>
      </div>
    </div>
  );
}
