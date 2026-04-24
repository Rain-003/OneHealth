<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // You may need: composer require doctrine/dbal
        Schema::table('current_pregnancies', function (Blueprint $table) {
            // core text fields (add if missing)
            if (!Schema::hasColumn('current_pregnancies', 'age_of_pregnancy')) {
                $table->string('age_of_pregnancy')->nullable();
            }
            if (!Schema::hasColumn('current_pregnancies', 'fundic_height')) {
                $table->string('fundic_height')->nullable();
            }
            if (!Schema::hasColumn('current_pregnancies', 'fetal_heart_tone')) {
                $table->string('fetal_heart_tone')->nullable();
            }
            if (!Schema::hasColumn('current_pregnancies', 'remarks')) {
                $table->text('remarks')->nullable();
            }
            if (!Schema::hasColumn('current_pregnancies', 'iron_folate_rx')) {
                $table->string('iron_folate_rx')->nullable();
            }
            if (!Schema::hasColumn('current_pregnancies', 'next_visit_date')) {
                $table->date('next_visit_date')->nullable();
            }
            if (!Schema::hasColumn('current_pregnancies', 'laboratory_results')) {
                $table->text('laboratory_results')->nullable();
            }
            if (!Schema::hasColumn('current_pregnancies', 'visit_date')) {
                $table->date('visit_date')->nullable()->index();
            }
        });

        // Convert ALL Y/N columns to enum('oo','hindi') — change if exists, add if missing
        $ynCols = [
            'bleeding',
            'uti',
            'fever_38_or_more',
            'pallor_anemia',
            'abnormal_abdominal_size',
            'abnormal_presentation',
            'absent_fetal_heartbeat',
            'edema',
            'vaginal_infection',
            'iodine_risk_area',
            'malaria_prophylaxis',
            'plan_breastfeed',
            'counseled_danger_signs',
            'dental_check',
            'birth_plan_prepared',
            'danger_present',
        ];

        Schema::table('current_pregnancies', function (Blueprint $table) use ($ynCols) {
            foreach ($ynCols as $col) {
                if (Schema::hasColumn('current_pregnancies', $col)) {
                    // was tinyint/boolean before → convert to enum
                    $table->enum($col, ['oo','hindi'])->nullable()->change();
                } else {
                    // brand new column
                    $table->enum($col, ['oo','hindi'])->nullable()->after('age_of_pregnancy');
                }
            }
        });

        // Unique (patient_id, visit_date) guard (skip if it already exists)
        if (!$this->indexExists('current_pregnancies', 'cp_unique_patient_visit')) {
            Schema::table('current_pregnancies', function (Blueprint $table) {
                $table->unique(['patient_id', 'visit_date'], 'cp_unique_patient_visit');
            });
        }
    }

    public function down(): void
    {
        // Roll back Y/N columns to nullable boolean if you need to revert
        $ynCols = [
            'fever_38_or_more',
            'pallor_anemia',
            'abnormal_abdominal_size',
            'abnormal_presentation',
            'absent_fetal_heartbeat',
            'edema',
            'vaginal_infection',
            'iodine_risk_area',
            'malaria_prophylaxis',
            'plan_breastfeed',
            'counseled_danger_signs',
            'dental_check',
            'birth_plan_prepared',
            'danger_present',
            // intentionally not forcing bleeding/uti removal or type change; adjust if desired
        ];

        Schema::table('current_pregnancies', function (Blueprint $table) use ($ynCols) {
            foreach ($ynCols as $col) {
                if (Schema::hasColumn('current_pregnancies', $col)) {
                    $table->boolean($col)->nullable()->change();
                }
            }
            if (Schema::hasColumn('current_pregnancies', 'iron_folate_rx')) {
                $table->dropColumn('iron_folate_rx');
            }
            if (Schema::hasColumn('current_pregnancies', 'next_visit_date')) {
                $table->dropColumn('next_visit_date');
            }
            if (Schema::hasColumn('current_pregnancies', 'laboratory_results')) {
                $table->dropColumn('laboratory_results');
            }
            if ($this->indexExists('current_pregnancies', 'cp_unique_patient_visit')) {
                $table->dropUnique('cp_unique_patient_visit');
            }
        });
    }

    private function indexExists(string $table, string $index): bool
    {
        $db = DB::getDatabaseName();
        $count = DB::table('information_schema.statistics')
            ->where('table_schema', $db)
            ->where('table_name', $table)
            ->where('index_name', $index)
            ->count();
        return $count > 0;
    }
};
