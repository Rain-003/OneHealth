<?php

use Inertia\Inertia;
use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;

use App\Http\Controllers\Auth\PatientsController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\RegisteredUserController;

use App\Http\Controllers\PatientRecordsController;
use App\Http\Controllers\ManagePatientsController;
use App\Http\Controllers\ImmunizationController;
use App\Http\Controllers\PrenatalController;
use App\Http\Controllers\AccountsController;

use App\Http\Controllers\Prenatal\ItrController;
use App\Http\Controllers\Prenatal\HbmHistoryController;
use App\Http\Controllers\Prenatal\HbmCurrentController;
use App\Http\Controllers\Prenatal\HbmAfterController;
use App\Http\Controllers\Prenatal\PregnancyController;

use App\Http\Controllers\PatientPortalController;
use App\Http\Controllers\Tools\BackfillController;

use App\Http\Controllers\ActivityController;
use App\Http\Controllers\AdminActivityExportController;
use App\Models\Activity;
use App\Models\User;
use App\Models\Archive;
use App\Models\PatientOwnershipRequest;

use App\Http\Controllers\AnnouncementController;
use App\Http\Controllers\ArchiveController;
use App\Http\Controllers\ReportsController;

use App\Models\Appointment;
use Carbon\Carbon;

use App\Http\Controllers\PatientOwnershipRequestController;

// 🆕 PhilSMS test controller
use App\Http\Controllers\SmsTestController;

/*
|--------------------------------------------------------------------------
| Landing page
|--------------------------------------------------------------------------
*/
Route::get('/', function () {
    if (auth('patient')->check()) {
        return redirect()->route('patient.dashboard');
    }
    if (auth()->check()) {
        return redirect()->route('dashboard');
    }
    return Inertia::render('home');
})->name('home');

/*
|--------------------------------------------------------------------------
| Patient (public site)
|--------------------------------------------------------------------------
*/
Route::prefix('patient')->name('patient.')->group(function () {
    Route::middleware('guest:patient')->group(function () {
        Route::get('/login', [PatientsController::class, 'create'])->name('login');
        Route::post('/login', [PatientsController::class, 'store'])->name('login.store');

        Route::get('/access-with-info', fn() => Inertia::render('patients/access-with-info'))
            ->name('access.info');

        Route::post('/access-with-info', [PatientsController::class, 'loginWithInfo'])
            ->name('access.info.post');

        Route::post('/access-with-info/resend', [PatientsController::class, 'resendOtp'])
            ->name('access.info.resend');
    });

    Route::middleware('auth:patient')->group(function () {
        Route::get('/dashboard', [PatientPortalController::class, 'dashboard'])->name('dashboard');
        Route::get('/schedule', [PatientPortalController::class, 'schedule'])->name('schedule');

        Route::get('/inbox', fn() => Inertia::render('404handlerpage'))->name('inbox');

        Route::get('/immunization-card', [ImmunizationController::class, 'card'])->name('immunization.card');
        Route::get('/prenatal-card', [PrenatalController::class, 'card'])->name('prenatal.card');

        Route::get('/records', function () {
            $p = auth('patient')->user();
            $type = strtolower((string) ($p->patient_type ?? ''));
            $isPrenatal = in_array($type, ['pregnancy', 'prenatal', 'pregnant'], true);

            return $isPrenatal
                ? redirect()->route('patient.prenatal.card')
                : redirect()->route('patient.immunization.card');
        })->name('records');

        Route::match(['get', 'post'], '/tools/backfill-appointments', [BackfillController::class, 'appointmentsMine'])
            ->name('tools.backfill');

        Route::post('/logout', [PatientsController::class, 'destroy'])->name('logout');
    });
});

/*
|--------------------------------------------------------------------------
| Worker/Admin authentication (guests)
|--------------------------------------------------------------------------
*/
Route::middleware('guest')->group(function () {
    Route::get('/register', [RegisteredUserController::class, 'create'])->name('register');
    Route::post('/register', [RegisteredUserController::class, 'store']);

    Route::get('/login', [AuthenticatedSessionController::class, 'create'])->name('login');
    Route::post('/login', [AuthenticatedSessionController::class, 'store']);
});

