@extends('layouts.app')
@section('title','Health Worker Login')

@section('body')
<div class="min-h-dvh flex items-center justify-center px-4 py-10">
  <div class="w-full max-w-md rounded-3xl shadow-[var(--shadow-oh)] bg-white overflow-hidden">
    <div class="bg-oh-teal px-6 py-6 text-white">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-white/20 grid place-items-center font-bold">OH</div>
        <h1 class="text-xl font-semibold">OneHealth Staff Login</h1>
      </div>
      <p class="text-white/80 text-sm mt-1">Welcome back! Please authenticate.</p>
    </div>

    <form method="POST" action="{{ route('login') }}" class="px-6 py-6 space-y-4">
      @csrf
      <label class="block">
        <span class="block text-sm font-medium mb-1">Email</span>
        <input name="email" type="email" autocomplete="email"
               value="{{ old('email') }}"
               class="w-full rounded-xl border border-slate-200 py-2.5 px-3 outline-none focus:ring-2 focus:ring-oh-teal"
               placeholder="you@example.com"/>
        @error('email') <div class="text-xs text-red-600 mt-1">{{ $message }}</div> @enderror
      </label>

      <label class="block">
        <span class="block text-sm font-medium mb-1">Password</span>
        <input name="password" type="password" autocomplete="current-password"
               class="w-full rounded-xl border border-slate-200 py-2.5 px-3 outline-none focus:ring-2 focus:ring-oh-teal"
               placeholder="••••••••"/>
      </label>

      <label class="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" name="remember" value="1" class="rounded border-slate-300"/>
        Remember me
      </label>

      <button class="mt-2 w-full bg-oh-teal hover:bg-oh-tealDark text-white font-medium py-2.5 rounded-xl transition-colors">
        Sign In
      </button>

      <div class="mt-4 text-center text-sm">
        <a href="{{ url('/') }}" class="text-oh-navy underline">Back to Landing</a>
      </div>
    </form>
  </div>
</div>
@endsection
