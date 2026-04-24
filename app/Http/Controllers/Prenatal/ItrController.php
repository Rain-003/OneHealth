<?php

namespace App\Http\Controllers\Prenatal;

use App\Http\Controllers\Controller;
use App\Http\Controllers\PatientRecordsController;
use App\Models\PatientsModel;
use App\Models\PrenatalTopModel;
use App\Models\PrenatalPlan;
use App\Models\PrenatalVisit;
use App\Models\Appointment;
use App\Models\Activity;
use App\Models\CurrentPregnancy;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ItrController extends Controller
{
    /* ───────────────────────────── Auth helpers ───────────────────────────── */

    private function ensureCanEdit(Request $request, PatientsModel $patient): void
    {
        $user = $request->user();
        if (!$user) abort(403);

        if ($user->role !== 'admin' && (int) $patient->owner_id !== (int) $user->id) {
            abort(403, 'View only.');
        }
    }

    /**
     * ✅ If patient is currently TRANSFERRED, flip back to ACTIVE when a real record is saved.
     * (draft/autosave should NOT reactivate)
     */
    private function reactivateIfTransferred(PatientsModel $patient, string $source): void
    {
        $cur = strtolower((string) ($patient->status ?? ''));
        if ($cur !== 'transferred') return;

        $patient->status = 'active';
        $patient->save();

        Activity::record('patient.reactivated', [
            'patient_id'  => $patient->id,
            'description' => 'Patient status set back to active after saving a record.',
            'properties'  => [
                'from'   => 'transferred',
                'to'     => 'active',
                'source' => $source,
            ],
        ]);
    }

    /* ───────────────────── Signature storage helpers ───────────────────── */

    /**
     * Keep one consistent disk for signature files.
     * Using the public disk is safest for both local and hosted Laravel apps
     * because it works with Storage::url() and the /storage symlink.
     */
    private function signatureDisk(): string
    {
        return 'public';
    }

    /**
     * Store only a clean relative path in DB.
     */
    private function normalizeStoredPath(?string $path): ?string
    {
        if (!$path) return null;

        $path = str_replace('\\', '/', $path);
        $path = preg_replace('#^/?storage/#', '', $path);
        $path = ltrim($path, '/');

        return $path !== '' ? $path : null;
    }

    /**
     * Delete a previously stored signature safely.
     */
    private function deleteSignatureFile(?string $path): void
    {
        $path = $this->normalizeStoredPath($path);
        if (!$path) return;

        try {
            Storage::disk($this->signatureDisk())->delete($path);
        } catch (\Throwable $e) {
            Log::warning('Failed deleting prenatal signature file', [
                'path' => $path,
                'err'  => $e->getMessage(),
            ]);
        }
    }

    /**
     * Save uploaded signature image and return relative path.
     */
    private function storeUploadedSignature(Request $request): ?string
    {
        if (!$request->hasFile('signature_file')) {
            return null;
        }

        $stored = $request->file('signature_file')->store(
            'signatures/prenatal',
            $this->signatureDisk()
        );

        return $this->normalizeStoredPath($stored);
    }

    /**
     * Save drawn signature (base64 data URL) and return relative path.
     */
    private function storeDrawnSignature(?string $dataUrl): ?string
    {
        if (!$dataUrl) {
            return null;
        }

        if (!preg_match('/^data:image\/(\w+);base64,/', $dataUrl, $matches)) {
            return null;
        }

        $base64 = substr($dataUrl, strpos($dataUrl, ',') + 1);
        $decoded = base64_decode($base64);

        if ($decoded === false) {
            return null;
        }

        $ext = strtolower($matches[1] ?? 'png');
        if ($ext === 'jpeg') $ext = 'jpg';
        if (!in_array($ext, ['png', 'jpg', 'webp'], true)) {
            $ext = 'png';
        }

        $path = 'signatures/prenatal/' . uniqid('sig_', true) . '.' . $ext;

        Storage::disk($this->signatureDisk())->put($path, $decoded);

        return $this->normalizeStoredPath($path);
    }

    /* ───────────────────────────── AOG helpers ───────────────────────────── */

    private function normalizeYmd($value): ?string
    {
        if ($value === null || $value === '') return null;
        try {
            return Carbon::parse($value)->format('Y-m-d');
        } catch (\Throwable $e) {
            return null;
        }
    }

    private function daysBetweenYmd(?string $from, ?string $to): ?int
    {
        if (!$from || !$to) return null;

        try {
            $a = Carbon::createFromFormat('Y-m-d', $from)->startOfDay();
            $b = Carbon::createFromFormat('Y-m-d', $to)->startOfDay();
            return (int) $a->diffInDays($b, false);
        } catch (\Throwable $e) {
            return null;
        }
    }

    private function trimesterFromAogDays(?int $aogDays): ?string
    {
        if ($aogDays === null || $aogDays < 0) return null;

        if ($aogDays <= 97) return '1st';
        if ($aogDays <= 181) return '2nd';
        return '3rd';
    }

    private function resolvePatientLmpDate(PatientsModel $patient): ?string
    {
        try {
            $top = PrenatalTopModel::where('patient_id', $patient->id)->first();
            $topLmp = $this->normalizeYmd($top?->lmp);
            if ($topLmp) return $topLmp;
        } catch (\Throwable $e) {
            // ignore
        }

        $snap = (array) ($patient->prenatal_itr ?? []);
        $snapLmp = $this->normalizeYmd($snap['lmp'] ?? ($snap['lmp_date'] ?? null));
        if ($snapLmp) return $snapLmp;

        return null;
    }

    /**
     * Recompute all prenatal visit AOGs in chronological order.
     */
    private function recomputeVisitAogChain(PatientsModel $patient): void
    {
        $lmp = $this->resolvePatientLmpDate($patient);

        $visits = PrenatalVisit::where('patient_id', $patient->id)
            ->orderBy('visit_date')
            ->orderBy('id')
            ->get();

        $prevAogDays = null;
        $prevVisitDate = null;

        foreach ($visits as $idx => $visit) {
            $visitDate = $this->normalizeYmd($visit->visit_date);
            $newAogDays = null;

            if (!$visitDate) {
                $newAogDays = null;
            } elseif ($idx === 0) {
                $fromLmp = $this->daysBetweenYmd($lmp, $visitDate);
                if ($fromLmp !== null && $fromLmp >= 0) {
                    $newAogDays = $fromLmp;
                } elseif (!is_null($visit->aog_days) && (int) $visit->aog_days >= 0) {
                    $newAogDays = (int) $visit->aog_days;
                }
            } else {
                $gap = $this->daysBetweenYmd($prevVisitDate, $visitDate);

                if ($prevAogDays !== null && $gap !== null) {
                    $newAogDays = $prevAogDays + $gap;
                } else {
                    $fromLmp = $this->daysBetweenYmd($lmp, $visitDate);
                    if ($fromLmp !== null && $fromLmp >= 0) {
                        $newAogDays = $fromLmp;
                    } elseif (!is_null($visit->aog_days) && (int) $visit->aog_days >= 0) {
                        $newAogDays = (int) $visit->aog_days;
                    }
                }
            }

            $changes = [];

            if (Schema::hasColumn($visit->getTable(), 'aog_days')) {
                $changes['aog_days'] = $newAogDays;
            }

            if (Schema::hasColumn($visit->getTable(), 'trimester')) {
                $changes['trimester'] = $this->trimesterFromAogDays($newAogDays);
            }

            if (!empty($changes)) {
                $visit->forceFill($changes);
                $visit->save();
            }

            $prevAogDays = $newAogDays;
            $prevVisitDate = $visitDate;
        }
    }

    /**
     * Refresh patient JSON snapshot from DB rows so frontend gets canonical values.
     */
    private function refreshPatientPrenatalVisitsSnapshot(PatientsModel $patient): void
    {
        if (!Schema::hasColumn($patient->getTable(), 'prenatal_visits')) return;

        $rows = PrenatalVisit::where('patient_id', $patient->id)
            ->orderBy('visit_date')
            ->orderBy('id')
            ->get()
            ->map(fn ($r) => $r->toArray())
            ->values()
            ->all();

        $patient->prenatal_visits = $rows;
        $patient->save();
    }

    /**
     * Rebuild the mirrored HBM/current data from all ITR visits.
     */
    private function syncAllItrVisitsToHbmCurrent(PatientsModel $patient): void
    {
        if (Schema::hasColumn($patient->getTable(), 'prenatal_hbm_current')) {
            $patient->prenatal_hbm_current = [
                'rows'   => [],
                'visits' => [],
            ];
            $patient->save();
        }

        CurrentPregnancy::where('patient_id', $patient->id)->delete();
        Appointment::where('patient_id', $patient->id)
            ->where('source_type', 'prenatal_current_visit')
            ->delete();

        $visits = PrenatalVisit::where('patient_id', $patient->id)
            ->orderBy('visit_date')
            ->orderBy('id')
            ->get();

        foreach ($visits as $visit) {
            if (!empty($visit->trimester) && !empty($visit->visit_date)) {
                $this->syncItrVisitToHbmCurrent($patient->fresh(), $visit);
            }
        }
    }

    /* -------------------------------- ITR HEADER ------------------------------- */
    public function save(Request $request, PatientsModel $patient)
    {
        $this->ensureCanEdit($request, $patient);

        $payload = $request->input('itr');
        if (!is_array($payload)) {
            $payload = $request->except(['_token', 'mode', 'autosave']);
        }

        $payload['lmp'] = $payload['lmp'] ?? ($payload['lmp_date'] ?? null);
        $payload['edc'] = $payload['edc'] ?? ($payload['edc_date'] ?? ($payload['edd'] ?? $payload['edd_date'] ?? null));

        foreach (['risk_a_date','risk_b_date','risk_c_date','risk_d_date','risk_e_date'] as $rk) {
            if (array_key_exists($rk, $payload) && $payload[$rk] !== null && $payload[$rk] !== '') {
                try {
                    $payload[$rk] = Carbon::parse($payload[$rk])->format('Y-m-d');
                } catch (\Throwable $e) {
                    $payload[$rk] = null;
                }
            }
        }

        foreach (['risk_a_flag','risk_b_flag','risk_c_flag','risk_d_flag','risk_e_flag'] as $bk) {
            if (array_key_exists($bk, $payload)) {
                $payload[$bk] = filter_var($payload[$bk], FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE);
            }
        }

        if (!empty($payload['next_visit_date'])) {
            try {
                $payload['next_visit_date'] = Carbon::parse($payload['next_visit_date'])->format('Y-m-d');
            } catch (\Throwable $e) {}
        }

        $isDraft = ($request->input('mode') === 'draft') || $request->boolean('autosave');

        if ($isDraft) {
            if (Schema::hasColumn($patient->getTable(), 'prenatal_itr')) {
                $snap = (array) ($patient->prenatal_itr ?? []);
                $snap = array_replace_recursive($snap, $payload, [
                    'lmp_date' => $payload['lmp'] ?? ($snap['lmp_date'] ?? null),
                    'edc_date' => $payload['edc'] ?? ($snap['edc_date'] ?? null),
                ]);
                $patient->prenatal_itr = $snap;
                $patient->save();
            }
            return response()->noContent();
        }

        foreach ($payload as $k => $v) {
            if ($v === '') $payload[$k] = null;
        }

        $data = validator($payload, [
            'lmp'       => ['nullable', 'date'],
            'edc'       => ['nullable', 'date'],
            'ob_g'      => ['nullable', 'integer'],
            'ob_p'      => ['nullable', 'integer'],
            'ob_gtpal'  => ['nullable', 'string', 'max:50'],

            'risk_a_date' => ['nullable','date'],
            'risk_b_date' => ['nullable','date'],
            'risk_c_date' => ['nullable','date'],
            'risk_d_date' => ['nullable','date'],
            'risk_e_date' => ['nullable','date'],

            'tt1_date'       => ['nullable', 'date'],
            'tt2_date'       => ['nullable', 'date'],
            'tt3_date'       => ['nullable', 'date'],
            'tt4_date'       => ['nullable', 'date'],
            'tt5_date'       => ['nullable', 'date'],
            'vitamin_a_date' => ['nullable', 'date'],

            'risk_a_flag' => ['nullable', 'boolean'],
            'risk_b_flag' => ['nullable', 'boolean'],
            'risk_c_flag' => ['nullable', 'boolean'],
            'risk_d_flag' => ['nullable', 'boolean'],
            'risk_e_flag' => ['nullable', 'boolean'],

            'next_visit_date' => ['nullable','date'],
        ])->validate();

        try {
            $top = PrenatalTopModel::firstOrNew(['patient_id' => $patient->id]);

            $allowed = [];
            foreach ($data as $k => $v) {
                if (Schema::hasColumn($top->getTable(), $k)) {
                    $allowed[$k] = $v;
                }
            }

            $top->forceFill($allowed);
            $top->patient_id = $patient->id;
            $top->save();

            if (Schema::hasColumn($patient->getTable(), 'prenatal_itr')) {
                $snap = (array) ($patient->prenatal_itr ?? []);
                $snap = array_replace_recursive($snap, $payload, [
                    'lmp_date' => $payload['lmp'] ?? ($snap['lmp_date'] ?? null),
                    'edc_date' => $payload['edc'] ?? ($snap['edc_date'] ?? null),
                ]);
                $patient->prenatal_itr = $snap;
                $patient->save();
            }

            $this->recomputeVisitAogChain($patient->fresh());
            $this->refreshPatientPrenatalVisitsSnapshot($patient->fresh());
            $this->syncAllItrVisitsToHbmCurrent($patient->fresh());

            Activity::record('prenatal.itr.updated', [
                'patient_id'  => $patient->id,
                'description' => 'Updated prenatal ITR',
                'properties'  => ['keys' => array_keys($allowed)],
            ]);

            if (!empty($data['next_visit_date'])) {
                Appointment::updateOrCreate(
                    [
                        'patient_id'  => $patient->id,
                        'source_type' => 'prenatal_itr',
                        'source_id'   => 0,
                    ],
                    [
                        'date'  => $data['next_visit_date'],
                        'title' => 'Prenatal follow-up',
                        'notes' => null,
                    ]
                );
            }

            $this->reactivateIfTransferred($patient, 'prenatal_itr_save');

            return response()->noContent();
        } catch (\Throwable $e) {
            Log::error('ITR save error', ['patient_id' => $patient->id, 'err' => $e->getMessage()]);
            return response()->json(['message' => 'ITR save failed: '.$e->getMessage()], 500);
        }
    }

    /* ------------------------------ TT / Vit A ------------------------------- */
    public function saveTtVitA(Request $request, PatientsModel $patient)
    {
        $this->ensureCanEdit($request, $patient);

        $payload = $request->input('tt_vita');
        if (!is_array($payload)) {
            $payload = $request->only(['tt1_date','tt2_date','tt3_date','tt4_date','tt5_date','vitamin_a_date']);
            if (empty($payload)) $payload = $request->except(['_token']);
        }

        $clean = [];
        foreach ($payload as $k => $v) $clean[$k] = ($v === '') ? null : $v;

        $clean = validator($clean, [
            'tt1_date'       => ['nullable', 'date'],
            'tt2_date'       => ['nullable', 'date'],
            'tt3_date'       => ['nullable', 'date'],
            'tt4_date'       => ['nullable', 'date'],
            'tt5_date'       => ['nullable', 'date'],
            'vitamin_a_date' => ['nullable', 'date'],
        ])->validate();

        try {
            $top = PrenatalTopModel::firstOrNew(['patient_id' => $patient->id]);

            $allowed = [];
            foreach ($clean as $k => $v) {
                if (Schema::hasColumn($top->getTable(), $k)) $allowed[$k] = $v;
            }

            $top->forceFill($allowed);
            $top->patient_id = $patient->id;
            $top->save();

            if (Schema::hasColumn($patient->getTable(), 'prenatal_itr')) {
                $snap = (array) ($patient->prenatal_itr ?? []);
                $patient->prenatal_itr = array_replace_recursive($snap, $clean);
                $patient->save();
            }

            Activity::record('prenatal.tt_vita.updated', [
                'patient_id'  => $patient->id,
                'description' => 'Updated TT/Vitamin A dates',
            ]);

            $this->reactivateIfTransferred($patient, 'prenatal_ttvita_save');

            return response()->noContent();
        } catch (\Throwable $e) {
            Log::error('TT/VitA save error', ['patient_id' => $patient->id, 'err' => $e->getMessage()]);
            return response()->json(['message' => 'TT/VitA save failed: '.$e->getMessage()], 500);
        }
    }

    /* --------------------------------- PLAN ---------------------------------- */
    public function savePlan(Request $request, PatientsModel $patient)
    {
        $this->ensureCanEdit($request, $patient);

        $plan = $request->input('plan');
        if (!is_array($plan)) {
            $plan = $request->except(['_token', 'signature_file']);
        }

        foreach ($plan as $k => $v) {
            if ($v === '') {
                $plan[$k] = null;
            }
        }

        $validated = validator($plan, [
            'plan_date'                      => ['nullable', 'date'],
            'planned_facility'               => ['nullable', 'string', 'max:255'],
            'attending_personnel'            => ['nullable', 'string', 'max:255'],
            'planned_facility_is_philhealth' => ['nullable', 'string', 'max:10'],
            'distance_from_residence'        => ['nullable', 'string', 'max:100'],
            'estimated_cost'                 => ['nullable', 'string', 'max:100'],
            'mode_of_payment'                => ['nullable', 'string', 'max:100'],
            'available_transport'            => ['nullable', 'string', 'max:100'],
            'companion_name'                 => ['nullable', 'string', 'max:255'],
            'companion_address'              => ['nullable', 'string', 'max:255'],
            'companion_contact'              => ['nullable', 'string', 'max:255'],
            'family_companion_name'          => ['nullable', 'string', 'max:255'],
            'family_companion_relationship'  => ['nullable', 'string', 'max:255'],
            'family_companion_address'       => ['nullable', 'string', 'max:255'],
            'family_companion_contact'       => ['nullable', 'string', 'max:255'],
            'caretaker_name'                 => ['nullable', 'string', 'max:255'],
            'caretaker_relationship'         => ['nullable', 'string', 'max:255'],
            'blood_type'                     => ['nullable', 'string', 'max:10'],
            'blood_donor_1_name'             => ['nullable', 'string', 'max:255'],
            'blood_donor_1_address'          => ['nullable', 'string', 'max:255'],
            'blood_donor_2_name'             => ['nullable', 'string', 'max:255'],
            'blood_donor_2_address'          => ['nullable', 'string', 'max:255'],
            'emergency_contact_name'         => ['nullable', 'string', 'max:255'],
            'emergency_contact_address'      => ['nullable', 'string', 'max:255'],
            'emergency_contact_contact'      => ['nullable', 'string', 'max:255'],
            'maternal_hospital_1_name'       => ['nullable', 'string', 'max:255'],
            'maternal_hospital_1_address'    => ['nullable', 'string', 'max:255'],
            'maternal_hospital_2_name'       => ['nullable', 'string', 'max:255'],
            'maternal_hospital_2_address'    => ['nullable', 'string', 'max:255'],
            'signature_name'                 => ['nullable', 'string', 'max:255'],
            'signature_mode'                 => ['nullable', 'in:upload,draw'],
            'signature_data'                 => ['nullable', 'string'],
        ])->validate();

        $request->validate([
            'signature_file' => ['nullable', 'image', 'mimes:png,jpg,jpeg,webp', 'max:2048'],
        ]);

        try {
            $payload = $validated;

            $payload['attending']           = $validated['attending_personnel'] ?? null;
            $payload['distance']            = $validated['distance_from_residence'] ?? null;
            $payload['payment_mode']        = $validated['mode_of_payment'] ?? null;
            $payload['transport']           = $validated['available_transport'] ?? null;
            $payload['companion_1_name']    = $validated['companion_name'] ?? null;
            $payload['companion_1_contact'] = $validated['companion_contact'] ?? null;
            $payload['companion_2_name']    = $validated['family_companion_name'] ?? null;
            $payload['companion_2_contact'] = $validated['family_companion_contact'] ?? null;
            $payload['refer_to_name']       = $validated['emergency_contact_name'] ?? null;
            $payload['refer_to_contact']    = $validated['emergency_contact_contact'] ?? null;
            $payload['refer_to_address']    = $validated['emergency_contact_address'] ?? null;

            $rawPhilhealth = $plan['planned_facility_is_philhealth'] ?? null;
            $isPhilhealth = in_array($rawPhilhealth, ['1', 1, true, 'yes', 'YES'], true);
            $payload['philhealth_accredited'] = $isPhilhealth;

            $bloodSummary = [];
            if (!empty($validated['blood_donor_1_name'])) {
                $bloodSummary[] = trim(($validated['blood_donor_1_name'] ?? '') . ' - ' . ($validated['blood_donor_1_address'] ?? ''));
            }
            if (!empty($validated['blood_donor_2_name'])) {
                $bloodSummary[] = trim(($validated['blood_donor_2_name'] ?? '') . ' - ' . ($validated['blood_donor_2_address'] ?? ''));
            }
            $payload['blood_donors'] = $bloodSummary ? implode('; ', $bloodSummary) : null;

            $model = PrenatalPlan::firstOrNew(['patient_id' => $patient->id]);
            $oldSignaturePath = $this->normalizeStoredPath($model->signature_path ?? null);

            $payload['signature_path'] = $oldSignaturePath;
            $payload['signed_at'] = $model->signed_at ?? null;
            $payload['signature_mode'] = $validated['signature_mode'] ?? $model->signature_mode ?? null;

            $hasUploadedSignature = $request->hasFile('signature_file');
            $hasDrawnSignature = !empty($validated['signature_data']);
            $wantsSignatureRemoved =
                !$hasUploadedSignature &&
                !$hasDrawnSignature &&
                empty($validated['signature_mode']) &&
                empty($validated['signature_name']);

            if ($hasUploadedSignature) {
                $newPath = $this->storeUploadedSignature($request);

                if (!$newPath) {
                    return response()->json([
                        'message' => 'Uploaded signature could not be saved.',
                    ], 422);
                }

                $payload['signature_path'] = $newPath;
                $payload['signature_mode'] = 'upload';
                $payload['signed_at'] = now();

                if ($oldSignaturePath && $oldSignaturePath !== $newPath) {
                    $this->deleteSignatureFile($oldSignaturePath);
                }
            } elseif ($hasDrawnSignature) {
                $newPath = $this->storeDrawnSignature($validated['signature_data']);

                if (!$newPath) {
                    return response()->json([
                        'message' => 'Invalid drawn signature data.',
                    ], 422);
                }

                $payload['signature_path'] = $newPath;
                $payload['signature_mode'] = 'draw';
                $payload['signed_at'] = now();

                if ($oldSignaturePath && $oldSignaturePath !== $newPath) {
                    $this->deleteSignatureFile($oldSignaturePath);
                }
            } elseif ($wantsSignatureRemoved) {
                if ($oldSignaturePath) {
                    $this->deleteSignatureFile($oldSignaturePath);
                }

                $payload['signature_path'] = null;
                $payload['signature_mode'] = null;
                $payload['signed_at'] = null;
                $payload['signature_name'] = null;
            }

            unset($payload['signature_data']);

            $model->fill($payload);
            $model->patient_id = $patient->id;
            $model->save();

            Activity::record('prenatal.plan.updated', [
                'patient_id'  => $patient->id,
                'description' => 'Updated prenatal birth plan',
                'properties'  => [
                    'signature_mode' => $model->signature_mode,
                    'has_signature'  => !empty($model->signature_path),
                ],
            ]);

            $this->reactivateIfTransferred($patient, 'prenatal_plan_save');

            return response()->noContent();
        } catch (\Throwable $e) {
            Log::error('Birth plan save error', [
                'patient_id' => $patient->id,
                'err'        => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Birth plan save failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /* -------------------------------- VISITS --------------------------------- */
    public function saveVisit(Request $request, PatientsModel $patient)
    {
        $this->ensureCanEdit($request, $patient);

        $visit = $request->input('visit');
        if (!is_array($visit)) {
            $visit = $request->except(['_token']);
        }

        if (!empty($visit['visit_date'])) {
            try {
                $visit['visit_date'] = Carbon::parse($visit['visit_date'])->format('Y-m-d');
            } catch (\Throwable $e) {}
        }

        foreach ($visit as $k => $v) {
            if ($v === '') $visit[$k] = null;
        }

        foreach (['health_education','birthplan_filled','lab_request','referred','advised'] as $b) {
            if (array_key_exists($b, $visit)) {
                $visit[$b] = filter_var($visit[$b], FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE);
            }
        }

        $validated = validator(['visit' => $visit], [
            'visit.id'               => ['sometimes','integer'],
            'visit.visit_date'       => ['required','date_format:Y-m-d'],
            'visit.aog_days'         => ['nullable','integer','min:0'],
            'visit.bp'               => ['nullable','string','max:12'],
            'visit.pr'               => ['nullable','string','max:12'],
            'visit.rr'               => ['nullable','string','max:12'],
            'visit.temp'             => ['nullable','string','max:12'],
            'visit.wt'               => ['nullable','numeric'],
            'visit.fh'               => ['nullable','numeric'],
            'visit.fhr'              => ['nullable','integer'],
            'visit.feso4_caps'       => ['nullable','integer','min:0'],
            'visit.tt_given_ml'      => ['nullable','numeric'],
            'visit.remarks'          => ['nullable','string','max:2000'],
            'visit.trimester'        => ['nullable','in:1st,2nd,3rd'],
            'visit.health_education' => ['nullable','boolean'],
            'visit.birthplan_filled' => ['nullable','boolean'],
            'visit.lab_request'      => ['nullable','boolean'],
            'visit.referred'         => ['nullable','boolean'],
            'visit.advised'          => ['nullable','boolean'],
        ])->validate()['visit'];

        $payload = array_replace($visit, $validated);

        try {
            $id = DB::transaction(function () use ($patient, $payload) {
                $model = null;

                if (!empty($payload['id'])) {
                    $model = PrenatalVisit::where('patient_id', $patient->id)
                        ->where('id', $payload['id'])
                        ->first();
                }

                if (!$model) {
                    $model = new PrenatalVisit();
                    $model->patient_id = $patient->id;
                }

                $fillable = array_flip((new PrenatalVisit())->getFillable());
                $filtered = [];

                foreach ($payload as $k => $v) {
                    if ($k === 'id') continue;
                    if ($k === 'aog_days') continue;
                    if ($k === 'trimester') continue;
                    if (isset($fillable[$k])) $filtered[$k] = $v;
                }

                $model->fill($filtered);

                if (Schema::hasColumn($model->getTable(), 'column_index')) {
                    if (!isset($payload['column_index']) || $payload['column_index'] === null) {
                        $max = PrenatalVisit::where('patient_id', $patient->id)->max('column_index');
                        $model->column_index = is_null($max) ? 0 : ((int)$max + 1);
                    } else {
                        $model->column_index = (int)$payload['column_index'];
                    }
                }

                if (Schema::hasColumn($model->getTable(), 'token') && empty($model->token)) {
                    $token = null;
                    try {
                        $db = DB::getDatabaseName();
                        $len = DB::table('information_schema.columns')
                            ->where('table_schema', $db)
                            ->where('table_name', $model->getTable())
                            ->where('column_name', 'token')
                            ->value('character_maximum_length');
                        $len = (int) $len;

                        if ($len > 0) {
                            $hexUuid = str_replace('-', '', (string) Str::uuid());
                            if ($len <= 32) {
                                $token = substr($hexUuid, 0, $len);
                            } else {
                                $dash = (string) Str::uuid();
                                $token = substr($dash, 0, $len);
                            }
                        }
                    } catch (\Throwable $e) {}

                    if ($token === null) $token = Str::random(20);
                    $model->token = $token;
                }

                $model->patient_id = $patient->id;
                $model->saveOrFail();

                return (int) $model->id;
            });

            $freshPatient = $patient->fresh();
            $this->recomputeVisitAogChain($freshPatient);
            $this->refreshPatientPrenatalVisitsSnapshot($freshPatient);

            $row = PrenatalVisit::where('patient_id', $patient->id)
                ->where('id', $id)
                ->first();

            if ($row) {
                Appointment::updateOrCreate(
                    [
                        'patient_id'  => $patient->id,
                        'source_type' => 'prenatal_visit',
                        'source_id'   => (int) $row->id,
                    ],
                    [
                        'date'  => $row->visit_date,
                        'title' => 'Prenatal Visit',
                        'notes' => $row->remarks ?? null,
                    ]
                );
            }

            $this->syncAllItrVisitsToHbmCurrent($patient->fresh());

            app(PatientRecordsController::class)->rebuildScheduleForPatient($patient);

            $this->reactivateIfTransferred($patient, 'prenatal_visit_save');

            $action = empty($payload['id']) ? 'created' : 'updated';

            Activity::record('prenatal.visit.'.$action, [
                'patient_id'  => $patient->id,
                'description' => 'Prenatal visit '.$action.(empty($payload['visit_date']) ? '' : ' ('.$payload['visit_date'].')'),
                'properties'  => ['id' => $id],
            ]);

            $row = PrenatalVisit::where('patient_id', $patient->id)
                ->where('id', $id)
                ->first();

            return response()->json([
                'id'  => $id,
                'row' => $row?->toArray(),
            ], 200);
        } catch (\Illuminate\Database\QueryException $qe) {
            Log::error('Visit save DB error', [
                'patient_id' => $patient->id,
                'payload'    => $payload,
                'sql_error'  => $qe->getMessage(),
            ]);
            return response()->json(['message' => 'Visit save failed (DB): '.$qe->getMessage()], 500);
        } catch (\Throwable $e) {
            Log::error('Visit save error', [
                'patient_id' => $patient->id,
                'payload'    => $payload,
                'err'        => $e->getMessage(),
            ]);
            return response()->json(['message' => 'Visit save failed: '.$e->getMessage()], 500);
        }
    }

    public function deleteVisit(Request $request, PatientsModel $patient, $visit)
    {
        $this->ensureCanEdit($request, $patient);

        $model = PrenatalVisit::where('patient_id', $patient->id)
            ->where('id', $visit)
            ->first();

        if ($model) {
            $visitDate = $model->visit_date;
            $model->delete();

            Appointment::where([
                'patient_id'  => $patient->id,
                'source_type' => 'prenatal_visit',
                'source_id'   => (int) $visit,
            ])->delete();

            if (!empty($visitDate)) {
                $cp = CurrentPregnancy::where('patient_id', $patient->id)
                    ->where('visit_date', $visitDate)
                    ->first();

                if ($cp) {
                    Appointment::where([
                        'patient_id'  => $patient->id,
                        'source_type' => 'prenatal_current_visit',
                        'source_id'   => (int) $cp->id,
                    ])->delete();

                    $cp->delete();
                }

                if (Schema::hasColumn($patient->getTable(), 'prenatal_hbm_current')) {
                    $existing = (array) ($patient->prenatal_hbm_current ?? []);

                    $rows = (array) ($existing['rows'] ?? []);
                    foreach ($rows as $k => $r) {
                        if ((string)($r['visit_date'] ?? '') === (string)$visitDate) {
                            unset($rows[$k]);
                        }
                    }
                    $existing['rows'] = $rows;

                    $visits = array_values((array) ($existing['visits'] ?? []));
                    $visits = array_values(array_filter($visits, fn ($r) => (string)($r['visit_date'] ?? '') !== (string)$visitDate));
                    $existing['visits'] = $visits;

                    $patient->prenatal_hbm_current = $existing;
                    $patient->save();
                }
            }

            $this->recomputeVisitAogChain($patient->fresh());
            $this->refreshPatientPrenatalVisitsSnapshot($patient->fresh());
            $this->syncAllItrVisitsToHbmCurrent($patient->fresh());

            Activity::record('prenatal.visit.deleted', [
                'patient_id'  => $patient->id,
                'description' => 'Deleted prenatal visit',
                'properties'  => ['id' => $visit],
            ]);

            app(PatientRecordsController::class)->rebuildScheduleForPatient($patient);
        }

        return response()->noContent();
    }

    /* =========================================================================
     |  Sync ITR visit -> HBM Current automatically when trimester is set
     |========================================================================= */
    private function syncItrVisitToHbmCurrent(PatientsModel $patient, PrenatalVisit $visit): void
    {
        if (empty($visit->visit_date)) return;
        if (empty($visit->trimester)) return;

        $monthIndex = match ((string) $visit->trimester) {
            '1st' => 1,
            '2nd' => 4,
            '3rd' => 7,
            default => null,
        };
        if (!$monthIndex) return;

        if (Schema::hasColumn($patient->getTable(), 'prenatal_hbm_current')) {
            $existing = (array) ($patient->prenatal_hbm_current ?? []);

            $rows = (array) ($existing['rows'] ?? []);
            $key  = (string) $monthIndex;
            $prev = (array) ($rows[$key] ?? []);

            $gestWeeks = null;
            if (!is_null($visit->aog_days)) {
                $gestWeeks = (string) floor(((int) $visit->aog_days) / 7);
            }

            $next = array_replace_recursive($prev, [
                'month_index'        => $monthIndex,
                'column_index'       => $monthIndex,
                'visit_date'         => $visit->visit_date,
                'gestational_weeks'  => $gestWeeks,
                'bp'                 => $visit->bp,
                'weight_kg'          => $visit->wt,
                'fundal_height_cm'   => $visit->fh,
                'fetal_heart_tone'   => $visit->fhr,
                'remarks'            => $visit->remarks,
            ]);

            $rows[$key] = $next;
            $existing['rows'] = $rows;

            $visits = array_values((array) ($existing['visits'] ?? []));
            $visits = array_values(array_filter($visits, function ($r) use ($visit) {
                return (string) ($r['visit_date'] ?? '') !== (string) $visit->visit_date;
            }));
            $visits[] = [
                'month_index'       => $monthIndex,
                'column_index'      => $monthIndex,
                'visit_date'        => $visit->visit_date,
                'gestational_weeks' => $gestWeeks,
                'bp'                => $visit->bp,
                'weight_kg'         => $visit->wt,
                'fundal_height_cm'  => $visit->fh,
                'fetal_heart_tone'  => $visit->fhr,
                'remarks'           => $visit->remarks,
            ];
            $existing['visits'] = $visits;

            $patient->prenatal_hbm_current = $existing;
            $patient->save();
        }

        $cp = CurrentPregnancy::firstOrNew([
            'patient_id' => $patient->id,
            'visit_date' => $visit->visit_date,
        ]);

        $cp->fill([
            'patient_id'       => $patient->id,
            'visit_date'       => $visit->visit_date,
            'age_of_pregnancy' => !is_null($visit->aog_days) ? (string) floor(((int) $visit->aog_days) / 7) : null,
            'bp'               => $visit->bp,
            'weight_kg'        => $visit->wt,
            'fundic_height'    => $visit->fh,
            'fetal_heart_tone' => $visit->fhr,
            'remarks'          => $visit->remarks,
        ]);

        $cp->save();

        Appointment::updateOrCreate(
            [
                'patient_id'  => $patient->id,
                'source_type' => 'prenatal_current_visit',
                'source_id'   => (int) $cp->id,
            ],
            [
                'date'  => $visit->visit_date,
                'title' => 'Prenatal Checkup',
                'notes' => $visit->remarks ?? null,
            ]
        );
    }
}