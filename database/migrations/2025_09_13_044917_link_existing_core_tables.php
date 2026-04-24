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
        // --- PATIENTS ---
    if (Schema::hasTable('patients')) {
        // Add patient_type enum if missing
        Schema::table('patients', function (Blueprint $table) {
            if (!Schema::hasColumn('patients', 'patient_type')) {
                $table->enum('patient_type', ['immunization','pregnancy'])
                    ->default('immunization')
                    ->after('barangay');
                $table->index('patient_type', 'patients_patient_type_index');
            }
        });

        // Add identity unique only if it doesn't already exist
        $hasIdentityIndex = $this->indexExists('patients', 'patients_identity_unique');
        if (!$hasIdentityIndex
            && Schema::hasColumn('patients','full_name')
            && Schema::hasColumn('patients','birthdate')
            && Schema::hasColumn('patients','barangay')) {

            Schema::table('patients', function (Blueprint $table) {
                $table->unique(['full_name','birthdate','barangay'], 'patients_identity_unique');
            });
        }

        // Migrate old 'category' -> 'patient_type' then drop it (if present)
        if (Schema::hasColumn('patients', 'category')) {
            DB::statement("
                UPDATE patients
                SET patient_type = CASE
                    WHEN LOWER(category) IN ('immunization','infant') THEN 'immunization'
                    WHEN LOWER(category) IN ('prenatal','pregnancy','mother') THEN 'pregnancy'
                    ELSE patient_type
                END
            ");

            Schema::table('patients', function (Blueprint $table) {
                $table->dropColumn('category');
            });
        }
    }


        // === USERS ===
        if (Schema::hasTable('users')) {
            Schema::table('users', function (Blueprint $table) {
                // Keep roles simple; add if missing
                if (!Schema::hasColumn('users', 'role')) {
                    $table->enum('role', ['admin','worker'])->default('worker')->after('password');
                    $table->index('role');
                }
            });
        }

        // === PATIENT_RECORDS ===
        if (Schema::hasTable('patient_records')) {
            Schema::table('patient_records', function (Blueprint $table) {
                // Ensure types suitable for FKs
                if (Schema::hasColumn('patient_records', 'patient_id')) {
                    try { $table->unsignedBigInteger('patient_id')->change(); } catch (\Throwable $e) {}
                } else {
                    $table->unsignedBigInteger('patient_id')->after('id');
                }

                // created_by FK -> users (nullable)
                if (!Schema::hasColumn('patient_records', 'created_by')) {
                    $table->foreignId('created_by')->nullable()->after('patient_id')
                          ->constrained('users')->nullOnDelete();
                }

                // record_type enum mother|infant
                if (!Schema::hasColumn('patient_records', 'record_type')) {
                    $table->enum('record_type', ['mother','infant'])->after('title');
                    $table->index('record_type', 'patient_records_record_type_index');
                }

                // Handy indexes
                try { $table->index(['patient_id','visit_date'], 'pr_patient_visit_idx'); } catch (\Throwable $e) {}
            });

            // Add FK patient_id -> patients.id (ignore if exists)
            try {
                Schema::table('patient_records', function (Blueprint $table) {
                    $table->foreign('patient_id', 'patient_records_patient_id_foreign')
                          ->references('id')->on('patients')->onDelete('cascade');
                });
            } catch (\Throwable $e) {}
        }
    }

    public function down(): void
    {
        // Conservative down()
        if (Schema::hasTable('patient_records')) {
            Schema::table('patient_records', function (Blueprint $table) {
                try { $table->dropForeign('patient_records_patient_id_foreign'); } catch (\Throwable $e) {}
                try { $table->dropConstrainedForeignId('created_by'); } catch (\Throwable $e) {}
                if (Schema::hasColumn('patient_records', 'record_type')) {
                    try { $table->dropIndex('patient_records_record_type_index'); } catch (\Throwable $e) {}
                    $table->dropColumn('record_type');
                }
                try { $table->dropIndex('pr_patient_visit_idx'); } catch (\Throwable $e) {}
            });
        }

        if (Schema::hasTable('users')) {
            Schema::table('users', function (Blueprint $table) {
                if (Schema::hasColumn('users', 'role')) {
                    try { $table->dropIndex('users_role_index'); } catch (\Throwable $e) {}
                    $table->dropColumn('role');
                }
            });
        }

        if (Schema::hasTable('patients')) {
            Schema::table('patients', function (Blueprint $table) {
                if (Schema::hasColumn('patients', 'patient_type')) {
                    try { $table->dropIndex('patients_patient_type_index'); } catch (\Throwable $e) {}
                    $table->dropColumn('patient_type');
                }
                try { $table->dropUnique('patients_identity_unique'); } catch (\Throwable $e) {}
            });
        }
    }
};
