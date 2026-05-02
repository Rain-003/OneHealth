<?php

namespace App\Http\Controllers\Prenatal\Concerns;

use App\Models\PatientsModel;
use App\Models\Pregnancy;
use App\Models\PrenatalPlan;
use App\Models\PrenatalTopModel;
use App\Models\PrenatalVisit;
use Illuminate\Support\Arr;

trait LoadsPrenatal
{
    use ResolvesPregnancy;

    private function loadPlanItrVisits(PatientsModel $patient, ?int $pregnancyId = null): array
    {
        $pregnancy = $this->selectedOrActivePregnancyFor($patient, $pregnancyId);

        if (!$pregnancy) {
            return [null, null, collect(), null];
        }

        $plan = PrenatalPlan::where('patient_id', $patient->id)
            ->where(function ($query) use ($pregnancy) {
                $query->where('pregnancy_id', $pregnancy->id)
                    ->orWhereNull('pregnancy_id');
            })
            ->latest('id')
            ->first();

        $itrTop = PrenatalTopModel::where('patient_id', $patient->id)
            ->where(function ($query) use ($pregnancy) {
                $query->where('pregnancy_id', $pregnancy->id)
                    ->orWhereNull('pregnancy_id');
            })
            ->latest('id')
            ->first();

        $visits = PrenatalVisit::where('patient_id', $patient->id)
            ->where(function ($query) use ($pregnancy) {
                $query->where('pregnancy_id', $pregnancy->id)
                    ->orWhereNull('pregnancy_id');
            })
            ->orderBy('visit_date', 'asc')
            ->get()
            ->values();

        return [$plan, $itrTop, $visits, $pregnancy];
    }

    private function patientSummary(PatientsModel $patient): array
    {
        return Arr::only($patient->toArray(), [
            'id',
            'full_name',
            'birthdate',
            'barangay',
            'address',
            'philhealth_number',
            'civil_status',
            'height_cm',
        ]);
    }
}
