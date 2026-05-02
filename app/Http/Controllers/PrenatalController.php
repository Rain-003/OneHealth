<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\PatientsModel;
use App\Models\PatientOwnershipRequest;
use App\Models\PrenatalPlan;
use App\Models\PrenatalTopModel;   // ITR (top)
use App\Models\PrenatalVisit;      // ITR visits
use App\Models\HbmHistory;         // HBM history
use App\Models\Pregnancy;           // pregnancy records
use App\Models\User;               // transferTargets
use App\Models\Activity;           // barangay transfer history
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Inertia\Inertia;
use Barryvdh\DomPDF\Facade\Pdf;
use App\Http\Controllers\Prenatal\Concerns\ResolvesPregnancy;

class PrenatalController extends Controller
{
    use ResolvesPregnancy;

    /*
     |----------------------------------------------------------------------
     | READ-ONLY: patient-facing card
     |----------------------------------------------------------------------
     */
    public function card(Request $request)
    {
        $patient = auth('patient')->user();

        /** @var \App\Models\PatientsModel $patient */
        if (!$patient instanceof \App\Models\PatientsModel) {
            abort(401);
        }

        $pregnancy = $this->selectedOrActivePregnancyFor($patient, (int) $request->query('pregnancy_id') ?: null);
        $pregnancies = $this->pregnancyListFor($patient);

        // Load from tables for the active pregnancy only.
        $planRow = ($pregnancy ? PrenatalPlan::where('patient_id', $patient->id)
            ->where('pregnancy_id', $pregnancy->id)
            ->first() : null);
        $itrRow = ($pregnancy ? PrenatalTopModel::where('patient_id', $patient->id)
            ->where('pregnancy_id', $pregnancy->id)
            ->first() : null);
        $visCol = ($pregnancy ? PrenatalVisit::where('patient_id', $patient->id)
            ->where('pregnancy_id', $pregnancy->id)
            ->orderBy('visit_date', 'asc')
            ->get() : collect());

        // Fallbacks to patient JSON snapshots
        $plan = $planRow?->toArray() ?? $this->legacySnapshotFor($patient, $pregnancy, 'prenatal_plan');
        $itr = $this->withItrAliases($itrRow?->toArray() ?? $this->legacySnapshotFor($patient, $pregnancy, 'prenatal_itr'));
        $visits = $visCol->count()
            ? $visCol->toArray()
            : $this->sortVisitsSnapshot($this->legacySnapshotFor($patient, $pregnancy, 'prenatal_visits'));

        $itrVisitsForHbm = $this->buildItrVisitsForHbm(
            $visCol->count() ? $visCol->all() : $this->legacySnapshotFor($patient, $pregnancy, 'prenatal_visits')
        );

        // HBM History
        $hbmHistory = ($pregnancy ? HbmHistory::where('patient_id', $patient->id)
            ->where('pregnancy_id', $pregnancy->id)
            ->first() : null);
        $historyLegacy = $this->legacySnapshotFor($patient, $pregnancy, 'prenatal_history') ?: null;

        // HBM Current (read-only)
        $hbmCur = $this->pregnancyScopedSnapshot(
            (array) ($patient->prenatal_hbm_current ?: []),
            $this->pregnancyId($pregnancy),
            ['__pregnancy_id', 'pregnancy_id']
        );

        $current = [
            'rows' => (array) ($hbmCur['rows'] ?? []),
            'visits' => array_values((array) ($hbmCur['visits'] ?? [])),
            'lmp_date' => $hbmCur['lmp_date'] ?? null,
            'edd_date' => $hbmCur['edd_date'] ?? null,
            'pregnancy_number' => $hbmCur['pregnancy_number'] ?? null,
        ];

        $delivery = $hbmCur['delivery'] ?? null;

        // HBM After (read-only) — normalize & provide BOTH object and legacy array
        $hbmAfter = $this->pregnancyScopedSnapshot(
            (array) ($patient->prenatal_hbm_after ?: []),
            $this->pregnancyId($pregnancy),
            ['_pregnancy_id', '__pregnancy_id', 'pregnancy_id']
        );
        if (empty($hbmAfter['visits']) && !empty($hbmAfter['after_cols'])) {
            $hbmAfter['visits'] = $hbmAfter['after_cols']; // legacy fallback
        }
        $postnatal = $hbmAfter['visits'] ?? [];

        return Inertia::render('patients/prenatal-card', [
            'patient' => $this->patientSummary($patient),
            'pregnancy' => $this->pregnancySummary($pregnancy),
            'pregnancies' => $pregnancies,

            // hydrate ITR from table OR JSON snapshot, with alias keys
            'itr' => $itr,
            'plan' => $plan,
            'visits' => array_values((array) $visits),

            // NEW: normalized ITR visits for HBM Current auto-fill
            'itr_visits' => $itrVisitsForHbm,

            'history' => $hbmHistory?->toArray(),
            'history_legacy' => $historyLegacy,

            // HBM current in the SAME shape as editor
            'current' => $current,

            'current_meta' => [
                'lmp_date' => $current['lmp_date'],
                'edd_date' => $current['edd_date'],
                'pregnancy_number' => $current['pregnancy_number'],
            ],

            'delivery' => $delivery,

            // provide full after object + legacy array
            'after' => $hbmAfter,
            'postnatal' => array_values((array) $postnatal),
        ]);
    }

