<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    private function indexExists(string $table, string $index): bool
    {
        $rows = DB::select("SHOW INDEX FROM `{$table}` WHERE Key_name = ?", [$index]);
        return !empty($rows);
    }

    public function up(): void
    {
        if (!Schema::hasTable('patients')) return;

        Schema::table('patients', function (Blueprint $table) {
            if (!Schema::hasColumn('patients', 'full_name')) {
                $table->string('full_name')->after('id');
            }
            if (!Schema::hasColumn('patients', 'birthdate')) {
                $table->date('birthdate')->after('full_name');
            }
            if (!Schema::hasColumn('patients', 'barangay')) {
                $table->string('barangay')->nullable()->after('birthdate');
            }
            if (!Schema::hasColumn('patients', 'patient_type')) {
                $table->enum('patient_type', ['immunization','pregnancy'])
                      ->default('immunization')
                      ->after('barangay');
                $table->index('patient_type', 'patients_patient_type_index');
            }
        });

        // Add the composite unique only if it isn’t already there
        if (!$this->indexExists('patients', 'patients_identity_unique')) {
            Schema::table('patients', function (Blueprint $table) {
                $table->unique(['full_name','birthdate','barangay'], 'patients_identity_unique');
            });
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('patients')) return;

        Schema::table('patients', function (Blueprint $table) {
            if (Schema::hasColumn('patients', 'patient_type')) {
                try { $table->dropIndex('patients_patient_type_index'); } catch (\Throwable $e) {}
                $table->dropColumn('patient_type');
            }
            try { $table->dropUnique('patients_identity_unique'); } catch (\Throwable $e) {}
        });
    }
};
