<?php

namespace App\Http\Controllers;

use App\Services\PhilSmsService;
use Illuminate\Http\Request;

class SmsTestController extends Controller
{
    public function __construct(
        protected PhilSmsService $sms
    ) {}

    public function sendTest(Request $request)
    {
        $request->validate([
            'phone'   => ['required', 'string'],
            'message' => ['required', 'string', 'max:500'],
        ]);

        $ok = $this->sms->send($request->input('phone'), $request->input('message'));

        if ($ok) {
            return back()->with('status', 'SMS sent successfully!');
        }

        return back()->with('status', 'Failed to send SMS. Check logs for details.');
    }
}