    /*
     |----------------------------------------------------------------------
     | READ-ONLY: worker/editor page shell
     | - Writes are posted to ItrController/HBM controllers.
     | UPDATED: passes transferTargets + barangayTransferHistory for pregnancy UI
     | UPDATED: passes itr_visits for HBM Current auto-fill
     |----------------------------------------------------------------------
     */
    public function show(Request $request, PatientsModel $patient)
    {
        $tab = (string) $request->query('tab', 'itr'); // "itr" | "hbm"
        $sub = (string) $request->query('sub', 'history');

        /** @var \App\Models\User|null $user */
        $user = $request->user();

        $patient->loadMissing(['owner:id,name,barangay']);

        $canEdit = false;

        if ($user) {
            $sameAssignedBarangay =
                trim(mb_strtolower((string) $patient->assigned_barangay)) !== '' &&
                trim(mb_strtolower((string) $patient->assigned_barangay)) === trim(mb_strtolower((string) $user->barangay));

            $canEdit =
                $user->role === 'admin' ||
                (int) $patient->owner_id === (int) $user->id ||
                $sameAssignedBarangay;
        }

        $pendingRequestId = null;
        if ($user && $user->role !== 'admin' && !$canEdit) {
            $pendingRequestId = PatientOwnershipRequest::query()
                ->where('patient_id', $patient->id)
                ->where('requested_by', $user->id)
                ->where('status', 'pending')
                ->value('id');
        }

        /**
         * Transfer targets for "Assign health worker"
         * (same behavior as records/show)
         */
        $transferTargets = [];
        if ($user && $canEdit) {
            $transferTargets = User::query()
                ->where('id', '!=', (int) $patient->owner_id)
                ->where('role', '!=', 'admin')
                ->orderBy('name')
                ->get(['id', 'name', 'barangay']);
        }

        /**
         * Barangay transfer history for modal
         * Uses Activity.type = patient.transferred + properties JSON.
         * Your DB uses activities.user_id (not created_by).
         */
        $barangayTransferHistory = $this->getBarangayTransferHistory((int) $patient->id, 50);

        $pregnancy = $this->selectedOrActivePregnancyFor($patient, (int) $request->query('pregnancy_id') ?: null);
        $pregnancies = $this->pregnancyListFor($patient);

        // Load from tables for the active pregnancy only.
        $planRow = ($pregnancy ? PrenatalPlan::where('patient_id', $patient->id)
            ->where('pregnancy_id', $pregnancy->id)
            ->first() : null);
        $itrRow = ($pregnancy ? PrenatalTopModel::where('patient_id', $patient->id)
            ->where('pregnancy_id', $pregnancy->id)
            ->first() : null);
        $visCol = ($pregnancy ? PrenatalVisit::where('patient_id', $patient->id)
            ->where('pregnancy_id', $pregnancy->id)
            ->orderBy('visit_date', 'asc')
            ->get() : collect());

        // Fallbacks to patient JSON snapshots
        $plan = $planRow?->toArray() ?? $this->legacySnapshotFor($patient, $pregnancy, 'prenatal_plan');
        $itr = $this->withItrAliases($itrRow?->toArray() ?? $this->legacySnapshotFor($patient, $pregnancy, 'prenatal_itr'));
        $visits = $visCol->count()
            ? $visCol->toArray()
            : $this->sortVisitsSnapshot($this->legacySnapshotFor($patient, $pregnancy, 'prenatal_visits'));

        $itrVisitsForHbm = $this->buildItrVisitsForHbm(
            $visCol->count() ? $visCol->all() : $this->legacySnapshotFor($patient, $pregnancy, 'prenatal_visits')
        );

        // HBM history + legacy
        $hbmHistory = ($pregnancy ? HbmHistory::where('patient_id', $patient->id)
            ->where('pregnancy_id', $pregnancy->id)
            ->first() : null);
        $historyLegacy = $this->legacySnapshotFor($patient, $pregnancy, 'prenatal_history') ?: null;

        // HBM Current (editor shell)
        $hbmCur = $this->pregnancyScopedSnapshot(
            (array) ($patient->prenatal_hbm_current ?: []),
            $this->pregnancyId($pregnancy),
            ['__pregnancy_id', 'pregnancy_id']
        );
        $current_rows = (array) ($hbmCur['rows'] ?? []);
        $current_visits = array_values((array) ($hbmCur['visits'] ?? []));
        $delivery = $hbmCur['delivery'] ?? null;

        // HBM After (editor shell) — normalize & provide BOTH
        $hbmAfter = $this->pregnancyScopedSnapshot(
            (array) ($patient->prenatal_hbm_after ?: []),
            $this->pregnancyId($pregnancy),
            ['_pregnancy_id', '__pregnancy_id', 'pregnancy_id']
        );
        if (empty($hbmAfter['visits']) && !empty($hbmAfter['after_cols'])) {
            $hbmAfter['visits'] = $hbmAfter['after_cols'];
        }
        $postnatal = array_values((array) ($hbmAfter['visits'] ?? []));

        return Inertia::render('center/prenatal-edit', [
            'patient' => $this->patientSummary($patient),
            'pregnancy' => $this->pregnancySummary($pregnancy),
            'pregnancies' => $pregnancies,

            'owner' => $patient->owner ? [
                'id' => $patient->owner->id,
                'name' => $patient->owner->name,
                'barangay' => $patient->owner->barangay,
            ] : null,

            'canEdit' => $canEdit,
            'pendingOwnershipRequestId' => $pendingRequestId,

            // used by transfer modal + history modal
            'transferTargets' => $transferTargets,
            'barangayTransferHistory' => $barangayTransferHistory,

            // hydrate ITR from table OR JSON snapshot (with aliases)
            'itr' => $itr,
            'plan' => $plan,
            'visits' => array_values((array) $visits),

            // NEW: normalized ITR visits for HBM Current auto-fill
            'itr_visits' => $itrVisitsForHbm,

            'history' => $hbmHistory?->toArray(),
            'history_legacy' => $historyLegacy,

            'current' => [
                'rows' => $current_rows,
                'visits' => $current_visits,
                'lmp_date' => $hbmCur['lmp_date'] ?? null,
                'edd_date' => $hbmCur['edd_date'] ?? null,
                'pregnancy_number' => $hbmCur['pregnancy_number'] ?? null,
                'delivery' => $delivery,
            ],

            // Pass full 'after' object so HBMAfter.tsx hydrates correctly
            'after' => $hbmAfter,
            'postnatal' => $postnatal,

            'tab' => $tab,
            'sub' => $sub,
        ]);
    }

