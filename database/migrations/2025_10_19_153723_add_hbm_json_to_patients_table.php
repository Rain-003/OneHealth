<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('patients', function (Blueprint $t) {
            if (!Schema::hasColumn('patients', 'prenatal_hbm_current')) {
                $t->json('prenatal_hbm_current')->nullable();
            }
            if (!Schema::hasColumn('patients', 'prenatal_hbm_after')) {
                $t->json('prenatal_hbm_after')->nullable();
            }
        });
    }

    public function down(): void {
        Schema::table('patients', function (Blueprint $t) {
            if (Schema::hasColumn('patients', 'prenatal_hbm_after'))   $t->dropColumn('prenatal_hbm_after');
            if (Schema::hasColumn('patients', 'prenatal_hbm_current')) $t->dropColumn('prenatal_hbm_current');
        });
    }
};
