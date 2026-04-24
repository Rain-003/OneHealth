<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('appointments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('patient_id')->index();
            $table->date('date')->index();
            $table->string('title', 191);

            // merged from add_sources_to_appointments_table
            $table->string('source_type', 64)->nullable()->index();   // 'record' | 'immunization_dose' | …
            $table->unsignedBigInteger('source_id')->nullable()->index();
            $table->text('notes')->nullable();                        // keep as text for flexibility

            $table->timestamps();

            // Prevent duplicates when we know the source of the appointment
            $table->unique(['patient_id', 'source_type', 'source_id'], 'uniq_patient_source');

            // Extra uniqueness from the old add_sources migration
            $table->unique(['source_type', 'source_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointments');
    }
};
