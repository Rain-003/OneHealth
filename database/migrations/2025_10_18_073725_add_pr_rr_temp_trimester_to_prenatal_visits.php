<?php
// php artisan make:migration add_pr_rr_temp_trimester_to_prenatal_visits --table=prenatal_visits

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('prenatal_visits', function (Blueprint $t) {
            $t->enum('trimester', ['1st','2nd','3rd'])->nullable()->after('visit_date');
            $t->string('pr', 12)->nullable()->after('bp');
            $t->string('rr', 12)->nullable()->after('pr');
            $t->string('temp', 12)->nullable()->after('rr');
        });
    }

    public function down(): void
    {
        Schema::table('prenatal_visits', function (Blueprint $t) {
            $t->dropColumn(['trimester','pr','rr','temp']);
        });
    }
};