    /* =========================================================================
     | Helpers
     |======================================================================== */

    private function pregnancyListFor(PatientsModel $patient): array
    {
        return Pregnancy::query()
            ->where('patient_id', $patient->id)
            ->orderByDesc('pregnancy_no')
            ->orderByDesc('id')
            ->get(['id', 'patient_id', 'pregnancy_no', 'lmp', 'edd', 'status', 'outcome', 'completed_at'])
            ->map(fn(Pregnancy $pregnancy) => $this->pregnancySummary($pregnancy))
            ->values()
            ->all();
    }

    private function pregnancySummary(?Pregnancy $pregnancy): ?array
    {
        if (!$pregnancy) {
            return null;
        }

        return [
            'id' => $pregnancy->id,
            'patient_id' => $pregnancy->patient_id,
            'pregnancy_no' => $pregnancy->pregnancy_no,
            'lmp' => $this->ymd($pregnancy->lmp),
            'edd' => $this->ymd($pregnancy->edd),
            'status' => $pregnancy->status,
            'outcome' => $pregnancy->outcome,
            'completed_at' => $this->ymd($pregnancy->completed_at),
        ];
    }

    private function pregnancyScopedSnapshot(array $snapshot, ?int $pregnancyId, array $keys): array
    {
        if (!$pregnancyId) {
            return [];
        }
        foreach ($keys as $key) {
            if (array_key_exists($key, $snapshot) && (int) $snapshot[$key] !== $pregnancyId) {
                return [];
            }
        }

        return $snapshot;
    }

