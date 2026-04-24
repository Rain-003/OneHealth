<?php

namespace App\Http\Controllers;

use App\Models\PatientsModel;
use App\Models\ImmunizationRecord;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ImmunizationController extends Controller
{
    public function show(PatientsModel $patient)
    {
        $vaccines = $this->defaultMatrix();

        // Query directly to avoid relying on an undefined PatientsModel relation
        $existing = ImmunizationRecord::where('patient_id', $patient->id)
            ->orderBy('vaccine')
            ->orderBy('dose_label')
            ->get(); // date_given cast -> Y-m-d via model

        return Inertia::render('center/immunization-edit', [
            'patient' => $patient,
            'matrix'  => $vaccines,
            'doses'   => $existing,
        ]);
    }

    public function upsert(Request $request, PatientsModel $patient)
    {
        $data = $request->validate([
            'vaccine'    => ['required', 'string'],
            'dose_label' => ['required', 'string'],
            'date_given' => ['nullable', 'date'],
            'remarks'    => ['nullable', 'string'],
        ]);

        ImmunizationRecord::updateOrCreate(
            [
                'patient_id' => $patient->id,
                'vaccine'    => $data['vaccine'],
                'dose_label' => $data['dose_label'],
            ],
            [
                'date_given' => $data['date_given'] ?? null,
                'remarks'    => $data['remarks'] ?? null,
            ]
        );

        return back()->with('status', 'Immunization record saved.');
    }

    public function card()
    {
        $patient = auth('patient')->user();
        if (!$patient) {
            return redirect()->route('patient.login');
        }

        $vaccines = $this->defaultMatrix();

        // Query directly (no relation required)
        $doses = ImmunizationRecord::where('patient_id', $patient->id)
            ->orderBy('vaccine')
            ->orderBy('dose_label')
            ->get();

        return Inertia::render('patients/immunization-card', [
            'patient' => $patient,
            'matrix'  => $vaccines,
            'doses'   => $doses,
        ]);
    }

    private function defaultMatrix(): array
    {
        return [
            'BCG Vaccine'                     => ['At birth'],
            'Hepatitis B Vaccine'             => ['At birth'],
            'Pentavalent (DPT-HepB-Hib)'      => ['6w', '10w', '14w'],
            'Oral Polio Vaccine (OPV)'        => ['6w', '10w', '14w'],
            'Inactivated Polio Vaccine (IPV)' => ['14w'],
            'Pneumococcal Conjugate (PCV)'    => ['6w', '10w', '14w'],
            'Measles, Mumps, Rubella (MMR)'   => ['9m', '12m'],
        ];
    }
}
