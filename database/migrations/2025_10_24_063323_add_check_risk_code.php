<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('prenatal_top', function (Blueprint $table) {
            // one flag per risk code (A–E)
            $table->boolean('risk_a_flag')->default(false)->after('risk_a_date');
            $table->boolean('risk_b_flag')->default(false)->after('risk_b_date');
            $table->boolean('risk_c_flag')->default(false)->after('risk_c_date');
            $table->boolean('risk_d_flag')->default(false)->after('risk_d_date');
            $table->boolean('risk_e_flag')->default(false)->after('risk_e_date');
        });
    }

    public function down(): void
    {
        Schema::table('prenatal_top', function (Blueprint $table) {
            $table->dropColumn([
                'risk_a_flag','risk_b_flag','risk_c_flag','risk_d_flag','risk_e_flag'
            ]);
        });
    }
};
