<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    private array $ynCols = [
        'exclusive_breastfeeding',
        'family_planning_intent',
        'fever_38_up',
        'foul_lochia',
        'heavy_bleeding',
        'red_breast',
        'navel_ok',
        'tb',
        'heart_disease',
        'diabetes',
        'asthma',
        'goiter',
    ];

    public function up(): void
    {
        Schema::table('postnatal_records', function (Blueprint $table) {
            // Add followup_date index if missing
            if (!Schema::hasColumn('postnatal_records', 'followup_date')) {
                $table->date('followup_date')->nullable()->index();
            }
        });

        // Convert each yes/no column to enum('oo','hindi') via temp swap (DBAL-less approach)
        foreach ($this->ynCols as $col) {
            // Add temp enum column if not present
            if (!Schema::hasColumn('postnatal_records', "{$col}_tmp")) {
                Schema::table('postnatal_records', function (Blueprint $table) use ($col) {
                    $table->enum("{$col}_tmp", ['oo','hindi'])->nullable()->after('followup_date');
                });
            }

            // Backfill temp from existing column (boolean/string → enum)
            // true/1/'1'/'true'/'yes'/'oo' -> 'oo'
            // false/0/'0'/'false'/'no'/'hindi' -> 'hindi'
            DB::statement("
                UPDATE postnatal_records
                SET {$col}_tmp = CASE
                    WHEN {$col} IS NULL THEN NULL
                    WHEN {$col} IN (1, '1') THEN 'oo'
                    WHEN {$col} IN (0, '0') THEN 'hindi'
                    WHEN LOWER(CAST({$col} AS CHAR)) IN ('oo','true','yes') THEN 'oo'
                    WHEN LOWER(CAST({$col} AS CHAR)) IN ('hindi','false','no') THEN 'hindi'
                    ELSE NULL
                END
            ");


            // Drop original column (if exists) and rename temp -> original
            if (Schema::hasColumn('postnatal_records', $col)) {
                Schema::table('postnatal_records', function (Blueprint $table) use ($col) {
                    $table->dropColumn($col);
                });
            }
            Schema::table('postnatal_records', function (Blueprint $table) use ($col) {
                $table->renameColumn("{$col}_tmp", $col);
            });
        }

        // Optional unique key
        try {
            Schema::table('postnatal_records', function (Blueprint $table) {
                $table->unique(['patient_id','followup_date'], 'postnatal_unique_patient_date');
            });
        } catch (\Throwable $e) {
            // ignore if already exists
        }
    }

    public function down(): void
    {
        // Revert enums back to booleans/strings (simple approach: boolean)
        Schema::table('postnatal_records', function (Blueprint $table) {
            foreach ($this->ynCols as $col) {
                $tmp = "{$col}_bool";
                $table->boolean($tmp)->nullable()->after('followup_date');
            }
        });

        foreach ($this->ynCols as $col) {
            DB::statement("
                UPDATE postnatal_records
                SET {$col}_bool = CASE
                    WHEN {$col} = 'oo' THEN 1
                    WHEN {$col} = 'hindi' THEN 0
                    ELSE NULL
                END
            ");
            Schema::table('postnatal_records', function (Blueprint $table) use ($col) {
                $table->dropColumn($col);
            });
            Schema::table('postnatal_records', function (Blueprint $table) use ($col) {
                $table->renameColumn("{$col}_bool", $col);
            });
        }

        // Drop unique if we added it
        try {
            Schema::table('postnatal_records', function (Blueprint $table) {
                $table->dropUnique('postnatal_unique_patient_date');
            });
        } catch (\Throwable $e) {
            // ignore
        }
    }
};
