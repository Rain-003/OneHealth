<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('prenatal_plans', function (Blueprint $table) {
        $table->string('signature_mode', 20)->nullable()->after('signature_name');
        $table->string('signature_path')->nullable()->after('signature_mode');
        $table->timestamp('signed_at')->nullable()->after('signature_path');
    });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('prenatal_plans', function (Blueprint $table) {
            $table->dropColumn([
                'signature_mode',
                'signature_path',
                'signed_at',
            ]);
        });
    }
};
