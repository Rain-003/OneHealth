<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <title inertia>OneHealth</title>

    <link rel="icon" type="image/svg+xml" href="{{ asset('onehealth-icon.svg') }}">
    <link rel="alternate icon" href="{{ asset('favicon.ico') }}">

    {{-- CSRF for Laravel --}}
    <meta name="csrf-token" content="{{ csrf_token() }}">

    {{-- Make the token available to any script (and preconfigure axios if it exists) --}}
    <script>
        (function () {
            const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
            // Expose for fetch() helpers or other libs
            window.__CSRF_TOKEN__ = token;

            // If axios was loaded before Vite bundle, set defaults early
            if (window.axios) {
                window.axios.defaults.withCredentials = true;
                window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
                window.axios.defaults.headers.common['Accept'] = 'application/json';
                window.axios.defaults.headers.common['X-CSRF-TOKEN'] = token;
            }
        })();
    </script>

    @viteReactRefresh
    @vite('resources/js/app.tsx')
    @inertiaHead
</head>

<body class="min-h-dvh bg-oh-tealLight text-slate-800 antialiased">
  @yield('body')
</body>
</html>
