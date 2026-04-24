<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private function indexExists(string $table, string $index): bool
    {
        $rows = DB::select("SHOW INDEX FROM `{$table}` WHERE Key_name = ?", [$index]);
        return !empty($rows);
    }

    public function up(): void
    {
        if (!Schema::hasTable('patients')) {
            return;
        }

        // Ensure required columns exist (safe if already there)
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

        // 1) Drop the UNIQUE if present
        if ($this->indexExists('patients', 'patients_identity_unique')) {
            Schema::table('patients', function (Blueprint $table) {
                try {
                    $table->dropUnique('patients_identity_unique');
                } catch (\Throwable $e) {
                    // ignore if already dropped
                }
            });
        }

        // 2) Add a NON-UNIQUE composite index instead
        if (!$this->indexExists('patients', 'patients_identity_index')) {
            Schema::table('patients', function (Blueprint $table) {
                $table->index(['full_name','birthdate','barangay'], 'patients_identity_index');
            });
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('patients')) {
            return;
        }

        // Drop the non-unique index, if present
        if ($this->indexExists('patients', 'patients_identity_index')) {
            Schema::table('patients', function (Blueprint $table) {
                try {
                    $table->dropIndex('patients_identity_index');
                } catch (\Throwable $e) {
                    // ignore if already dropped
                }
            });
        }

        // (Optional) Restore the UNIQUE like before on rollback
        if (!$this->indexExists('patients', 'patients_identity_unique')) {
            Schema::table('patients', function (Blueprint $table) {
                $table->unique(['full_name','birthdate','barangay'], 'patients_identity_unique');
            });
        }
    }
};