    private function pregnancyId(?Pregnancy $pregnancy): ?int
    {
        return $pregnancy ? (int) $pregnancy->id : null;
    }

    /**
     * Legacy JSON columns belong to the original pregnancy only.
     * This prevents Pregnancy #2+ from showing old Pregnancy #1 data when no rows exist yet.
     */
    private function legacySnapshotFor(PatientsModel $patient, ?Pregnancy $pregnancy, string $column): array
    {
        if (!$pregnancy) {
            return [];
        }

        if ((int) ($pregnancy->pregnancy_no ?? 1) !== 1) {
            return [];
        }

        return (array) ($patient->{$column} ?: []);
    }
    /**
     * Barangay transfer history (Activity trail)
     * Uses Activity.type = patient.transferred and Activity.properties JSON.
     *
     * IMPORTANT: DB uses activities.user_id (not created_by).
     * If Activity has user() relation, we use it; otherwise we do a safe lookup.
     */
    private function getBarangayTransferHistory(int $patientId, int $limit = 50): array
    {
        $acts = Activity::query()
            ->with(['user:id,name,barangay'])
            ->where('patient_id', $patientId)
            ->where('type', 'patient.transferred')
            ->orderByDesc('created_at')
            ->limit(max(1, $limit))
            ->get([
                'id',
                'user_id',
                'type',
                'description',
                'properties',
                'created_at',
            ]);

        return $acts->map(function ($a) {
            $props = is_array($a->properties)
                ? $a->properties
                : (json_decode((string) $a->properties, true) ?: []);

            $by = null;
            if ($a->relationLoaded('user') && $a->user) {
                $by = [
                    'id' => $a->user->id,
                    'name' => $a->user->name,
                    'barangay' => $a->user->barangay,
                ];
            } elseif (!empty($a->user_id)) {
                $u = User::query()->find((int) $a->user_id, ['id', 'name', 'barangay']);
                if ($u) {
                    $by = [
                        'id' => $u->id,
                        'name' => $u->name,
                        'barangay' => $u->barangay,
                    ];
                }
            }

            return [
                'id' => $a->id,
                'date' => $a->created_at ? Carbon::parse($a->created_at)->toDateTimeString() : null,
                'from_barangay' => data_get($props, 'from_barangay'),
                'to_barangay' => data_get($props, 'to_barangay'),
                'description' => $a->description,
                'by' => $by,
            ];
        })->values()->all();
    }

    private function withItrAliases(array $itr): array
    {
        // UI expects lmp_date / edc_date but table may store lmp / edc
        $itr['lmp_date'] = $itr['lmp_date'] ?? ($itr['lmp'] ?? null);
        $itr['edc_date'] = $itr['edc_date'] ?? ($itr['edc'] ?? null);
        return $itr;
    }

    private function sortVisitsSnapshot(array $rows): array
    {
        usort($rows, function ($a, $b) {
            $da = $a['visit_date'] ?? null;
            $db = $b['visit_date'] ?? null;
            return strcmp((string) $da, (string) $db);
        });
        return $rows;
    }

    /**
     * Build the normalized itr_visits array used by HBMCurrent.tsx.
     *
     * Supports:
     * - Eloquent PrenatalVisit rows
     * - JSON snapshot rows from patient->prenatal_visits
     */
    private function buildItrVisitsForHbm(iterable $sourceRows): array
    {
        $out = [];

        foreach ($sourceRows as $row) {
            $item = $row instanceof PrenatalVisit ? $row->toArray() : (array) $row;

            $normalized = $this->normalizeItrVisitForHbm($item);
            if ($normalized) {
                $out[] = $normalized;
            }
        }

        usort($out, function ($a, $b) {
            $da = (string) ($a['visit_date'] ?? '');
            $db = (string) ($b['visit_date'] ?? '');
            return strcmp($da, $db);
        });

        return array_values($out);
    }

