<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Pregnancy extends Model
{
    use HasFactory;

    protected $fillable = [
        'patient_id',
        'pregnancy_no',
        'lmp',
        'edd',
        'status',
        'outcome',
        'completed_at',
    ];

    protected $casts = [
        'lmp' => 'date',
        'edd' => 'date',
        'completed_at' => 'date',
    ];

    public function patient()
    {
        return $this->belongsTo(PatientsModel::class, 'patient_id');
    }

    public function currentPregnancy()
    {
        return $this->hasOne(CurrentPregnancy::class, 'pregnancy_id');
    }

    public function hbmHistory()
    {
        return $this->hasOne(HbmHistory::class, 'pregnancy_id');
    }

    public function prenatalTop()
    {
        return $this->hasOne(PrenatalTopModel::class, 'pregnancy_id');
    }

    public function prenatalPlan()
    {
        return $this->hasOne(PrenatalPlan::class, 'pregnancy_id');
    }

    public function prenatalVisits()
    {
        return $this->hasMany(PrenatalVisit::class, 'pregnancy_id');
    }

    public function postnatalRecord()
    {
        return $this->hasOne(PostnatalRecord::class, 'pregnancy_id');
    }

    public function scopeOngoing($query)
    {
        return $query->where('status', 'ongoing');
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function isOngoing(): bool
    {
        return $this->status === 'ongoing';
    }

    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }
}