Route::post('/logout', [AuthenticatedSessionController::class, 'destroy'])
    ->middleware('auth')
    ->name('logout');

/*
|--------------------------------------------------------------------------
| Workers area (auth required)
|--------------------------------------------------------------------------
*/
Route::middleware('auth')->group(function () {
    Route::get('/center/dashboard', function (Request $request) {
        /** @var \App\Models\User|null $user */
        $user = $request->user();

        $items = Activity::query()
            ->where(function ($q) use ($user) {
                if (!$user || $user->role !== 'admin') {
                    $q->where('user_id', $user->id);
                }
            })
            ->latest('id')
            ->with(['patient:id,full_name,barangay', 'user:id,name,barangay'])
            ->limit(15)
            ->get()
            ->map(function ($a) {
                $props = is_array($a->properties) ? $a->properties : [];

                return [
                    'id' => $a->id,
                    'type' => $a->type,
                    'description' => $a->description,
                    'patient' => $a->patient?->full_name,
                    'by' => $a->user?->name,
                    'barangay' => $a->patient?->barangay ?? $a->user?->barangay,
                    'when' => optional($a->created_at)->diffForHumans(),
                    'at' => optional($a->created_at)->toIso8601String(),
                    'details' => $props['rows_pretty'] ?? ($props['summary'] ?? null),
                ];
            });

        $announcements = \App\Models\Announcement::query()
            ->where('is_active', true)
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

        $centerSchedule = app(PatientRecordsController::class)
            ->getCenterScheduleForUser($request);

        $ownershipRequests = collect();
        if ($user && $user->role !== 'admin') {
            $ownershipRequests = PatientOwnershipRequest::query()
                ->where('status', 'pending')
                ->where('current_owner_id', $user->id)
                ->with([
                    'patient:id,full_name,barangay,owner_id',
                    'requester:id,name,barangay',
                ])
                ->latest('id')
                ->limit(20)
                ->get()
                ->map(function ($r) {
                    return [
                        'id' => $r->id,
                        'patient' => [
                            'id' => $r->patient_id,
                            'full_name' => $r->patient?->full_name,
                            'barangay' => $r->patient?->barangay,
                        ],
                        'requester' => [
                            'id' => $r->requested_by,
                            'name' => $r->requester?->name,
                            'barangay' => $r->requester?->barangay,
                        ],
                        'message' => $r->message,
                        'when' => optional($r->created_at)->diffForHumans(),
                        'at' => optional($r->created_at)->toIso8601String(),
                    ];
                });
        }

        return Inertia::render('center/dashboard', [
            'auth' => ['user' => $user],
            'activities' => $items,
            'announcements' => $announcements,
            'appointments' => $centerSchedule,
            'ownershipRequests' => $ownershipRequests,
            'ownershipRequestsCount' => $ownershipRequests->count(),
        ]);
    })->name('center.dashboard');

    Route::put(
        '/center/appointments/{appointment}',
        [PatientRecordsController::class, 'rescheduleAppointment']
    )
        ->whereNumber('appointment')
        ->name('center.appointments.reschedule');

    Route::redirect('/dashboard', '/center/dashboard')->name('dashboard');
    Route::redirect('/center', '/center/dashboard')->name('center.base');

    Route::get('/center/reports', [ReportsController::class, 'index'])
        ->name('center.reports.index');

    Route::get('/center/activity', [ActivityController::class, 'index'])
        ->name('center.activity.index');

    Route::get('/center/records', [PatientRecordsController::class, 'index'])->name('center.records');
    Route::get('/center/records/all', [PatientRecordsController::class, 'all'])->name('center.records.all');
    Route::get('/center/records/{patient}', [PatientRecordsController::class, 'show'])
        ->whereNumber('patient')
        ->name('center.records.show');

    Route::put('/center/records/{patient}', [PatientRecordsController::class, 'updatePatient'])
        ->whereNumber('patient')
        ->name('center.records.patient.update');

    Route::post('/center/records/{patient}', [PatientRecordsController::class, 'store'])
        ->whereNumber('patient')
        ->name('center.records.store');

    Route::put('/center/records/{patient}/{record}', [PatientRecordsController::class, 'update'])
        ->whereNumber('patient')
        ->whereNumber('record')
        ->name('center.records.update');

    Route::post('/center/records/{patient}/status', [PatientRecordsController::class, 'updateStatus'])
        ->whereNumber('patient')
        ->name('center.records.status');

    Route::post('/center/records/{patient}/transfer', [PatientRecordsController::class, 'transfer'])
        ->whereNumber('patient')
        ->name('center.records.transfer');

    Route::post('/center/patients/{patient}/ownership-requests', [PatientOwnershipRequestController::class, 'store'])
        ->whereNumber('patient')
        ->name('center.ownership.request');

    Route::post('/center/patients/{patient}/ownership-transfer', [PatientOwnershipRequestController::class, 'transfer'])
        ->whereNumber('patient')
        ->name('center.ownership.transfer');

    Route::put('/center/ownership-requests/{ownershipRequest}', [PatientOwnershipRequestController::class, 'approve'])
        ->whereNumber('ownershipRequest')
        ->name('center.ownership.approve');

    Route::put('/center/ownership-requests/{ownershipRequest}/reject', [PatientOwnershipRequestController::class, 'reject'])
        ->whereNumber('ownershipRequest')
        ->name('center.ownership.reject');

    Route::get('/center/patients/{patient}/immunization', [ImmunizationController::class, 'show'])
        ->whereNumber('patient')
        ->name('center.immunization.show');

    Route::post('/center/patients/{patient}/immunization', [PatientRecordsController::class, 'immunizationUpsert'])
        ->whereNumber('patient')
        ->name('center.immunization.upsert');

    Route::get('/center/patients/{patient}/prenatal', [PrenatalController::class, 'show'])
        ->whereNumber('patient')
        ->name('center.prenatal.show');

    Route::post('/center/patients/{patient}/prenatal/pregnancies', [PregnancyController::class, 'store'])
        ->whereNumber('patient')
        ->name('center.prenatal.pregnancies.store');

    Route::post('/center/patients/{patient}/prenatal/pregnancies/{pregnancy}/complete', [PregnancyController::class, 'complete'])
        ->whereNumber('patient')
        ->whereNumber('pregnancy')
        ->name('center.prenatal.pregnancies.complete');

    Route::post('/center/patients/{patient}/prenatal/pregnancies/{pregnancy}/reopen', [PregnancyController::class, 'reopen'])
        ->name('center.prenatal.pregnancies.reopen');

    Route::post('/center/patients/{patient}/prenatal/itr-details', [ItrController::class, 'save'])
        ->whereNumber('patient')
        ->name('center.prenatal.itr.details.save');

    Route::post('/center/patients/{patient}/prenatal/plan', [ItrController::class, 'savePlan'])
        ->whereNumber('patient')
        ->name('center.prenatal.plan.save');

    Route::post('/center/patients/{patient}/prenatal/visit', [ItrController::class, 'saveVisit'])
        ->whereNumber('patient')
        ->name('center.prenatal.visit.save');

    Route::delete('/center/patients/{patient}/prenatal/visit/{visit}', [ItrController::class, 'deleteVisit'])
        ->whereNumber('patient')
        ->whereNumber('visit')
        ->name('center.prenatal.visit.delete');

    Route::post('/center/patients/{patient}/prenatal/current-grid', [HbmCurrentController::class, 'save'])
        ->whereNumber('patient')
        ->name('center.prenatal.current.grid.save');

    Route::post('/center/patients/{patient}/prenatal/after-grid', [HbmAfterController::class, 'save'])
        ->whereNumber('patient')
        ->name('center.prenatal.after.grid.save');

    Route::post('/center/patients/{patient}/hbm/after', [HbmAfterController::class, 'save'])
        ->whereNumber('patient')
        ->name('center.patients.hbm.after.save');

    Route::post('/center/patients/{patient}/prenatal/hbm/after', [HbmAfterController::class, 'save'])
        ->whereNumber('patient')
        ->name('center.prenatal.hbm.after.save');

    Route::post('/center/patients/{patient}/prenatal/history', [HbmHistoryController::class, 'save'])
        ->whereNumber('patient')
        ->name('center.prenatal.history.save');

    Route::post('/center/patients/{patient}/prenatal/tt-vitA', [ItrController::class, 'saveTtVitA'])
        ->whereNumber('patient')
        ->name('center.prenatal.ttvita.save');

    Route::post('/center/patients/{patient}/hbm/history', [HbmHistoryController::class, 'save'])
        ->whereNumber('patient')
        ->name('center.patients.hbm.history');

    Route::post('/center/patients', [ManagePatientsController::class, 'store'])
        ->name('center.patients.store');

    Route::post('/patients', [ManagePatientsController::class, 'store'])
        ->name('patients.store');

    Route::get('/accounts', [AccountsController::class, 'index'])->name('accounts.index');
    Route::post('/accounts', [AccountsController::class, 'store'])->name('accounts.store');
    Route::put('/accounts/{user}', [AccountsController::class, 'update'])
        ->whereNumber('user')
        ->name('accounts.update');

    Route::delete('/accounts/{user}', [AccountsController::class, 'destroy'])
        ->whereNumber('user')
        ->name('accounts.destroy');

    Route::get('/admin/announcements', [AnnouncementController::class, 'index'])
        ->name('admin.announcements.index');

    Route::post('/admin/announcements', [AnnouncementController::class, 'store'])
        ->name('admin.announcements.store');

    Route::put('/admin/announcements/{announcement}', [AnnouncementController::class, 'update'])
        ->whereNumber('announcement')
        ->name('admin.announcements.update');

    Route::delete('/admin/announcements/{announcement}', [AnnouncementController::class, 'destroy'])
        ->whereNumber('announcement')
        ->name('admin.announcements.destroy');

    Route::get('/admin/activity/export', [AdminActivityExportController::class, 'export'])
        ->name('admin.activity.export');

    Route::post('/admin/archives/{archive}/restore', [ArchiveController::class, 'restore'])
        ->whereNumber('archive')
        ->name('admin.archives.restore');

    Route::delete('/admin/archives/{archive}', [ArchiveController::class, 'destroy'])
        ->whereNumber('archive')
        ->name('admin.archives.destroy');

    Route::match(['get', 'post'], '/center/tools/backfill-appointments', [BackfillController::class, 'appointmentsAll'])
        ->name('center.tools.backfill');

    Route::post('/sms/test', [SmsTestController::class, 'sendTest'])
        ->name('sms.test');
});

