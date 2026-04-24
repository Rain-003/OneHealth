<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class PrenatalPrintController extends Controller
{
    public function download(Request $request, $patientId)
    {
        $html = $request->input('html', '');

        if (!$html) {
            return response('Missing HTML', 422);
        }

        // Require: composer require barryvdh/laravel-dompdf
        $pdf = app('dompdf.wrapper');
        $pdf->loadHTML($html)->setPaper('A4', 'portrait');

        return $pdf->download("prenatal-$patientId.pdf");
    }
}
