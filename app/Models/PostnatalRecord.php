<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToBarangayUser;
use App\Enums\YesNo; // backed enum: 'oo' | 'hindi'

class PostnatalRecord extends Model
{
    use BelongsToBarangayUser;
    // Table name defaults to 'postnatal_records'

    protected $fillable = [
        'patient_id',
        'barangay',
        'followup_date',

        // Oo/Hindi fields
        'exclusive_breastfeeding',
        'family_planning_intent',
        'fever_38_up',
        'foul_lochia',
        'heavy_bleeding',
        'red_breast',
        'navel_ok',

        // Vitals / notes
        'bp',
        'wt',
        'temp',
        'remarks',

        // Vitamins / Iron dates
        'vitamin_a_date',
        'iron_folate_date',

        // Health problems (Oo/Hindi)
        'tb',
        'heart_disease',
        'diabetes',
        'asthma',
        'goiter',
    ];

    protected $casts = [
        // Dates
        'followup_date'    => 'date',
        'vitamin_a_date'   => 'date',
        'iron_folate_date' => 'date',

        // Enum yes/no (stored as 'oo' | 'hindi' | null)
        'exclusive_breastfeeding' => YesNo::class,
        'family_planning_intent'  => YesNo::class,
        'fever_38_up'             => YesNo::class,
        'foul_lochia'             => YesNo::class,
        'heavy_bleeding'          => YesNo::class,
        'red_breast'              => YesNo::class,
        'navel_ok'                => YesNo::class,

        'tb'            => YesNo::class,
        'heart_disease' => YesNo::class,
        'diabetes'      => YesNo::class,
        'asthma'        => YesNo::class,
        'goiter'        => YesNo::class,

        // Leave bp/wt/temp/remarks as strings unless you change DB types
        // 'wt'   => 'decimal:2', // uncomment only if you change column type
        // 'temp' => 'decimal:1', // idem
    ];

    /* Relationships */
    public function patient()
    {
        return $this->belongsTo(PatientsModel::class, 'patient_id');
    }

    /* Handy scopes */
    public function scopeForPatient($q, $patientId)
    {
        return $q->where('patient_id', $patientId);
    }

    public function scopeOnDate($q, $date)
    {
        return $q->whereDate('followup_date', $date);
    }
}
