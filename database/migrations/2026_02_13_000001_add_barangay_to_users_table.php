<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'barangay')) {
                $table->string('barangay')->nullable()->after('email');
                $table->index('barangay');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'barangay')) {
                try { $table->dropIndex(['barangay']); } catch (\Throwable $e) {}
                $table->dropColumn('barangay');
            }
        });
    }
};
