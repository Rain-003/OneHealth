<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use App\Models\Appointment;
use App\Models\ImmunizationRecord;
use App\Models\PatientsModel;
use App\Models\Pregnancy;
use App\Models\PrenatalVisit;
use App\Http\Controllers\Prenatal\Concerns\ResolvesPregnancy;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

class PatientPortalController extends Controller
{
    use ResolvesPregnancy;
    /**
     * Resolve the currently authenticated patient (patient guard).
     */
    protected function resolvePatient(Request $request): PatientsModel
    {
        /** @var \App\Models\PatientsModel|null $patient */
        $patient = auth('patient')->user();
        abort_if(!$patient, 401, 'Patient not authenticated.');
        return $patient;
    }

    protected function formatPatientDisplayName(PatientsModel $patient): string
    {
        $first = trim((string) ($patient->first_name ?? ''));
        $middle = trim((string) ($patient->middle_name ?? ''));
        $last = trim((string) ($patient->last_name ?? ''));
        $suffix = trim((string) ($patient->suffix ?? ''));

        if ($first !== '' || $middle !== '' || $last !== '' || $suffix !== '') {
            $middleInitial = $middle !== ''
                ? Str::upper(Str::substr(Str::of($middle)->squish()->__toString(), 0, 1)) . '.'
                : '';

            $given = trim(implode(' ', array_filter([
                Str::of($first)->squish()->__toString(),
                $middleInitial,
            ])));

            $display = trim($last);

            if ($given !== '') {
                $display .= ($display !== '' ? ', ' : '') . $given;
            }

            if ($suffix !== '') {
                $display .= ($display !== '' ? ', ' : '') . Str::of($suffix)->squish()->__toString();
            }

            return $display !== '' ? Str::upper($display) : 'Unnamed patient';
        }

        return trim((string) ($patient->full_name ?? '')) ?: 'Unnamed patient';
    }

    protected function patientPayload(PatientsModel $patient): array
    {
        return array_merge($patient->toArray(), [
            'display_name' => $this->formatPatientDisplayName($patient),
            'formal_name' => $this->formatPatientDisplayName($patient),
        ]);
    }

    protected function pregnancyPayload(?Pregnancy $pregnancy): ?array
    {
        if (!$pregnancy) {
            return null;
        }

        return [
            'id' => $pregnancy->id,
            'patient_id' => $pregnancy->patient_id,
            'pregnancy_no' => $pregnancy->pregnancy_no,
            'lmp' => optional($pregnancy->lmp)->toDateString(),
            'edd' => optional($pregnancy->edd)->toDateString(),
            'status' => $pregnancy->status,
            'outcome' => $pregnancy->outcome,
            'completed_at' => optional($pregnancy->completed_at)->toDateString(),
        ];
    }

    /**
     * Base mapper for generic appointment lists.
     * - date: "YYYY-MM-DD"
     * - title: string
     * - status: upcoming | today | done
     */
    protected function mapAppointments($rows)
    {
        $today = Carbon::today(config('app.timezone'));

        return $rows
            ->filter(fn($a) => !empty($a->date))
            ->map(function (Appointment $a) use ($today) {
                $d = $a->date instanceof Carbon
                    ? $a->date->copy()
                    : Carbon::parse($a->date, config('app.timezone'));

                $status = $d->isSameDay($today)
                    ? 'today'
                    : ($d->isPast() ? 'done' : 'upcoming');

                return [
                    'id' => $a->id,
                    'date' => $d->toDateString(),
                    'title' => $a->title ?? 'Clinic Visit',
                    'status' => $status,
                ];
            })
            ->values();
    }

    /**
     * Decode appointment meta from appointments.notes JSON.
     */
    protected function decodeAppointmentMeta($notes): array
    {
        if (!is_string($notes) || trim($notes) === '') {
            return [];
        }

        $decoded = json_decode($notes, true);
        return is_array($decoded) ? $decoded : [];
    }

    /**
     * Immunization matrix copied from HW schedule logic.
     */
    protected function defaultMatrix(): array
    {
        return [
            'BCG Vaccine' => ['At birth'],
            'Hepatitis B Vaccine' => ['At birth'],
            'Pentavalent (DPT-HepB-Hib)' => ['6w', '10w', '14w'],
            'Oral Polio Vaccine (OPV)' => ['6w', '10w', '14w'],
            'Inactivated Polio Vaccine (IPV)' => ['14w'],
            'Pneumococcal Conjugate (PCV)' => ['6w', '10w', '14w'],
            'Measles, Mumps, Rubella (MMR)' => ['9m', '12m'],
        ];
    }

