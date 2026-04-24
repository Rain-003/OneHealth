<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Archive extends Model
{
    use HasFactory;

    protected $table = 'archives';

    protected $fillable = [
        'patient_id',
        'user_id',
        'item_type',
        'item_id',
        'item_label',
        'reason',
        'payload',
        'archived_at',
        'restored_at',
    ];

    protected $casts = [
        'archived_at' => 'datetime',
        'restored_at' => 'datetime',
        'payload'     => 'array',
    ];

    public function patient()
    {
        return $this->belongsTo(PatientsModel::class, 'patient_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function scopeOnlyActive($query)
    {
        return $query->whereNull('restored_at');
    }

    public function scopeOnlyRestored($query)
    {
        return $query->whereNotNull('restored_at');
    }
}
