<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $tables = [
            'current_pregnancies',
            'hbm_histories',
            'postnatal_records',
            'prenatal_birth_plans',
            'prenatal_headers',
            'prenatal_plans',
            'prenatal_top',
            'prenatal_visits',
        ];

        foreach ($tables as $tableName) {
            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                if (!Schema::hasColumn($tableName, 'pregnancy_id')) {
                    $table->foreignId('pregnancy_id')
                        ->nullable()
                        ->after('patient_id')
                        ->constrained('pregnancies')
                        ->nullOnDelete();

                    $table->index(['patient_id', 'pregnancy_id']);
                }
            });
        }
    }

    public function down(): void
    {
        $tables = [
            'current_pregnancies',
            'hbm_histories',
            'postnatal_records',
            'prenatal_birth_plans',
            'prenatal_headers',
            'prenatal_plans',
            'prenatal_top',
            'prenatal_visits',
        ];

        foreach ($tables as $tableName) {
            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                if (Schema::hasColumn($tableName, 'pregnancy_id')) {
                    $table->dropForeign([$tableName . '_pregnancy_id_foreign']);
                    $table->dropIndex([$tableName . '_patient_id_pregnancy_id_index']);
                    $table->dropColumn('pregnancy_id');
                }
            });
        }
    }
};