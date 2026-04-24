<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('prenatal_plans', function (Blueprint $table) {
            // General
            $table->date('plan_date')->nullable()->after('patient_id');
            $table->string('attending_personnel')->nullable()->after('attending');
            $table->string('planned_facility_is_philhealth')->nullable()->after('philhealth_accredited');
            $table->string('distance_from_residence')->nullable()->after('distance');
            $table->string('mode_of_payment')->nullable()->after('payment_mode');
            $table->string('available_transport')->nullable()->after('transport');

            // Companion + family companion + caretaker
            $table->string('companion_name')->nullable()->after('companion_2_contact');
            $table->string('companion_address')->nullable()->after('companion_name');
            $table->string('companion_contact')->nullable()->after('companion_address');

            $table->string('family_companion_name')->nullable()->after('companion_contact');
            $table->string('family_companion_relationship')->nullable()->after('family_companion_name');
            $table->string('family_companion_address')->nullable()->after('family_companion_relationship');
            $table->string('family_companion_contact')->nullable()->after('family_companion_address');

            $table->string('caretaker_name')->nullable()->after('family_companion_contact');
            $table->string('caretaker_relationship')->nullable()->after('caretaker_name');

            // Blood donors (split)
            $table->string('blood_donor_1_name')->nullable()->after('blood_type');
            $table->string('blood_donor_1_address')->nullable()->after('blood_donor_1_name');
            $table->string('blood_donor_2_name')->nullable()->after('blood_donor_1_address');
            $table->string('blood_donor_2_address')->nullable()->after('blood_donor_2_name');

            // Complication / emergency contacts
            $table->string('emergency_contact_name')->nullable()->after('refer_to_address');
            $table->string('emergency_contact_address')->nullable()->after('emergency_contact_name');
            $table->string('emergency_contact_contact')->nullable()->after('emergency_contact_address');

            // Nearest maternal & newborn facilities
            $table->string('maternal_hospital_1_name')->nullable()->after('emergency_contact_contact');
            $table->string('maternal_hospital_1_address')->nullable()->after('maternal_hospital_1_name');
            $table->string('maternal_hospital_2_name')->nullable()->after('maternal_hospital_1_address');
            $table->string('maternal_hospital_2_address')->nullable()->after('maternal_hospital_2_name');

            // Signature (just the name for now – file upload handled separately)
            $table->string('signature_name')->nullable()->after('maternal_hospital_2_address');
        });
    }

    public function down(): void
    {
        Schema::table('prenatal_plans', function (Blueprint $table) {
            $table->dropColumn([
                'plan_date',
                'attending_personnel',
                'planned_facility_is_philhealth',
                'distance_from_residence',
                'mode_of_payment',
                'available_transport',

                'companion_name',
                'companion_address',
                'companion_contact',

                'family_companion_name',
                'family_companion_relationship',
                'family_companion_address',
                'family_companion_contact',

                'caretaker_name',
                'caretaker_relationship',

                'blood_donor_1_name',
                'blood_donor_1_address',
                'blood_donor_2_name',
                'blood_donor_2_address',

                'emergency_contact_name',
                'emergency_contact_address',
                'emergency_contact_contact',

                'maternal_hospital_1_name',
                'maternal_hospital_1_address',
                'maternal_hospital_2_name',
                'maternal_hospital_2_address',

                'signature_name',
            ]);
        });
    }
};
