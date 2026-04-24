<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PatientOwnershipRequest extends Model
{
    protected $table = 'patient_ownership_requests';

    protected $fillable = [
        'patient_id',
        'requested_by',
        'current_owner_id',
        'status',
        'message',
        'responded_by',
        'responded_at',
    ];

    protected $casts = [
        'responded_at' => 'datetime',
    ];

    public function patient()
    {
        return $this->belongsTo(PatientsModel::class, 'patient_id');
    }

    public function requester()
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function currentOwner()
    {
        return $this->belongsTo(User::class, 'current_owner_id');
    }

    public function responder()
    {
        return $this->belongsTo(User::class, 'responded_by');
    }
}
