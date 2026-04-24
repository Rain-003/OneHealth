<?php

namespace App\Http\Controllers\Prenatal\Concerns;

use App\Models\PatientsModel;
use App\Models\PrenatalPlan;
use App\Models\PrenatalTopModel;
use App\Models\PrenatalVisit;
use Illuminate\Support\Arr;

trait LoadsPrenatal
{
    private function loadPlanItrVisits(PatientsModel $patient): array
    {
        $plan   = PrenatalPlan::where('patient_id', $patient->id)->first();
        $itrTop = PrenatalTopModel::where('patient_id', $patient->id)->first();
        $visits = PrenatalVisit::where('patient_id', $patient->id)
            ->orderBy('visit_date', 'asc')
            ->get()
            ->values();

        return [$plan, $itrTop, $visits];
    }

    private function patientSummary(PatientsModel $patient): array
    {
        return Arr::only($patient->toArray(), [
            'id', 'full_name', 'birthdate', 'barangay', 'address',
            'philhealth_number', 'civil_status', 'height_cm',
        ]);
    }
}
