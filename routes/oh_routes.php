<?php

use Illuminate\Support\Facades\Route;

Route::view('/', 'landing')->name('landing');
Route::view('/login/patient', 'auth.patient-login')->name('patient.login');
Route::view('/login/worker', 'auth.worker-login')->name('worker.login');
Route::view('/worker/dashboard', 'worker.dashboard')->name('worker.dashboard');

// Prenatal PDF routes
Route::get('/center/patients/{id}/prenatal/print', [PrenatalController::class, 'print'])->name('prenatal.print');
Route::get('/center/patients/{id}/prenatal/download', [PrenatalController::class, 'download'])->name('prenatal.download');
