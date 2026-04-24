<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    // Columns we’re converting: boolean -> enum('oo','hindi')
    private array $boolCols = [
        'three_consecutive_abortions',
        'stillbirth_history',
        'pph_history',
        'tb_current',
        'heart_disease_current',
        'diabetes_current',
        'asthma_current',
        'goiter_current',
    ];

    public function up(): void
    {
        // 1) Add parallel *_yn columns as enum('oo','hindi') NULL
        Schema::table('hbm_histories', function (Blueprint $table) {
            foreach ($this->boolCols as $col) {
                $table->enum($col . '_yn', ['oo', 'hindi'])->nullable()->after($col);
            }
        });

        // 2) Backfill: 1 -> 'oo', 0 -> 'hindi', NULL -> NULL
        foreach ($this->boolCols as $col) {
            DB::table('hbm_histories')->update([
                $col . '_yn' => DB::raw("CASE WHEN `$col` = 1 THEN 'oo' WHEN `$col` = 0 THEN 'hindi' ELSE NULL END")
            ]);
        }

        // 3) Drop old boolean columns
        Schema::table('hbm_histories', function (Blueprint $table) {
            foreach ($this->boolCols as $col) {
                $table->dropColumn($col);
            }
        });

        // 4) Rename *_yn -> original names
        Schema::table('hbm_histories', function (Blueprint $table) {
            foreach ($this->boolCols as $col) {
                $table->renameColumn($col . '_yn', $col);
            }
        });
    }

    public function down(): void
    {
        // Reverse: add parallel *_bool columns, backfill, drop enums, rename back
        Schema::table('hbm_histories', function (Blueprint $table) {
            foreach ($this->boolCols as $col) {
                $table->boolean($col . '_bool')->nullable()->after($col);
            }
        });

        foreach ($this->boolCols as $col) {
            DB::table('hbm_histories')->update([
                $col . '_bool' => DB::raw("CASE WHEN `$col` = 'oo' THEN 1 WHEN `$col` = 'hindi' THEN 0 ELSE NULL END")
            ]);
        }

        Schema::table('hbm_histories', function (Blueprint $table) {
            foreach ($this->boolCols as $col) {
                $table->dropColumn($col);
            }
        });

        Schema::table('hbm_histories', function (Blueprint $table) {
            foreach ($this->boolCols as $col) {
                $table->renameColumn($col . '_bool', $col);
            }
        });
    }
};
