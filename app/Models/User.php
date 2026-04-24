<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Validation\ValidationException;

class User extends Authenticatable
{
    use HasFactory, Notifiable, SoftDeletes;

    protected $fillable = [
        'name',
        'email',
        'password',
        'barangay',
        'role',
        'email_verified_at',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    protected static function booted(): void
    {
        static::deleting(function (User $user) {
            // Block deleting the last active admin
            if ($user->role === 'admin') {
                $activeAdminCount = static::where('role', 'admin')->count();

                if ($activeAdminCount <= 1) {
                    throw ValidationException::withMessages([
                        'account' => 'The last admin account cannot be archived or deleted.',
                    ]);
                }
            }

            // Optional extra safety: block self-delete at model level too
            if (auth()->check() && auth()->id() === $user->id) {
                throw ValidationException::withMessages([
                    'account' => 'You cannot archive or delete your own account.',
                ]);
            }
        });
    }
}