<?php

// database/migrations/2025_01_01_000000_create_hbm_histories_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('hbm_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained('patients')->cascadeOnDelete()->unique();

            // Section: Edad & Taas (separate from Kasaysayan)
            $table->enum('age_bracket', ['under_18','18_34','35_plus'])->nullable();
            $table->enum('height_bracket', ['below_145','eq_145','above_145'])->nullable();

            // Section: Kasaysayan ng Pagbubuntis (history)
            $table->unsignedSmallInteger('prev_pregnancies')->nullable();
            $table->boolean('three_consecutive_abortions')->nullable();
            $table->boolean('stillbirth_history')->nullable();
            $table->boolean('pph_history')->nullable();

            // Section: Kasalukuyang Problema (current health problems)
            $table->boolean('tb_current')->nullable();
            $table->boolean('heart_disease_current')->nullable();
            $table->boolean('diabetes_current')->nullable();
            $table->boolean('asthma_current')->nullable();
            $table->boolean('goiter_current')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hbm_histories');
    }
};
