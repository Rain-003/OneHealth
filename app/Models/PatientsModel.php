<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Notifications\Notifiable;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Carbon\Carbon;

/**
 * App\Models\PatientsModel
 *
 * @property int $id
 * @property string|null $patient_type
 * @property string|null $full_name
 * @property string|null $first_name
 * @property string|null $middle_name
 * @property string|null $last_name
 * @property string|null $suffix
 * @property string|null $sex
 * @property string|null $barangay
 * @property string|null $address
 * @property \Illuminate\Support\Carbon|null $birthdate
 * @property string|null $contact_no
 * @property string|null $mother_name
 * @property string|null $father_name
 * @property string|null $place_of_birth
 * @property float|null  $birth_weight_kg
 * @property float|null  $birth_length_cm
 * @property string|null $health_center
 * @property string|null $family_no
 * @property string|null $family_serial_number
 * @property string|null $philhealth_no
 * @property int|null    $height_cm
 * @property string|null $civil_status
 *
 * JSON attributes (cast to array)
 * @property array|null $prenatal_plan
 * @property array|null $prenatal_visits
 * @property array|null $prenatal_history
 * @property array|null $prenatal_ttvita
 * @property array|null $prenatal_hbm_current
 * @property array|null $prenatal_hbm_after
 * @property array|null $prenatal_itr
 *
 * Appended accessors
 * @property-read int|null    $age_years
 * @property-read string|null $phone_number
 */
class PatientsModel extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $table = 'patients';

    protected $hidden = ['password', 'remember_token'];

    protected $fillable = [
        'owner_id',
        'patient_type',
        'full_name',
        'first_name',
        'middle_name',
        'last_name',
        'suffix',
        'birthdate',
        'barangay',


        'status',
        // Header / demographics
        'sex',
        'place_of_birth',
        'address',
        'birth_weight_kg',
        'birth_length_cm',
        'contact_no',
        'mother_name',
        'father_name',
        'health_center',
        'family_no',

        // Prenatal / ITR metadata
        'family_serial_number',
        'philhealth_no',
        'height_cm',
        'civil_status',

        // JSON columns
        'prenatal_plan',
        'prenatal_visits',
        'prenatal_history',
        'prenatal_ttvita',
        'prenatal_hbm_current',
        'prenatal_hbm_after',
        'prenatal_itr',

        // Immunization metadata
        'date_of_registration',
        'date_referred_nb_screening',
        'date_nbs_done',
        'child_height_cm',
        'cpab',
        'delivery_type',
        'tt_status_mother',
        'tt_status_date',

    ];

    protected $casts = [
        'birthdate' => 'date',
        'birth_weight_kg' => 'float',
        'birth_length_cm' => 'float',
        'height_cm' => 'integer',
        'prenatal_itr' => 'array',
        'prenatal_plan' => 'array',
        'prenatal_visits' => 'array',
        'prenatal_hbm_current' => 'array',
        'prenatal_hbm_after' => 'array',
        'prenatal_history' => 'array',
        'prenatal_ttvita' => 'array',
        'date_of_registration' => 'date',
        'date_referred_nb_screening' => 'date',
        'date_nbs_done' => 'date',
        'child_height_cm' => 'decimal:2',
        'tt_status_date' => 'date',

    ];

    protected $appends = [
        'age_years',
        'phone_number',
    ];

    /* -------- Accessors -------- */

    public function getAgeYearsAttribute(): ?int
    {
        return $this->birthdate ? Carbon::parse($this->birthdate)->age : null;
    }

    /**
     * Virtual attribute used by the React UI (patient.phone_number).
     * Reads from the contact_no DB column.
     */
    public function getPhoneNumberAttribute(): ?string
    {
        return $this->contact_no;
    }

    /* -------- Relations -------- */

    public function immunizations(): HasMany
    {
        return $this->hasMany(\App\Models\ImmunizationRecord::class, 'patient_id');
    }

    public function owner()
    {
        return $this->belongsTo(\App\Models\User::class, 'owner_id');
    }

    public function trustedDevices(): HasMany
    {
        return $this->hasMany(\App\Models\PatientTrustedDevice::class, 'patient_id');
    }
}
