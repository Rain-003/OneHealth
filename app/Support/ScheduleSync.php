<?php

namespace App\Support;

use App\Models\Appointment;
use Illuminate\Support\Carbon;

class ScheduleSync
{
    public static function upsert(
        int $patientId,
        string|\DateTimeInterface|null $date,
        string $title,
        ?string $sourceType = null,
        int|string|null $sourceId = null,
        ?string $notes = null
    ): ?Appointment {
        if (!$date) return null;
        $d = Carbon::parse($date);

        $payload = [
            'patient_id' => $patientId,
            'date'       => $d,
            'title'      => $title,
            'status_raw' => null,
            'notes'      => $notes,
        ];

        if ($sourceType && $sourceId) {
            $existing = Appointment::where('source_type', $sourceType)
                ->where('source_id', $sourceId)->first();

            if ($existing) {
                $existing->fill($payload)->save();
                return $existing;
            }

            $payload['source_type'] = $sourceType;
            $payload['source_id']   = $sourceId;
        }

        return Appointment::create($payload);
    }

    public static function deleteBySource(string $sourceType, int|string $sourceId): void
    {
        Appointment::where('source_type', $sourceType)
            ->where('source_id', $sourceId)->delete();
    }
}
