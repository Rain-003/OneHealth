<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('prenatal_top', function (Blueprint $table) {
            $table->dropUnique('prenatal_top_patient_id_unique');
            $table->unique(['patient_id', 'pregnancy_id'], 'prenatal_top_patient_pregnancy_unique');
        });
    }

    public function down(): void
    {
        Schema::table('prenatal_top', function (Blueprint $table) {
            $table->dropUnique('prenatal_top_patient_pregnancy_unique');
            $table->unique('patient_id', 'prenatal_top_patient_id_unique');
        });
    }
};