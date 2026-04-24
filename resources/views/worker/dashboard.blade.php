@extends('layouts.app')
@section('title','Worker Dashboard')

@section('body')
<div class="min-h-dvh bg-slate-50">
  <aside id="oh-sidebar"
         class="fixed inset-y-0 left-0 z-30 w-72 -translate-x-0 md:translate-x-0 bg-oh-teal text-white px-4 pb-6 pt-5 shadow-xl transition-transform">
    <div class="flex items-center justify-between px-2">
      <div class="flex items-center gap-2">
        <div class="w-7 h-7 rounded-lg bg-white/20 grid place-items-center font-bold">OH</div>
        <span class="font-semibold tracking-wide">ONE HEALTH</span>
      </div>
      <button class="rounded-xl p-2 hover:bg-white/10 md:hidden"
              onclick="document.getElementById('oh-sidebar').classList.add('-translate-x-full')">
        <svg class="w-5 h-5" viewBox='0 0 24 24' fill='none' stroke='currentColor'><path d='M4 6h16M4 12h16M4 18h16'/></svg>
      </button>
    </div>

    <nav class="mt-6 space-y-2">
      @php $items = [
        ['Dashboard', route('dashboard')],
        ['Patients',  '#'],
        ['Records',   '#'],
        ['Reports',   '#'],
        ['Settings',  '#'],
      ]; @endphp
      @foreach($items as [$label,$href])
        <a href="{{ $href }}"
           class="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-white/10">
          <span>{{ $label }}</span>
          <svg class="w-4 h-4 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </a>
      @endforeach
    </nav>

    <div class="mt-auto pt-6 border-t border-white/10">
      <form method="POST" action="{{ route('logout') }}">
        @csrf
        <button class="w-full rounded-xl bg-white/10 hover:bg-white/20 py-2">Sign out</button>
      </form>
    </div>
  </aside>

  <main class="md:pl-72">
    <header class="sticky top-0 z-20 bg-white/70 backdrop-blur border-b border-slate-200">
      <div class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <button class="md:hidden rounded-xl p-2 hover:bg-slate-100"
                  onclick="document.getElementById('oh-sidebar').classList.remove('-translate-x-full')">
            <svg class="w-5 h-5" viewBox='0 0 24 24' fill='none' stroke='currentColor'><path d='M4 6h16M4 12h16M4 18h16'/></svg>
          </button>
          <h1 class="text-lg font-semibold text-oh-navy">Dashboard</h1>
        </div>
        <div class="flex items-center gap-2">
          <input class="hidden md:block rounded-xl border border-slate-200 py-2 px-3 outline-none focus:ring-2 focus:ring-oh-teal"
                 placeholder="Search…"/>
          <div class="w-9 h-9 rounded-full bg-oh-teal text-white grid place-items-center font-semibold">W</div>
        </div>
      </div>
    </header>

    <section class="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        @foreach([['Patients',24],['Records',58],['Reports',5],['Alerts',2]] as [$k,$v])
          <div class="rounded-2xl bg-white p-4 shadow-[var(--shadow-oh)]">
            <div class="text-sm text-slate-500">{{ $k }}</div>
            <div class="mt-1 text-3xl font-bold text-slate-800">{{ $v }}</div>
          </div>
        @endforeach
      </div>

      <div class="rounded-2xl bg-white shadow-[var(--shadow-oh)] overflow-hidden">
        <div class="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 class="font-semibold text-oh-navy">Recent Activity</h2>
          <a href="#" class="text-sm text-oh-navy underline">View all</a>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead class="bg-slate-50 text-slate-600">
              <tr>
                <th class="text-left px-4 py-2">Patient</th>
                <th class="text-left px-4 py-2">Action</th>
                <th class="text-left px-4 py-2">When</th>
                <th class="text-left px-4 py-2">By</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @foreach([
                ['Jane Doe','Updated record','2h ago','Nurse K'],
                ['Sam Cruz','New report','4h ago','Dr. M'],
                ['Ava Lee','Appointment set','Yesterday','Nurse K'],
              ] as [$p,$a,$t,$b])
              <tr>
                <td class="px-4 py-2">{{ $p }}</td>
                <td class="px-4 py-2">{{ $a }}</td>
                <td class="px-4 py-2 text-slate-500">{{ $t }}</td>
                <td class="px-4 py-2">{{ $b }}</td>
              </tr>
              @endforeach
            </tbody>
          </table>
        </div>
      </div>
    </section>
  </main>
</div>
@endsection
