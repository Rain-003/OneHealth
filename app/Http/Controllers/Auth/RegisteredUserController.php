<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Support\Str;
use Inertia\Inertia;

class RegisteredUserController extends Controller
{
    public function create()
    {
        // Must match resources/js/pages/auth/register.tsx (lowercase)
        return Inertia::render('auth/register');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'     => ['required', 'string', 'max:255'],
            'email'    => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:users,email'],
            'password' => [
                'required',
                'confirmed',
                Password::min(8)->mixedCase()->numbers()->symbols()->uncompromised()
            ],
            // Intentionally no 'role' from client for security
        ]);

        $user = User::create([
            'name'              => Str::of($validated['name'])->squish()->__toString(),
            'email'             => Str::lower($validated['email']),
            'password'          => Hash::make($validated['password']),
            'role'              => 'health_worker', // server-enforced default
            // Leave email_verified_at null; add 'verified' middleware later if desired
        ]);

        event(new Registered($user)); // will send verification email if mail is configured

        // Do NOT login automatically; send back to login with a flash message
        return redirect()->route('login')->with('status', 'Account created. You can now log in.');
    }
}
