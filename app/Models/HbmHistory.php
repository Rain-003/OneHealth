<?php

namespace App\Models;

use App\Enums\YesNo;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToBarangayUser;

class HbmHistory extends Model
{
    use BelongsToBarangayUser;
    // Eloquent will already pluralize HbmHistory -> hbm_histories,
    // but we can be explicit:
    protected $table = 'hbm_histories';

    protected $fillable = [
        'patient_id',
        'barangay',
        // Edad & Taas
        'age_bracket',        // under_18 | 18_34 | 35_plus | null
        'height_bracket',     // below_145 | eq_145 | above_145 | null

        // Kasaysayan ng Pagbubuntis
        'prev_pregnancies',
        'three_consecutive_abortions', // enum: oo | hindi | null
        'stillbirth_history',          // enum: oo | hindi | null
        'pph_history',                 // enum: oo | hindi | null

        // Kasalukuyang Problema
        'tb_current',                  // enum: oo | hindi | null
        'heart_disease_current',       // enum: oo | hindi | null
        'diabetes_current',            // enum: oo | hindi | null
        'asthma_current',              // enum: oo | hindi | null
        'goiter_current',              // enum: oo | hindi | null
    ];

    protected $casts = [
        // keep bracket enums as strings (nullable)
        'age_bracket'      => 'string',
        'height_bracket'   => 'string',

        // numbers
        'prev_pregnancies' => 'integer',

        // Yes/No enums (nullable)
        'three_consecutive_abortions' => YesNo::class,
        'stillbirth_history'          => YesNo::class,
        'pph_history'                 => YesNo::class,
        'tb_current'                  => YesNo::class,
        'heart_disease_current'       => YesNo::class,
        'diabetes_current'            => YesNo::class,
        'asthma_current'              => YesNo::class,
        'goiter_current'              => YesNo::class,
    ];

    public function patient()
    {
        return $this->belongsTo(PatientsModel::class, 'patient_id');
    }

    /* ---- Convenience helpers (optional) ---- */
    public function isYes(?YesNo $value): ?bool
    {
        return $value?->value === YesNo::Oo->value;
    }

    // Example usage: $model->isYes($model->tb_current)
}
