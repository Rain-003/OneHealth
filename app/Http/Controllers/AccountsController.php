<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Archive;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class AccountsController extends Controller
{
    public function index(Request $request)
    {
        $q = (string) $request->query('q', '');
        $role = (string) $request->query('role', '');

        $users = User::query()
            ->when($q !== '', function ($query) use ($q) {
                $like = '%' . str_replace(['%', '_'], ['\\%', '\\_'], $q) . '%';

                $query->where(function ($sub) use ($like) {
                    $sub->where('name', 'like', $like)
                        ->orWhere('email', 'like', $like);
                });
            })
            ->when($role !== '', fn ($query) => $query->where('role', $role))
            ->orderByDesc('created_at')
            ->paginate(10)
            ->withQueryString()
            ->through(function (User $u) {
                return [
                    'id' => $u->id,
                    'name' => $u->name,
                    'email' => $u->email,
                    'role' => $u->role,
                    'barangay' => $u->barangay,
                    'email_verified_at' => optional($u->email_verified_at)?->toDateTimeString(),
                    'created_at' => optional($u->created_at)?->toDateTimeString(),
                ];
            });

        $activeTab = $request->input('tab');

        return Inertia::render('accounts/index', [
            'users' => $users,
            'filters' => [
                'q' => $q,
                'role' => $role,
            ],
            'can' => [
                'manageUsers' => true,
            ],
            'flash' => [
                'success' => $activeTab === 'accounts' ? session('success') : null,
                'error' => $activeTab === 'accounts' ? session('error') : null,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $roles = ['admin', 'health_worker'];
        $maxPerBarangay = 5;

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'max:255',
                'email:rfc',
                'regex:/^[^@\s]+@[^@\s]+\.(com|net|org|gov|edu|ph|mil|info|io|co|biz)$/i',
                'unique:users,email',
            ],
            'role' => ['required', Rule::in($roles)],
            'barangay' => [
                'nullable',
                'string',
                'max:255',
                Rule::requiredIf($request->input('role') === 'health_worker'),
                function ($attribute, $value, $fail) use ($request, $maxPerBarangay) {
                    if ($request->input('role') !== 'health_worker' || !$value) {
                        return;
                    }

                    $count = User::where('role', 'health_worker')
                        ->where('barangay', $value)
                        ->count();

                    if ($count >= $maxPerBarangay) {
                        $fail("Maximum of {$maxPerBarangay} health worker accounts for {$value} has been reached.");
                    }
                },
            ],
            'password' => [
                'required',
                'string',
                'confirmed',
                Password::min(8)
                    ->mixedCase()
                    ->numbers()
                    ->symbols(),
            ],
        ]);

        User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'role' => $data['role'],
            'barangay' => $data['barangay'] ?? null,
            'password' => Hash::make($data['password']),
            'email_verified_at' => now(),
        ]);

        return redirect()->route('admin.index', array_filter([
            'tab' => 'accounts',
            'q' => $request->input('q'),
            'role' => $request->input('role'),
        ]))->with('success', 'Account created.');
    }

    public function update(Request $request, User $user)
    {
        $roles = ['admin', 'health_worker'];
        $maxPerBarangay = 5;

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'max:255',
                'email:rfc',
                'regex:/^[^@\s]+@[^@\s]+\.(com|net|org|gov|edu|ph|mil|info|io|co|biz)$/i',
                Rule::unique('users', 'email')->ignore($user->id),
            ],
            'role' => ['required', Rule::in($roles)],
            'barangay' => [
                'nullable',
                'string',
                'max:255',
                Rule::requiredIf($request->input('role') === 'health_worker'),
                function ($attribute, $value, $fail) use ($request, $user, $maxPerBarangay) {
                    if ($request->input('role') !== 'health_worker' || !$value) {
                        return;
                    }

                    $count = User::where('role', 'health_worker')
                        ->where('barangay', $value)
                        ->where('id', '!=', $user->id)
                        ->count();

                    if ($count >= $maxPerBarangay) {
                        $fail("Maximum of {$maxPerBarangay} health worker accounts for {$value} has been reached.");
                    }
                },
            ],
            'password' => [
                'nullable',
                'string',
                'confirmed',
                Password::min(8)
                    ->mixedCase()
                    ->numbers()
                    ->symbols(),
            ],
        ]);

        $user->name = $data['name'];
        $user->email = $data['email'];
        $user->role = $data['role'];
        $user->barangay = $data['barangay'] ?? null;

        if (!empty($data['password'])) {
            $user->password = Hash::make($data['password']);
        }

        $user->save();

        return redirect()->route('admin.index', array_filter([
            'tab' => 'accounts',
            'q' => $request->input('q'),
            'role' => $request->input('role'),
        ]))->with('success', 'Account updated.');
    }

public function destroy(Request $request, User $user)
{
    $redirect = redirect()->route('admin.index', array_filter([
        'tab' => 'accounts',
        'q' => $request->input('q'),
        'role' => $request->input('role'),
    ]));

    try {
        DB::transaction(function () use ($user) {
            Archive::create([
                'item_type' => 'user',
                'item_id' => $user->id,
                'item_label' => $user->name ?? $user->email ?? ('User #' . $user->id),
                'reason' => 'Account archived from Admin Accounts.',
                'user_id' => auth()->id(),
                'archived_at' => now(),
            ]);

            $user->delete();
        });

        return $redirect->with('success', 'Account archived.');
    } catch (\Illuminate\Validation\ValidationException $e) {
        return $redirect->with('error', collect($e->errors())->flatten()->first());
    } catch (\Throwable $e) {
        return $redirect->with('error', 'Failed to archive account.');
    }
}
}