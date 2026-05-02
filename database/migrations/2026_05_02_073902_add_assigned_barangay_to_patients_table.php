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
            if (!Schema::hasColumn('patients', 'assigned_barangay')) {
                $table->string('assigned_barangay')->nullable()->after('barangay')->index();
            }
        });

        /*
         * Backfill old patients:
         * If patient has an owner, use the owner's barangay.
         * If no owner/user barangay exists, fallback to patient's address barangay.
         */
        DB::statement("
            UPDATE patients p
            LEFT JOIN users u ON u.id = p.owner_id
            SET p.assigned_barangay = COALESCE(NULLIF(u.barangay, ''), p.barangay)
            WHERE p.assigned_barangay IS NULL OR p.assigned_barangay = ''
        ");
    }

    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            if (Schema::hasColumn('patients', 'assigned_barangay')) {
                $table->dropIndex(['assigned_barangay']);
                $table->dropColumn('assigned_barangay');
            }
        });
    }
};