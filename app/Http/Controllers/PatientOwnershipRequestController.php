<?php

namespace App\Http\Controllers;

use App\Models\PatientsModel;
use App\Models\PatientOwnershipRequest;
use App\Models\Activity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Models\User;

class PatientOwnershipRequestController extends Controller
{
    private function isAdmin(?User $u): bool
    {
        return (is_string($u?->role) && strcasecmp($u->role, 'admin') === 0);
    }

    private function ensureCanRequestOwnership(Request $request, PatientsModel $patient): void
    {
        $u = $request->user();
        if (!$u) abort(401);

        if ($this->isAdmin($u)) {
            abort(403, 'Admin does not need ownership requests.');
        }

        if ($patient->owner_id && (int) $patient->owner_id === (int) $u->id) {
            abort(403, 'You already own this patient.');
        }
    }

    private function backSuccess(string $message)
    {
        session()->forget('error');
        return back()->with('status', $message)->with('flash_id', (string) Str::uuid());
    }

    private function backError(string $message)
    {
        session()->forget('status');
        return back()->with('error', $message)->with('flash_id', (string) Str::uuid());
    }

    /**
     * POST /center/patients/{patient}/ownership-requests
     */
    public function store(Request $request, PatientsModel $patient)
    {
        $this->ensureCanRequestOwnership($request, $patient);

        $u = $request->user();

        $data = $request->validate([
            'message' => ['nullable', 'string', 'max:500'],
        ]);

        $patientName = $patient->full_name ?: ('Patient #' . $patient->id);

        // If unassigned, claim immediately
        if (!$patient->owner_id) {
            $patient->owner_id = $u->id;
            $patient->save();

            Activity::record('ownership.claimed', [
                'patient_id'  => $patient->id,
                'description' => "Claimed ownership of {$patientName} (unassigned).",
                'properties'  => [
                    'new_owner_id' => $u->id,
                ],
            ]);

            return $this->backSuccess('You are now the assigned health worker for this patient.');
        }

        // Prevent duplicate pending request
        $exists = PatientOwnershipRequest::query()
            ->where('patient_id', $patient->id)
            ->where('requested_by', $u->id)
            ->where('status', 'pending')
            ->exists();

        if ($exists) {
            return $this->backError('You already have a pending assignment request for this patient.');
        }

        $req = PatientOwnershipRequest::create([
            'patient_id'       => $patient->id,
            'requested_by'     => $u->id,
            'current_owner_id' => $patient->owner_id,
            'status'           => 'pending',
            'message'          => $data['message'] ?? null,
        ]);

        Activity::record('ownership.requested', [
            'patient_id'  => $patient->id,
            'description' => "Requested assignment for {$patientName}.",
            'properties'  => [
                'request_id'       => $req->id,
                'current_owner_id' => $patient->owner_id,
            ],
        ]);

        Activity::record('ownership.request_received', [
            'user_id'     => $patient->owner_id,
            'patient_id'  => $patient->id,
            'description' => "Assignment request received for {$patientName}.",
            'properties'  => [
                'request_id'   => $req->id,
                'requested_by' => $u->id,
            ],
        ]);

        return $this->backSuccess('Assignment request sent to the current health worker.');
    }

