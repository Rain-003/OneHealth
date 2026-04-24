<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Inertia\Inertia;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Inertia::share([
            // ✅ Global CSRF token for all Inertia pages
            'csrf' => fn () => csrf_token(),

            // (Optional) minimal current users per guard
            'auth' => [
                'user' => fn () => optional(auth()->user())
                    ?->only(['id','name','email']),
                'patient' => fn () => optional(auth('patient')->user())
                    ?->only(['id','full_name','patient_type']),
            ],

            // (Optional) standard flash
            'flash' => fn () => [
                'message' => session('message'),
                'status'  => session('status'),
            ],
        ]);
    }
}
