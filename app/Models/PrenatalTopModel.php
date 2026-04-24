<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToBarangayUser;
use Carbon\Carbon;

class PrenatalTopModel extends Model
{

    use BelongsToBarangayUser;
    protected $table = 'prenatal_top';

    protected $fillable = [
        'patient_id',
        'barangay',
        'lmp','edc','ob_g','ob_p','ob_gtpal',
        // flags + dates
        'risk_a_flag','risk_b_flag','risk_c_flag','risk_d_flag','risk_e_flag',
        'risk_a_date','risk_b_date','risk_c_date','risk_d_date','risk_e_date',
        // TT / Vit A
        'tt1_date','tt2_date','tt3_date','tt4_date','tt5_date','vitamin_a_date',
    ];

    protected $casts = [
        'lmp' => 'date:Y-m-d',
        'edc' => 'date:Y-m-d',
        'risk_a_date' => 'date:Y-m-d',
        'risk_b_date' => 'date:Y-m-d',
        'risk_c_date' => 'date:Y-m-d',
        'risk_d_date' => 'date:Y-m-d',
        'risk_e_date' => 'date:Y-m-d',
        'tt1_date' => 'date:Y-m-d',
        'tt2_date' => 'date:Y-m-d',
        'tt3_date' => 'date:Y-m-d',
        'tt4_date' => 'date:Y-m-d',
        'tt5_date' => 'date:Y-m-d',
        'vitamin_a_date' => 'date:Y-m-d',

        'risk_a_flag' => 'boolean',
        'risk_b_flag' => 'boolean',
        'risk_c_flag' => 'boolean',
        'risk_d_flag' => 'boolean',
        'risk_e_flag' => 'boolean',
    ];

    /** Normalize string/DateTime to Y-m-d; return null when invalid. */
    protected static function normalizeDate($v): ?string
    {
        if ($v === null || $v === '') return null;
        if ($v instanceof \DateTimeInterface) {
            return $v->format('Y-m-d');
        }
        try {
            return Carbon::parse($v)->format('Y-m-d');
        } catch (\Throwable $e) {
            return null;
        }
    }

    public function patient()
    {
        return $this->belongsTo(PatientsModel::class, 'patient_id');
    }

    public function setLmpAttribute($v){ $this->attributes['lmp'] = static::normalizeDate($v); }
    public function setEdcAttribute($v){ $this->attributes['edc'] = static::normalizeDate($v); }

    public function setRiskADateAttribute($v){ $this->attributes['risk_a_date'] = static::normalizeDate($v); }
    public function setRiskBDateAttribute($v){ $this->attributes['risk_b_date'] = static::normalizeDate($v); }
    public function setRiskCDateAttribute($v){ $this->attributes['risk_c_date'] = static::normalizeDate($v); }
    public function setRiskDDateAttribute($v){ $this->attributes['risk_d_date'] = static::normalizeDate($v); }
    public function setRiskEDateAttribute($v){ $this->attributes['risk_e_date'] = static::normalizeDate($v); }

    public function setTt1DateAttribute($v){ $this->attributes['tt1_date'] = static::normalizeDate($v); }
    public function setTt2DateAttribute($v){ $this->attributes['tt2_date'] = static::normalizeDate($v); }
    public function setTt3DateAttribute($v){ $this->attributes['tt3_date'] = static::normalizeDate($v); }
    public function setTt4DateAttribute($v){ $this->attributes['tt4_date'] = static::normalizeDate($v); }
    public function setTt5DateAttribute($v){ $this->attributes['tt5_date'] = static::normalizeDate($v); }
    public function setVitaminADateAttribute($v){ $this->attributes['vitamin_a_date'] = static::normalizeDate($v); }
}
