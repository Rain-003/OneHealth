<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\PatientsModel;

class PrenatalPlan extends Model
{
    use HasFactory;

    protected $table = 'prenatal_plans';

    protected $fillable = [
        'patient_id',

        // legacy fields (still kept so nothing else breaks)
        'planned_facility',
        'attending',
        'philhealth_accredited',
        'distance',
        'estimated_cost',
        'payment_mode',
        'transport',
        'companion_1_name',
        'companion_1_contact',
        'companion_2_name',
        'companion_2_contact',
        'blood_type',
        'blood_donors',
        'refer_to_name',
        'refer_to_contact',
        'refer_to_address',

        // NEW Birth & Emergency Plan fields (ITRBirthPlan.tsx)
        'plan_date',
        'attending_personnel',
        'planned_facility_is_philhealth',
        'distance_from_residence',
        'mode_of_payment',
        'available_transport',

        'companion_name',
        'companion_address',
        'companion_contact',

        'family_companion_name',
        'family_companion_relationship',
        'family_companion_address',
        'family_companion_contact',

        'caretaker_name',
        'caretaker_relationship',

        'blood_donor_1_name',
        'blood_donor_1_address',
        'blood_donor_2_name',
        'blood_donor_2_address',

        'emergency_contact_name',
        'emergency_contact_address',
        'emergency_contact_contact',

        'maternal_hospital_1_name',
        'maternal_hospital_1_address',
        'maternal_hospital_2_name',
        'maternal_hospital_2_address',

        'signature_name',
        'signature_mode',
        'signature_path',
        'signed_at',
    ];

    protected $casts = [
        'philhealth_accredited' => 'boolean',
        'plan_date'             => 'date',
        'signed_at' => 'datetime',
    ];

    // 👇 This makes sure `family_number` is included when the model is converted to array / JSON
    protected $appends = [
        'family_number',
    ];

    public function patient()
    {
        return $this->belongsTo(PatientsModel::class, 'patient_id');
    }

    /**
     * Virtual `family_number` attribute, pulled from the related patient.
     * This does NOT change the DB, it just exposes a computed field.
     */
    public function getFamilyNumberAttribute()
    {
        $patient = $this->patient;

        if (!$patient) {
            return null;
        }

        // Prefer the unified family_number, but fall back to legacy fields
        return $patient->family_number
            ?? $patient->family_no
            ?? $patient->family_serial_number
            ?? null;
    }
}
