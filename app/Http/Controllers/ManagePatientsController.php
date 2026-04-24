<?php

namespace App\Http\Controllers;

use App\Models\Activity;
use App\Models\PatientsModel;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;

class ManagePatientsController extends Controller
{
    public function create()
    {
        return Inertia::render('center/patients/create');
    }

    /**
     * Store a new patient from AddPatientWizard.
     */
    public function store(Request $request)
    {
        // --- Build full_name as fallback (first/middle/last/suffix) ---
        $first = trim((string) $request->input('first_name'));
        $middle = trim((string) $request->input('middle_name'));
        $last = trim((string) $request->input('last_name'));
        $suffix = trim((string) $request->input('suffix'));

        if (strtoupper($suffix) === 'OTHERS') {
            $suffix = trim((string) $request->input('suffix_other'));
        }

        $builtFull = trim(implode(' ', array_filter([$first, $middle, $last, $suffix])));

        if (!$request->filled('full_name') && $builtFull !== '') {
            $request->merge(['full_name' => $builtFull]);
        }

        // --- NORMALIZE FAMILY NUMBER FROM ANY POSSIBLE WIZARD KEY ---
        $familyInput = $request->input('family_serial_number')
            ?? $request->input('family_no')
            ?? $request->input('familyNumber')
            ?? $request->input('family_number');

        if ($familyInput !== null) {
            if (!$request->filled('family_serial_number')) {
                $request->merge(['family_serial_number' => $familyInput]);
            }
            if (!$request->filled('family_no')) {
                $request->merge(['family_no' => $familyInput]);
            }
        }

        // --- NORMALIZE PHILHEALTH FROM ANY POSSIBLE WIZARD KEY ---
        $philhealthInput = $request->input('philhealth_no')
            ?? $request->input('philhealth_number')
            ?? $request->input('philhealthNumber');

        if ($philhealthInput !== null && !$request->filled('philhealth_no')) {
            $request->merge(['philhealth_no' => $philhealthInput]);
        }

        // --- Validate ---
        $data = $request->validate([
            'patient_type' => ['required', 'in:immunization,pregnancy'],
            'full_name' => ['required', 'string', 'max:255'],

            'birthdate' => [
                Rule::requiredIf(fn() => $request->input('patient_type') === 'immunization'),
                'nullable',
                'date',
                'before_or_equal:today',
            ],

            'sex' => ['nullable', 'in:Male,Female'],
            'barangay' => ['nullable', 'string', 'max:191'],
            'address' => ['nullable', 'string', 'max:255'],
            'place_of_birth' => ['nullable', 'string', 'max:255'],
            'health_center' => ['nullable', 'string', 'max:255'],

            // Contact aliases
            'phone' => ['nullable', 'string', 'max:30'],
            'contact_number' => ['nullable', 'string', 'max:30'],
            'contact_no' => ['nullable', 'string', 'max:30'],

            'mother_name' => ['nullable', 'string', 'max:255'],
            'father_name' => ['nullable', 'string', 'max:255'],

            // Family no aliases
            'family_serial_number' => ['nullable', 'string', 'max:191'],
            'family_no' => ['nullable', 'string', 'max:191'],

            // PhilHealth aliases
            'philhealth_number' => ['nullable', 'string', 'max:191'],
            'philhealth_no' => ['nullable', 'string', 'max:191'],

            // Pregnancy
            'height_cm' => ['nullable', 'integer', 'min:0', 'max:400'],
            'civil_status' => ['nullable', 'string', 'max:50'],

            // Immunization extra fields
            'birth_weight_kg' => ['nullable', 'numeric', 'min:0', 'max:20'],
            'date_of_registration' => ['nullable', 'date'],
            'date_referred_nb_screening' => ['nullable', 'date'],
            'date_nbs_done' => ['nullable', 'date'],
            'child_height_cm' => ['nullable', 'numeric', 'min:0', 'max:200'],
            'cpab' => ['nullable', 'string', 'max:100'],
            'delivery_type' => ['nullable', 'string', 'max:100'],
            'tt_status_mother' => ['nullable', 'string', 'max:100'],
            'tt_status_date' => ['nullable', 'date'],

            // Optional raw address components from older/newer forms
            'province' => ['nullable', 'string', 'max:191'],
            'state_province' => ['nullable', 'string', 'max:191'],
            'city' => ['nullable', 'string', 'max:191'],
            'city_municipality' => ['nullable', 'string', 'max:191'],
            'street' => ['nullable', 'string', 'max:191'],
            'purok' => ['nullable', 'string', 'max:191'],
            'house_no' => ['nullable', 'string', 'max:191'],

            // New wizard address keys
            'address_province' => ['nullable', 'string', 'max:191'],
            'address_city' => ['nullable', 'string', 'max:191'],
            'address_house_street' => ['nullable', 'string', 'max:191'],
            'address_line2' => ['nullable', 'string', 'max:191'],
            'address_postal_code' => ['nullable', 'string', 'max:30'],
        ]);

        // Auto-assign ownership to creator
        if (Auth::check()) {
            $data['owner_id'] = Auth::id();
        }

        // Normalize strings
        $data['full_name'] = Str::of($data['full_name'])->squish()->__toString();

        foreach ([
            'mother_name',
            'father_name',
            'place_of_birth',
            'health_center',
            'cpab',
            'delivery_type',
            'tt_status_mother',
            'civil_status',
        ] as $k) {
            if (array_key_exists($k, $data)) {
                $data[$k] = $data[$k] !== null && $data[$k] !== ''
                    ? Str::of($data[$k])->squish()->__toString()
                    : null;
            }
        }

        if (!empty($data['barangay'])) {
            $data['barangay'] = Str::of($data['barangay'])->squish()->__toString();
        }

        // Map phone aliases → contact_no
        $data['contact_no'] = $data['contact_no']
            ?? ($data['contact_number'] ?? ($data['phone'] ?? null));

        unset($data['phone'], $data['contact_number']);

        // Normalize contact_no: digits only; keep 09XXXXXXXXX when possible
        if (array_key_exists('contact_no', $data) && $data['contact_no'] !== null) {
            $digits = preg_replace('/\D/', '', (string) $data['contact_no']);

            if ($digits !== '') {
                if (strlen($digits) === 10 && str_starts_with($digits, '9')) {
                    $data['contact_no'] = '0' . $digits;
                } else {
                    $data['contact_no'] = $digits;
                }
            } else {
                $data['contact_no'] = null;
            }
        }

        // Map wizard key → DB column (philhealth)
        $data['philhealth_no'] = $data['philhealth_no'] ?? ($data['philhealth_number'] ?? null);
        unset($data['philhealth_number']);

        // Normalize birthdate to Y-m-d (supports DD/MM/YYYY)
        if (!empty($data['birthdate'])) {
            $raw = $data['birthdate'];

            if (is_string($raw) && preg_match('/^\d{2}\/\d{2}\/\d{4}$/', $raw)) {
                $data['birthdate'] = Carbon::createFromFormat('d/m/Y', $raw)->toDateString();
            } else {
                $data['birthdate'] = Carbon::parse($raw)->toDateString();
            }
        } else {
            $data['birthdate'] = null;
        }

        // Normalize other date fields
        foreach ([
            'date_of_registration',
            'date_referred_nb_screening',
            'date_nbs_done',
            'tt_status_date',
        ] as $dateField) {
            if (!empty($data[$dateField])) {
                $data[$dateField] = Carbon::parse($data[$dateField])->toDateString();
            } else {
                $data[$dateField] = null;
            }
        }

        // Normalize numeric extra fields
        foreach (['birth_weight_kg', 'child_height_cm'] as $numField) {
            if (array_key_exists($numField, $data)) {
                $data[$numField] = ($data[$numField] === '' || $data[$numField] === null)
                    ? null
                    : (float) $data[$numField];
            }
        }

        // Build a human-readable address if none was provided directly
        if (empty($data['address'])) {
            $province = $request->input('address_province')
                ?? $request->input('province')
                ?? $request->input('state_province');

            $city = $request->input('address_city')
                ?? $request->input('city')
                ?? $request->input('city_municipality');

            $line1 = $request->input('address_house_street')
                ?? $request->input('street')
                ?? $request->input('house_no')
                ?? $request->input('purok');

            $line2 = $request->input('address_line2');
            $postal = $request->input('address_postal_code');

            $parts = array_filter([
                $line1 ? Str::of($line1)->squish()->__toString() : null,
                $line2 ? Str::of($line2)->squish()->__toString() : null,
                $data['barangay'] ?? null,
                $city ? Str::title(Str::of($city)->squish()->__toString()) : null,
                $province ? Str::title(Str::of($province)->squish()->__toString()) : null,
                $postal ? Str::of($postal)->squish()->__toString() : null,
            ]);

            $data['address'] = $parts ? Str::upper(implode(', ', $parts)) : null;
        } elseif (!empty($data['address'])) {
            $data['address'] = Str::of($data['address'])->squish()->__toString();
        }
        if (($data['patient_type'] ?? null) === 'pregnancy') {
            $data['sex'] = 'Female';
        }

        // Create the patient
        $patient = PatientsModel::create($data);

        // Activity log
        $bd = $patient->birthdate instanceof Carbon
            ? $patient->birthdate->toDateString()
            : (is_string($patient->birthdate) ? $patient->birthdate : null);

        $module = $patient->patient_type === 'pregnancy' ? 'prenatal' : 'immunization';

        Activity::record('patient.created', [
            'patient_id' => $patient->id,
            'description' => 'Added patient in ' . $module . ': ' . $patient->full_name,
            'properties' => [
                'birthdate' => $bd,
                'module' => $module,
                'patient_type' => $patient->patient_type,
            ],
        ]);

        return redirect()
            ->route('center.records.show', ['patient' => $patient->id])
            ->with('success', 'Patient created.');
    }
}