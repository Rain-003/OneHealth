<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Http\Requests\UserStoreRequest;
use App\Http\Requests\UserUpdateRequest;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function index(Request $r)
    {
        $q    = $r->string('q');
        $role = $r->string('role');

        $users = User::query()
            ->when($q, fn ($qq) => $qq->where(function ($w) use ($q) {
                $w->where('name', 'like', "%$q%")
                  ->orWhere('email', 'like', "%$q%");
            }))
            ->when($role, fn ($qq) => $qq->where('role', $role))
            ->orderByDesc('id')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('accounts/index', [
            'users' => $users->through(function ($u) {
                return [
                    'id'                => $u->id,
                    'name'              => $u->name,
                    'email'             => $u->email,
                    'role'              => $u->role,
                    'barangay'          => $u->barangay, // 👈 NEW
                    'email_verified_at' => $u->email_verified_at?->toDateTimeString(),
                    'created_at'        => $u->created_at?->toDateTimeString(),
                ];
            }),
            'filters' => [
                'q'    => $q,
                'role' => $role,
            ],
            'can' => ['manageUsers' => true],
        ]);
    }

    public function store(UserStoreRequest $r)
    {
        $data = $r->validated();

        User::create([
            'name'      => $data['name'],
            'email'     => $data['email'],
            'role'      => $data['role'],
            'barangay'  => $data['barangay'] ?? null, // 👈 NEW
            'password'  => Hash::make($data['password']),
        ]);

        return back()->with('success', 'Account created.');
    }

    public function update(UserUpdateRequest $r, User $user)
    {
        $data = $r->validated();

        $user->fill([
            'name'      => $data['name'],
            'email'     => $data['email'],
            'role'      => $data['role'],
            'barangay'  => $data['barangay'] ?? null, // 👈 NEW
        ]);

        if (!empty($data['password'])) {
            $user->password = Hash::make($data['password']);
        }

        $user->save();

        return back()->with('success', 'Account updated.');
    }

    public function destroy(User $user)
    {
        if (auth()->id() === $user->id) {
            return back()->with('error', 'You cannot delete your own account.');
        }

        $user->delete();

        return back()->with('success', 'Account deleted.');
    }
}
