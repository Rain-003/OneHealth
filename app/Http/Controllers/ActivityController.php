<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Activity;
use App\Models\PatientsModel;
use App\Models\User;
use Carbon\Carbon;

class ActivityController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        // 'me' | 'team' (non-admins are ALWAYS forced to 'me')
        $whoParam = $request->string('who')->toString();
        $type = $request->string('type')->toString(); // exact type key
        $pid = $request->integer('patient_id');       // optional patient filter
        $uid = $request->integer('user_id');          // admin-only account filter

        // Admin can see everyone; non-admins can only see themselves
        $isAdmin = $user && $user->role === 'admin';

        // Enforce security: only admins can use "team".
        $who = $isAdmin
            ? ($whoParam ?: 'team')
            : 'me';

        $query = Activity::query()
            ->with(['patient:id,full_name', 'user:id,name'])

            // Non-admin: always scoped to self
            ->when(!$isAdmin, fn ($q) => $q->where('user_id', $user->id))

            // Admin filters
            ->when($isAdmin && $uid, fn ($q) => $q->where('user_id', $uid))
            ->when($isAdmin && !$uid && $who !== 'team', fn ($q) => $q->where('user_id', $user->id))

            ->when($type !== '', fn ($q) => $q->where('type', $type))
            ->when($pid, fn ($q) => $q->where('patient_id', $pid))
            ->latest('id');

        // Transform for the TSX page (keep paginator shape)
        $activities = $query->paginate(20)->withQueryString()->through(function ($a) {
            $props = is_array($a->properties) ? $a->properties : [];

            return [
                'id' => $a->id,
                'type' => $a->type,
                'description' => $a->description,
                'patient' => $a->patient?->full_name,
                'by' => $a->user?->name,
                'when' => optional($a->created_at)->diffForHumans(),
                'at' => optional($a->created_at)->toIso8601String(),
                'ip_address' => $a->ip_address,
                'user_agent' => $a->user_agent,
                'details' => $props['rows_pretty'] ?? ($props['summary'] ?? null),
            ];
        });

        // Build dropdown data
        $types = Activity::query()
            ->selectRaw('type, COUNT(*) as c')

            // Same security rules for the type counts
            ->when(!$isAdmin, fn ($q) => $q->where('user_id', $user->id))
            ->when($isAdmin && $uid, fn ($q) => $q->where('user_id', $uid))
            ->when($isAdmin && !$uid && $who !== 'team', fn ($q) => $q->where('user_id', $user->id))

            ->groupBy('type')
            ->orderBy('type')
            ->get();

        $patients = PatientsModel::orderBy('full_name')
            ->limit(200)
            ->get(['id', 'full_name']);

        $users = $isAdmin
            ? User::query()->orderBy('name')->limit(500)->get(['id', 'name', 'email', 'role'])
            : collect();

        $activeTab = $request->input('tab');

        return Inertia::render('center/activity/index', [
            'activities' => $activities,
            'filters' => [
                // default filter: admin behaves like "team"
                'who' => $who ?: ($isAdmin ? 'team' : 'me'),
                'type' => $type,
                'patient_id' => $pid ?: '',
                'user_id' => $isAdmin ? ($uid ?: '') : '',
            ],
            'typeCounts' => $types,
            'patients' => $patients,
            'users' => $users,
            'flash' => [
                'success' => $activeTab === 'activity' ? session('success') : null,
                'error' => $activeTab === 'activity' ? session('error') : null,
            ],
        ]);
    }

    /**
     * Admin-only CSV export (date range).
     */
    public function export(Request $request)
    {
        $user = $request->user();

        if (!$user || $user->role !== 'admin') {
            abort(403);
        }

        $fromInput = $request->input('from');
        $toInput = $request->input('to');

        // Default: last 7 days (inclusive)
        $to = $toInput ? Carbon::parse($toInput)->endOfDay() : now()->endOfDay();
        $from = $fromInput ? Carbon::parse($fromInput)->startOfDay() : now()->subDays(6)->startOfDay();

        // If user accidentally swaps dates
        if ($from->gt($to)) {
            [$from, $to] = [$to, $from];
        }

        // Safety: avoid huge exports
        if ($from->diffInDays($to) > 90) {
            return redirect()
                ->route('center.activity.index', array_filter([
                    'tab' => 'activity',
                    'who' => $request->input('who'),
                    'type' => $request->input('type'),
                    'patient_id' => $request->input('patient_id'),
                    'user_id' => $request->input('user_id'),
                ]))
                ->with('error', 'Export range is limited to 90 days. Please choose a smaller date range.');
        }

        $who = (string) $request->input('who', 'team'); // 'me' | 'team'
        $type = (string) $request->input('type', '');
        $pid = $request->input('patient_id');
        $uid = $request->input('user_id');

        $query = Activity::query()
            ->with(['patient:id,full_name', 'user:id,name,email,role'])
            ->whereBetween('created_at', [$from, $to])
            ->when($uid, fn ($q) => $q->where('user_id', $uid))
            ->when(!$uid && $who !== 'team', fn ($q) => $q->where('user_id', $user->id))
            ->when($type !== '', fn ($q) => $q->where('type', $type))
            ->when($pid, fn ($q) => $q->where('patient_id', $pid))
            ->orderByDesc('id');

        // Audit the export itself
        Activity::record('activity.export', [
            'user_id' => $user->id,
            'description' => 'Exported activity logs',
            'properties' => [
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
                'filters' => [
                    'who' => $who,
                    'user_id' => $uid,
                    'type' => $type,
                    'patient_id' => $pid,
                ],
            ],
        ]);

        $filename = 'activity_logs_' . $from->toDateString() . '_to_' . $to->toDateString() . '.csv';

        return response()->streamDownload(function () use ($query) {
            $out = fopen('php://output', 'w');

            // UTF-8 BOM for Excel
            fprintf($out, chr(0xEF) . chr(0xBB) . chr(0xBF));

            fputcsv($out, [
                'Timestamp',
                'Account',
                'Email',
                'Role',
                'Type',
                'Description',
                'Patient',
                'IP Address',
                'User Agent',
            ]);

            $query->chunk(1000, function ($rows) use ($out) {
                foreach ($rows as $a) {
                    fputcsv($out, [
                        optional($a->created_at)->toDateTimeString(),
                        $a->user?->name,
                        $a->user?->email,
                        $a->user?->role,
                        $a->type,
                        $a->description,
                        $a->patient?->full_name,
                        $a->ip_address,
                        $a->user_agent,
                    ]);
                }
            });

            fclose($out);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }
}