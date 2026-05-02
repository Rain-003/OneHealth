<?php

namespace App\Http\Controllers;

use App\Models\Activity;
use App\Models\Appointment;
use App\Models\ImmunizationRecord;
use App\Models\PatientOwnershipRequest;
use App\Models\PatientRecord;
use App\Models\PatientsModel;
use App\Models\PrenatalTopModel;
use App\Models\PrenatalVisit;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use Inertia\Inertia;

class PatientRecordsController extends Controller
{
    /* ──────────────────────────────────────────────────────────────────────
     |  Auth helpers
     |  ────────────────────────────────────────────────────────────────────── */

    private function isAdmin(?User $u): bool
    {
        return ($u?->role === 'admin');
    }

    private function sameBarangay(?string $a, ?string $b): bool
    {
        $a = trim(mb_strtolower((string) $a));
        $b = trim(mb_strtolower((string) $b));

        return $a !== '' && $b !== '' && $a === $b;
    }

    private function canEditPatient(?User $u, PatientsModel $patient): bool
    {
        if (!$u) {
            return false;
        }

        if ($this->isAdmin($u)) {
            return true;
        }

        // Exact owner can edit.
        if ($patient->owner_id && (int) $patient->owner_id === (int) $u->id) {
            return true;
        }

        // Barangay team can edit.
        return $this->sameBarangay($patient->assigned_barangay, $u->barangay);
    }

    private function ensureCanEditPatient(Request $request, PatientsModel $patient): void
    {
        if (!$this->canEditPatient($request->user(), $patient)) {
            abort(403, 'View only. You can only edit patients you own.');
        }
    }

    private function dashboardUrl(): string
    {
        if (Route::has('center.dashboard'))
            return route('center.dashboard');
        if (Route::has('dashboard'))
            return route('dashboard');
        return url('/center');
    }

    /* Patient name helpers: keeps full_name and split name columns in sync. */

    private function cleanNamePart($value): ?string
    {
        $value = trim(preg_replace('/\\s+/', ' ', (string) ($value ?? '')));
        return $value === '' ? null : mb_strtoupper($value);
    }

    private function cleanSuffix($value): ?string
    {
        $value = trim(preg_replace('/\\s+/', ' ', (string) ($value ?? '')));
        if ($value === '') {
            return null;
        }

        return mb_strtoupper(str_replace('.', '', $value));
    }

    private function buildFullNameFromParts(array $data): string
    {
        return trim(implode(' ', array_filter([
            $this->cleanNamePart($data['first_name'] ?? null),
            $this->cleanNamePart($data['middle_name'] ?? null),
            $this->cleanNamePart($data['last_name'] ?? null),
            $this->cleanSuffix($data['suffix'] ?? null),
        ], fn($value) => $value !== null && $value !== '')));
    }

    private function splitFullNameFallback(?string $fullName): array
    {
        $raw = trim(preg_replace('/\\s+/', ' ', (string) ($fullName ?? '')));
        if ($raw === '') {
            return [
                'first_name' => null,
                'middle_name' => null,
                'last_name' => null,
                'suffix' => null,
            ];
        }

        $suffixes = ['JR', 'SR', 'II', 'III', 'IV', 'V'];
        $parts = preg_split('/\\s+/', $raw) ?: [];

        $suffix = null;
        if (count($parts) > 1) {
            $candidate = mb_strtoupper(str_replace('.', '', (string) end($parts)));
            if (in_array($candidate, $suffixes, true)) {
                $suffix = array_pop($parts);
            }
        }

        if (count($parts) === 1) {
            return [
                'first_name' => $this->cleanNamePart($parts[0] ?? null),
                'middle_name' => null,
                'last_name' => null,
                'suffix' => $this->cleanSuffix($suffix),
            ];
        }

        $firstName = array_shift($parts);
        $lastName = array_pop($parts);

        return [
            'first_name' => $this->cleanNamePart($firstName),
            'middle_name' => $this->cleanNamePart(implode(' ', $parts)),
            'last_name' => $this->cleanNamePart($lastName),
            'suffix' => $this->cleanSuffix($suffix),
        ];
    }

    private function normalizePatientNameData(array $data): array
    {
        $hasSplitNameInput = array_key_exists('first_name', $data)
            || array_key_exists('middle_name', $data)
            || array_key_exists('last_name', $data)
            || array_key_exists('suffix', $data);

        if ($hasSplitNameInput) {
            $data['first_name'] = $this->cleanNamePart($data['first_name'] ?? null);
            $data['middle_name'] = $this->cleanNamePart($data['middle_name'] ?? null);
            $data['last_name'] = $this->cleanNamePart($data['last_name'] ?? null);
            $data['suffix'] = $this->cleanSuffix($data['suffix'] ?? null);

            $builtFullName = $this->buildFullNameFromParts($data);
            if ($builtFullName !== '') {
                $data['full_name'] = $builtFullName;
            } elseif (!empty($data['full_name'])) {
                $data['full_name'] = $this->cleanNamePart($data['full_name']);
            }

            return $data;
        }

        if (!empty($data['full_name'])) {
            $data['full_name'] = $this->cleanNamePart($data['full_name']);
            $data = array_merge($data, $this->splitFullNameFallback($data['full_name']));
        }

        return $data;
    }

    /* ──────────────────────────────────────────────────────────────────────
     |  Appointment meta (stored in appointments.notes as JSON)
     |  ────────────────────────────────────────────────────────────────────── */

