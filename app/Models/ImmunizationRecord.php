<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToBarangayUser;

class ImmunizationRecord extends Model
{

    use BelongsToBarangayUser;
    protected $table = 'immunization_records'; // adjust if different

    protected $fillable = [
        'patient_id',
        'barangay',
        'vaccine',
        'dose_label',
        'dose_no',   // keep if your table has this column
        'date_given',
        'remarks',
    ];

    // Ensures Inertia gets YYYY-MM-DD
    protected $casts = [
        'date_given' => 'date:Y-m-d',
    ];

    public function patient()
    {
        return $this->belongsTo(PatientsModel::class, 'patient_id');
    }
}
