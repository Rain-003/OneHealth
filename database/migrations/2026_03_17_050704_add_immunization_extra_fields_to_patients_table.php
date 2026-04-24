<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            if (!Schema::hasColumn('patients', 'date_of_registration')) {
                $table->date('date_of_registration')->nullable()->after('family_no');
            }

            if (!Schema::hasColumn('patients', 'date_referred_nb_screening')) {
                $table->date('date_referred_nb_screening')->nullable()->after('date_of_registration');
            }

            if (!Schema::hasColumn('patients', 'date_nbs_done')) {
                $table->date('date_nbs_done')->nullable()->after('date_referred_nb_screening');
            }

            if (!Schema::hasColumn('patients', 'child_height_cm')) {
                $table->decimal('child_height_cm', 5, 2)->nullable()->after('birth_weight_kg');
            }

            if (!Schema::hasColumn('patients', 'cpab')) {
                $table->string('cpab', 100)->nullable()->after('child_height_cm');
            }

            if (!Schema::hasColumn('patients', 'delivery_type')) {
                $table->string('delivery_type', 100)->nullable()->after('cpab');
            }

            if (!Schema::hasColumn('patients', 'tt_status_mother')) {
                $table->string('tt_status_mother', 100)->nullable()->after('delivery_type');
            }

            if (!Schema::hasColumn('patients', 'tt_status_date')) {
                $table->date('tt_status_date')->nullable()->after('tt_status_mother');
            }
        });
    }

    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $drops = [];

            foreach ([
                'date_of_registration',
                'date_referred_nb_screening',
                'date_nbs_done',
                'child_height_cm',
                'cpab',
                'delivery_type',
                'tt_status_mother',
                'tt_status_date',
            ] as $col) {
                if (Schema::hasColumn('patients', $col)) {
                    $drops[] = $col;
                }
            }

            if (!empty($drops)) {
                $table->dropColumn($drops);
            }
        });
    }
};