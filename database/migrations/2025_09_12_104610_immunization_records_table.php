<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('immunization_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained('patients')->cascadeOnDelete();
            $table->string('vaccine');
            $table->string('dose_label');
            $table->unsignedTinyInteger('dose_no')->nullable();
            $table->date('date_given')->nullable();
            $table->string('remarks')->nullable();
            $table->timestamps();

            $table->unique(['patient_id','vaccine','dose_label']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('immunization_records');
    }
};