    /**
     * PUT /center/ownership-requests/{request}/approve
     */
    public function approve(Request $request, PatientOwnershipRequest $ownershipRequest)
    {
        $u = $request->user();
        if (!$u) return $this->backError('Please login again.');

        $patient = PatientsModel::find($ownershipRequest->patient_id);
        if (!$patient) return $this->backError('Patient record not found.');

        $isAdmin = $this->isAdmin($u);
        if (!$isAdmin && (int) $ownershipRequest->current_owner_id !== (int) $u->id) {
            return back()
                ->with('error', 'You are not allowed to approve this request (only the current assigned health worker can).')
                ->with('status', null)
                ->with('flash_id', (string) Str::uuid());
        }

        if ($ownershipRequest->status !== 'pending') {
            return $this->backError('This request is no longer pending.');
        }

        // If the patient ownership already changed, treat this request as stale.
        if ((int) $patient->owner_id !== (int) $ownershipRequest->current_owner_id) {
            $ownershipRequest->status = 'rejected';
            $ownershipRequest->responded_by = $u->id;
            $ownershipRequest->responded_at = now();
            $ownershipRequest->save();

            return back()
                ->with('error', 'This request is stale (the patient is no longer assigned to you).')
                ->with('status', null)
                ->with('flash_id', (string) Str::uuid());
        }

        $patientName = $patient->full_name ?: ('Patient #' . $patient->id);

        DB::transaction(function () use ($u, $ownershipRequest, $patientName) {
            $patient = PatientsModel::lockForUpdate()->findOrFail($ownershipRequest->patient_id);

            $oldOwner = (int) ($patient->owner_id ?? 0);
            $newOwner = (int) $ownershipRequest->requested_by;

            $patient->owner_id = $newOwner;
            $patient->save();

            $ownershipRequest->status = 'approved';
            $ownershipRequest->current_owner_id = $oldOwner;
            $ownershipRequest->responded_by = $u->id;
            $ownershipRequest->responded_at = now();
            $ownershipRequest->save();

            Activity::record('ownership.approved', [
                'user_id'     => $u->id,
                'patient_id'  => $patient->id,
                'description' => "Approved assignment request for {$patientName}.",
                'properties'  => [
                    'request_id'   => $ownershipRequest->id,
                    'old_owner_id' => $oldOwner,
                    'new_owner_id' => $newOwner,
                ],
            ]);

            Activity::record('ownership.assigned_to_you', [
                'user_id'     => $newOwner,
                'patient_id'  => $patient->id,
                'description' => "{$patientName} was assigned to you by {$u->name}.",
                'properties'  => [
                    'request_id'   => $ownershipRequest->id,
                    'old_owner_id' => $oldOwner,
                    'new_owner_id' => $newOwner,
                    'assigned_by'  => $u->id,
                ],
            ]);
        });

        return $this->backSuccess("Assignment approved for {$patientName}.");
    }

    /**
     * PUT /center/ownership-requests/{request}/reject
     */
    public function reject(Request $request, PatientOwnershipRequest $ownershipRequest)
    {
        $u = $request->user();
        if (!$u) return $this->backError('Please login again.');

        $patient = PatientsModel::find($ownershipRequest->patient_id);
        if (!$patient) return $this->backError('Patient record not found.');

        $isAdmin = $this->isAdmin($u);
        if (!$isAdmin && (int) $ownershipRequest->current_owner_id !== (int) $u->id) {
            return back()
                ->with('error', 'You are not allowed to reject this request (only the current assigned health worker can).')
                ->with('status', null)
                ->with('flash_id', (string) Str::uuid());
        }

        if ($ownershipRequest->status !== 'pending') {
            return $this->backError('This request is no longer pending.');
        }

        if ((int) $patient->owner_id !== (int) $ownershipRequest->current_owner_id) {
            $ownershipRequest->status = 'rejected';
            $ownershipRequest->responded_by = $u->id;
            $ownershipRequest->responded_at = now();
            $ownershipRequest->save();

            return back()
                ->with('error', 'This request is stale (the patient is no longer assigned to you).')
                ->with('status', null)
                ->with('flash_id', (string) Str::uuid());
        }

        $patientName = $patient->full_name ?: ('Patient #' . $patient->id);

        $ownershipRequest->status = 'rejected';
        $ownershipRequest->responded_by = $u->id;
        $ownershipRequest->responded_at = now();
        $ownershipRequest->save();

        Activity::record('ownership.rejected', [
            'user_id'     => $u->id,
            'patient_id'  => $ownershipRequest->patient_id,
            'description' => "Rejected assignment request for {$patientName}.",
            'properties'  => ['request_id' => $ownershipRequest->id],
        ]);

        Activity::record('ownership.request_rejected', [
            'user_id'     => $ownershipRequest->requested_by,
            'patient_id'  => $ownershipRequest->patient_id,
            'description' => "Your assignment request for {$patientName} was rejected by {$u->name}.",
            'properties'  => ['request_id' => $ownershipRequest->id, 'rejected_by' => $u->id],
        ]);

        return $this->backSuccess("Assignment rejected for {$patientName}.");
    }

