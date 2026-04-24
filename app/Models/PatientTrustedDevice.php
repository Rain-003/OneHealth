<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PatientTrustedDevice extends Model
{
    protected $fillable = [
        'patient_id',
        'token_hash',
        'device_name',
        'user_agent',
        'ip_address',
        'last_used_at',
        'expires_at',
        'revoked_at',
    ];

    protected $casts = [
        'last_used_at' => 'datetime',
        'expires_at'   => 'datetime',
        'revoked_at'   => 'datetime',
    ];

    public function patient(): BelongsTo
    {
        return $this->belongsTo(PatientsModel::class, 'patient_id');
    }

    public function isActive(): bool
    {
        return is_null($this->revoked_at) && now()->lt($this->expires_at);
    }
}