<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PhilSmsService
{
    /**
     * Send SMS via PhilSMS.
     *
     * @param  string|array  $recipients  Single number or array of numbers.
     * @param  string        $message     SMS body.
     * @param  string|null   $scheduleTime  Optional "Y-m-d H:i" in server timezone.
     * @return bool
     */
    public function send(string|array $recipients, string $message, ?string $scheduleTime = null): bool
    {
        $token     = config('services.philsms.token');
        $baseUrl   = rtrim(config('services.philsms.base_url'), '/');
        $senderId  = config('services.philsms.sender_id', 'OneHealth');
        $type      = config('services.philsms.type', 'plain');

        Log::info('PhilSMS config check', [
            'base_url'  => $baseUrl,
            'has_token' => (bool) $token,
            'sender_id' => $senderId,
            'type'      => $type,
        ]);

        if (!$token) {
            Log::warning('PhilSMS: API token not configured.');
            return false;
        }

        // Normalize recipients => "63917...,63920..."
        $recipientString = $this->normalizeRecipients($recipients);

        if ($recipientString === '') {
            Log::warning('PhilSMS: No valid recipient numbers provided after normalization.', [
                'original' => $recipients,
            ]);
            return false;
        }

        $payload = [
            'recipient' => $recipientString,
            'sender_id' => $senderId,
            'type'      => $type,
            'message'   => $message,
        ];

        if ($scheduleTime) {
            // PhilSMS expects "Y-m-d H:i"
            $payload['schedule_time'] = $scheduleTime;
        }

        Log::info('PhilSMS sending SMS', [
            'url'     => $baseUrl . '/sms/send',
            'payload' => $payload,
        ]);

        try {
            $response = Http::withToken($token)
                ->acceptJson()
                ->asJson()
                ->post($baseUrl . '/sms/send', $payload);

            $body = $response->json();

            Log::info('PhilSMS response', [
                'status' => $response->status(),
                'body'   => $body,
            ]);

            if ($response->successful() && isset($body['status']) && $body['status'] === 'success') {
                return true;
            }

            Log::warning('PhilSMS send failed', [
                'http_status' => $response->status(),
                'body'        => $body,
            ]);

            return false;
        } catch (\Throwable $e) {
            Log::error('PhilSMS exception when sending SMS', [
                'message' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Normalize PH numbers to 63XXXXXXXXXX (E.164-style, 12 digits).
     *
     * Accepts:
     *  - "09171234567"
     *  - "9171234567"
     *  - "639171234567"
     *  - "+63 917-123-4567"
     *
     * Always outputs: "639171234567"
     *
     * @param  string|array  $recipients
     * @return string
     */
    protected function normalizeRecipients(string|array $recipients): string
    {
        $list    = is_array($recipients) ? $recipients : [$recipients];
        $cleaned = [];

        foreach ($list as $original) {
            $normalized = $this->normalizeSingleRecipient($original);

            if ($normalized) {
                $cleaned[] = $normalized;
            }
        }

        Log::info('PhilSMS normalized recipients summary', [
            'input'   => $recipients,
            'cleaned' => $cleaned,
        ]);

        return implode(',', $cleaned);
    }

    /**
     * Normalize a single PH mobile to 63XXXXXXXXXX or return null if invalid.
     */
    protected function normalizeSingleRecipient(?string $raw): ?string
    {
        $numOriginal = trim((string) $raw);

        if ($numOriginal === '') {
            return null;
        }

        // Keep digits only
        $digits = preg_replace('/\D/', '', $numOriginal);

        if ($digits === '' || $digits === null) {
            Log::info('PhilSMS dropped number (no digits after clean)', [
                'original' => $numOriginal,
            ]);
            return null;
        }

        // Strip leading country code 63 (if present)
        if (str_starts_with($digits, '63')) {
            $digits = substr($digits, 2);
        }

        // Strip leading 0 (if present)
        if (str_starts_with($digits, '0')) {
            $digits = substr($digits, 1);
        }

        // Keep last 10 digits – defensive in case extra digits were present
        if (strlen($digits) > 10) {
            $digits = substr($digits, -10);
        }

        // At this point we expect EXACTLY 10 digits for a PH mobile local part
        if (strlen($digits) !== 10) {
            Log::warning('PhilSMS dropped invalid mobile length', [
                'original' => $numOriginal,
                'digits'   => $digits,
                'length'   => strlen($digits),
            ]);
            return null;
        }

        $final = '63' . $digits;

        Log::info('PhilSMS normalized one recipient', [
            'original'   => $numOriginal,
            'normalized' => $final,
        ]);

        return $final;
    }
}