    private function encodeAppointmentMeta(array $meta): ?string
    {
        if (empty($meta))
            return null;

        try {
            return json_encode($meta, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        } catch (\Throwable $e) {
            return null;
        }
    }

    private function decodeAppointmentMeta($notes): array
    {
        if (!is_string($notes) || trim($notes) === '')
            return [];

        $decoded = json_decode($notes, true);
        return is_array($decoded) ? $decoded : [];
    }

    /* ──────────────────────────────────────────────────────────────────────
     |  Auto-reactivate status (TRANSERRED → ACTIVE) when ANY record is saved
     |  ────────────────────────────────────────────────────────────────────── */

    /**
     * If a patient is currently TRANSFERRED and a new record is saved,
     * auto-set status back to ACTIVE.
     *
     * - Does NOT reactivate deceased.
     * - Does NOT touch left_without_notice (patient still has access; status is informational).
     * - Call this AFTER successfully saving any clinical record/dose/etc.
     */
    private function activateIfTransferred(PatientsModel $patient, string $reason, array $context = []): void
    {
        $cur = strtolower((string) ($patient->status ?? ''));

        if ($cur === 'deceased')
            return;
        if ($cur !== 'transferred')
            return;

        $old = $patient->status ?? 'transferred';

        $patient->status = 'active';
        $patient->save();

        Activity::record('patient.status_auto_reactivated', [
            'patient_id' => $patient->id,
            'description' => 'Auto-reactivated patient status (TRANSFERRED → ACTIVE) after saving a record.',
            'properties' => array_merge([
                'from' => $old,
                'to' => 'active',
                'reason' => $reason,
            ], $context),
        ]);
    }

    /* ──────────────────────────────────────────────────────────────────────
     |  Barangay transfer history (Activity trail)
     |  ────────────────────────────────────────────────────────────────────── */

    /**
     * Returns latest-first barangay transfer history for a patient, based on
     * Activity::record('patient.transferred', ...) properties.
     *
     * IMPORTANT:
     * Your DB uses activities.user_id (NOT created_by).
     */
    private function getBarangayTransferHistory(int $patientId, int $limit = 50): array
    {
        $acts = Activity::query()
            ->with(['user:id,name,barangay'])
            ->where('patient_id', $patientId)
            ->where('type', 'patient.transferred')
            ->orderByDesc('created_at')
            ->limit(max(1, $limit))
            ->get([
                'id',
                'user_id',
                'type',
                'description',
                'properties',
                'created_at',
            ]);

        return $acts->map(function ($a) {
            $props = is_array($a->properties) ? $a->properties : (json_decode((string) $a->properties, true) ?: []);

            $by = null;

            if ($a->relationLoaded('user') && $a->user) {
                $by = [
                    'id' => $a->user->id,
                    'name' => $a->user->name,
                    'barangay' => $a->user->barangay,
                ];
            } elseif (!empty($a->user_id)) {
                $u = User::query()->find($a->user_id, ['id', 'name', 'barangay']);
                if ($u) {
                    $by = [
                        'id' => $u->id,
                        'name' => $u->name,
                        'barangay' => $u->barangay,
                    ];
                }
            }

            return [
                'id' => $a->id,
                'date' => $a->created_at ? Carbon::parse($a->created_at)->toDateTimeString() : null,
                'from_barangay' => data_get($props, 'from_barangay'),
                'to_barangay' => data_get($props, 'to_barangay'),
                'from_status' => data_get($props, 'from_status'),
                'to_status' => data_get($props, 'to_status'),
                'description' => $a->description,
                'by' => $by,
                'raw_properties' => $props,
            ];
        })->values()->all();
    }

    /* ──────────────────────────────────────────────────────────────────────
     |  Pregnancy helpers (PrenatalVisit is source of truth)
     |  ────────────────────────────────────────────────────────────────────── */

    private function pregnancyHighRisk(?PrenatalTopModel $top): bool
    {
        if (!$top)
            return false;

        return (bool) (
            ($top->risk_a_flag ?? false) ||
            ($top->risk_b_flag ?? false) ||
            ($top->risk_c_flag ?? false) ||
            ($top->risk_d_flag ?? false) ||
            ($top->risk_e_flag ?? false)
        );
    }

    private function estimateLmp(?Carbon $lmp, ?PrenatalVisit $lastVisit): ?Carbon
    {
        if ($lmp)
            return $lmp->copy()->startOfDay();

        if ($lastVisit && $lastVisit->visit_date && $lastVisit->aog_days !== null) {
            try {
                $vd = Carbon::parse($lastVisit->visit_date)->startOfDay();
                return $vd->copy()->subDays((int) $lastVisit->aog_days)->startOfDay();
            } catch (\Throwable $e) {
                return null;
            }
        }

        return null;
    }

    private function gaWeeksAt(Carbon $date, ?Carbon $lmpEst, ?PrenatalVisit $visit = null): ?int
    {
        if ($visit && $visit->aog_days !== null) {
            return intdiv((int) $visit->aog_days, 7);
        }

        if ($lmpEst) {
            $days = $lmpEst->diffInDays($date, false);
            if ($days >= 0)
                return intdiv((int) $days, 7);
        }

        return null;
    }

    private function computeNextPrenatalAuto(PatientsModel $patient): ?array
    {
        $today = Carbon::today()->startOfDay();

        // Stop if delivered (stored in prenatal_hbm_current JSON snapshot)
        $cur = (array) ($patient->prenatal_hbm_current ?? []);
        $deliveryDateRaw = data_get($cur, 'delivery.delivery_date');
        if (!empty($deliveryDateRaw)) {
            try {
                Carbon::parse($deliveryDateRaw);
                return null;
            } catch (\Throwable $e) {
                // ignore parse error
            }
        }

        // If there is ANY future manual prenatal_next_visit, do not generate auto.
        $manual = Appointment::query()
            ->where('patient_id', $patient->id)
            ->where('source_type', 'prenatal_next_visit')
            ->where('source_id', '!=', (int) $patient->id)
            ->whereDate('date', '>=', $today->toDateString())
            ->orderBy('date')
            ->first();

        if ($manual)
            return null;

        $top = PrenatalTopModel::where('patient_id', $patient->id)->first();
        $lmp = $top?->lmp ? Carbon::parse($top->lmp)->startOfDay() : null;
        $edc = $top?->edc ? Carbon::parse($top->edc)->startOfDay() : null;

        $lastVisit = PrenatalVisit::where('patient_id', $patient->id)
            ->whereNotNull('visit_date')
            ->orderByDesc('visit_date')
            ->first();

        if (!$lastVisit && !$lmp)
            return null;

        if ($edc) {
            $end = $edc->copy()->addDays(14);
            if ($today->gt($end))
                return null;
        }

        $baseDate = $lastVisit && $lastVisit->visit_date
            ? Carbon::parse($lastVisit->visit_date)->startOfDay()
            : $today->copy();

        $gaWeeks = null;

        if ($lmp) {
            $gaDays = $lmp->diffInDays($baseDate, false);
            if ($gaDays >= 0)
                $gaWeeks = intdiv((int) $gaDays, 7);
        }

        if ($gaWeeks === null && $lastVisit && $lastVisit->aog_days !== null) {
            $gaWeeks = intdiv((int) $lastVisit->aog_days, 7);
        }

        if ($gaWeeks === null)
            $gaWeeks = 0;

        $highRisk = $this->pregnancyHighRisk($top);

        $intervalWeeks = 4;
        if ($gaWeeks >= 36) {
            $intervalWeeks = 1;
        } elseif ($gaWeeks >= 28) {
            $intervalWeeks = 2;
        } else {
            $intervalWeeks = 4;
        }

        if ($highRisk) {
            if ($gaWeeks < 28)
                $intervalWeeks = min($intervalWeeks, 2);
            if ($gaWeeks >= 28)
                $intervalWeeks = 1;
        }

        $next = $baseDate->copy()->addWeeks($intervalWeeks);

        $kind = 'next_due_auto';
        if ($next->lt($today)) {
            $next = $today->copy();
            $kind = 'catch_up_auto';
        }

        if ($edc) {
            $end = $edc->copy()->addDays(14);
            if ($next->gt($end))
                $next = $end;
        }

        return [
            'date' => $next->toDateString(),
            'title' => 'Next Prenatal Visit',
            'meta' => [
                'program' => 'prenatal',
                'kind' => $kind,
                'recommended' => true,
                'ga_weeks' => $gaWeeks,
                'interval_weeks' => $intervalWeeks,
                'high_risk' => $highRisk,
                'lmp' => $lmp ? $lmp->toDateString() : null,
                'edc' => $edc ? $edc->toDateString() : null,
                'based_on' => $lastVisit ? 'last_visit' : 'lmp',
            ],
        ];
    }

    /* ──────────────────────────────────────────────────────────────────────
     |  Records index / show
     |  ────────────────────────────────────────────────────────────────────── */

    public function index(Request $request)
    {
        $q = (string) $request->query('q', '');
        $type = (string) $request->query('type', '');
        $sort = (string) $request->query('sort', 'created_new');
        $perPage = (int) $request->query('per_page', 20);

        /** @var User|null $user */
        $user = $request->user();
        $scope = (string) $request->query('scope', 'mine');
        if ($this->isAdmin($user)) {
            $scope = 'all';
        }

        $query = PatientsModel::query()->with(['owner:id,name,barangay']);

        if (!$this->isAdmin($user) && $scope !== 'all') {
            $query->where(function ($q) use ($user) {
                $q->where('owner_id', $user?->id);

                if (!empty($user?->barangay)) {
                    $q->orWhere('assigned_barangay', $user->barangay);
                }
            });
        }

        if ($q !== '') {
            $like = '%' . str_replace(['%', '_'], ['\\%', '\\_'], $q) . '%';
            $query->where(function ($sub) use ($like) {
                $sub->where('full_name', 'like', $like)
                    ->orWhere('first_name', 'like', $like)
                    ->orWhere('middle_name', 'like', $like)
                    ->orWhere('last_name', 'like', $like)
                    ->orWhere('suffix', 'like', $like)
                    ->orWhere('barangay', 'like', $like)
                    ->orWhere('family_no', 'like', $like);
            });
        }

        if ($type !== '' && $type !== 'all') {
            $query->where('patient_type', $type);
        }

        switch ($sort) {
            case 'created_old':
                $query->orderBy('created_at', 'asc');
                break;
            case 'name_asc':
                $query->orderByRaw("full_name IS NULL, COALESCE(full_name, '') COLLATE utf8mb4_unicode_ci ASC");
                break;
            case 'name_desc':
                $query->orderByRaw("full_name IS NULL, COALESCE(full_name, '') COLLATE utf8mb4_unicode_ci DESC");
                break;
            case 'birth_new':
                $query->orderByRaw("birthdate IS NULL, birthdate DESC");
                break;
            case 'birth_old':
                $query->orderByRaw("birthdate IS NULL, birthdate ASC");
                break;
            case 'created_new':
            default:
                $query->orderBy('created_at', 'desc');
                break;
        }

        $patients = $query
            ->paginate($perPage > 0 ? $perPage : 20)
            ->withQueryString()
            ->through(function (PatientsModel $p) use ($user) {
                return [
                    'id' => $p->id,
                    'full_name' => $p->full_name,
                    'first_name' => $p->first_name,
                    'middle_name' => $p->middle_name,
                    'last_name' => $p->last_name,
                    'suffix' => $p->suffix,
                    'birthdate' => optional($p->birthdate)->toDateString() ?? ($p->birthdate ?? null),
                    'barangay' => $p->barangay,
                    'family_no' => $p->family_no,
                    'status' => $p->status,
                    'patient_type' => $p->patient_type,
                    'can_edit' => $this->canEditPatient($user, $p),
                    'owner' => $p->owner ? [
                        'id' => $p->owner->id,
                        'name' => $p->owner->name,
                        'barangay' => $p->owner->barangay,
                    ] : null,
                ];
            });

        $transferTargets = [];
        if ($user) {
            $transferTargets = User::query()
                ->where('role', '!=', 'admin')
                ->orderBy('name')
                ->get(['id', 'name', 'barangay']);
        }

        return Inertia::render('center/records/index', [
            'patients' => $patients,
            'counts' => [],
            'transferTargets' => $transferTargets,
            'filters' => [
                'q' => $q,
                'type' => $type === '' ? 'all' : $type,
                'sort' => $sort ?: 'created_new',
                'scope' => $scope,
            ],
            'dashboardUrl' => $this->dashboardUrl(),
            'auth' => ['user' => $request->user()],
        ]);
    }

    public function all(Request $request)
    {
        $type = $request->string('record_type')->toString();
        $sort = $request->string('sort')->toString();
        $dir = $sort === 'oldest' ? 'asc' : 'desc';

        $records = PatientRecord::query()
            ->select(['id', 'patient_id', 'visit_date', 'title', 'record_type', 'created_at'])
            ->with([
                'patient:id,full_name,first_name,middle_name,last_name,suffix,patient_type,barangay,owner_id',
                'patient.owner:id,name,barangay',
            ])
            ->when($type, fn($q) => $q->where('record_type', $type))
            ->orderBy('visit_date', $dir)
            ->orderBy('created_at', $dir)
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('center/records/all', [
            'records' => $records,
            'filters' => ['record_type' => $type, 'sort' => $sort ?: 'latest'],
        ]);
    }

    public function show(PatientsModel $patient)
    {
        $user = request()->user();
        $patient->loadMissing(['owner:id,name,barangay']);
        $canEdit = $this->canEditPatient($user, $patient);

        $pendingRequestId = null;
        if ($user && !$this->isAdmin($user) && !$canEdit) {
            $pendingRequestId = PatientOwnershipRequest::query()
                ->where('patient_id', $patient->id)
                ->where('requested_by', $user->id)
                ->where('status', 'pending')
                ->value('id');
        }

        $barangayTransferHistory = $this->getBarangayTransferHistory((int) $patient->id, 50);

        if ($patient->patient_type === 'pregnancy') {
            return redirect()->route('center.prenatal.show', ['patient' => $patient->id]);
        }

        $sort = request()->string('sort')->toString();
        $dir = $sort === 'oldest' ? 'asc' : 'desc';

        $records = PatientRecord::query()
            ->where('patient_id', $patient->id)
            ->orderBy('visit_date', $dir)
            ->orderBy('created_at', $dir)
            ->get(['id', 'visit_date', 'title', 'record_type', 'notes', 'created_at']);

        $matrix = null;
        $doses = [];
        if ($patient->patient_type === 'immunization') {
            $matrix = $this->defaultMatrix();
            $doses = ImmunizationRecord::where('patient_id', $patient->id)->get([
                'id',
                'vaccine',
                'dose_label',
                'date_given',
                'remarks'
            ]);
        }

        $tab = request()->string('tab')->toString();
        $activeTab = in_array($tab, ['records', 'card'], true) ? $tab : 'records';

        $transferTargets = [];
        if ($user && $canEdit) {
            $transferTargets = User::query()
                ->where('id', '!=', (int) $patient->owner_id)
                ->where('role', '!=', 'admin')
                ->orderBy('name')
                ->get(['id', 'name', 'barangay']);
        }

        return Inertia::render('center/records/show', [
            'patient' => $patient,
            'owner' => $patient->owner ? [
                'id' => $patient->owner->id,
                'name' => $patient->owner->name,
                'barangay' => $patient->owner->barangay,
            ] : null,
            'canEdit' => $canEdit,
            'pendingOwnershipRequestId' => $pendingRequestId,
            'transferTargets' => $transferTargets,
            'records' => $records,
            'filters' => ['sort' => $sort ?: 'latest'],
            'dashboardUrl' => $this->dashboardUrl(),
            'immunization' => [
                'matrix' => $matrix,
                'doses' => $doses,
            ],
            'barangayTransferHistory' => $barangayTransferHistory,
            'ui' => [
                'tab' => $activeTab,
            ],
        ]);
    }

    /* ──────────────────────────────────────────────────────────────────────
     |  Patient updates
     |  ────────────────────────────────────────────────────────────────────── */

    public function updatePatient(Request $request, PatientsModel $patient)
    {
        $this->ensureCanEditPatient($request, $patient);

        $data = $request->validate([
            'full_name' => ['required_without:first_name', 'nullable', 'string', 'max:255'],
            'first_name' => ['nullable', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'last_name' => ['nullable', 'string', 'max:100'],
            'suffix' => ['nullable', 'string', 'max:20'],
            'birthdate' => ['nullable', 'date'],
            'sex' => ['nullable', 'string', 'max:20'],
            'barangay' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'health_center' => ['nullable', 'string', 'max:255'],
            'family_no' => ['nullable', 'string', 'max:50'],
            'mother_name' => ['nullable', 'string', 'max:150'],
            'father_name' => ['nullable', 'string', 'max:150'],
            'contact_no' => ['nullable', 'string', 'max:32'],
            'phone' => ['nullable', 'string', 'max:32'],
            'place_of_birth' => ['nullable', 'string', 'max:255'],
            'civil_status' => ['nullable', 'string', 'max:50'],
            'philhealth_no' => ['nullable', 'string', 'max:50'],
            'height_cm' => ['nullable', 'numeric'],
            'status' => ['required', 'string', 'in:active,deceased,transferred,left_without_notice'],
        ]);

        $data = $this->normalizePatientNameData($data);

        if (empty($data['full_name'])) {
            return back()
                ->withErrors(['full_name' => 'Patient name is required.'])
                ->withInput();
        }

        if (array_key_exists('birthdate', $data) && $data['birthdate']) {
            $data['birthdate'] = Carbon::parse($data['birthdate'])->toDateString();
        }

        if (
            (!array_key_exists('contact_no', $data) || $data['contact_no'] === null || $data['contact_no'] === '') &&
            array_key_exists('phone', $data)
        ) {
            $data['contact_no'] = $data['phone'];
        }

        if (array_key_exists('contact_no', $data) && $data['contact_no'] !== null) {
            $digits = preg_replace('/\D/', '', (string) $data['contact_no']);
            if ($digits !== '') {
                if (strlen($digits) === 10 && str_starts_with($digits, '9')) {
                    $data['contact_no'] = '0' . $digits;
                } else {
                    $data['contact_no'] = $digits;
                }
            } else {
                $data['contact_no'] = null;
            }
        }

        unset($data['phone']);

        $before = $patient->only([
            'full_name',
            'first_name',
            'middle_name',
            'last_name',
            'suffix',
            'birthdate',
            'sex',
            'barangay',
            'address',
            'health_center',
            'family_no',
            'mother_name',
            'father_name',
            'contact_no',
            'place_of_birth',
            'civil_status',
            'philhealth_no',
            'height_cm',
            'status',
        ]);

        $patient->fill($data);
        $patient->save();

        if (($data['status'] ?? null) === 'deceased') {
            Appointment::where('patient_id', $patient->id)
                ->whereIn('source_type', ['immunization_schedule', 'prenatal_next_visit'])
                ->delete();
        }

        $after = $patient->only(array_keys($before));

        if (
            array_key_exists('birthdate', $data) ||
            array_key_exists('barangay', $data) ||
            array_key_exists('status', $data)
        ) {
            $this->rebuildScheduleForPatient($patient);
        }

        Activity::record('patient.updated', [
            'patient_id' => $patient->id,
            'description' => 'Updated patient demographic information.',
            'properties' => [
                'before' => $before,
                'after' => $after,
            ],
        ]);

        return back()->with('status', 'Patient details updated.');
    }

    public function updateStatus(Request $request, PatientsModel $patient)
    {
        $this->ensureCanEditPatient($request, $patient);

        // ✅ Added left_without_notice (does NOT block patient access; informational only)
        $data = $request->validate([
            'status' => ['required', 'string', 'in:active,deceased,transferred,left_without_notice'],
        ]);

        $oldStatus = $patient->status ?? 'active';
        $newStatus = $data['status'];

        if ($oldStatus === $newStatus) {
            return back()->with('status', 'Patient status unchanged.');
        }

        $patient->status = $newStatus;
        $patient->save();

        // Only deceased should clear future schedules
        if ($newStatus === 'deceased') {
            Appointment::where('patient_id', $patient->id)
                ->whereIn('source_type', ['immunization_schedule', 'prenatal_next_visit'])
                ->delete();
        }

        Activity::record('patient.status_updated', [
            'patient_id' => $patient->id,
            'description' => 'Updated patient status: ' . $oldStatus . ' → ' . $newStatus,
            'properties' => [
                'from' => $oldStatus,
                'to' => $newStatus,
            ],
        ]);

        return back()->with('status', 'Patient status updated.');
    }

    public function transfer(Request $request, PatientsModel $patient)
    {
        $this->ensureCanEditPatient($request, $patient);

        $data = $request->validate([
            'barangay' => ['required', 'string', 'max:255'],
        ]);

        $oldBarangay = $patient->barangay;
        $oldStatus = $patient->status ?? 'active';

        $patient->barangay = $data['barangay'];
        $patient->status = 'transferred';
        $patient->save();

        $this->rebuildScheduleForPatient($patient);

        Activity::record('patient.transferred', [
            'patient_id' => $patient->id,
            'description' => 'Transferred patient to barangay ' . $patient->barangay,
            'properties' => [
                'from_barangay' => $oldBarangay,
                'to_barangay' => $patient->barangay,
                'from_status' => $oldStatus,
                'to_status' => $patient->status,
            ],
        ]);

        return back()->with('status', 'Patient transferred.');
    }

    /* ──────────────────────────────────────────────────────────────────────
     |  Records create/update
     |  ────────────────────────────────────────────────────────────────────── */

    private function mapPatientTypeToRecordType(?string $patientType): string
    {
        return $patientType === 'pregnancy' ? 'mother' : 'infant';
    }

    public function store(Request $request, PatientsModel $patient)
    {
        $this->ensureCanEditPatient($request, $patient);

        $validated = $request->validate([
            'visit_date' => ['required', 'date'],
            'title' => ['required', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:65535'],
        ]);

        $recordType = $this->mapPatientTypeToRecordType($patient->patient_type);

        $rec = PatientRecord::create([
            'patient_id' => $patient->id,
            'created_by' => auth()->id(),
            'visit_date' => $validated['visit_date'],
            'title' => Str::of($validated['title'])->squish()->__toString(),
            'record_type' => $recordType,
            'notes' => $validated['notes'] ?? null,
        ]);

        Appointment::updateOrCreate(
            [
                'patient_id' => $patient->id,
                'source_type' => 'record',
                'source_id' => (int) $rec->id,
            ],
            [
                'date' => Carbon::parse($rec->visit_date)->toDateString(),
                'title' => $rec->title ?? 'Clinic Visit',
                'notes' => $validated['notes'] ?? null,
            ]
        );

        // ✅ AUTO: transferred → active on any saved record
        $this->activateIfTransferred($patient, 'patient_record_created', [
            'record_id' => (int) $rec->id,
            'title' => $rec->title,
            'visit_date' => (string) $rec->visit_date,
        ]);

        $this->rebuildScheduleForPatient($patient);

        Activity::record('record.created', [
            'patient_id' => $patient->id,
            'description' => 'Added patient record: ' . $rec->title,
            'properties' => ['visit_date' => $rec->visit_date, 'record_id' => $rec->id],
        ]);

        return back()->with('status', 'Record saved.');
    }

    public function update(Request $request, PatientsModel $patient, PatientRecord $record)
    {
        $this->ensureCanEditPatient($request, $patient);

        if ($record->patient_id !== $patient->id)
            abort(404);

        $validated = $request->validate([
            'visit_date' => ['required', 'date'],
            'title' => ['required', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:65535'],
        ]);

        $recordType = $this->mapPatientTypeToRecordType($patient->patient_type);

        $record->update([
            'visit_date' => $validated['visit_date'],
            'title' => Str::of($validated['title'])->squish()->__toString(),
            'record_type' => $recordType,
            'notes' => $validated['notes'] ?? null,
        ]);

        Appointment::updateOrCreate(
            [
                'patient_id' => $patient->id,
                'source_type' => 'record',
                'source_id' => (int) $record->id,
            ],
            [
                'date' => Carbon::parse($record->visit_date)->toDateString(),
                'title' => $record->title ?? 'Clinic Visit',
                'notes' => $validated['notes'] ?? null,
            ]
        );

        // ✅ AUTO: transferred → active on any saved record
        $this->activateIfTransferred($patient, 'patient_record_updated', [
            'record_id' => (int) $record->id,
            'title' => $record->title,
            'visit_date' => (string) $record->visit_date,
        ]);

        $this->rebuildScheduleForPatient($patient);

        Activity::record('record.updated', [
            'patient_id' => $patient->id,
            'description' => 'Updated patient record: ' . $record->title,
            'properties' => ['visit_date' => $record->visit_date, 'record_id' => $record->id],
        ]);

        return back()->with('status', 'Record updated.');
    }

    /* ──────────────────────────────────────────────────────────────────────
     |  Immunization logic
     |  ────────────────────────────────────────────────────────────────────── */

    public function immunizationUpsert(Request $request, PatientsModel $patient)
    {
        $this->ensureCanEditPatient($request, $patient);

        $input = $request->all();

        foreach (['mother_name', 'father_name', 'vaccine', 'dose_label', 'date_given', 'remarks'] as $k) {
            if (array_key_exists($k, $input) && $input[$k] === '') {
                $input[$k] = null;
            }
        }

        if (!isset($input['rows']) && isset($input['vaccine'])) {
            $input['rows'] = [
                [
                    'vaccine' => $input['vaccine'] ?? null,
                    'dose_label' => $input['dose_label'] ?? null,
                    'date_given' => $input['date_given'] ?? null,
                    'remarks' => $input['remarks'] ?? null,
                ]
            ];
        }

        $data = validator($input, [
            'mother_name' => ['nullable', 'string', 'max:150'],
            'father_name' => ['nullable', 'string', 'max:150'],

            'rows' => ['required', 'array', 'min:1'],
            'rows.*.vaccine' => ['required', 'string'],
            'rows.*.dose_label' => ['required', 'string'],
            'rows.*.date_given' => ['nullable', 'date'],
            'rows.*.remarks' => ['nullable', 'string'],
        ])->validate();

        $saved = [];

        DB::transaction(function () use ($data, $patient, &$saved) {
            if (array_key_exists('mother_name', $data) || array_key_exists('father_name', $data)) {
                $patient->update([
                    'mother_name' => $data['mother_name'] ?? $patient->mother_name,
                    'father_name' => $data['father_name'] ?? $patient->father_name,
                ]);
            }

            foreach ($data['rows'] as $row) {
                $vaccine = Str::of($row['vaccine'])->squish()->__toString();
                $label = Str::of($row['dose_label'])->squish()->__toString();

                $rec = ImmunizationRecord::updateOrCreate(
                    [
                        'patient_id' => $patient->id,
                        'vaccine' => $vaccine,
                        'dose_label' => $label,
                    ],
                    [
                        'date_given' => $row['date_given'] ?? null,
                        'remarks' => $row['remarks'] ?? null,
                    ]
                );

                if (!empty($rec->date_given)) {
                    Appointment::updateOrCreate(
                        [
                            'patient_id' => $patient->id,
                            'source_type' => 'immunization_dose',
                            'source_id' => (int) $rec->id,
                        ],
                        [
                            'date' => Carbon::parse($rec->date_given)->toDateString(),
                            'title' => 'Immunization: ' . $rec->vaccine . ' — ' . $rec->dose_label,
                            'notes' => $rec->remarks,
                        ]
                    );
                } else {
                    Appointment::where('patient_id', $patient->id)
                        ->where('source_type', 'immunization_dose')
                        ->where('source_id', (int) $rec->id)
                        ->delete();
                }

                $saved[] = $rec;
            }

            // ✅ AUTO: transferred → active on any saved immunization
            $this->activateIfTransferred($patient, 'immunization_saved', [
                'rows_saved' => count($saved),
            ]);

            $this->rebuildScheduleForPatient($patient);
        });

        $rowsPretty = array_map(function ($rec) {
            $date = $rec->date_given ? Carbon::parse($rec->date_given)->toDateString() : 'none';
            return "{$rec->vaccine} — {$rec->dose_label}: {$date}";
        }, $saved);

        Activity::record('immunization.updated', [
            'patient_id' => $patient->id,
            'description' => 'Updated immunization',
            'properties' => [
                'dose_count' => count($saved),
                'rows_pretty' => $rowsPretty,
                'summary' => implode(' • ', $rowsPretty),
            ],
        ]);

        return back(303)->with('flash', ['message' => 'Immunization saved.']);
    }

    /* ──────────────────────────────────────────────────────────────────────
     |  Immunization schedule helpers (unchanged)
     |  ────────────────────────────────────────────────────────────────────── */

    private function defaultMatrix(): array
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

    private function addDoseOffsetFromBirth(Carbon $birth, string $doseLabel): ?Carbon
    {
        $label = Str::of($doseLabel)->lower()->trim()->__toString();

        if ($label === 'at birth' || $label === 'birth')
            return $birth->copy();

        if (preg_match('/^(\d+)\s*w$/', $label, $m))
            return $birth->copy()->addWeeks((int) $m[1]);

        if (preg_match('/^(\d+)\s*m$/', $label, $m))
            return $birth->copy()->addMonths((int) $m[1]);

        return null;
    }

    private function parseDoseLabel(string $doseLabel): array
    {
        $label = Str::of($doseLabel)->lower()->trim()->__toString();

        if ($label === 'at birth' || $label === 'birth')
            return ['type' => 'birth', 'value' => 0];

        if (preg_match('/^(\d+)\s*w$/', $label, $m))
            return ['type' => 'weeks', 'value' => (int) $m[1]];

        if (preg_match('/^(\d+)\s*m$/', $label, $m))
            return ['type' => 'months', 'value' => (int) $m[1]];

        return ['type' => 'unknown', 'value' => 0];
    }

    private function intervalBetweenDoseLabels(string $prevLabel, string $currentLabel): array
    {
        $prev = $this->parseDoseLabel($prevLabel);
        $cur = $this->parseDoseLabel($currentLabel);

        if ($prev['type'] === 'birth' && $cur['type'] === 'weeks')
            return ['weeks' => max(0, $cur['value'])];
        if ($prev['type'] === 'birth' && $cur['type'] === 'months')
            return ['months' => max(0, $cur['value'])];

        if ($prev['type'] === 'weeks' && $cur['type'] === 'weeks')
            return ['weeks' => max(0, $cur['value'] - $prev['value'])];
        if ($prev['type'] === 'months' && $cur['type'] === 'months')
            return ['months' => max(0, $cur['value'] - $prev['value'])];

        $base = Carbon::create(2000, 1, 1)->startOfDay();
        $d1 = $this->addDoseOffsetFromBirth($base, $prevLabel);
        $d2 = $this->addDoseOffsetFromBirth($base, $currentLabel);

        if (!$d1 || !$d2)
            return ['days' => 0];

        $days = $d1->diffInDays($d2, false);
        return ['days' => max(0, (int) $days)];
    }

    private function addInterval(Carbon $date, array $interval): Carbon
    {
        $d = $date->copy();

        if (isset($interval['weeks']))
            return $d->addWeeks((int) $interval['weeks']);
        if (isset($interval['months']))
            return $d->addMonths((int) $interval['months']);
        if (isset($interval['days']))
            return $d->addDays((int) $interval['days']);

        return $d;
    }

    private function computeRollingSeriesSchedule(Carbon $birth, string $vaccine, array $labels, array $givenDatesMap): array
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
                if (!$due)
                    continue;
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

    private function computeNextImmunizationSchedule(PatientsModel $patient): ?array
    {
        if (!$patient->birthdate)
            return null;

        $matrix = $this->defaultMatrix();

        $doses = ImmunizationRecord::where('patient_id', $patient->id)->get([
            'vaccine',
            'dose_label',
            'date_given',
        ]);

        $givenDatesMap = [];
        foreach ($doses as $dose) {
            if (!$dose->date_given)
                continue;
            $key = Str::lower(trim($dose->vaccine)) . '|' . Str::lower(trim($dose->dose_label));
            $givenDatesMap[$key] = Carbon::parse($dose->date_given)->toDateString();
        }

        $birth = Carbon::parse($patient->birthdate)->startOfDay();

        $candidateDate = null;
        $candidateVaccine = null;
        $candidateDoseLabel = null;

        foreach ($matrix as $vaccine => $labels) {
            $series = $this->computeRollingSeriesSchedule($birth, $vaccine, $labels, $givenDatesMap);

            foreach ($series as $item) {
                if ($item['given'])
                    continue;

                $due = $item['due'];
                if ($candidateDate === null || $due->lt($candidateDate)) {
                    $candidateDate = $due->copy();
                    $candidateVaccine = $vaccine;
                    $candidateDoseLabel = $item['label'];
                }
                break;
            }
        }

        if ($candidateDate === null)
            return null;

        return [
            'date' => $candidateDate->toDateString(),
            'title' => 'Next immunization',
            'patient_id' => $patient->id,
            'patient_name' => $patient->full_name,
            'barangay' => $patient->barangay,
            'meta' => [
                'program' => 'immunization',
                'kind' => 'next_due',
                'vaccine' => $candidateVaccine,
                'dose_label' => $candidateDoseLabel,
            ],
        ];
    }

    /* ──────────────────────────────────────────────────────────────────────
     |  Schedule rebuild (per-patient + center)
     |  ────────────────────────────────────────────────────────────────────── */

    public function rebuildScheduleForPatient(PatientsModel $patient): void
    {
        if ($patient->patient_type === 'immunization') {
            $schedule = $this->computeNextImmunizationSchedule($patient);
            $source = 'immunization_schedule';

            if ($schedule === null) {
                Appointment::where('patient_id', $patient->id)
                    ->where('source_type', $source)
                    ->delete();
            } else {
                Appointment::updateOrCreate(
                    [
                        'patient_id' => $patient->id,
                        'source_type' => $source,
                        'source_id' => (int) $patient->id,
                    ],
                    [
                        'date' => $schedule['date'],
                        'title' => $schedule['title'],
                        'notes' => $this->encodeAppointmentMeta($schedule['meta'] ?? []),
                    ]
                );
            }
        }

        if ($patient->patient_type === 'pregnancy') {
            $today = Carbon::today()->toDateString();

            $manualExists = Appointment::query()
                ->where('patient_id', $patient->id)
                ->where('source_type', 'prenatal_next_visit')
                ->where('source_id', '!=', (int) $patient->id)
                ->whereDate('date', '>=', $today)
                ->exists();

            if ($manualExists) {
                Appointment::where('patient_id', $patient->id)
                    ->where('source_type', 'prenatal_next_visit')
                    ->where('source_id', (int) $patient->id)
                    ->delete();
                return;
            }

            $auto = $this->computeNextPrenatalAuto($patient);

            if ($auto === null) {
                Appointment::where('patient_id', $patient->id)
                    ->where('source_type', 'prenatal_next_visit')
                    ->where('source_id', (int) $patient->id)
                    ->delete();
            } else {
                Appointment::updateOrCreate(
                    [
                        'patient_id' => $patient->id,
                        'source_type' => 'prenatal_next_visit',
                        'source_id' => (int) $patient->id,
                    ],
                    [
                        'date' => $auto['date'],
                        'title' => $auto['title'] ?? 'Next Prenatal Visit',
                        'notes' => $this->encodeAppointmentMeta($auto['meta'] ?? []),
                    ]
                );
            }

            Appointment::where('patient_id', $patient->id)
                ->where('source_type', 'pregnancy_schedule')
                ->delete();
        }
    }

    public function rebuildCenterSchedule(): void
    {
        $patients = PatientsModel::query()
            ->select(['id', 'full_name', 'first_name', 'middle_name', 'last_name', 'suffix', 'barangay', 'birthdate', 'patient_type', 'status', 'prenatal_hbm_current'])
            ->get();

        foreach ($patients as $patient) {
            $this->rebuildScheduleForPatient($patient);
        }
    }

    public function rescheduleAppointment(Request $request, Appointment $appointment)
    {
        $data = $request->validate([
            'date' => ['required', 'date', 'after_or_equal:today'],
        ]);

        $appointment->date = Carbon::parse($data['date'])->toDateString();
        $appointment->save();

        Activity::record('appointment.rescheduled', [
            'patient_id' => $appointment->patient_id,
            'description' => 'Rescheduled appointment: ' . $appointment->title . ' to ' . $appointment->date,
            'properties' => [
                'appointment_id' => $appointment->id,
                'date' => $appointment->date,
                'title' => $appointment->title,
            ],
        ]);

        return back()->with('status', 'Appointment rescheduled.');
    }

    /* ──────────────────────────────────────────────────────────────────────
     |  Center schedule feed (backend)
     |  ────────────────────────────────────────────────────────────────────── */

    public function getCenterScheduleForUser(Request $request)
    {
        /** @var User|null $user */
        $user = $request->user();

        $appointmentsQuery = Appointment::query()
            ->join('patients as p', 'appointments.patient_id', '=', 'p.id')
            ->whereIn('appointments.source_type', [
                'immunization_schedule',
                'prenatal_next_visit',
            ])
            // ✅ keep showing schedules unless deceased
            ->where(function ($q) {
                $q->whereNull('p.status')
                    ->orWhere('p.status', '!=', 'deceased');
            })
            ->select([
                'appointments.id',
                'appointments.date',
                'appointments.title',
                'appointments.notes',
                'appointments.source_type',
                'appointments.source_id',
                'p.id as patient_id',
                'p.full_name as patient_name',
                'p.barangay',
            ]);

        if ($user && $user->role !== 'admin') {
            if (!empty($user->barangay)) {
                $appointmentsQuery->where('p.barangay', $user->barangay);
            }
        }

        $rows = $appointmentsQuery->orderBy('appointments.date')->get();

        if ($rows->isEmpty()) {
            return $this->buildMissedImmunizationAppointments($user)->values();
        }

        $patientIds = $rows->pluck('patient_id')->unique()->values();

        $doneAppointments = Appointment::query()
            ->whereIn('patient_id', $patientIds)
            ->whereIn('source_type', ['record', 'immunization_dose', 'prenatal_current_visit'])
            ->orderBy('date')
            ->get()
            ->groupBy('patient_id');

        $prenatalVisitsByPatient = PrenatalVisit::query()
            ->whereIn('patient_id', $patientIds)
            ->whereNotNull('visit_date')
            ->orderBy('visit_date')
            ->get(['patient_id', 'visit_date'])
            ->groupBy('patient_id');

        $today = Carbon::today()->toDateString();

        $appointments = $rows->map(function ($row) use ($doneAppointments, $prenatalVisitsByPatient, $today) {
            $meta = $this->decodeAppointmentMeta($row->notes);

            $program = $meta['program'] ?? (
                $row->source_type === 'immunization_schedule'
                ? 'immunization'
                : ($row->source_type === 'prenatal_next_visit' ? 'prenatal' : 'other')
            );

            $kind = $meta['kind'] ?? 'next_due';

            $display = $row->title;

            $status = 'upcoming';
            $givenDate = null;
            $hasRecord = false;

            $scheduleDate = (string) $row->date;

            if ($program === 'prenatal') {
                $visits = $prenatalVisitsByPatient->get($row->patient_id) ?? collect();
                $matchedVisit = $visits->first(fn($v) => (string) $v->visit_date >= $scheduleDate);

                if ($matchedVisit) {
                    $status = 'done';
                    $givenDate = (string) $matchedVisit->visit_date;
                    $hasRecord = true;
                }
            }

            if (!$hasRecord) {
                $doneForPatient = $doneAppointments->get($row->patient_id) ?? collect();
                $matchedDone = $doneForPatient->first(fn($appt) => (string) $appt->date >= $scheduleDate);

                if ($matchedDone) {
                    $status = 'done';
                    $givenDate = (string) $matchedDone->date;
                    $hasRecord = true;
                } else {
                    if ($scheduleDate === $today)
                        $status = 'today';
                    elseif ($scheduleDate < $today)
                        $status = 'missed';
                    else
                        $status = 'upcoming';
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
                'patient_id' => $row->patient_id,
                'patient_name' => $row->patient_name,
                'barangay' => $row->barangay,
                'status' => $status,
                'given_date' => $givenDate,
                'has_record' => $hasRecord,
                'can_reschedule' => true,
            ];
        });

        $missedFromMatrix = $this->buildMissedImmunizationAppointments($user);

        return $appointments
            ->concat($missedFromMatrix)
            ->sortBy('date')
            ->values();
    }

    private function buildMissedImmunizationAppointments(?User $user)
    {
        $matrix = $this->defaultMatrix();
        if (empty($matrix))
            return collect();

        $patientsQuery = PatientsModel::query()
            ->where('patient_type', 'immunization')
            ->whereNotNull('birthdate')
            // ✅ keep including left_without_notice and transferred; only exclude deceased
            ->where(function ($q) {
                $q->whereNull('status')
                    ->orWhere('status', '!=', 'deceased');
            })
            ->select(['id', 'full_name', 'first_name', 'middle_name', 'last_name', 'suffix', 'barangay', 'birthdate']);

        if ($user && $user->role !== 'admin' && !empty($user->barangay)) {
            $patientsQuery->where('barangay', $user->barangay);
        }

        $patients = $patientsQuery->get();
        if ($patients->isEmpty())
            return collect();

        $patientIds = $patients->pluck('id')->all();

        $doses = ImmunizationRecord::query()
            ->whereIn('patient_id', $patientIds)
            ->get(['patient_id', 'vaccine', 'dose_label', 'date_given']);

        $dosesByPatient = $doses->groupBy('patient_id');
        $today = Carbon::today()->toDateString();

        $synthetic = collect();
        $syntheticId = 1000000000;

        foreach ($patients as $patient) {
            $birth = Carbon::parse($patient->birthdate)->startOfDay();

            $givenDatesMap = [];
            foreach ($dosesByPatient->get($patient->id, collect()) as $dose) {
                if (!$dose->date_given)
                    continue;
                $key = Str::lower(trim($dose->vaccine)) . '|' . Str::lower(trim($dose->dose_label));
                $givenDatesMap[$key] = Carbon::parse($dose->date_given)->toDateString();
            }

            foreach ($matrix as $vaccine => $labels) {
                $series = $this->computeRollingSeriesSchedule($birth, $vaccine, $labels, $givenDatesMap);

                foreach ($series as $item) {
                    $dueYmd = $item['due']->toDateString();
                    $isGiven = (bool) $item['given'];

                    if ($isGiven)
                        continue;
                    if ($dueYmd >= $today)
                        continue;

                    $synthetic->push([
                        'id' => $syntheticId++,
                        'date' => $dueYmd,
                        'title' => 'Missed dose',
                        'display' => 'Missed dose: ' . $vaccine . ' — ' . $item['label'],
                        'program' => 'immunization',
                        'kind' => 'missed_due',
                        'meta' => [
                            'program' => 'immunization',
                            'kind' => 'missed_due',
                            'vaccine' => $vaccine,
                            'dose_label' => $item['label'],
                        ],
                        'source_type' => 'synthetic_missed',
                        'patient_id' => $patient->id,
                        'patient_name' => $patient->full_name,
                        'barangay' => $patient->barangay,
                        'status' => 'missed',
                        'given_date' => null,
                        'has_record' => false,
                        'can_reschedule' => false,
                    ]);
                }
            }
        }

        return $synthetic;
    }
}
