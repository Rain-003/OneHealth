<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            // Paper card header fields
            $table->string('mother_name')->nullable()->after('full_name');
            $table->string('father_name')->nullable()->after('mother_name');
            $table->string('place_of_birth')->nullable()->after('birthdate');
            $table->string('address')->nullable()->after('place_of_birth');
            $table->decimal('birth_weight_kg', 4, 2)->nullable()->after('address');
            $table->decimal('birth_length_cm', 5, 2)->nullable()->after('birth_weight_kg');
            $table->enum('sex', ['Male','Female'])->nullable()->after('birth_length_cm');

            // Clinic-side metadata on the card
            $table->string('health_center')->nullable()->after('sex');
            if (!Schema::hasColumn('patients', 'barangay')) {
                $table->string('barangay')->nullable();
            } else {
                $table->string('barangay')->nullable()->change();
            }
            $table->string('family_no')->nullable()->after('barangay');
        });
    }

    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->dropColumn([
                'mother_name',
                'father_name',
                'place_of_birth',
                'address',
                'birth_weight_kg',
                'birth_length_cm',
                'sex',
                'health_center',
                'family_no',
            ]);
        });
    }
};
