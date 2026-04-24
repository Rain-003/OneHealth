<?php

namespace App\Http\Controllers\Prenatal;

use App\Http\Controllers\Controller;
use App\Models\PatientsModel;
use App\Models\HbmHistory;
use App\Models\Appointment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use App\Models\Activity;

class HbmHistoryController extends Controller
{
    /** Normalize incoming Yes/No-ish values to 'oo' | 'hindi' | null. */
    private function yn($v): ?string
    {
        if ($v === 'oo')    return 'oo';
        if ($v === 'hindi') return 'hindi';
        if ($v === true || $v === 1 || $v === '1' || $v === 'true' || $v === 'yes') return 'oo';
        if ($v === false || $v === 0 || $v === '0' || $v === 'false' || $v === 'no')  return 'hindi';
        return null;
    }

    // Former: PrenatalController::saveHistory
    public function save(Request $request, PatientsModel $patient)
    {
        $user = $request->user();
        if (!$user) { abort(403); }
        if ($user->role !== 'admin' && (int) $patient->owner_id !== (int) $user->id) {
            abort(403, 'View only.');
        }

        $mode    = (string) $request->input('mode', '');
        $isDraft = in_array($mode, ['draft','autosave'], true) || $request->boolean('autosave');

        $payload = $request->input('history');
        if (!is_array($payload)) {
            $payload = $request->except(['_token','mode','autosave']);
        }

        // Optional follow-up date for calendar
        $followUp = $payload['next_check_date']
            ?? $payload['follow_up_date']
            ?? $payload['schedule_date']
            ?? null;
        if (!empty($followUp)) {
            try { $followUp = Carbon::parse($followUp)->format('Y-m-d'); } catch (\Throwable $e) { $followUp = null; }
        }

        // '' → null
        foreach ($payload as $k => $v) {
            if ($v === '') $payload[$k] = null;
        }

        // Normalize enums
        $ynKeys = [
            'three_consecutive_abortions','stillbirth_history','pph_history',
            'tb_current','heart_disease_current','diabetes_current','asthma_current','goiter_current',
        ];
        foreach ($ynKeys as $key) {
            if (array_key_exists($key, $payload)) {
                $payload[$key] = $this->yn($payload[$key]);
            }
        }

        // Validate
        $data = validator($payload, [
            'age_bracket'                 => ['nullable','in:under_18,18_34,35_plus'],
            'height_bracket'              => ['nullable','in:below_145,eq_145,above_145'],
            'prev_pregnancies'            => ['nullable','integer','min:0','max:50'],
            'three_consecutive_abortions' => ['nullable','in:oo,hindi'],
            'stillbirth_history'          => ['nullable','in:oo,hindi'],
            'pph_history'                 => ['nullable','in:oo,hindi'],
            'tb_current'                  => ['nullable','in:oo,hindi'],
            'heart_disease_current'       => ['nullable','in:oo,hindi'],
            'diabetes_current'            => ['nullable','in:oo,hindi'],
            'asthma_current'              => ['nullable','in:oo,hindi'],
            'goiter_current'              => ['nullable','in:oo,hindi'],
        ])->validate();

        try {
            /* ───────── AUTOSAVE: JSON snapshot only, no DB normalize, no Activity ───────── */
            if ($isDraft) {
                if (Schema::hasColumn('patients', 'prenatal_history')) {
                    $legacy = (array) ($patient->prenatal_history ?? []);
                    $patient->prenatal_history = array_replace($legacy, $data);
                    $patient->save();
                }
                return response()->noContent();
            }

            /* ───────── COMMIT: Upsert normalized table + mirror JSON + Activity ───────── */
            $model = HbmHistory::firstOrNew(['patient_id' => $patient->id]);

            $allowed = [];
            $table   = $model->getTable();
            foreach ($data as $k => $v) {
                if (Schema::hasColumn($table, $k)) $allowed[$k] = $v;
            }

            $model->forceFill($allowed);
            $model->patient_id = $patient->id;
            $model->save();

            if (Schema::hasColumn('patients', 'prenatal_history')) {
                $legacy = (array) ($patient->prenatal_history ?? []);
                $patient->prenatal_history = array_replace($legacy, $data);
                $patient->save();
            }

            Activity::record('prenatal.hbm_history.updated', [
                'patient_id'  => $patient->id,
                'description' => 'Updated HBM (history)',
            ]);

            // Mirror optional follow-up into calendar
            if (!empty($followUp)) {
                Appointment::updateOrCreate(
                    [
                        'patient_id'  => $patient->id,
                        'source_type' => 'prenatal_hbm_history',
                        'source_id'   => (int) $model->id,
                    ],
                    [
                        'date'  => $followUp,
                        'title' => 'Prenatal Risk/History Follow-up',
                        'notes' => null,
                    ]
                );
            }

            return response()->json(['history' => $model->toArray()], 200);
        } catch (\Throwable $e) {
            Log::error('HBM History save error', [
                'patient_id' => $patient->id,
                'err'        => $e->getMessage(),
            ]);
            return response()->json(['message' => 'HBM History save failed: '.$e->getMessage()], 500);
        }
    }
}
