<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('prenatal_birth_plans', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('patient_id')->index();
            // A light version of the “Birth & Emergency Plan” header
            $table->string('planned_facility')->nullable();
            $table->string('attending')->nullable();               // doctor/nurse/midwife
            $table->boolean('philhealth_accredited')->nullable();
            $table->string('distance')->nullable();                // free text (km/min)
            $table->string('estimated_cost')->nullable();
            $table->string('payment_mode')->nullable();
            $table->string('transport')->nullable();

            $table->string('companion_1_name')->nullable();
            $table->string('companion_1_contact')->nullable();
            $table->string('companion_2_name')->nullable();
            $table->string('companion_2_contact')->nullable();

            $table->string('blood_type')->nullable();
            $table->text('blood_donors')->nullable();              // free text list
            $table->string('refer_to_name')->nullable();
            $table->string('refer_to_contact')->nullable();
            $table->string('refer_to_address')->nullable();

            $table->json('nearest_facilities')->nullable();        // [{name,address},...]

            $table->timestamps();
            $table->unique('patient_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prenatal_birth_plans');
    }
};
