<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PrenatalBirthPlan extends Model
{
    protected $fillable = [
        'patient_id',
        'planned_facility','attending','philhealth_accredited','distance',
        'estimated_cost','payment_mode','transport',
        'companion_1_name','companion_1_contact','companion_2_name','companion_2_contact',
        'blood_type','blood_donors','refer_to_name','refer_to_contact','refer_to_address',
        'nearest_facilities',
    ];

    protected $casts = [
        'philhealth_accredited' => 'boolean',
        'nearest_facilities'    => 'array',
    ];
}
