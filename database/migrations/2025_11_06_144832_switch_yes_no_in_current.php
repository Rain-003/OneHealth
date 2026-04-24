<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('current_pregnancies', function (Blueprint $table) {
            // If you don’t have this yet, uncomment:
            // $table->foreignId('patient_id')->constrained('patients')->cascadeOnDelete()->change();

            // Core visit fields already present in your table; add if missing
            if (!Schema::hasColumn('current_pregnancies', 'age_of_pregnancy')) {
                $table->string('age_of_pregnancy')->nullable(); // weeks (text)
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

            // ✅ Save ALL Oo/Hindi per visit
            foreach ([
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
            ] as $col) {
                if (!Schema::hasColumn('current_pregnancies', $col)) {
                    $table->enum($col, ['oo','hindi'])->nullable()->after('age_of_pregnancy');
                }
            }

            // Other monthly fields shown in the UI
            if (!Schema::hasColumn('current_pregnancies', 'iron_folate_rx')) {
                $table->string('iron_folate_rx')->nullable();
            }
            if (!Schema::hasColumn('current_pregnancies', 'next_visit_date')) {
                $table->date('next_visit_date')->nullable();
            }
            if (!Schema::hasColumn('current_pregnancies', 'laboratory_results')) {
                $table->text('laboratory_results')->nullable();
            }

            // Optional: keep JSON “checks” if you want; safe to leave
            // $table->json('checks')->nullable()->change();

            // Helpful index to ensure 1 row per (patient, visit_date)
            if (!Schema::hasColumn('current_pregnancies', 'visit_date')) {
                $table->date('visit_date')->nullable()->index();
            }
        });

        // Unique constraint for (patient_id, visit_date)
        if (!Schema::hasTable('current_pregnancies_unique_tmp')) {
            Schema::table('current_pregnancies', function (Blueprint $table) {
                $table->unique(['patient_id', 'visit_date'], 'cp_unique_patient_visit')->nullable();
            });
        }
    }

    public function down(): void
    {
        Schema::table('current_pregnancies', function (Blueprint $table) {
            $table->dropUnique('cp_unique_patient_visit');

            foreach ([
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
                // keep bleeding/uti if you already had them
            ] as $col) {
                if (Schema::hasColumn('current_pregnancies', $col)) {
                    $table->dropColumn($col);
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
        });
    }
};
