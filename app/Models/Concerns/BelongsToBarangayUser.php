<?php

namespace App\Models\Concerns;

use Illuminate\Support\Facades\Auth;

trait BelongsToBarangayUser
{
    protected static function bootBelongsToBarangayUser()
    {
        static::creating(function ($model) {
            $user = Auth::user();

            if ($user && empty($model->barangay)) {
                $model->barangay = $user->barangay
                    ?? $user->health_center
                    ?? null;
            }
        });
    }
}
