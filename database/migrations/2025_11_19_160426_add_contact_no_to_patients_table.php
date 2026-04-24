<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            if (!Schema::hasColumn('patients', 'contact_no')) {
                // You can change the "after(...)" to whatever column order you like
                $table->string('contact_no', 30)
                      ->nullable()
                      ->after('family_no'); // or after('barangay') / after('address')
            }
        });
    }

    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            if (Schema::hasColumn('patients', 'contact_no')) {
                $table->dropColumn('contact_no');
            }
        });
    }
};
