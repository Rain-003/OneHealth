<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToBarangayUser;
use App\Enums\YesNo;
use App\Models\Pregnancy;

class CurrentPregnancy extends Model
{
    use BelongsToBarangayUser;
    protected $table = 'current_pregnancies';

    protected $fillable = [
        'patient_id',
        'barangay',
        'visit_date',
        'age_of_pregnancy',
        'bp',
        'weight_kg',
        'fundic_height',
        'fetal_heart_tone',
        'remarks',
        'laboratory_results',
        'iron_folate_rx',
        'next_visit_date',

        // All yes/no
        'bleeding',
        'uti',
        'fever_38_or_more',
        'pallor_anemia',
        'abnormal_abdominal_size',
        'abnormal_presentation',
        'absent_fetal_heartbeat',
        'edema',
        'vaginal_infection',
        'iodine_risk_area',
        'malaria_prophylaxis',
        'plan_breastfeed',
        'counseled_danger_signs',
        'dental_check',
        'birth_plan_prepared',
        'danger_present',

        // keep if you still store extras
        'checks',
        'hr','rr','temp',

        'pregnancy_id',
    ];

    protected $casts = [
        'visit_date'     => 'date',
        'next_visit_date'=> 'date',

        // Enum casts (normalize to enum objects in PHP)
        'bleeding'                => YesNo::class,
        'uti'                     => YesNo::class,
        'fever_38_or_more'        => YesNo::class,
        'pallor_anemia'           => YesNo::class,
        'abnormal_abdominal_size' => YesNo::class,
        'abnormal_presentation'   => YesNo::class,
        'absent_fetal_heartbeat'  => YesNo::class,
        'edema'                   => YesNo::class,
        'vaginal_infection'       => YesNo::class,
        'iodine_risk_area'        => YesNo::class,
        'malaria_prophylaxis'     => YesNo::class,
        'plan_breastfeed'         => YesNo::class,
        'counseled_danger_signs'  => YesNo::class,
        'dental_check'            => YesNo::class,
        'birth_plan_prepared'     => YesNo::class,
        'danger_present'          => YesNo::class,

        'checks' => 'array',
        'weight_kg' => 'decimal:2',
        'temp'      => 'decimal:1',
        'hr'        => 'integer',
        'rr'        => 'integer',
    ];

    public function patient()
    {
        return $this->belongsTo(PatientsModel::class, 'patient_id');
    }

    public function scopeForPatient($q, $patientId)
    {
        return $q->where('patient_id', $patientId);
    }
}
