<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('current_pregnancies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained('patients')->onDelete('cascade');

            // "Current" (Kasalukuyang Pagbubuntis) fields
            $table->date('visit_date')->nullable();
            $table->string('age_of_pregnancy')->nullable();   // e.g. "2 o 3"
            $table->boolean('bleeding')->nullable();          // Oo/Hindi
            $table->boolean('uti')->nullable();               // Oo/Hindi
            $table->decimal('weight_kg', 6, 2)->nullable();
            $table->string('bp')->nullable();
            $table->string('hr')->nullable();
            $table->string('rr')->nullable();
            $table->string('temp')->nullable();
            $table->string('fundic_height')->nullable();
            $table->string('fetal_heart_tone')->nullable();
            $table->text('remarks')->nullable();

            // Extra checkbox groups (store as JSON if needed)
            $table->json('checks')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('current_pregnancies');
    }
};
