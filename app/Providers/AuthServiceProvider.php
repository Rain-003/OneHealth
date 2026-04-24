<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;

class AuthServiceProvider extends ServiceProvider
{
    protected $policies = [
        // \App\Models\User::class => \App\Policies\UserPolicy::class,
    ];

    public function boot(): void
    {
        $this->registerPolicies();

        // Admins are allowed to do anything
        Gate::before(function (User $user, ?string $ability = null) {
            return strcasecmp((string)$user->role, 'admin') === 0 ? true : null;
        });

        // Ability used by routes: can:manage-users
        Gate::define('manage-users', function (User $user) {
            return $user->role === 'admin';
        });
    }
}
