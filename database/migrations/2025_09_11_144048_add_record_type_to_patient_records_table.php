<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('patient_records', function (Blueprint $table) {
            if (!Schema::hasColumn('patient_records', 'record_type')) {
                $table->enum('record_type', ['mother', 'infant'])->default('mother')->after('patient_id');
                $table->index('record_type');
            }
        });
    }

    public function down(): void
    {
        Schema::table('patient_records', function (Blueprint $table) {
            if (Schema::hasColumn('patient_records', 'record_type')) {
                $table->dropIndex(['record_type']);
                $table->dropColumn('record_type');
            }
        });
    }
};
