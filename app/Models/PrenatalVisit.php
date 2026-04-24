<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToBarangayUser;

class PrenatalVisit extends Model
{
    use BelongsToBarangayUser;
    protected $table = 'prenatal_visits';

    protected $fillable = [
        'patient_id',
        'barangay',
        'visit_date',
        'aog_days',
        'bp',
        'pr',
        'rr',
        'wt',
        'temp',
        'fh',
        'fhr',
        'health_education',
        'birthplan_filled',
        'lab_request',
        'referred',
        'tt_given_ml',
        'feso4_caps',
        'advised',
        'remarks',
        'trimester', // accepts "1st" | "2nd" | "3rd" or 1|2|3
    ];

    protected $casts = [
        'visit_date'        => 'date:Y-m-d',
        'aog_days'          => 'integer',
        'wt'                => 'decimal:2',
        'fh'                => 'decimal:2',
        'fhr'               => 'integer',
        'health_education'  => 'boolean',
        'birthplan_filled'  => 'boolean',
        'lab_request'       => 'boolean',
        'referred'          => 'boolean',
        'tt_given_ml'       => 'decimal:2',
        'feso4_caps'        => 'integer',
        'advised'           => 'boolean',
        // pr, rr, temp, bp, remarks (strings)
    ];

    /** ---------- Normalizers ---------- */
    public function setWtAttribute($v)        { $this->attributes['wt'] = $this->n($v); }
    public function setFhAttribute($v)        { $this->attributes['fh'] = $this->n($v); }
    public function setTtGivenMlAttribute($v) { $this->attributes['tt_given_ml'] = $this->n($v); }
    public function setFeso4CapsAttribute($v) { $this->attributes['feso4_caps'] = $this->i($v); }
    public function setFhrAttribute($v)       { $this->attributes['fhr'] = $this->i($v); }
    public function setAogDaysAttribute($v)   { $this->attributes['aog_days'] = $this->i($v); }

    protected function n($v)
    {
        return ($v === '' || $v === null) ? null : (is_numeric($v) ? $v : null);
    }
    protected function i($v)
    {
        return ($v === '' || $v === null) ? null : (is_numeric($v) ? (int) $v : null);
    }

    /** ---------- Trimester: tolerate int or "1st/2nd/3rd" ---------- */
    public function setTrimesterAttribute($v)
    {
        if ($v === '' || $v === null) {
            $this->attributes['trimester'] = null;
            return;
        }
        $map = [
            '1st' => 1, '2nd' => 2, '3rd' => 3,
            '1' => 1, '2' => 2, '3' => 3,
            1 => 1, 2 => 2, 3 => 3,
        ];
        // If column is INT this will be perfect; if it's VARCHAR, MySQL will store "1"/"2"/"3" fine.
        $this->attributes['trimester'] = $map[$v] ?? $v;
    }

    public function getTrimesterAttribute($v)
    {
        if ($v === null || $v === '') return null;
        $rev = [
            1 => '1st', 2 => '2nd', 3 => '3rd',
            '1' => '1st', '2' => '2nd', '3' => '3rd',
            '1st' => '1st', '2nd' => '2nd', '3rd' => '3rd',
        ];
        return $rev[$v] ?? null; // normalize presentation for the UI
    }

    /** ---------- Relations / scopes ---------- */
    public function patient()
    {
        return $this->belongsTo(PatientsModel::class, 'patient_id');
    }

    public function scopeChrono($q)
    {
        return $q->orderBy('visit_date', 'asc')->orderBy('id', 'asc');
    }
}
