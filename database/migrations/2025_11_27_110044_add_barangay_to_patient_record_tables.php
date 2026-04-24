<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Immunization records
        Schema::table('immunization_records', function (Blueprint $table) {
            $table->string('barangay')->nullable()->after('patient_id');
        });

        // Prenatal Top
        Schema::table('prenatal_top', function (Blueprint $table) {
            $table->string('barangay')->nullable()->after('patient_id');
        });

        // Prenatal visits
        Schema::table('prenatal_visits', function (Blueprint $table) {
            $table->string('barangay')->nullable()->after('patient_id');
        });

        // HBM Current Pregnancy
        Schema::table('current_pregnancies', function (Blueprint $table) {
            $table->string('barangay')->nullable()->after('patient_id');
        });

        // HBM History
        Schema::table('hbm_histories', function (Blueprint $table) {
            $table->string('barangay')->nullable()->after('patient_id');
        });

        // Postnatal records
        Schema::table('postnatal_records', function (Blueprint $table) {
            $table->string('barangay')->nullable()->after('patient_id');
        });
    }

    public function down(): void
    {
        Schema::table('immunization_records', function (Blueprint $table) {
            $table->dropColumn('barangay');
        });

        Schema::table('prenatal_top', function (Blueprint $table) {
            $table->string('barangay')->nullable()->after('patient_id');
        });

        Schema::table('prenatal_visits', function (Blueprint $table) {
            $table->dropColumn('barangay');
        });

        Schema::table('current_pregnancies', function (Blueprint $table) {
            $table->dropColumn('barangay');
        });

        Schema::table('hbm_histories', function (Blueprint $table) {
            $table->dropColumn('barangay');
        });

        Schema::table('postnatal_records', function (Blueprint $table) {
            $table->dropColumn('barangay');
        });
    }
};
