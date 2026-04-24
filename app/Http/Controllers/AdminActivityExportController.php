<?php

namespace App\Http\Controllers;

use App\Models\Activity;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminActivityExportController extends Controller
{
    /**
     * Download activity logs as CSV (Admin only).
     */
    public function export(Request $request): StreamedResponse
    {
        $user = $request->user();
        if (!$user || $user->role !== 'admin') {
            abort(403);
        }

        $fromStr = trim((string) $request->query('from', ''));
        $toStr   = trim((string) $request->query('to', ''));

        // Default to last 7 days if either date is missing.
        if ($fromStr === '' || $toStr === '') {
            $to = Carbon::now();
            $from = (clone $to)->subDays(6);
        } else {
            try {
                $from = Carbon::createFromFormat('Y-m-d', $fromStr);
                $to   = Carbon::createFromFormat('Y-m-d', $toStr);
            } catch (\Throwable $e) {
                abort(422, 'Invalid date range. Use YYYY-MM-DD.');
            }
        }

        $from = $from->startOfDay();
        $to   = $to->endOfDay();

        // Hard cap range to keep exports fast + safe.
        $maxDays = 90;
        if ($from->diffInDays($to) > $maxDays) {
            abort(422, "Date range too large. Please export {$maxDays} days or less.");
        }

        $type     = trim((string) $request->query('type', ''));
        $staff    = trim((string) $request->query('staff', ''));
        $barangay = trim((string) $request->query('barangay', ''));
        $q        = trim((string) $request->query('q', ''));
        $sort     = (string) $request->query('sort', 'newest');
        $sort     = in_array($sort, ['newest', 'oldest'], true) ? $sort : 'newest';

        // Audit the export action itself.
        Activity::record('activity.export', [
            'description' => 'Exported activity logs',
            'properties' => [
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
                'type' => $type ?: null,
                'staff' => $staff ?: null,
                'barangay' => $barangay ?: null,
                'q' => $q ?: null,
                'sort' => $sort,
            ],
        ]);

        $query = Activity::query()
            ->with([
                'patient:id,full_name,barangay',
                'user:id,name,barangay',
            ])
            ->whereBetween('created_at', [$from, $to]);

        if ($type !== '') {
            $query->where('type', $type);
        }

        if ($staff !== '') {
            $query->whereHas('user', function ($u) use ($staff) {
                $u->where('name', $staff);
            });
        }

        if ($barangay !== '') {
            $needle = strtoupper($barangay);
            $query->where(function ($sub) use ($needle) {
                $sub
                    ->whereHas('patient', function ($p) use ($needle) {
                        $p->whereRaw('UPPER(barangay) = ?', [$needle]);
                    })
                    ->orWhereHas('user', function ($u) use ($needle) {
                        $u->whereRaw('UPPER(barangay) = ?', [$needle]);
                    });
            });
        }

        if ($q !== '') {
            $like = '%' . str_replace(['%', '_'], ['\\%', '\\_'], $q) . '%';
            $query->where(function ($sub) use ($like) {
                $sub
                    ->where('description', 'like', $like)
                    ->orWhere('type', 'like', $like)
                    ->orWhereHas('patient', function ($p) use ($like) {
                        $p->where('full_name', 'like', $like);
                    })
                    ->orWhereHas('user', function ($u) use ($like) {
                        $u->where('name', 'like', $like)
                          ->orWhere('email', 'like', $like);
                    });
            });
        }

        if ($sort === 'oldest') {
            $query->orderBy('created_at', 'asc')->orderBy('id', 'asc');
        } else {
            $query->orderBy('created_at', 'desc')->orderBy('id', 'desc');
        }

        $filename = 'activity_logs_' . $from->format('Ymd') . '-' . $to->format('Ymd') . '.csv';

        return response()->streamDownload(function () use ($query) {
            $out = fopen('php://output', 'w');
            if ($out === false) {
                return;
            }

            // UTF-8 BOM for Excel compatibility
            fwrite($out, "\xEF\xBB\xBF");

            fputcsv($out, [
                'Timestamp',
                'Type',
                'Description',
                'Performed By',
                'Barangay',
                'Patient',
                'IP Address',
                'Device/User Agent',
                'Details',
            ]);

            $query->chunkById(1000, function ($rows) use ($out) {
                foreach ($rows as $a) {
                    $props = is_array($a->properties) ? $a->properties : [];
                    $details = $props['summary'] ?? null;
                    if (!$details && isset($props['rows_pretty']) && is_array($props['rows_pretty'])) {
                        $details = implode(' | ', array_map('strval', $props['rows_pretty']));
                    }

                    $barangay = $a->patient?->barangay ?? $a->user?->barangay;

                    fputcsv($out, [
                        optional($a->created_at)->format('Y-m-d H:i:s'),
                        $a->type,
                        $a->description,
                        $a->user?->name,
                        $barangay,
                        $a->patient?->full_name,
                        $a->ip_address,
                        $a->user_agent,
                        $details,
                    ]);
                }
            }, 'id');

            fclose($out);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }
}
