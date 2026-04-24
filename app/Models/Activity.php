<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Activity extends Model
{
    protected $fillable = [
        'user_id', 'patient_id', 'type', 'description', 'properties', 'ip_address', 'user_agent',
    ];

    protected $casts = [
        'properties' => 'array',
    ];

    public function user()    { return $this->belongsTo(User::class); }
    public function patient() { return $this->belongsTo(PatientsModel::class, 'patient_id'); }

    // Convenience helper
    public static function record(string $type, array $attrs = []): self
    {
        $request = request();
        return static::create([
            'user_id'     => $attrs['user_id']     ?? auth()->id(),
            'patient_id'  => $attrs['patient_id']  ?? null,
            'type'        => $type,
            'description' => $attrs['description'] ?? ucfirst(str_replace('_', ' ', $type)),
            'properties'  => $attrs['properties']  ?? null,
            'ip_address'  => $attrs['ip_address']  ?? ($request?->ip()),
            'user_agent'  => $attrs['user_agent']  ?? ($request?->userAgent()),
        ]);
    }
}
