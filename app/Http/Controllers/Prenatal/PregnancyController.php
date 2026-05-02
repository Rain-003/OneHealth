<?php

namespace App\Http\Controllers\Prenatal;

use App\Http\Controllers\Controller;
use App\Models\PatientsModel;
use App\Models\Pregnancy;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PregnancyController extends Controller
{
    /**
     * Create a new pregnancy record for the mother.
     *
     * Rule:
     * A patient should only have one ongoing pregnancy at a time.
     */
    public function store(Request $request, PatientsModel $patient)
    {
        $validated = $request->validate([
            'lmp' => ['nullable', 'date'],
            'edd' => ['nullable', 'date', 'after_or_equal:lmp'],
        ]);

        $existingOngoing = Pregnancy::where('patient_id', $patient->id)
            ->where('status', 'ongoing')
            ->latest('id')
            ->first();

        if ($existingOngoing) {
            return back()->with('status', 'This patient already has an ongoing pregnancy. Complete it first before creating a new pregnancy record.');
        }

        DB::transaction(function () use ($patient, $validated) {
            $nextPregnancyNo = ((int) Pregnancy::where('patient_id', $patient->id)->max('pregnancy_no')) + 1;

            Pregnancy::create([
                'patient_id' => $patient->id,
                'pregnancy_no' => $nextPregnancyNo,
                'lmp' => $validated['lmp'] ?? null,
                'edd' => $validated['edd'] ?? null,
                'status' => 'ongoing',
                'outcome' => null,
                'completed_at' => null,
            ]);
        });

        return back()->with('status', 'New pregnancy record created successfully.');
    }

    /**
     * Mark a pregnancy as completed.
     */
    public function complete(Request $request, PatientsModel $patient, Pregnancy $pregnancy)
    {
        if ((int) $pregnancy->patient_id !== (int) $patient->id) {
            abort(404);
        }

        $validated = $request->validate([
            'outcome' => ['nullable', 'in:delivered,miscarriage,transferred,unknown'],
            'completed_at' => ['nullable', 'date'],
        ]);

        DB::transaction(function () use ($pregnancy, $validated) {
            $pregnancy->update([
                'status' => 'completed',
                'outcome' => $validated['outcome'] ?? $pregnancy->outcome ?? 'unknown',
                'completed_at' => $validated['completed_at'] ?? now()->toDateString(),
            ]);
        });

        return back()->with('status', 'Pregnancy record completed successfully.');
    }

    /**
     * Reopen a completed pregnancy if it was completed by mistake.
     *
     * Rule:
     * Reopening is only allowed when the patient has no other ongoing pregnancy.
     */
    public function reopen(Request $request, PatientsModel $patient, Pregnancy $pregnancy)
    {
        if ((int) $pregnancy->patient_id !== (int) $patient->id) {
            abort(404);
        }

        $existingOngoing = Pregnancy::where('patient_id', $patient->id)
            ->where('status', 'ongoing')
            ->where('id', '!=', $pregnancy->id)
            ->latest('id')
            ->first();

        if ($existingOngoing) {
            return back()->with('status', 'This patient already has another ongoing pregnancy. Complete it first before reopening this record.');
        }

        DB::transaction(function () use ($pregnancy) {
            $pregnancy->update([
                'status' => 'ongoing',
                'outcome' => null,
                'completed_at' => null,
            ]);
        });

        return back()->with('status', 'Pregnancy completion was cancelled. The record is ongoing again.');
    }
}
