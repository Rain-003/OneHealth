@extends('layouts.app')
@section('title','Patient Login')
@section('body')
<div class="min-h-dvh flex items-center justify-center p-4">
  <div class="w-full max-w-md card p-6 bg-white">
    <div class="flex items-center gap-3 mb-6">
      <div class="w-9 h-9 rounded-xl bg-oh-teal text-white flex items-center justify-center font-bold">OH</div>
      <h1 class="text-xl font-semibold text-oh-navy">Patient Login</h1>
    </div>
    <form method="POST" action="#">
      @csrf
      <label class="block text-sm font-medium mb-1">Name</label>
      <input class="w-full rounded-xl border border-slate-200 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-oh-teal" placeholder="Your name"/>

      <label class="block text-sm font-medium mt-4 mb-1">Code</label>
      <input class="w-full rounded-xl border border-slate-200 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-oh-teal" placeholder="Access code"/>

      <button class="mt-6 w-full bg-oh-teal hover:bg-oh-tealDark text-white font-medium py-2.5 rounded-xl transition-colors">Log In</button>
      <div class="mt-4 text-center text-sm">
        <a href="{{ route('worker.login') }}" class="text-oh-navy underline">Log in for Workers</a>
      </div>
    </form>
  </div>
</div>
@endsection
