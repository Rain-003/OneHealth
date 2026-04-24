<?php

namespace App\Http\Middleware;

use Closure;                               // <-- add this
use Illuminate\Http\Request;               // usually already there
use Illuminate\Support\Facades\Auth;       // needed below

class RedirectIfAuthenticated
{
    public function handle(Request $request, Closure $next, ...$guards)
    {
        $guards = empty($guards) ? [null] : $guards;

        foreach ($guards as $guard) {
            if (Auth::guard($guard)->check()) {
                return $guard === 'patient'
                    ? redirect()->route('patient.dashboard')
                    : redirect()->route('dashboard');
            }
        }

        return $next($request);
    }
}
