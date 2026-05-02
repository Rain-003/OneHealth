<?php

namespace App\Http\Controllers\Prenatal;

use App\Http\Controllers\Controller;
use App\Models\PatientsModel;
use App\Models\PostnatalRecord;
use App\Models\Appointment;
use Illuminate\Http\Request;
use Carbon\Carbon;
use App\Models\Activity;
use App\Http\Controllers\Prenatal\Concerns\ResolvesPregnancy;

class HbmAfterController extends Controller
{
    use ResolvesPregnancy;

    /**
     * Allow standard resource routes to call the same logic.
     * Route model binding should still inject PatientsModel $patient.
     */
    public function update(Request $request, PatientsModel $patient)
    {
        return $this->save($request, $patient);
    }

    /**
     * Normalize incoming Yes/No-ish values to 'oo' | 'hindi' | null.
     */
    private function yn($v): ?string
    {
        if ($v === 'oo')
            return 'oo';
        if ($v === 'hindi')
            return 'hindi';
        if ($v === true || $v === 1 || $v === '1' || $v === 'true' || $v === 'yes')
            return 'oo';
        if ($v === false || $v === 0 || $v === '0' || $v === 'false' || $v === 'no')
            return 'hindi';
        return null;
    }

    private function boolOrNull($v): ?bool
    {
        if ($v === null || $v === '')
            return null;
        if ($v === true || $v === 1 || $v === '1' || $v === 'true' || $v === 'yes' || $v === 'oo')
            return true;
        if ($v === false || $v === 0 || $v === '0' || $v === 'false' || $v === 'no' || $v === 'hindi')
            return false;
        return null;
    }

    private function ymdOrNull($v): ?string
    {
        if ($v === null || $v === '')
            return null;
        try {
            return Carbon::parse($v)->format('Y-m-d');
        } catch (\Throwable $e) {
            return null;
        }
    }

    private function intOrNull($v): ?int
    {
        if ($v === null || $v === '')
            return null;
        if (!is_numeric($v))
            return null;
        return (int) $v;
    }

