<?php

namespace App\Http\Controllers\Tools;

use App\Http\Controllers\Controller;
use App\Models\PatientsModel;
use App\Models\PatientRecord;
use App\Models\ImmunizationRecord;
use App\Models\Appointment;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;

class BackfillController extends Controller
{
    public function appointmentsAll(): RedirectResponse
    {
        $count = 0;

        PatientsModel::query()->chunkById(200, function ($patients) use (&$count) {
            foreach ($patients as $p) {
                $count += $this->backfillForPatient((int) $p->id);
            }
        });

        return back()->with('status', "Backfilled {$count} schedule rows.");
    }

    public function appointmentsMine(Request $request): RedirectResponse
    {
        /** @var \App\Models\PatientsModel|null $p */
        $p = auth('patient')->user();
        abort_unless($p instanceof PatientsModel, 401);

        $count = $this->backfillForPatient((int) $p->id);

        return back()->with('status', "Backfilled {$count} schedule rows for you.");
    }

    private function backfillForPatient(int $patientId): int
    {
        $n = 0;

        // From general patient records (visit_date)
        $records = PatientRecord::where('patient_id', $patientId)
            ->whereNotNull('visit_date')
            ->get(['id','visit_date','title']);

        foreach ($records as $r) {
            Appointment::updateOrCreate(
                [
                    'patient_id'  => $patientId,
                    'source_type' => 'record',
                    'source_id'   => (int) $r->id,
                ],
                [
                    'date'  => $r->visit_date,
                    'title' => $r->title ?: 'Clinic Visit',
                    'notes' => 'Backfilled',
                ]
            );
            $n++;
        }

        // From immunization doses (date_given)
        $doses = ImmunizationRecord::where('patient_id', $patientId)
            ->whereNotNull('date_given')
            ->get(['id','vaccine','dose_label','date_given','remarks']);

        foreach ($doses as $d) {
            Appointment::updateOrCreate(
                [
                    'patient_id'  => $patientId,
                    'source_type' => 'immunization_dose',
                    'source_id'   => (int) $d->id,
                ],
                [
                    'date'  => $d->date_given,
                    'title' => 'Immunization: ' . $d->vaccine . ' — ' . $d->dose_label,
                    'notes' => $d->remarks,
                ]
            );
            $n++;
        }

        return $n;
    }
}
