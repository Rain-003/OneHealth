<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('prenatal_plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained('patients')->onDelete('cascade');

            $table->string('planned_facility')->nullable();
            $table->string('attending')->nullable();
            $table->boolean('philhealth_accredited')->default(false);
            $table->string('distance')->nullable();
            $table->string('estimated_cost')->nullable();
            $table->string('payment_mode')->nullable();
            $table->string('transport')->nullable();

            $table->string('companion_1_name')->nullable();
            $table->string('companion_1_contact')->nullable();
            $table->string('companion_2_name')->nullable();
            $table->string('companion_2_contact')->nullable();

            $table->string('blood_type', 50)->nullable();
            $table->text('blood_donors')->nullable();

            $table->string('refer_to_name')->nullable();
            $table->string('refer_to_contact')->nullable();
            $table->string('refer_to_address')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prenatal_plans');
    }
};
