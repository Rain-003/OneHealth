<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            if (!Schema::hasColumn('patients', 'family_serial_number')) $table->string('family_serial_number')->nullable()->after('id');
            if (!Schema::hasColumn('patients', 'philhealth_no'))   $table->string('philhealth_no')->nullable();
            if (!Schema::hasColumn('patients', 'address'))              $table->string('address')->nullable();
            if (!Schema::hasColumn('patients', 'barangay'))             $table->string('barangay')->nullable();
            if (!Schema::hasColumn('patients', 'birthday'))             $table->date('birthday')->nullable();
            if (!Schema::hasColumn('patients', 'height_cm'))            $table->unsignedInteger('height_cm')->nullable();
            if (!Schema::hasColumn('patients', 'civil_status'))         $table->string('civil_status')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            // keep columns; remove if you really need to
        });
    }
};
