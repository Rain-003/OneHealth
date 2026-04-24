<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">

    {{-- App title for Inertia pages --}}
    <title inertia>{{ config('app.name', 'ONE HEALTH') }}</title>

    {{-- Favicon / tab logo --}}
    <link rel="icon" type="image/svg+xml" href="{{ asset('LOGO.svg') }}">
    <link rel="shortcut icon" type="image/svg+xml" href="{{ asset('LOGO.svg') }}">

    {{-- Icons / font --}}
    <link rel="apple-touch-icon" href="{{ asset('apple-touch-icon.png') }}">
    <link rel="preconnect" href="https://fonts.bunny.net">
    <link
      href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600"
      rel="stylesheet"
    />

    {{-- CSRF for Laravel --}}
    <meta name="csrf-token" content="{{ csrf_token() }}">

    {{-- Make the token available to any script (and preconfigure axios if it exists) --}}
    <script>
      (function () {
        const token =
          document
            .querySelector('meta[name="csrf-token"]')
            ?.getAttribute('content') || '';

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

    {{-- Vite + Inertia --}}
    @viteReactRefresh
    @vite(['resources/js/app.tsx'])
    @inertiaHead
  </head>
  <body class="font-sans antialiased">
    @inertia
  </body>
</html>
