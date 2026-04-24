<?php

namespace App\Http\Controllers\Prenatal;

use App\Http\Controllers\Controller;
use App\Models\PatientsModel;
use App\Models\CurrentPregnancy;
use App\Models\Appointment;
use Illuminate\Http\Request;
use Carbon\Carbon;
use App\Enums\YesNo;
use App\Models\Activity;

class HbmCurrentController extends Controller
{
    /**
     * ✅ If patient is currently TRANSFERRED, flip back to ACTIVE when a real save happens.
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

    /**
     * Store structured metadata in Appointment.notes (JSON) so dashboard can identify:
     * - program: prenatal
     * - kind: current_visit / next_due_manual / next_due_auto / catch_up_auto
     * - GA weeks, originating row id, etc.
     */
    private function encodeMeta(array $meta): ?string
    {
        if (empty($meta)) return null;
        try {
            return json_encode($meta, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        } catch (\Throwable $e) {
            return null;
        }
    }

    private function parseYmd($date): ?string
    {
        if (empty($date)) return null;
        try {
            return Carbon::parse($date)->format('Y-m-d');
        } catch (\Throwable $e) {
            return null;
        }
    }

    /**
     * Prenatal "recommended" interval rule (simple + realistic):
     * - < 28w  : every 4 weeks
     * - 28-35w: every 2 weeks
     * - >= 36w: every 1 week
     */
    private function intervalWeeksForGa(?int $gaWeeks): int
    {
        $gaWeeks = $gaWeeks ?? 0;
        if ($gaWeeks >= 36) return 1;
        if ($gaWeeks >= 28) return 2;
        return 4;
    }

    /**
     * Compute an auto "next prenatal visit" date based on a base visit date + GA.
     * If computed date is in the past, use today and mark as catch-up.
     */
    private function computeAutoNextVisit(string $baseVisitYmd, ?int $gaWeeks): array
    {
        $today = Carbon::today()->startOfDay();
        $base  = Carbon::parse($baseVisitYmd)->startOfDay();

        $intervalWeeks = $this->intervalWeeksForGa($gaWeeks);
        $next = $base->copy()->addWeeks($intervalWeeks);

        $kind = 'next_due_auto';
        if ($next->lt($today)) {
            $next = $today->copy();
            $kind = 'catch_up_auto';
        }

        return [
            'date' => $next->toDateString(),
            'kind' => $kind,
            'interval_weeks' => $intervalWeeks,
        ];
    }

    // Former: PrenatalController::saveCurrent
    public function save(Request $request, PatientsModel $patient)
    {
        $user = $request->user();
        if (!$user) { abort(403); }
        if ($user->role !== 'admin' && (int) $patient->owner_id !== (int) $user->id) {
            abort(403, 'View only.');
        }

        $mode    = (string) $request->input('mode', '');
        $isDraft = in_array($mode, ['draft','autosave'], true) || $request->boolean('autosave');

        $incoming = $request->input('current');
        if (!is_array($incoming)) {
            $incoming = $request->only(['rows','visits','lmp_date','edd_date','pregnancy_number','delivery']);
            if (empty($incoming)) $incoming = $request->except(['_token','mode','autosave']);
        }

        $existing = (array) ($patient->prenatal_hbm_current ?? []);

        /* ----------------------- keep JSON snapshot for UI ----------------------- */
        if (isset($incoming['rows']) && is_array($incoming['rows'])) {
            $rows = (array) ($existing['rows'] ?? []);
            foreach ($incoming['rows'] as $k => $v) {
                $key  = (string) $k;
                $prev = (array) ($rows[$key] ?? []);
                $next = array_replace_recursive($prev, (array) $v);
                $next['month_index']  = (int) ($next['month_index']  ?? $key);
                $next['column_index'] = (int) ($next['column_index'] ?? $key);
                $rows[$key] = $next;
            }
            $existing['rows'] = $rows;
        }

        if (isset($incoming['visits']) && is_array($incoming['visits'])) {
            $existing['visits'] = array_values($incoming['visits']);
        }

        foreach (['lmp_date','edd_date','pregnancy_number'] as $t) {
            if (array_key_exists($t, $incoming)) $existing[$t] = $incoming[$t];
        }

        if (array_key_exists('delivery', $incoming) && is_array($incoming['delivery'])) {
            $existing['delivery'] = array_replace_recursive(
                (array) ($existing['delivery'] ?? []),
                $incoming['delivery']
            );
        }

        // Coerce booleans for the snapshot
        $boolFields = [
            'bleeding','uti','fever_38_or_more','pallor_anemia','abnormal_abdominal_size',
            'abnormal_presentation','absent_fetal_heartbeat','edema','vaginal_infection',
            'iodine_risk_area','malaria_prophylaxis','plan_breastfeed','counseled_danger_signs',
            'birth_plan_prepared','danger_present',
        ];
        $toBool = fn($v) => filter_var($v, FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE);

        if (!empty($existing['rows']) && is_array($existing['rows'])) {
            foreach ($existing['rows'] as $k => $row) {
                foreach ($boolFields as $f) {
                    if (array_key_exists($f, $row)) $row[$f] = $toBool($row[$f]);
                }
                $existing['rows'][$k] = $row;
            }
        }

        if (!empty($existing['visits']) && is_array($existing['visits'])) {
            foreach ($existing['visits'] as $i => $row) {
                foreach ($boolFields as $f) {
                    if (array_key_exists($f, $row)) $row[$f] = $toBool($row[$f]);
                }
                $existing['visits'][$i] = $row;
            }
        }

        if (!empty($existing['delivery']) && is_array($existing['delivery'])) {
            foreach (['immediate_breastfeeding','pph_over_500cc','baby_alive','baby_healthy'] as $f) {
                if (array_key_exists($f, $existing['delivery'])) {
                    $existing['delivery'][$f] = $toBool($existing['delivery'][$f]);
                }
            }
        }

        // Always persist the JSON snapshot so the UI never loses edits
        $patient->prenatal_hbm_current = $existing;
        $patient->save();

        /* ───────── AUTOSAVE: stop here (no normalize, no Activity, no appointments) ───────── */
        if ($isDraft) {
            return response()->noContent();
        }

        // If delivered, clear prenatal schedules and legacy rows and still normalize visit logs
        $delivered = false;
        $deliveryDateYmd = $this->parseYmd(data_get($existing, 'delivery.delivery_date'));
        if ($deliveryDateYmd) {
            $delivered = true;
        }

        /* ----------------------- normalize into DB table (COMMIT) ------------------------ */
        $keepDates   = [];
        $keepRowIds  = [];

        // Track most recent visit for auto scheduling fallback
        $latestVisitYmd = null;
        $latestGaWeeks  = null;

        // Track earliest future manual "next visit" (we will keep only one for simplicity)
        $earliestFutureManualNext = null;
        $earliestFutureManualRowId = null;

        if (!empty($existing['rows'])) {
            $rows = (array) $existing['rows'];

            foreach ($rows as $row) {
                $row = (array) $row;

                $visitDateYmd = $this->parseYmd($row['visit_date'] ?? null);
                $nextVisitYmd = $this->parseYmd($row['next_visit_date'] ?? null);

                if (!$visitDateYmd) continue;
                $keepDates[] = $visitDateYmd;

                $model = CurrentPregnancy::firstOrNew([
                    'patient_id' => $patient->id,
                    'visit_date' => $visitDateYmd,
                ]);

                $model->fill([
                    'patient_id'        => $patient->id,
                    'visit_date'        => $visitDateYmd,
                    'age_of_pregnancy'  => $row['gestational_weeks'] ?? null,
                    'bp'                => $row['bp'] ?? null,
                    'weight_kg'         => $row['weight_kg'] ?? null,
                    'fundic_height'     => $row['fundal_height_cm'] ?? null,
                    'fetal_heart_tone'  => $row['fetal_heart_tone'] ?? null,
                    'laboratory_results'=> $row['laboratory_results'] ?? null,
                    'iron_folate_rx'    => $row['iron_folate_rx'] ?? null,
                    'next_visit_date'   => $nextVisitYmd,
                ]);

                $model->bleeding                = YesNo::fromLoose($row['vaginal_bleeding']          ?? null);
                $model->uti                     = YesNo::fromLoose($row['urine_infection']           ?? null);
                $model->fever_38_or_more        = YesNo::fromLoose($row['fever_38_or_more']          ?? null);
                $model->pallor_anemia           = YesNo::fromLoose($row['pallor_anemia']             ?? null);
                $model->abnormal_abdominal_size = YesNo::fromLoose($row['abnormal_abdominal_size']   ?? null);
                $model->abnormal_presentation   = YesNo::fromLoose($row['abnormal_presentation']     ?? null);
                $model->absent_fetal_heartbeat  = YesNo::fromLoose($row['absent_fetal_heartbeat']    ?? null);
                $model->edema                   = YesNo::fromLoose($row['edema']                     ?? null);
                $model->vaginal_infection       = YesNo::fromLoose($row['vaginal_infection']         ?? null);
                $model->iodine_risk_area        = YesNo::fromLoose($row['iodine_risk_area']          ?? null);
                $model->malaria_prophylaxis     = YesNo::fromLoose($row['malaria_prophylaxis']       ?? null);
                $model->plan_breastfeed         = YesNo::fromLoose($row['plan_breastfeed']           ?? null);
                $model->counseled_danger_signs  = YesNo::fromLoose($row['counseled_danger_signs']    ?? null);
                $model->dental_check            = YesNo::fromLoose($row['dental_check']              ?? null);
                $model->birth_plan_prepared     = YesNo::fromLoose($row['birth_plan_prepared']       ?? null);
                $model->danger_present          = YesNo::fromLoose($row['danger_present']            ?? null);

                foreach (['hr','rr','temp','remarks'] as $opt) {
                    if (array_key_exists($opt, $row)) $model->{$opt} = $row[$opt];
                }

                $model->save();
                $keepRowIds[] = (int) $model->id;

                // GA weeks for meta + auto scheduling
                $gaWeeks = null;
                if (isset($row['gestational_weeks']) && $row['gestational_weeks'] !== '' && is_numeric($row['gestational_weeks'])) {
                    $gaWeeks = (int) $row['gestational_weeks'];
                } elseif (!empty($model->age_of_pregnancy) && is_numeric($model->age_of_pregnancy)) {
                    $gaWeeks = (int) $model->age_of_pregnancy;
                }

                // Track latest visit
                if ($latestVisitYmd === null || $visitDateYmd > $latestVisitYmd) {
                    $latestVisitYmd = $visitDateYmd;
                    $latestGaWeeks  = $gaWeeks;
                }

                // ✅ CURRENT visit appointment (done log)
                Appointment::updateOrCreate(
                    [
                        'patient_id'  => $patient->id,
                        'source_type' => 'prenatal_current_visit',
                        'source_id'   => (int) $model->id,
                    ],
                    [
                        'date'  => $visitDateYmd,
                        'title' => 'Prenatal Checkup',
                        'notes' => $this->encodeMeta([
                            'program'      => 'prenatal',
                            'kind'         => 'current_visit',
                            'visit_date'   => $visitDateYmd,
                            'ga_weeks'     => $gaWeeks,
                            'row_id'       => (int) $model->id,
                            'remarks'      => $model->remarks ?? null,
                            'danger'       => ($model->danger_present?->value ?? null),
                        ]),
                    ]
                );

                // ✅ MANUAL NEXT visit appointment (scheduled)
                if (!empty($nextVisitYmd) && !$delivered) {
                    // Prefer earliest future manual schedule (most actionable)
                    $todayYmd = Carbon::today()->toDateString();
                    if ($nextVisitYmd >= $todayYmd) {
                        if ($earliestFutureManualNext === null || $nextVisitYmd < $earliestFutureManualNext) {
                            $earliestFutureManualNext = $nextVisitYmd;
                            $earliestFutureManualRowId = (int) $model->id;
                        }
                    }

                    Appointment::updateOrCreate(
                        [
                            'patient_id'  => $patient->id,
                            'source_type' => 'prenatal_next_visit',
                            'source_id'   => (int) $model->id,
                        ],
                        [
                            'date'  => $nextVisitYmd,
                            'title' => 'Next Prenatal Visit',
                            'notes' => $this->encodeMeta([
                                'program'         => 'prenatal',
                                'kind'            => 'next_due_manual',
                                'recommended'     => false,
                                'next_visit_date' => $nextVisitYmd,
                                'from_visit_date' => $visitDateYmd,
                                'ga_weeks'        => $gaWeeks,
                                'row_id'          => (int) $model->id,
                            ]),
                        ]
                    );

                    // Legacy cleanup (if any old code created this)
                    Appointment::where('patient_id', $patient->id)
                        ->where('source_type', 'pregnancy_schedule')
                        ->delete();
                } else {
                    // Remove manual next visit appointment for this row if next_visit_date is blank
                    Appointment::where('patient_id', $patient->id)
                        ->where('source_type', 'prenatal_next_visit')
                        ->where('source_id', (int) $model->id)
                        ->delete();
                }
            }

            // Remove normalized rows not in payload
            $keepDates = array_values(array_unique(array_filter($keepDates)));
            if (!empty($keepDates)) {
                CurrentPregnancy::where('patient_id', $patient->id)
                    ->whereNotIn('visit_date', $keepDates)
                    ->delete();
            }

            // Cleanup orphan appointments for removed rows
            if (!empty($keepRowIds)) {
                Appointment::where('patient_id', $patient->id)
                    ->whereIn('source_type', ['prenatal_current_visit','prenatal_next_visit'])
                    ->whereNotIn('source_id', $keepRowIds)
                    ->delete();
            }
        }

        /**
         * ✅ Option A finalization:
         * - Keep ONLY ONE prenatal_next_visit per patient:
         *   - If there is at least one FUTURE manual next visit, keep the earliest one.
         *   - Otherwise, write/update the AUTO reserved slot (source_id = patient_id) using latest visit.
         * - If delivered, remove ALL prenatal_next_visit rows (manual + auto).
         */
        if ($delivered) {
            Appointment::where('patient_id', $patient->id)
                ->where('source_type', 'prenatal_next_visit')
                ->delete();

            Appointment::where('patient_id', $patient->id)
                ->where('source_type', 'pregnancy_schedule')
                ->delete();
        } else {
            if ($earliestFutureManualNext !== null && $earliestFutureManualRowId !== null) {
                // Keep only the earliest future manual schedule
                Appointment::where('patient_id', $patient->id)
                    ->where('source_type', 'prenatal_next_visit')
                    ->where(function ($q) use ($earliestFutureManualRowId) {
                        $q->where('source_id', '!=', (int) $earliestFutureManualRowId)
                          ->orWhereNull('source_id');
                    })
                    ->delete();

                // Also remove AUTO slot if it exists
                Appointment::where('patient_id', $patient->id)
                    ->where('source_type', 'prenatal_next_visit')
                    ->where('source_id', (int) $patient->id)
                    ->delete();

                // Legacy cleanup
                Appointment::where('patient_id', $patient->id)
                    ->where('source_type', 'pregnancy_schedule')
                    ->delete();
            } else {
                // No manual future next visit → create/update AUTO slot (source_id = patient_id) if we can compute it
                if (!empty($latestVisitYmd)) {
                    $auto = $this->computeAutoNextVisit($latestVisitYmd, $latestGaWeeks);

                    Appointment::updateOrCreate(
                        [
                            'patient_id'  => $patient->id,
                            'source_type' => 'prenatal_next_visit',
                            'source_id'   => (int) $patient->id, // ✅ reserved auto slot
                        ],
                        [
                            'date'  => $auto['date'],
                            'title' => 'Next Prenatal Visit',
                            'notes' => $this->encodeMeta([
                                'program'        => 'prenatal',
                                'kind'           => $auto['kind'],
                                'recommended'    => true,
                                'based_on'       => 'hbm_latest_visit',
                                'from_visit_date'=> $latestVisitYmd,
                                'ga_weeks'       => $latestGaWeeks,
                                'interval_weeks' => $auto['interval_weeks'],
                            ]),
                        ]
                    );

                    // Legacy cleanup
                    Appointment::where('patient_id', $patient->id)
                        ->where('source_type', 'pregnancy_schedule')
                        ->delete();
                } else {
                    // No visits at all → ensure auto slot is removed (avoid stale)
                    Appointment::where('patient_id', $patient->id)
                        ->where('source_type', 'prenatal_next_visit')
                        ->where('source_id', (int) $patient->id)
                        ->delete();
                }
            }
        }

        $rowsCount   = is_array($existing['rows'] ?? null) ? count($existing['rows']) : 0;
        $visitsCount = is_array($existing['visits'] ?? null) ? count($existing['visits']) : 0;

        Activity::record('prenatal.hbm_current.updated', [
            'patient_id'  => $patient->id,
            'description' => 'Updated HBM (current status)',
            'properties'  => [
                'rows' => $rowsCount,
                'visits' => $visitsCount,
                'delivered' => $delivered,
                'delivery_date' => $deliveryDateYmd,
                'manual_next_visit' => $earliestFutureManualNext,
                'auto_base_visit' => $latestVisitYmd,
            ],
        ]);

        // ✅ NEW: any COMMIT save to HBM current should reactivate transferred -> active
        $this->reactivateIfTransferred($patient, 'prenatal_hbm_current_save');

        return response()->noContent();
    }
}