<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\PatientsModel;
use App\Models\PatientTrustedDevice;
use App\Services\PhilSmsService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Str;
use Inertia\Inertia;

class PatientsController extends Controller
{
    protected PhilSmsService $sms;

    private const TRUSTED_DEVICE_COOKIE = 'patient_trusted_device';
    private const TRUSTED_DEVICE_DAYS = 180;

    public function __construct(PhilSmsService $sms)
    {
        $this->sms = $sms;
    }

    /**
     * Show the patient login page (main sign-in).
     */
    public function create()
    {
        return Inertia::render('patients/login');
    }

    /**
     * Placeholder for standard patient login (unused for now).
     */
    public function store(Request $request)
    {
        return back()->withErrors([
            'login' => 'Standard login is not available for patients. Please use “Access with info”.',
        ]);
    }

    /**
     * "Access with info" login.
     *
     * The patient may identify themself using ONE of these in the same input:
     *  - full name
     *  - first name + last name
     *  - first name + middle name + last name
     *  - surname, first name format
     *  - registered phone number
     *
     * Birthdate + barangay are still required, and SMS OTP/trusted-device checks stay in place.
     *
     * Two modes:
     *  - Step 1 (no OTP yet): validate identity, try trusted device, otherwise send SMS OTP.
     *  - Step 2 (has `otp`): validate code, log in patient, optionally trust device.
     */
    public function loginWithInfo(Request $request)
    {
        /*
         |--------------------------------------------------------------
         | STEP 2: OTP VERIFICATION
         |--------------------------------------------------------------
         */
        if ($request->filled('otp')) {
            $data = $request->validate([
                'otp' => ['required', 'digits:6'],
                'trust_device' => ['nullable', 'boolean'],
            ]);

            $sessionPatientId = $request->session()->get('patient_otp_user_id');
            $sessionOtp       = $request->session()->get('patient_otp_code');
            $expiresRaw       = $request->session()->get('patient_otp_expires_at');

            if (!$sessionPatientId || !$sessionOtp) {
                return back()->withErrors([
                    'otp' => 'Your code has expired or is invalid. Please try again.',
                ]);
            }

            $expiresAt = $expiresRaw ? Carbon::parse($expiresRaw) : null;
            if ($expiresAt && now()->greaterThan($expiresAt)) {
                $this->clearOtpSession($request);

                return back()->withErrors([
                    'otp' => 'Your code has expired. Please request a new one.',
                ]);
            }

            if ($data['otp'] !== $sessionOtp) {
                $phoneMasked = $request->session()->get('patient_otp_phone_masked');

                return back()
                    ->withErrors([
                        'otp' => 'The code you entered is incorrect.',
                    ])
                    ->with([
                        'otp_sent'     => true,
                        'phone_masked' => $phoneMasked,
                    ]);
            }

            // OTP OK → log in patient
            $patient = PatientsModel::find($sessionPatientId);

            if (!$patient) {
                $this->clearOtpSession($request);

                return back()->withErrors([
                    'access' => 'We could not find your patient record. Please try again.',
                ]);
            }

            // Block login if patient is marked as deceased
            if ($patient->status === 'deceased') {
                $this->clearOtpSession($request);

                return back()->withErrors([
                    'access' => 'This patient record is marked as deceased. Online access is disabled. If this is an error, please visit your health center.',
                ]);
            }

            Auth::guard('patient')->login($patient, true);
            $request->session()->regenerate();

            if ($request->boolean('trust_device')) {
                $this->issueTrustedDevice($request, $patient);
            }

            $this->clearOtpSession($request);

            return to_route('patient.dashboard', [], 303);
        }

        /*
         |--------------------------------------------------------------
         | STEP 1: VALIDATE IDENTITY + TRY TRUSTED DEVICE + SEND OTP
         |--------------------------------------------------------------
         */
        $data = $request->validate([
            // Keep field name as full_name so the existing patient login UI does not need to change immediately.
            'full_name' => ['required', 'string', 'min:2', 'max:255'],
            'birthdate' => ['required', 'date'],
            'barangay'  => ['required', 'string', 'min:2', 'max:255'],
        ]);

        $identifier = $this->normalizeText($data['full_name']);
        $brgy       = $this->normalizeText($data['barangay']);
        $dob        = Carbon::parse($data['birthdate'])->toDateString();

        $matches = PatientsModel::query()
            ->whereDate('birthdate', $dob)
            ->whereRaw('LOWER(TRIM(barangay)) = ?', [$brgy])
            ->get()
            ->filter(fn (PatientsModel $patient) => $this->patientMatchesAccessIdentifier($patient, $identifier))
            ->values();

        if ($matches->count() !== 1) {
            $message = $matches->count() > 1
                ? 'Multiple patient records matched those details. Please use your complete full name or registered phone number.'
                : 'No matching patient found with those details.';

            return back()
                ->withErrors([
                    'full_name' => $message,
                ])
                ->withInput();
        }

        /** @var \App\Models\PatientsModel $patient */
        $patient = $matches->first();

        // Block OTP if patient is marked as deceased
        if ($patient->status === 'deceased') {
            return back()
                ->withErrors([
                    'access' => 'This patient record is marked as deceased. Online access is disabled. If this is an error, please visit your health center.',
                ])
                ->withInput();
        }

        // Trusted device check: if recognized, skip OTP and log in directly
        $trustedDevice = $this->findTrustedDevice($request, $patient);

        if ($trustedDevice) {
            Auth::guard('patient')->login($patient, true);
            $request->session()->regenerate();
            $this->touchTrustedDevice($request, $trustedDevice);

            return to_route('patient.dashboard', [], 303);
        }

        return $this->sendPatientOtp($request, $patient);
    }

