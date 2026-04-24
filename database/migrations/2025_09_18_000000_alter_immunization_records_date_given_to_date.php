<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('immunization_records', function (Blueprint $table) {
            // requires doctrine/dbal if you are changing existing type
            // composer require doctrine/dbal
            $table->date('date_given')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('immunization_records', function (Blueprint $table) {
            // if you previously had string, revert; adjust to your old type if different
            $table->string('date_given')->nullable()->change();
        });
    }
};
