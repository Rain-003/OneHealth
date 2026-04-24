@extends('layouts.app')
@section('title','OneHealth — Choose Access')

@section('body')
<div class="max-w-5xl mx-auto px-4 py-10 md:py-14">
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 rounded-xl bg-oh-teal flex items-center justify-center text-white font-bold">OH</div>
      <h1 class="text-2xl md:text-3xl font-semibold tracking-wide text-oh-navy">ONE HEALTH</h1>
    </div>
    <a href="{{ route('worker.login') }}" class="rounded-full border border-slate-200 px-3.5 py-1.5 text-sm text-slate-700 hover:bg-white/60">Worker login</a>
  </div>

  <div class="text-center mt-8">
    <h2 class="text-xl md:text-2xl font-medium">How would you like to continue?</h2>
    <p class="text-slate-600 mt-1">Pick an option below.</p>
  </div>

  <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
    <a href="{{ route('patient.login') }}"
       class="card p-6 flex flex-col items-center text-center bg-white group">
      <div class="rounded-2xl w-28 h-28 bg-oh-teal/10 flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-105">
        <!-- patient icon -->
        <svg viewBox="0 0 24 24" class="w-14 h-14 text-oh-teal" fill="currentColor" aria-hidden="true">
          <path d="M12 13a5 5 0 1 0-5-5a5 5 0 0 0 5 5M4 20a8 8 0 0 1 16 0v1H4z"/>
        </svg>
      </div>
      <h3 class="text-lg font-semibold text-oh-navy">Patient Access</h3>
      <p class="text-sm text-slate-600 mt-1">View appointments, prescriptions, and results.</p>
    </a>

    <a href="{{ route('worker.login') }}"
       class="card p-6 flex flex-col items-center text-center bg-white group">
      <div class="rounded-2xl w-28 h-28 bg-oh-teal/10 flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-105">
        <!-- worker icon -->
        <svg viewBox="0 0 24 24" class="w-14 h-14 text-oh-teal" fill="currentColor" aria-hidden="true">
          <path d="M12 13a5 5 0 1 0-5-5a5 5 0 0 0 5 5M4 20a8 8 0 0 1 16 0v1H4z"/>
        </svg>
      </div>
      <h3 class="text-lg font-semibold text-oh-navy">Health Worker</h3>
      <p class="text-sm text-slate-600 mt-1">Sign in to manage accounts, records & reports.</p>
    </a>
  </div>

  <div class="mt-8 rounded-2xl bg-gradient-to-br from-oh-tealLight to-slate-100 p-5 text-slate-600">
    <p class="text-sm">Fully responsive. Staff use secure login; patients use their code to view their info.</p>
  </div>
</div>
@endsection