    /**
     * Save HBM (After) from the new dropdown-based HBMAfter.tsx.
     */
    public function save(Request $request, PatientsModel $patient)
    {
        $user = $request->user();
        if (!$user) {
            abort(403);
        }
        $sameAssignedBarangay =
            trim(mb_strtolower((string) $patient->assigned_barangay)) !== '' &&
            trim(mb_strtolower((string) $patient->assigned_barangay)) === trim(mb_strtolower((string) $user->barangay));

        if (
            $user->role !== 'admin' &&
            (int) $patient->owner_id !== (int) $user->id &&
            !$sameAssignedBarangay
        ) {
            abort(403, 'View only.');
        }

        $pregnancy = $this->activePregnancyFor($patient);

        $mode = (string) $request->input('mode', '');
        $isDraft = in_array($mode, ['draft', 'autosave'], true) || $request->boolean('autosave');

        // Accept {after:{...}} or flat payload
        $incoming = $request->input('after');
        if (!is_array($incoming)) {
            $incoming = $request->only([
                'visits',
                'after_cols',
                'vitamin_a_date',
                'iron_folate_date',
                'iron_folate_count',
                'iron_folate_qty',
                'supplements',
                'referral',
                'fp',
                'delivery',
            ]);

            if (empty($incoming)) {
                $incoming = $request->except(['_token', 'mode', 'autosave']);
            }
        }

        // Support legacy key name
        if (!isset($incoming['visits']) && isset($incoming['after_cols']) && is_array($incoming['after_cols'])) {
            $incoming['visits'] = $incoming['after_cols'];
        }

        // Existing JSON snapshot (for merging / defaults).
        // If the saved snapshot belongs to a different pregnancy, start clean so
        // a new pregnancy does not show the previous pregnancy's after-birth data.
        $existing = (array) ($patient->prenatal_hbm_after ?? []);
        if (($existing['_pregnancy_id'] ?? null) && (int) $existing['_pregnancy_id'] !== (int) $pregnancy->id) {
            $existing = [];
        }
        $existing['_pregnancy_id'] = (int) $pregnancy->id;

        /* --------------------------------------------------------------------
         | 1) SNAPSHOT FOR UI (kept in prenatal_hbm_after JSON)
         |    Rebuild visits as up to 4 "columns" ordered by column_index.
         |    No Yes/No coercion here; store raw values for React.
         * ------------------------------------------------------------------- */
        $snapshotVisits = [];

        if (isset($incoming['visits']) && is_array($incoming['visits'])) {
            $slots = [];

            foreach ($incoming['visits'] as $idx => $row) {
                $row = (array) $row;

                // Trim empty strings to null for cleaner JSON
                foreach ($row as $k => $val) {
                    if ($val === '') {
                        $row[$k] = null;
                    }
                }

                // Determine which "column" this visit represents (1–4)
                $ci = isset($row['column_index']) ? (int) $row['column_index'] : ($idx + 1);
                if ($ci < 1 || $ci > 4) {
                    $ci = $idx + 1;
                }
                $row['column_index'] = $ci;

                $slots[$ci] = $row;
            }

            // Sort by column_index so React can treat index 0..3 as 24h / Day3 / 1wk / 2–4wk
            ksort($slots);
            $snapshotVisits = array_values($slots);
        }

        if ($snapshotVisits) {
            $existing['visits'] = $snapshotVisits; // preferred key for React
            $existing['after_cols'] = $snapshotVisits; // legacy readers still work
        }

        /* --------------------------------------------------------------------
         |  SUPPLEMENTS (Vitamin A / Iron-Folate)
         |  Prefer nested "supplements" block from React; fall back to flat
         |  top-level keys, then existing snapshot.
         * ------------------------------------------------------------------- */
        $supp = [];
        if (isset($incoming['supplements']) && is_array($incoming['supplements'])) {
            $supp = (array) $incoming['supplements'];
        }

        $vitA = $supp['vitamin_a_date']
            ?? ($incoming['vitamin_a_date'] ?? ($existing['vitamin_a_date'] ?? null));
        $ironD = $supp['iron_folate_date']
            ?? ($incoming['iron_folate_date'] ?? ($existing['iron_folate_date'] ?? null));
        $ironC = $supp['iron_folate_count']
            ?? $supp['iron_folate_qty']
            ?? ($incoming['iron_folate_count']
                ?? $incoming['iron_folate_qty']
                ?? ($existing['iron_folate_count'] ?? null));

        $existing['supplements'] = [
            'vitamin_a_date' => $this->ymdOrNull($vitA),
            'iron_folate_date' => $this->ymdOrNull($ironD),
            'iron_folate_count' => $this->intOrNull($ironC),
            'iron_folate_qty' => $this->intOrNull($ironC),
        ];

        // Flat aliases for older readers
        $existing['vitamin_a_date'] = $existing['supplements']['vitamin_a_date'];
        $existing['iron_folate_date'] = $existing['supplements']['iron_folate_date'];
        $existing['iron_folate_count'] = $existing['supplements']['iron_folate_count'];
        $existing['iron_folate_qty'] = $existing['supplements']['iron_folate_qty'];

        // Keep any explicit top-level values from payload (for safety/backwards compat)
        foreach (['vitamin_a_date', 'iron_folate_date', 'iron_folate_count', 'iron_folate_qty'] as $t) {
            if (array_key_exists($t, $incoming)) {
                $existing[$t] = $incoming[$t] === '' ? null : $incoming[$t];
            }
        }

        /* --------------------------------------------------------------------
         |  REFERRAL block
         * ------------------------------------------------------------------- */
        if (isset($incoming['referral']) && is_array($incoming['referral'])) {
            $r = (array) $incoming['referral'];

            $existing['referral'] = [
                'referred' => (bool) ($r['referred'] ?? false),
                'reason' => (string) ($r['reason'] ?? ''),
                'institution' => (string) ($r['institution'] ?? ''),
            ];
        }

        /* --------------------------------------------------------------------
         |  FAMILY PLANNING block
         * ------------------------------------------------------------------- */
        if (isset($incoming['fp']) && is_array($incoming['fp'])) {
            $fp = (array) $incoming['fp'];

            $existing['fp'] = [
                'followup_date' => $this->ymdOrNull($fp['followup_date'] ?? null),
                'consult_date' => $this->ymdOrNull($fp['consult_date'] ?? null),
                'method' => $fp['method'] ?? null,
                'given_qty' => $this->intOrNull($fp['given_qty'] ?? null),
                'notes' => (string) ($fp['notes'] ?? ''),
            ];
        }

        /* --------------------------------------------------------------------
         |  DELIVERY / LABOR block
         |  This was the missing persistence path for the new Labor & Delivery UI.
         * ------------------------------------------------------------------- */
        if (isset($incoming['delivery']) && is_array($incoming['delivery'])) {
            $d = (array) $incoming['delivery'];

            $existing['delivery'] = [
                'immediate_breastfeeding' => $this->boolOrNull($d['immediate_breastfeeding'] ?? null),
                'delivery_mode' => $d['delivery_mode'] ?? null,
                'delivery_date' => $this->ymdOrNull($d['delivery_date'] ?? null),
                'delivery_place' => $d['delivery_place'] ?? null,
                'attended_by' => $d['attended_by'] ?? null,
                'birth_weight_g' => $this->intOrNull($d['birth_weight_g'] ?? null),
                'pph_over_500cc' => $this->boolOrNull($d['pph_over_500cc'] ?? null),
                'baby_alive' => $this->boolOrNull($d['baby_alive'] ?? null),
                'baby_healthy' => $this->boolOrNull($d['baby_healthy'] ?? null),
            ];
        }

        // ✅ Persist JSON snapshot used by the React form & patient view
        $patient->forceFill(['prenatal_hbm_after' => $existing])->save();

        // Draft/autosave: only snapshot JSON for the form, skip heavy DB work.
        if ($isDraft) {
            return response()->noContent();
        }

        /* --------------------------------------------------------------------
         | 2) NORMALIZE INTO TABLES (PostnatalRecord + Appointments)
         |    This is the only place where 'oo'/'hindi' coercions happen.
         * ------------------------------------------------------------------- */
        $normalizedVisits = $snapshotVisits;
        $keepIds = [];
        $keepFollowupDates = [];

        if (!empty($normalizedVisits)) {
            foreach ($normalizedVisits as $row) {
                $row = (array) $row;

                foreach ($row as $k => $val) {
                    if ($val === '') {
                        $row[$k] = null;
                    }
                }

                // Choose a date (followup/visit) — React sets both to same v.date
                $date = $row['followup_date'] ?? $row['visit_date'] ?? null;
                if (!$date) {
                    continue;
                }

                $date = $this->ymdOrNull($date);
                if (!$date) {
                    continue;
                }

                $keepFollowupDates[] = $date;

                $model = PostnatalRecord::firstOrNew([
                    'patient_id' => $patient->id,
                    'pregnancy_id' => $pregnancy->id,
                    'followup_date' => $date,
                ]);

                // Row-level supplement dates; fallback to top-level
                $vitA = $this->ymdOrNull($row['vitamin_a_date'] ?? ($existing['vitamin_a_date'] ?? null));
                $iron = $this->ymdOrNull($row['iron_folate_date'] ?? ($existing['iron_folate_date'] ?? null));

                $model->fill([
                    'patient_id' => $patient->id,
                    'pregnancy_id' => $pregnancy->id,
                    'followup_date' => $date,

                    // Coerce to 'oo'/'hindi' for normalized table columns
                    'exclusive_breastfeeding' => $this->yn($row['exclusive_breastfeeding'] ?? null),
                    'family_planning_intent' => $this->yn($row['family_planning_intent'] ?? null),
                    'fever_38_up' => $this->yn($row['fever_38_up'] ?? null),
                    'foul_lochia' => $this->yn($row['foul_lochia'] ?? null),
                    'heavy_bleeding' => $this->yn($row['heavy_bleeding'] ?? null),
                    'red_breast' => $this->yn($row['red_breast'] ?? null),

                    'bp' => $row['bp'] ?? null,
                    'wt' => isset($row['wt']) && $row['wt'] !== '' ? (string) $row['wt'] : null,
                    'temp' => isset($row['temp']) && $row['temp'] !== '' ? (string) $row['temp'] : null,

                    'navel_ok' => $this->yn($row['navel_ok'] ?? null),
                    'remarks' => $row['remarks'] ?? null,
                    'vitamin_a_date' => $vitA,
                    'iron_folate_date' => $iron,

                    // Co-morbidities
                    'tb' => $this->yn($row['tb'] ?? null),
                    'heart_disease' => $this->yn($row['heart_disease'] ?? null),
                    'diabetes' => $this->yn($row['diabetes'] ?? null),
                    'asthma' => $this->yn($row['asthma'] ?? null),
                    'goiter' => $this->yn($row['goiter'] ?? null),
                ]);

                $model->save();
                $keepIds[] = (int) $model->id;

                /* ------------------------------------------------------------
                 |  Mirror to calendar
                 * ----------------------------------------------------------- */

                // Main follow-up appointment
                Appointment::updateOrCreate(
                    [
                        'patient_id' => $patient->id,
                        'source_type' => 'postnatal_followup',
                        'source_id' => (int) $model->id,
                    ],
                    [
                        'date' => $model->followup_date,
                        'title' => 'Postnatal Follow-up',
                        'notes' => $model->remarks ?? null,
                    ]
                );

                // Vitamin A appointments
                if (!empty($vitA)) {
                    Appointment::updateOrCreate(
                        [
                            'patient_id' => $patient->id,
                            'source_type' => 'postnatal_vitamin_a',
                            'source_id' => (int) $model->id,
                        ],
                        [
                            'date' => $vitA,
                            'title' => 'Postnatal: Vitamin A',
                            'notes' => null,
                        ]
                    );
                } else {
                    Appointment::where('patient_id', $patient->id)
                        ->where('source_type', 'postnatal_vitamin_a')
                        ->where('source_id', (int) $model->id)
                        ->delete();
                }

                // Iron/Folate appointments
                if (!empty($iron)) {
                    Appointment::updateOrCreate(
                        [
                            'patient_id' => $patient->id,
                            'source_type' => 'postnatal_iron_folate',
                            'source_id' => (int) $model->id,
                        ],
                        [
                            'date' => $iron,
                            'title' => 'Postnatal: Iron/Folate',
                            'notes' => null,
                        ]
                    );
                } else {
                    Appointment::where('patient_id', $patient->id)
                        ->where('source_type', 'postnatal_iron_folate')
                        ->where('source_id', (int) $model->id)
                        ->delete();
                }
            }

            // Remove normalized rows not in payload (by followup_date)
            $keepFollowupDates = array_values(array_unique(array_filter($keepFollowupDates)));
            if (!empty($keepFollowupDates)) {
                $removedIds = PostnatalRecord::where('patient_id', $patient->id)
                    ->where('pregnancy_id', $pregnancy->id)
                    ->whereNotIn('followup_date', $keepFollowupDates)
                    ->pluck('id');

                if ($removedIds->isNotEmpty()) {
                    Appointment::where('patient_id', $patient->id)
                        ->whereIn('source_type', [
                            'postnatal_followup',
                            'postnatal_vitamin_a',
                            'postnatal_iron_folate',
                        ])
                        ->whereIn('source_id', $removedIds)
                        ->delete();

                    PostnatalRecord::whereIn('id', $removedIds)->delete();
                }
            }

            // Cleanup orphaned appointments
            if (!empty($keepIds)) {
                $activePostnatalIds = PostnatalRecord::where('patient_id', $patient->id)
                    ->where('pregnancy_id', $pregnancy->id)
                    ->pluck('id');

                if ($activePostnatalIds->isNotEmpty()) {
                    Appointment::where('patient_id', $patient->id)
                        ->whereIn('source_type', [
                            'postnatal_followup',
                            'postnatal_vitamin_a',
                            'postnatal_iron_folate',
                        ])
                        ->whereIn('source_id', $activePostnatalIds)
                        ->whereNotIn('source_id', $keepIds)
                        ->delete();
                }
            }
        } else {
            $activePostnatalIds = PostnatalRecord::where('patient_id', $patient->id)
                ->where('pregnancy_id', $pregnancy->id)
                ->pluck('id');

            if ($activePostnatalIds->isNotEmpty()) {
                Appointment::where('patient_id', $patient->id)
                    ->whereIn('source_type', [
                        'postnatal_followup',
                        'postnatal_vitamin_a',
                        'postnatal_iron_folate',
                    ])
                    ->whereIn('source_id', $activePostnatalIds)
                    ->delete();
            }

            PostnatalRecord::where('patient_id', $patient->id)
                ->where('pregnancy_id', $pregnancy->id)
                ->delete();
        }

        Activity::record('postnatal.updated', [
            'patient_id' => $patient->id,
            'description' => 'Updated postnatal record',
            'properties' => [
                'pregnancy_id' => $pregnancy->id,
                'pregnancy_no' => $pregnancy->pregnancy_no,
                'visits' => is_array($existing['visits'] ?? null) ? count($existing['visits']) : 0,
                'has_delivery' => !empty($existing['delivery']),
                'delivery_date' => data_get($existing, 'delivery.delivery_date'),
            ],
        ]);

        return response()->noContent();
    }
}