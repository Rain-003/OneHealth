<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthenticatedSessionController extends Controller
{
    public function create()
    {
        // Must match resources/js/pages/auth/login.tsx (lowercase)
        return Inertia::render('auth/login');
    }

    protected function throttleKey(Request $request): string
    {
        return Str::lower($request->input('email')).'|'.$request->ip();
    }

    public function store(Request $request)
    {
        $credentials = $request->validate([
            'email'    => ['required', 'email', 'max:255'],
            'password' => ['required', 'string'],
            'remember' => ['sometimes', 'boolean'],
        ]);

        // Simple login rate limiting (5 attempts per minute per email+IP)
        $key = $this->throttleKey($request);
        if (RateLimiter::tooManyAttempts($key, 5)) {
            $seconds = RateLimiter::availableIn($key);
            throw ValidationException::withMessages([
                'email' => "Too many login attempts. Try again in {$seconds} seconds.",
            ]);
        }

        $remember = (bool) ($credentials['remember'] ?? false);

        if (Auth::attempt([
            'email' => Str::lower($credentials['email']),
            'password' => $credentials['password'],
        ], $remember)) {
            RateLimiter::clear($key);
            $request->session()->regenerate();

            // Activity log: successful login (login time = created_at)
            if (Auth::id()) {
                Activity::record('auth.login', [
                    'user_id'     => Auth::id(),
                    'description' => 'Logged in',
                ]);
            }

            return redirect()->intended(route('dashboard'));
        }

        // Count failed attempt for 60 seconds decay
        RateLimiter::hit($key, 60);

        throw ValidationException::withMessages([
            'email' => 'These credentials do not match our records.',
        ])->redirectTo(url('/login'));
    }

    public function destroy(Request $request)
    {
        // Activity log: logout
        if ($request->user()) {
            Activity::record('auth.logout', [
                'user_id'     => $request->user()->id,
                'description' => 'Logged out',
            ]);
        }

        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