    /**
     * Normalize one ITR visit row into the shape HBMCurrent expects.
     */
    private function normalizeItrVisitForHbm(array $visit): ?array
    {
        $visitDate = $this->ymd($visit['visit_date'] ?? null);

        $aogDays = $visit['aog_days'] ?? null;
        $weeks = $this->daysToWeeks($aogDays);

        $monthIndex = $this->visitMonthIndexFromAog($aogDays);

        // Fallback only if AOG is missing
        if ($monthIndex === null) {
            $monthIndex = $this->visitMonthIndexFromTrimester($visit['trimester'] ?? null);
        }

        if ($monthIndex === null) {
            return null;
        }

        $gestationalWeeks = $weeks !== null ? (string) $weeks : null;
        $nextVisitDate = $this->computeNextVisitDate($visitDate, $gestationalWeeks);

        return [
            'id' => $visit['id'] ?? null,
            'month_index' => $monthIndex,
            'column_index' => $monthIndex,
            'visit_date' => $visitDate,
            'gestational_weeks' => $gestationalWeeks,
            'aog' => $gestationalWeeks,
            'aog_weeks' => $gestationalWeeks,
            'bp' => $visit['bp'] ?? null,
            'weight_kg' => $this->numOrNull($visit['wt'] ?? null),
            'wt' => $this->numOrNull($visit['wt'] ?? null),
            'fundal_height_cm' => $this->numOrNull($visit['fh'] ?? null),
            'fh' => $this->numOrNull($visit['fh'] ?? null),
            'next_visit_date' => $nextVisitDate,
        ];
    }

    /**
     * Convert AOG days to rounded gestational weeks.
     */
    private function daysToWeeks($days): ?int
    {
        if ($days === null || $days === '' || !is_numeric($days)) {
            return null;
        }

        $days = (int) $days;
        if ($days <= 0) {
            return null;
        }

        return (int) floor($days / 7);
    }

    /**
     * Map AOG days into HBM month bucket 1..9.
     *
     * Practical mapping used by HBM Current month view:
     *  1-4 weeks   => month 1
     *  5-8 weeks   => month 2
     *  9-13 weeks  => month 3
     * 14-17 weeks  => month 4
     * 18-22 weeks  => month 5
     * 23-27 weeks  => month 6
     * 28-31 weeks  => month 7
     * 32-35 weeks  => month 8
     * 36+ weeks    => month 9
     */
    private function visitMonthIndexFromAog($aogDays): ?int
    {
        $weeks = $this->daysToWeeks($aogDays);
        if ($weeks === null) {
            return null;
        }

        if ($weeks <= 4) {
            return 1;
        }
        if ($weeks <= 8) {
            return 2;
        }
        if ($weeks <= 13) {
            return 3;
        }
        if ($weeks <= 17) {
            return 4;
        }
        if ($weeks <= 22) {
            return 5;
        }
        if ($weeks <= 27) {
            return 6;
        }
        if ($weeks <= 31) {
            return 7;
        }
        if ($weeks <= 35) {
            return 8;
        }

        return 9;
    }

    /**
     * Fallback mapping only when trimester exists but AOG does not.
     * This is less precise, but better than dropping the row entirely.
     */
    private function visitMonthIndexFromTrimester($trimester): ?int
    {
        if ($trimester === null) {
            return null;
        }

        $value = strtolower(trim((string) $trimester));

        if (in_array($value, ['1', '1st', 'first', 'first trimester'], true)) {
            return 1;
        }
        if (in_array($value, ['2', '2nd', 'second', 'second trimester'], true)) {
            return 4;
        }
        if (in_array($value, ['3', '3rd', 'third', 'third trimester'], true)) {
            return 7;
        }

        return null;
    }

    private function ymd($value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        try {
            return Carbon::parse($value)->format('Y-m-d');
        } catch (\Throwable $e) {
            return null;
        }
    }

    private function numOrNull($value): ?float
    {
        if ($value === null || $value === '' || !is_numeric($value)) {
            return null;
        }

        return (float) $value;
    }

    private function computeNextVisitDate(?string $visitDate, ?string $gestationalWeeks): ?string
    {
        if (!$visitDate || !$gestationalWeeks || !is_numeric($gestationalWeeks)) {
            return null;
        }

        $weeks = (int) $gestationalWeeks;

        try {
            $date = Carbon::parse($visitDate);
        } catch (\Throwable $e) {
            return null;
        }

        if ($weeks < 28) {
            return $date->copy()->addDays(28)->format('Y-m-d');
        }
        if ($weeks < 36) {
            return $date->copy()->addDays(14)->format('Y-m-d');
        }

        return $date->copy()->addDays(7)->format('Y-m-d');
    }

