<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('patient_records', function (Blueprint $table) {
            $table->id();

            // IMPORTANT: this assumes your patients table is literally named 'patients'
            // If it's not, change 'patients' below to your actual table name.
            $table->foreignId('patient_id')->constrained('patients')->cascadeOnDelete();

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();

            $table->date('visit_date');
            $table->string('title', 255);
            $table->text('notes')->nullable();

            $table->timestamps();

            $table->index(['patient_id', 'visit_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patient_records');
    }
};