    protected function addDoseOffsetFromBirth(Carbon $birth, string $doseLabel): ?Carbon
    {
        $label = Str::of($doseLabel)->lower()->trim()->__toString();

        if ($label === 'at birth' || $label === 'birth') {
            return $birth->copy();
        }

        if (preg_match('/^(\d+)\s*w$/', $label, $m)) {
            return $birth->copy()->addWeeks((int) $m[1]);
        }

        if (preg_match('/^(\d+)\s*m$/', $label, $m)) {
            return $birth->copy()->addMonths((int) $m[1]);
        }

        return null;
    }

    protected function parseDoseLabel(string $doseLabel): array
    {
        $label = Str::of($doseLabel)->lower()->trim()->__toString();

        if ($label === 'at birth' || $label === 'birth') {
            return ['type' => 'birth', 'value' => 0];
        }

        if (preg_match('/^(\d+)\s*w$/', $label, $m)) {
            return ['type' => 'weeks', 'value' => (int) $m[1]];
        }

        if (preg_match('/^(\d+)\s*m$/', $label, $m)) {
            return ['type' => 'months', 'value' => (int) $m[1]];
        }

        return ['type' => 'unknown', 'value' => 0];
    }

    protected function intervalBetweenDoseLabels(string $prevLabel, string $currentLabel): array
    {
        $prev = $this->parseDoseLabel($prevLabel);
        $cur = $this->parseDoseLabel($currentLabel);

        if ($prev['type'] === 'birth' && $cur['type'] === 'weeks') {
            return ['weeks' => max(0, $cur['value'])];
        }

        if ($prev['type'] === 'birth' && $cur['type'] === 'months') {
            return ['months' => max(0, $cur['value'])];
        }

        if ($prev['type'] === 'weeks' && $cur['type'] === 'weeks') {
            return ['weeks' => max(0, $cur['value'] - $prev['value'])];
        }

        if ($prev['type'] === 'months' && $cur['type'] === 'months') {
            return ['months' => max(0, $cur['value'] - $prev['value'])];
        }

        $base = Carbon::create(2000, 1, 1)->startOfDay();
        $d1 = $this->addDoseOffsetFromBirth($base, $prevLabel);
        $d2 = $this->addDoseOffsetFromBirth($base, $currentLabel);

        if (!$d1 || !$d2) {
            return ['days' => 0];
        }

        $days = $d1->diffInDays($d2, false);

        return ['days' => max(0, (int) $days)];
    }

    protected function addInterval(Carbon $date, array $interval): Carbon
    {
        $d = $date->copy();

        if (isset($interval['weeks'])) {
            return $d->addWeeks((int) $interval['weeks']);
        }

        if (isset($interval['months'])) {
            return $d->addMonths((int) $interval['months']);
        }

        if (isset($interval['days'])) {
            return $d->addDays((int) $interval['days']);
        }

        return $d;
    }

    protected function computeRollingSeriesSchedule(Carbon $birth, string $vaccine, array $labels, array $givenDatesMap): array
    {
        $out = [];
        $prevDue = null;

        foreach (array_values($labels) as $i => $label) {
            $key = Str::lower(trim($vaccine)) . '|' . Str::lower(trim($label));
            $given = null;

            if (!empty($givenDatesMap[$key])) {
                $given = Carbon::parse($givenDatesMap[$key])->startOfDay();
            }

            if ($i === 0) {
                $due = $this->addDoseOffsetFromBirth($birth, $label);
                if (!$due) {
                    continue;
                }
                $prevDue = $due->copy();
            } else {
                $prevLabel = $labels[$i - 1];
                $prevKey = Str::lower(trim($vaccine)) . '|' . Str::lower(trim($prevLabel));

                $prevGiven = null;
                if (!empty($givenDatesMap[$prevKey])) {
                    $prevGiven = Carbon::parse($givenDatesMap[$prevKey])->startOfDay();
                }

                $interval = $this->intervalBetweenDoseLabels($prevLabel, $label);
                $anchor = $prevGiven ?: ($prevDue ? $prevDue->copy() : $birth->copy());
                $due = $this->addInterval($anchor, $interval);

                $prevDue = $due->copy();
            }

            $out[] = [
                'label' => $label,
                'due' => $due->copy()->startOfDay(),
                'given' => $given ? $given->copy()->startOfDay() : null,
            ];
        }

        return $out;
    }