    /**
     * Direct ownership transfer (owner/admin only).
     * POST /center/patients/{patient}/ownership-transfer
     *
     * ✅ Updated:
     * - Works for ALL patient types, including pregnancy.
     * - Optionally syncs patient.barangay to the target HW barangay (if set),
     *   and records 'patient.transferred' so your Barangay History modal works
     *   even when the transfer happened via “Assign health worker”.
     */
    public function transfer(Request $request, PatientsModel $patient)
    {
        $user = $request->user();
        if (!$user) return $this->backError('Please login again.');

        $isAdmin = $this->isAdmin($user);
        if (!$isAdmin && (int) $patient->owner_id !== (int) $user->id) {
            return $this->backError('You are not allowed to assign this patient.');
        }

        $data = $request->validate([
            'new_owner_id' => ['required', 'integer', 'exists:users,id'],
            // If you ever want to disable barangay syncing from UI later:
            // 'sync_barangay' => ['nullable','boolean'],
        ]);

        $newOwner = User::query()->findOrFail((int) $data['new_owner_id']);

        if (!$isAdmin && is_string($newOwner->role) && strcasecmp($newOwner->role, 'admin') === 0) {
            return $this->backError('Invalid assignment target.');
        }

        $patientName   = $patient->full_name ?: ('Patient #' . $patient->id);
        $oldOwnerId    = (int) ($patient->owner_id ?? 0);
        $oldBarangay   = $patient->barangay;
        $targetBarangay = $newOwner->barangay ?: null;

        DB::transaction(function () use (
            $patient,
            $newOwner,
            $oldOwnerId,
            $patientName,
            $user,
            $oldBarangay,
            $targetBarangay
        ) {
            // lock patient row (avoid race)
            $p = PatientsModel::lockForUpdate()->findOrFail($patient->id);

            $p->owner_id = $newOwner->id;

            // ✅ Barangay sync so pregnancy pages filtered by barangay still match the new HW.
            // Only change if target HW has a barangay configured.
            if (!empty($targetBarangay)) {
                $p->assigned_barangay = $targetBarangay;

                // Optional: mark as transferred (matches your existing semantics)
                // If you don't want ownership transfer to change status, comment this line.
                $p->status = 'transferred';
            }

            $p->save();

            // Actor log (who assigned)
            Activity::record('ownership.assigned', [
                'user_id'     => $user->id,
                'patient_id'  => $p->id,
                'description' => "Assigned {$patientName} to {$newOwner->name}.",
                'properties'  => [
                    'from_owner_id' => $oldOwnerId,
                    'to_owner_id'   => $newOwner->id,
                    'from_barangay' => $oldBarangay,
                    'to_barangay'   => $p->barangay,
                    'patient_type'  => $p->patient_type,
                ],
            ]);

            // Recipient notification log
            Activity::record('ownership.assigned_to_you', [
                'user_id'     => $newOwner->id,
                'patient_id'  => $p->id,
                'description' => "{$patientName} was assigned to you by {$user->name}.",
                'properties'  => [
                    'from_owner_id' => $oldOwnerId,
                    'to_owner_id'   => $newOwner->id,
                    'from_barangay' => $oldBarangay,
                    'to_barangay'   => $p->barangay,
                    'assigned_by'   => $user->id,
                    'patient_type'  => $p->patient_type,
                ],
            ]);

            // ✅ This powers your Barangay History modal even if transfer happened via ownership transfer.
            // Only record if barangay actually changed.
            if (!empty($targetBarangay) && strcasecmp((string) $oldBarangay, (string) $p->barangay) !== 0) {
                Activity::record('patient.transferred', [
                    'patient_id'  => $p->id,
                    'description' => 'Transferred patient to barangay ' . (string) $p->barangay,
                    'properties'  => [
                        'from_barangay' => $oldBarangay,
                        'to_barangay'   => $p->barangay,
                        'from_status'   => $patient->status ?? 'active',
                        'to_status'     => $p->status ?? 'transferred',
                        'via'           => 'ownership-transfer',
                        'from_owner_id' => $oldOwnerId,
                        'to_owner_id'   => $newOwner->id,
                    ],
                ]);
            }
        });

        return $this->backSuccess('Health worker assigned.');
    }
}