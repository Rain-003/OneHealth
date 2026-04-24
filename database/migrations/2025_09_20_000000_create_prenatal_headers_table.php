<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('prenatal_headers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained('patients')->onDelete('cascade');

            // ITR Header
            $table->string('family_serial_no')->nullable();
            $table->string('philhealth_no')->nullable();
            $table->date('lmp')->nullable();
            $table->date('edc')->nullable();
            $table->string('ob_g')->nullable();
            $table->string('ob_p')->nullable();
            $table->string('ob_gtpal')->nullable();

            // Birth & Emergency Plan (optional)
            $table->string('plan_planned_facility')->nullable();
            $table->string('plan_attending')->nullable();
            $table->boolean('plan_philhealth_accredited')->default(false);
            $table->string('plan_distance')->nullable();
            $table->string('plan_estimated_cost')->nullable();
            $table->string('plan_payment_mode')->nullable();
            $table->string('plan_transport')->nullable();
            $table->string('plan_companion_1_name')->nullable();
            $table->string('plan_companion_1_contact')->nullable();
            $table->string('plan_companion_2_name')->nullable();
            $table->string('plan_companion_2_contact')->nullable();
            $table->string('plan_blood_type')->nullable();
            $table->string('plan_blood_donors')->nullable();
            $table->string('plan_refer_to_name')->nullable();
            $table->string('plan_refer_to_contact')->nullable();
            $table->string('plan_refer_to_address')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prenatal_headers');
    }
};
