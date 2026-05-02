<?php

namespace App\Http\Controllers\Prenatal\Concerns;

use App\Models\PatientsModel;
use App\Models\Pregnancy;

trait ResolvesPregnancy
{
    /**
     * Get the current ongoing pregnancy.
     *
     * IMPORTANT:
     * This must NOT create a pregnancy automatically.
     * A new pregnancy should only be created when the user clicks "+ New Pregnancy".
     */
    protected function activePregnancyFor(PatientsModel $patient): ?Pregnancy
    {
        return Pregnancy::where('patient_id', $patient->id)
            ->where('status', 'ongoing')
            ->latest('id')
            ->first();
    }

    /**
     * Get the latest pregnancy record, whether ongoing or completed.
     */
    protected function latestPregnancyFor(PatientsModel $patient): ?Pregnancy
    {
        return Pregnancy::where('patient_id', $patient->id)
            ->latest('id')
            ->first();
    }

    /**
     * Get a selected pregnancy from the URL/request when available.
     * Falls back to active pregnancy, then latest pregnancy.
     *
     * This allows past records to be viewed using:
     * ?pregnancy_id=1
     */
    protected function selectedOrActivePregnancyFor(PatientsModel $patient, ?int $pregnancyId = null): ?Pregnancy
    {
        if ($pregnancyId) {
            $selected = Pregnancy::where('patient_id', $patient->id)
                ->where('id', $pregnancyId)
                ->first();

            if ($selected) {
                return $selected;
            }
        }

        $active = $this->activePregnancyFor($patient);

        if ($active) {
            return $active;
        }

        return $this->latestPregnancyFor($patient);
    }

    /**
     * Get the next pregnancy number for this patient.
     */
    protected function nextPregnancyNoFor(PatientsModel $patient): int
    {
        return ((int) Pregnancy::where('patient_id', $patient->id)->max('pregnancy_no')) + 1;
    }
}