    /**
     * Resend OTP for patient login.
     */
    public function resendOtp(Request $request)
    {
        $sessionPatientId = $request->session()->get('patient_otp_user_id');

        if (!$sessionPatientId) {
            return back()->withErrors([
                'otp' => 'Your session has expired. Please enter your details again.',
            ]);
        }

        $patient = PatientsModel::find($sessionPatientId);

        if (!$patient) {
            $this->clearOtpSession($request);

            return back()->withErrors([
                'access' => 'We could not find your patient record. Please try again.',
            ]);
        }

        if ($patient->status === 'deceased') {
            $this->clearOtpSession($request);

            return back()->withErrors([
                'access' => 'This patient record is marked as deceased. Online access is disabled. If this is an error, please visit your health center.',
            ]);
        }

        return $this->sendPatientOtp($request, $patient);
    }

    /**
     * Send OTP to patient mobile number.
     */
    protected function sendPatientOtp(Request $request, PatientsModel $patient)
    {
        /*
         |--------------------------------------------------------------
         | PHONE LOOKUP (covers old + new schema)
         |--------------------------------------------------------------
         |
         | Prefer the accessor `phone_number` (contact_no), then fall back
         | to any legacy columns if present.
         */
        $phone = $patient->phone_number
            ?? $patient->contact_no
            ?? $patient->contact_number
            ?? $patient->mobile
            ?? $patient->phone
            ?? null;

        Log::info('Patient OTP phone lookup', [
            'patient_id' => $patient->id,
            'raw_phone'  => $phone,
        ]);

        if (!$phone) {
            return back()
                ->withErrors([
                    'access' =>
                        'We cannot send an access code because there is no mobile number saved for this patient. Please visit your health center to update your record.',
                ])
                ->withInput();
        }

        // 60-second resend cooldown
        $lastSentAt = $request->session()->get('patient_otp_last_sent_at');
        if ($lastSentAt) {
            $lastSent = Carbon::parse($lastSentAt);

            if ($lastSent->diffInSeconds(now()) < 60) {
                $secondsLeft = 60 - $lastSent->diffInSeconds(now());

                return back()
                    ->withErrors([
                        'otp' => "Please wait {$secondsLeft} seconds before requesting a new code.",
                    ])
                    ->with([
                        'otp_sent'     => true,
                        'phone_masked' => $request->session()->get('patient_otp_phone_masked', 'your registered number'),
                    ]);
            }
        }

        // Strip non-digits for masking / logging; PhilSmsService will normalize
        $digitsOnly = preg_replace('/\D/', '', (string) $phone) ?: $phone;

        // Generate OTP and store in session
        $otp = (string) random_int(100000, 999999);

        $request->session()->put('patient_otp_user_id', $patient->id);
        $request->session()->put('patient_otp_code', $otp);
        $request->session()->put(
            'patient_otp_expires_at',
            now()->addMinutes(10)->toIso8601String()
        );
        $request->session()->put('patient_otp_last_sent_at', now()->toIso8601String());

        // basic masking: show only last 4 digits
        $last4       = substr(preg_replace('/\D/', '', $digitsOnly), -4);
        $phoneMasked = $last4 ? '•••• ' . $last4 : 'your registered number';
        $request->session()->put('patient_otp_phone_masked', $phoneMasked);

        // Send SMS via PhilSmsService
        $message = "Your OneHealth access code is {$otp}. It will expire in 10 minutes. Do not share this code.";

        Log::info('Sending patient OTP SMS', [
            'patient_id' => $patient->id,
            'phone_used' => $digitsOnly,
        ]);

        $sent = $this->sms->send($digitsOnly, $message);

        if (!$sent) {
            $this->clearOtpSession($request);

            Log::warning('Failed to send patient OTP SMS', [
                'patient_id' => $patient->id,
                'phone_used' => $digitsOnly,
            ]);

            return back()
                ->withErrors([
                    'access' =>
                        'We could not send the SMS code at this time. Please try again later or contact your health center.',
                ])
                ->withInput();
        }

        return back()
            ->withInput($request->only(['full_name', 'birthdate', 'barangay']))
            ->with([
                'otp_sent'     => true,
                'phone_masked' => $phoneMasked,
                'otp_message'  => 'A new code has been sent to your registered mobile number.',
            ]);
    }

    /**
     * Logout patient.
     */
    public function destroy(Request $request)
    {
        Auth::guard('patient')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('home');
    }

