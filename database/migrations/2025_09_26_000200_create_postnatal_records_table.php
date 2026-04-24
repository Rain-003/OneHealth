<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('postnatal_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained('patients')->onDelete('cascade');

            // "After Birth" (Postnatal) fields
            $table->date('followup_date')->nullable();
            $table->boolean('exclusive_breastfeeding')->nullable();
            $table->boolean('family_planning_intent')->nullable();
            $table->boolean('fever_38_up')->nullable();
            $table->boolean('foul_lochia')->nullable();
            $table->boolean('heavy_bleeding')->nullable();
            $table->boolean('red_breast')->nullable();

            $table->string('bp')->nullable();
            $table->string('wt')->nullable();
            $table->string('temp')->nullable();
            $table->string('navel_ok')->nullable(); // Ayos ang Pusod (Oo/Hindi)
            $table->text('remarks')->nullable();

            // vitamins / iron
            $table->date('vitamin_a_date')->nullable();
            $table->date('iron_folate_date')->nullable();

            // health problems
            $table->boolean('tb')->nullable();
            $table->boolean('heart_disease')->nullable();
            $table->boolean('diabetes')->nullable();
            $table->boolean('asthma')->nullable();
            $table->boolean('goiter')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('postnatal_records');
    }
};
