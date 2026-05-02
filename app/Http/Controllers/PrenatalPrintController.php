<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PrenatalPrintController extends Controller
{
    public function download(Request $request, $patientId)
    {
        $html = (string) $request->input('html', '');

        if (trim($html) === '') {
            return response('Missing HTML', 422);
        }

        // Optional: allow the frontend to pass pregnancy_no or pregnancy_id
        // so downloaded files are easier to identify when a mother has multiple pregnancies.
        $pregnancyLabel = $request->input('pregnancy_no')
            ? 'pregnancy-' . $request->input('pregnancy_no')
            : ($request->input('pregnancy_id') ? 'pregnancy-id-' . $request->input('pregnancy_id') : 'pregnancy-current');

        $filename = Str::slug("prenatal-{$patientId}-{$pregnancyLabel}") . '.pdf';

        // Require: composer require barryvdh/laravel-dompdf
        $pdf = app('dompdf.wrapper');
        $pdf->loadHTML($html)->setPaper('A4', 'portrait');

        return $pdf->download($filename);
    }
}
