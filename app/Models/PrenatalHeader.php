<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PrenatalHeader extends Model
{
    protected $table = 'prenatal_headers';

    /**
     * Keep ONLY columns that actually exist on prenatal_headers.
     * (Risk-code dates belong in patients.prenatal_itr JSON, not here.)
     */
    protected $fillable = [
        'patient_id',

        // Header / identity
        'blood_type',
        'family_serial_no',
        'name_line',
        'address_line',

        // TT dates + Vitamin A (if present on this table)
        'tt1_date',
        'tt2_date',
        'tt3_date',
        'tt4_date',
        'tt5_date',
        'vitamin_a_date',

        // Age & height
        'age_years',
        'age_band',        // UNDER_18 | 18_TO_34 | 35_PLUS
        'height_cm',
        'height_band',     // UNDER_145 | AT_LEAST_145

        // Recommendation
        'recommend_hospital_delivery',

        // Pregnancy history
        'previous_pregnancies_count', // 1 | 2 | 3 | 4 | 4_PLUS
        'prior_cesarean',
        'three_consecutive_miscarriages',
        'prior_stillbirth',
        'pph_after_delivery',

        // Current health problems
        'tuberculosis_14days_cough',
        'heart_disease',
        'diabetes',
        'asthma',
        'goiter',

        // ITR pregnancy details held by this table
        'lmp', 'edc', 'ob_g', 'ob_p', 'ob_gtpal',
    ];

    protected $casts = [
        // dates
        'tt1_date'       => 'date:Y-m-d',
        'tt2_date'       => 'date:Y-m-d',
        'tt3_date'       => 'date:Y-m-d',
        'tt4_date'       => 'date:Y-m-d',
        'tt5_date'       => 'date:Y-m-d',
        'vitamin_a_date' => 'date:Y-m-d',
        'lmp'            => 'date:Y-m-d',
        'edc'            => 'date:Y-m-d',

        // numbers
        'age_years' => 'integer',
        'height_cm' => 'integer',

        // booleans
        'recommend_hospital_delivery'    => 'boolean',
        'prior_cesarean'                 => 'boolean',
        'three_consecutive_miscarriages' => 'boolean',
        'prior_stillbirth'               => 'boolean',
        'pph_after_delivery'             => 'boolean',
        'tuberculosis_14days_cough'      => 'boolean',
        'heart_disease'                  => 'boolean',
        'diabetes'                       => 'boolean',
        'asthma'                         => 'boolean',
        'goiter'                         => 'boolean',
    ];

    public function patient()
    {
        return $this->belongsTo(PatientsModel::class, 'patient_id');
    }

    /* ------------------------- Guard against bad dates ------------------------- */

    protected static function normalizeDate(?string $v): ?string
    {
        if (!$v) return null;
        // Accept YYYY-MM-DD only; anything else → null
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $v)) return null;

        // Optional hard clamp for MySQL DATE valid range
        // (MySQL’s strict mode rejects < 1000-01-01)
        if (strcmp($v, '1000-01-01') < 0) return null;

        return $v;
    }

    public function setLmpAttribute($value): void
    {
        $this->attributes['lmp'] = static::normalizeDate($value);
    }

    public function setEdcAttribute($value): void
    {
        $this->attributes['edc'] = static::normalizeDate($value);
    }

    public function setTt1DateAttribute($value): void
    {
        $this->attributes['tt1_date'] = static::normalizeDate($value);
    }

    public function setTt2DateAttribute($value): void
    {
        $this->attributes['tt2_date'] = static::normalizeDate($value);
    }

    public function setTt3DateAttribute($value): void
    {
        $this->attributes['tt3_date'] = static::normalizeDate($value);
    }

    public function setTt4DateAttribute($value): void
    {
        $this->attributes['tt4_date'] = static::normalizeDate($value);
    }

    public function setTt5DateAttribute($value): void
    {
        $this->attributes['tt5_date'] = static::normalizeDate($value);
    }

    public function setVitaminADateAttribute($value): void
    {
        $this->attributes['vitamin_a_date'] = static::normalizeDate($value);
    }
}