    /**
     * Find an active trusted device for this patient.
     */
    protected function findTrustedDevice(Request $request, PatientsModel $patient): ?PatientTrustedDevice
    {
        $plainToken = $request->cookie(self::TRUSTED_DEVICE_COOKIE);

        if (!$plainToken) {
            return null;
        }

        $hashed = hash('sha256', $plainToken);

        return $patient->trustedDevices()
            ->where('token_hash', $hashed)
            ->whereNull('revoked_at')
            ->where('expires_at', '>', now())
            ->first();
    }

    /**
     * Issue a new trusted device token and cookie.
     */
    protected function issueTrustedDevice(Request $request, PatientsModel $patient): void
    {
        $plainToken = Str::random(64);

        $patient->trustedDevices()->create([
            'token_hash'   => hash('sha256', $plainToken),
            'device_name'  => Str::limit((string) $request->header('User-Agent'), 255),
            'user_agent'   => Str::limit((string) $request->userAgent(), 1000),
            'ip_address'   => $request->ip(),
            'last_used_at' => now(),
            'expires_at'   => now()->addDays(self::TRUSTED_DEVICE_DAYS),
        ]);

        Cookie::queue(cookie(
            self::TRUSTED_DEVICE_COOKIE,
            $plainToken,
            60 * 24 * self::TRUSTED_DEVICE_DAYS,
            '/',
            null,
            app()->environment('production'),
            true,
            false,
            config('session.same_site', 'lax')
        ));
    }

    /**
     * Refresh metadata for a trusted device that was used successfully.
     */
    protected function touchTrustedDevice(Request $request, PatientTrustedDevice $device): void
    {
        $device->forceFill([
            'last_used_at' => now(),
            'user_agent'   => Str::limit((string) $request->userAgent(), 1000),
            'ip_address'   => $request->ip(),
        ])->save();
    }

    /**
     * Clear OTP-related session keys.
     */
    protected function clearOtpSession(Request $request): void
    {
        $request->session()->forget([
            'patient_otp_user_id',
            'patient_otp_code',
            'patient_otp_expires_at',
            'patient_otp_phone_masked',
            'patient_otp_last_sent_at',
        ]);
    }

    /**
     * Compare patient data against the access text entered in the existing full_name field.
     */
    protected function patientMatchesAccessIdentifier(PatientsModel $patient, string $identifier): bool
    {
        if ($identifier === '') {
            return false;
        }

        $inputDigits = $this->normalizePhoneDigits($identifier);
        if ($inputDigits !== '') {
            foreach ($this->patientPhoneCandidates($patient) as $phone) {
                $phoneDigits = $this->normalizePhoneDigits($phone);
                if ($phoneDigits !== '' && $phoneDigits === $inputDigits) {
                    return true;
                }
            }
        }

        foreach ($this->patientNameCandidates($patient) as $candidate) {
            if ($candidate !== '' && $candidate === $identifier) {
                return true;
            }
        }

        return false;
    }

    /**
     * Supported patient name formats for access matching.
     */
    protected function patientNameCandidates(PatientsModel $patient): array
    {
        $first  = $this->normalizeText($patient->first_name ?? null);
        $middle = $this->normalizeText($patient->middle_name ?? null);
        $last   = $this->normalizeText($patient->last_name ?? null);
        $suffix = $this->normalizeText($patient->suffix ?? null);
        $full   = $this->normalizeText($patient->full_name ?? null);

        $candidates = [
            $full,
            trim(implode(' ', array_filter([$first, $middle, $last, $suffix]))),
            trim(implode(' ', array_filter([$first, $last]))),
            trim(implode(' ', array_filter([$first, $middle, $last]))),
            trim(implode(' ', array_filter([$last, $first]))),
            trim(implode(' ', array_filter([$last, $first, $middle]))),
            $last && $first ? trim($last . ', ' . trim(implode(' ', array_filter([$first, $middle, $suffix])))) : '',
            $last && $first ? trim($last . ', ' . trim(implode(' ', array_filter([$first, $suffix])))) : '',
        ];

        return array_values(array_unique(array_filter(array_map(
            fn ($value) => $this->normalizeText($value),
            $candidates
        ))));
    }

    /**
     * Supported phone fields for access matching.
     */
    protected function patientPhoneCandidates(PatientsModel $patient): array
    {
        return array_filter([
            $patient->phone_number ?? null,
            $patient->contact_no ?? null,
            $patient->contact_number ?? null,
            $patient->mobile ?? null,
            $patient->phone ?? null,
        ]);
    }

    protected function normalizeText(?string $value): string
    {
        return Str::of($value ?? '')
            ->trim()
            ->replaceMatches('/\s+/', ' ')
            ->lower()
            ->toString();
    }

    protected function normalizePhoneDigits(?string $value): string
    {
        $digits = preg_replace('/\D/', '', (string) ($value ?? '')) ?: '';

        if (str_starts_with($digits, '63')) {
            $digits = substr($digits, 2);
        }

        if (str_starts_with($digits, '0')) {
            $digits = substr($digits, 1);
        }

        return strlen($digits) >= 10 ? substr($digits, -10) : '';
    }
}
