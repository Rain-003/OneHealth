<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     */
    public function share(Request $request): array
    {
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');

        return [
            ...parent::share($request),

            // App info
            'name' => config('app.name'),
            'quote' => [
                'message' => trim((string) $message),
                'author'  => trim((string) $author),
            ],

            // Current authenticated web user (lazy)
            'auth' => [
                'user' => fn () => $request->user(),
            ],

            // Sidebar state
            'sidebarOpen' => ! $request->hasCookie('sidebar_state')
                || $request->cookie('sidebar_state') === 'true',

            // Flash messages available as props.flash
            'flash' => fn () => [
                'status'       => session('status'),
                'message'      => session('message'),
                'error'        => session('error'),
                'flash_id'     => session('flash_id'),

                // OTP login helpers (used by PatientAccessWithInfo.tsx)
                'otp_sent'     => session('otp_sent'),
                'phone_masked' => session('phone_masked'),
                'otp_message'  => session('otp_message'),
                'otp_cooldown' => session('otp_cooldown'),
            ],
        ];
    }
}