<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            if (!Schema::hasColumn('patients', 'owner_id')) {
                $table->foreignId('owner_id')
                    ->nullable()
                    ->after('id')
                    ->constrained('users')
                    ->nullOnDelete();
                $table->index('owner_id');
            }
        });

        // Backfill best-effort: use first record creator if available
        if (Schema::hasTable('patient_records') && Schema::hasColumn('patient_records', 'created_by')) {
            try {
                DB::statement("
                    UPDATE patients p
                    JOIN (
                        SELECT patient_id, MIN(created_by) AS created_by
                        FROM patient_records
                        WHERE created_by IS NOT NULL
                        GROUP BY patient_id
                    ) pr ON pr.patient_id = p.id
                    SET p.owner_id = COALESCE(p.owner_id, pr.created_by)
                ");
            } catch (\Throwable $e) {
                // ignore
            }
        }
    }

    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            if (Schema::hasColumn('patients', 'owner_id')) {
                try { $table->dropConstrainedForeignId('owner_id'); } catch (\Throwable $e) {
                    try { $table->dropForeign(['owner_id']); } catch (\Throwable $e2) {}
                    try { $table->dropColumn('owner_id'); } catch (\Throwable $e3) {}
                }
            }
        });
    }
};