    /**
     * Build the full immunization schedule for the logged-in patient only.
     * This covers missed, today, upcoming, and done based on vaccine data.
     */
    protected function buildImmunizationScheduleAppointmentsForPatient(PatientsModel $patient)
    {
        if ($patient->patient_type !== 'immunization' || !$patient->birthdate) {
            return collect();
        }

        $matrix = $this->defaultMatrix();

        $doses = ImmunizationRecord::query()
            ->where('patient_id', $patient->id)
            ->get(['vaccine', 'dose_label', 'date_given']);

        $givenDatesMap = [];
        foreach ($doses as $dose) {
            if (!$dose->date_given) {
                continue;
            }

            $key = Str::lower(trim($dose->vaccine)) . '|' . Str::lower(trim($dose->dose_label));
            $givenDatesMap[$key] = Carbon::parse($dose->date_given)->toDateString();
        }

        $birth = Carbon::parse($patient->birthdate)->startOfDay();
        $today = Carbon::today()->toDateString();

        $items = collect();
        $syntheticId = 1000000000;

        foreach ($matrix as $vaccine => $labels) {
            $series = $this->computeRollingSeriesSchedule($birth, $vaccine, $labels, $givenDatesMap);

            foreach ($series as $item) {
                $dueYmd = $item['due']->toDateString();
                $givenYmd = $item['given'] ? $item['given']->toDateString() : null;

                if ($givenYmd) {
                    $status = 'done';
                } elseif ($dueYmd === $today) {
                    $status = 'today';
                } elseif ($dueYmd < $today) {
                    $status = 'missed';
                } else {
                    $status = 'upcoming';
                }

                $items->push([
                    'id' => $syntheticId++,
                    'date' => $dueYmd,
                    'title' => 'Immunization Schedule',
                    'display' => $vaccine . ' — ' . $item['label'],
                    'program' => 'immunization',
                    'kind' => $status === 'missed' ? 'missed_due' : 'scheduled_due',
                    'meta' => [
                        'program' => 'immunization',
                        'kind' => $status === 'missed' ? 'missed_due' : 'scheduled_due',
                        'vaccine' => $vaccine,
                        'dose_label' => $item['label'],
                    ],
                    'source_type' => 'synthetic_immunization_schedule',
                    'patient_id' => $patient->id,
                    'patient_name' => $this->formatPatientDisplayName($patient),
                    'barangay' => $patient->barangay,
                    'status' => $status,
                    'given_date' => $givenYmd,
                    'has_record' => (bool) $givenYmd,
                    'can_reschedule' => false,
                ]);
            }
        }

        return $items->sortBy('date')->values();
    }

    /**
     * Patient-only prenatal schedule feed using the HW schedule logic.
     */
    protected function buildPrenatalScheduleAppointmentsForPatient(PatientsModel $patient, ?Pregnancy $pregnancy = null)
    {
        $pregnancy = $pregnancy ?: $this->activePregnancyFor($patient);

        if (!$pregnancy) {
            return collect();
        }

        $rows = Appointment::query()
            ->where('patient_id', $patient->id)
            ->whereIn('source_type', [
                'prenatal_next_visit',
            ])
            ->where(function ($q) use ($pregnancy) {
                $q->whereNull('notes')
                    ->orWhere('notes', '')
                    ->orWhere('notes', 'not like', '%"pregnancy_id"%')
                    ->orWhere('notes', 'like', '%"pregnancy_id":' . $pregnancy->id . '%')
                    ->orWhere('notes', 'like', '%"pregnancy_id": ' . $pregnancy->id . '%')
                    ->orWhere('notes', 'like', '%"pregnancy_id":"' . $pregnancy->id . '"%')
                    ->orWhere('notes', 'like', '%"pregnancy_id": "' . $pregnancy->id . '"%');
            })
            ->orderBy('date')
            ->get([
                'id',
                'date',
                'title',
                'notes',
                'source_type',
                'source_id',
                'patient_id',
            ]);

        $doneAppointments = Appointment::query()
            ->where('patient_id', $patient->id)
            ->whereIn('source_type', ['record', 'prenatal_current_visit'])
            ->where(function ($q) use ($pregnancy) {
                $q->whereNull('notes')
                    ->orWhere('notes', '')
                    ->orWhere('notes', 'not like', '%"pregnancy_id"%')
                    ->orWhere('notes', 'like', '%"pregnancy_id":' . $pregnancy->id . '%')
                    ->orWhere('notes', 'like', '%"pregnancy_id": ' . $pregnancy->id . '%')
                    ->orWhere('notes', 'like', '%"pregnancy_id":"' . $pregnancy->id . '"%')
                    ->orWhere('notes', 'like', '%"pregnancy_id": "' . $pregnancy->id . '"%');
            })
            ->orderBy('date')
            ->get();

        $prenatalVisits = PrenatalVisit::query()
            ->where('patient_id', $patient->id)
            ->where('pregnancy_id', $pregnancy->id)
            ->whereNotNull('visit_date')
            ->orderBy('visit_date')
            ->get(['patient_id', 'visit_date']);

        $today = Carbon::today()->toDateString();

        return $rows->map(function ($row) use ($doneAppointments, $prenatalVisits, $today, $patient) {
            $meta = $this->decodeAppointmentMeta($row->notes);

            $program = $meta['program'] ?? 'prenatal';
            $kind = $meta['kind'] ?? 'next_due';
            $display = $row->title;

            $status = 'upcoming';
            $givenDate = null;
            $hasRecord = false;
            $scheduleDate = (string) $row->date;

            $matchedVisit = $prenatalVisits->first(fn($v) => (string) $v->visit_date >= $scheduleDate);

            if ($matchedVisit) {
                $status = 'done';
                $givenDate = (string) $matchedVisit->visit_date;
                $hasRecord = true;
            }

            if (!$hasRecord) {
                $matchedDone = $doneAppointments->first(fn($appt) => (string) $appt->date >= $scheduleDate);

                if ($matchedDone) {
                    $status = 'done';
                    $givenDate = (string) $matchedDone->date;
                    $hasRecord = true;
                } else {
                    if ($scheduleDate === $today) {
                        $status = 'today';
                    } elseif ($scheduleDate < $today) {
                        $status = 'missed';
                    } else {
                        $status = 'upcoming';
                    }
                }
            }

            return [
                'id' => $row->id,
                'date' => $scheduleDate,
                'title' => $row->title,
                'display' => $display,
                'program' => $program,
                'kind' => $kind,
                'meta' => $meta,
                'source_type' => $row->source_type,
                'patient_id' => $patient->id,
                'patient_name' => $this->formatPatientDisplayName($patient),
                'barangay' => $patient->barangay,
                'status' => $status,
                'given_date' => $givenDate,
                'has_record' => $hasRecord,
                'can_reschedule' => false,
            ];
        })->values();
    }