Route::get('/admin', function (Request $request) {
    $user = auth()->user();

    $activityQuery = Activity::query()
        ->with([
            'patient:id,full_name,barangay',
            'user:id,name,barangay',
        ])
        ->latest('id');

    if (!$user || $user->role !== 'admin') {
        $activityQuery->where('user_id', $user->id);
    }

    $items = $activityQuery
        ->limit(50)
        ->get()
        ->map(function ($a) {
            $props = is_array($a->properties) ? $a->properties : [];

            return [
                'id' => $a->id,
                'user_id' => $a->user_id,
                'patient_id' => $a->patient_id,
                'type' => $a->type,
                'description' => $a->description,
                'patient' => $a->patient?->full_name,
                'by' => $a->user?->name,
                'barangay' => $a->patient?->barangay ?? $a->user?->barangay,
                'when' => optional($a->created_at)->diffForHumans(),
                'at' => optional($a->created_at)->toIso8601String(),
                'details' => $props['rows_pretty'] ?? ($props['summary'] ?? null),
            ];
        });

    $q = $request->input('q');
    $role = $request->input('role');

    $usersQuery = User::query();

    if ($q) {
        $usersQuery->where(function ($sub) use ($q) {
            $sub->where('name', 'like', '%' . $q . '%')
                ->orWhere('email', 'like', '%' . $q . '%');
        });
    }

    if ($role) {
        $usersQuery->where('role', $role);
    }

    $users = $usersQuery
        ->orderBy('name')
        ->paginate(15)
        ->withQueryString();

    $announcementQ = $request->input('announcement_q');

    $announcementsQuery = \App\Models\Announcement::query();

    if ($announcementQ) {
        $announcementsQuery->where(function ($sub) use ($announcementQ) {
            $sub->where('title', 'like', '%' . $announcementQ . '%')
                ->orWhere('body', 'like', '%' . $announcementQ . '%');
        });
    }

    $announcements = $announcementsQuery
        ->orderByDesc('created_at')
        ->paginate(10, ['*'], 'announcement_page')
        ->withQueryString();

    $archiveQ = $request->input('archive_q');
    $archiveType = $request->input('archive_type');
    $archiveSort = $request->input('archive_sort', 'latest');

    $archivesQuery = Archive::query()
        ->onlyActive()
        ->with(['patient:id,full_name', 'user:id,name']);

    if ($archiveType) {
        $archivesQuery->where('item_type', $archiveType);
    }

    if ($archiveQ) {
        $archivesQuery->where(function ($sub) use ($archiveQ) {
            $sub->where('item_label', 'like', '%' . $archiveQ . '%')
                ->orWhere('reason', 'like', '%' . $archiveQ . '%')
                ->orWhereHas('patient', function ($patientQuery) use ($archiveQ) {
                    $patientQuery->where('full_name', 'like', '%' . $archiveQ . '%');
                })
                ->orWhereHas('user', function ($userQuery) use ($archiveQ) {
                    $userQuery->where('name', 'like', '%' . $archiveQ . '%');
                });
        });
    }

    if ($archiveSort === 'oldest') {
        $archivesQuery->orderBy('archived_at');
    } elseif ($archiveSort === 'label_asc') {
        $archivesQuery->orderBy('item_label');
    } elseif ($archiveSort === 'label_desc') {
        $archivesQuery->orderByDesc('item_label');
    } else {
        $archivesQuery->orderByDesc('archived_at');
    }

    $archives = $archivesQuery
        ->get()
        ->map(function ($archive) {
            return [
                'id' => $archive->id,
                'item_type' => $archive->item_type,
                'item_id' => $archive->item_id,
                'item_label' => $archive->item_label,
                'reason' => $archive->reason,
                'archived_at' => $archive->archived_at,
                'restored_at' => $archive->restored_at,
                'created_at' => $archive->created_at,
                'deleted_at' => $archive->archived_at,
                'patient_name' => $archive->patient?->full_name,
                'deleted_by' => $archive->user?->name,
                'patient' => $archive->patient ? [
                    'id' => $archive->patient->id,
                    'full_name' => $archive->patient->full_name,
                ] : null,
                'user' => $archive->user ? [
                    'id' => $archive->user->id,
                    'name' => $archive->user->name,
                ] : null,
            ];
        });

    return Inertia::render('admin/index', [
        'auth' => ['user' => $user],
        'activities' => $items,
        'users' => $users,
        'filters' => ['q' => $q, 'role' => $role],
        'flash' => [
            'success' => session('success'),
            'error' => session('error'),
        ],
        'can' => [
            'manageUsers' => $user?->role === 'admin',
        ],
        'announcements' => $announcements,
        'announcementFilters' => [
            'q' => $announcementQ,
        ],
        'archives' => $archives,
        'archiveFilters' => [
            'q' => $archiveQ,
            'type' => $archiveType,
            'sort' => $archiveSort,
        ],
        'tab' => $request->input('tab', 'accounts'),
    ]);
})->middleware('auth')->name('admin.index');

Route::get('/about', function () {
    return Inertia::render('about');
})->name('about');