    /**
     * Compact patient summary for prenatal pages.
     * Normalize phone → expose both `phone` and `phone_number`.
     */
    private function patientSummary(PatientsModel $patient): array
    {
        $summary = Arr::only($patient->toArray(), [
            'id',
            'full_name',
            'birthdate',
            'barangay',
            'address',
            'philhealth_no',
            'civil_status',
            'height_cm',
            'phone_number',
            'family_serial_number',
            'family_no',
            'sex',
            'mother_name',
            'father_name',
            'place_of_birth',
            'health_center',
            'status',
            'patient_type',
        ]);

        $phone = $patient->phone_number ?? $patient->phone ?? null;

        $summary['phone_number'] = $phone;
        $summary['phone'] = $phone;

        return $summary;
    }

    /**
     * Generate and stream a PDF of the prenatal record
     */
    public function print(Request $request, PatientsModel $patient)
    {
        $pregnancy = $this->selectedOrActivePregnancyFor($patient, (int) $request->query('pregnancy_id') ?: null);
        if (!$pregnancy) {
            abort(404, 'No pregnancy record found for this patient.');
        }

        $planRow = ($pregnancy ? PrenatalPlan::where('patient_id', $patient->id)
            ->where('pregnancy_id', $pregnancy->id)
            ->first() : null);
        $itrRow = ($pregnancy ? PrenatalTopModel::where('patient_id', $patient->id)
            ->where('pregnancy_id', $pregnancy->id)
            ->first() : null);
        $visCol = ($pregnancy ? PrenatalVisit::where('patient_id', $patient->id)
            ->where('pregnancy_id', $pregnancy->id)
            ->orderBy('visit_date', 'asc')
            ->get() : collect());

        /** @var \Barryvdh\DomPDF\PDF $pdf */
        $pdf = Pdf::loadView('prenatal.print', [
            'patient' => $this->patientSummary($patient),
            'pregnancy' => $this->pregnancySummary($pregnancy),
            'plan' => $planRow?->toArray() ?? $this->legacySnapshotFor($patient, $pregnancy, 'prenatal_plan'),
            'itr' => $this->withItrAliases($itrRow?->toArray() ?? $this->legacySnapshotFor($patient, $pregnancy, 'prenatal_itr')),
            'visits' => $visCol->count()
                ? $visCol->toArray()
                : $this->sortVisitsSnapshot($this->legacySnapshotFor($patient, $pregnancy, 'prenatal_visits')),
        ]);

        return $pdf->stream('prenatal-record.pdf');
    }

    /**
     * Generate and download a PDF of the prenatal record
     */
    public function download(Request $request, PatientsModel $patient)
    {
        $pregnancy = $this->selectedOrActivePregnancyFor($patient, (int) $request->query('pregnancy_id') ?: null);
        if (!$pregnancy) {
            abort(404, 'No pregnancy record found for this patient.');
        }

        $planRow = ($pregnancy ? PrenatalPlan::where('patient_id', $patient->id)
            ->where('pregnancy_id', $pregnancy->id)
            ->first() : null);
        $itrRow = ($pregnancy ? PrenatalTopModel::where('patient_id', $patient->id)
            ->where('pregnancy_id', $pregnancy->id)
            ->first() : null);
        $visCol = ($pregnancy ? PrenatalVisit::where('patient_id', $patient->id)
            ->where('pregnancy_id', $pregnancy->id)
            ->orderBy('visit_date', 'asc')
            ->get() : collect());

        /** @var \Barryvdh\DomPDF\PDF $pdf */
        $pdf = Pdf::loadView('prenatal.print', [
            'patient' => $this->patientSummary($patient),
            'pregnancy' => $this->pregnancySummary($pregnancy),
            'plan' => $planRow?->toArray() ?? $this->legacySnapshotFor($patient, $pregnancy, 'prenatal_plan'),
            'itr' => $this->withItrAliases($itrRow?->toArray() ?? $this->legacySnapshotFor($patient, $pregnancy, 'prenatal_itr')),
            'visits' => $visCol->count()
                ? $visCol->toArray()
                : $this->sortVisitsSnapshot($this->legacySnapshotFor($patient, $pregnancy, 'prenatal_visits')),
        ]);

        return $pdf->download('prenatal-record.pdf');
    }
}