    /**
     * Patient-only schedule feed.
     */
    protected function getPatientScheduleFeed(PatientsModel $patient)
    {
        if ($patient->patient_type === 'immunization') {
            return $this->buildImmunizationScheduleAppointmentsForPatient($patient);
        }

        if ($patient->patient_type === 'pregnancy') {
            $pregnancy = $this->activePregnancyFor($patient);

            if (!$pregnancy) {
                return collect();
            }

            return $this->buildPrenatalScheduleAppointmentsForPatient($patient, $pregnancy)
                ->sortBy('date')
                ->values();
        }

        return collect();
    }

    /**
     * Shared announcement query for patient portal.
     */
    protected function loadAnnouncementsForPortal()
    {
        return Announcement::query()
            ->where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('audience')
                    ->orWhereIn('audience', ['all', 'patients', 'patient_portal']);
            })
            ->orderByDesc('is_pinned')
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->limit(10)
            ->get([
                'id',
                'title',
                'body',
                'audience',
                'is_pinned',
                'is_active',
                'published_at',
            ]);
    }

    public function dashboard(Request $request)
    {
        $patient = $this->resolvePatient($request);
        $today = Carbon::today(config('app.timezone'));
        $announcements = $this->loadAnnouncementsForPortal();
        $activePregnancy = $patient->patient_type === 'pregnancy'
            ? $this->activePregnancyFor($patient)
            : null;

        $rows = Appointment::query()
            ->where('patient_id', $patient->id)
            ->whereDate('date', '>=', $today->copy()->subMonth()->toDateString())
            ->orderBy('date', 'asc')
            ->limit(50)
            ->get();

        $next = Appointment::query()
            ->where('patient_id', $patient->id)
            ->whereDate('date', '>=', $today->toDateString())
            ->orderBy('date', 'asc')
            ->first();

        return Inertia::render('patients/dashboard', [
            'patient' => $this->patientPayload($patient),
            'activePregnancy' => $this->pregnancyPayload($activePregnancy),
            'appointments' => $this->mapAppointments($rows),
            'today' => $today->toDateString(),
            'nextAppointment' => $next
                ? $this->mapAppointments(collect([$next]))->first()
                : null,
            'announcements' => $announcements,
            'csrf' => csrf_token(),
        ]);
    }

    public function schedule(Request $request)
    {
        $patient = $this->resolvePatient($request);
        $today = Carbon::today(config('app.timezone'));
        $announcements = $this->loadAnnouncementsForPortal();
        $activePregnancy = $patient->patient_type === 'pregnancy'
            ? $this->activePregnancyFor($patient)
            : null;

        $appointments = $this->getPatientScheduleFeed($patient);

        $next = $appointments->first(function ($a) {
            return in_array($a['status'], ['upcoming', 'today'], true);
        });

        return Inertia::render('patients/schedule', [
            'patient' => $this->patientPayload($patient),
            'activePregnancy' => $this->pregnancyPayload($activePregnancy),
            'appointments' => $appointments,
            'today' => $today->toDateString(),
            'nextAppointment' => $next,
            'announcements' => $announcements,
            'csrf' => csrf_token(),
        ]);
    }
}