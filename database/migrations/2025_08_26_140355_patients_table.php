<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class PatientsTable extends Migration
{
    public function up(): void
    {
        Schema::create('patients', function (Blueprint $table) {
            $table->id();
            $table->string('full_name');         // store normalized full name if you like
            $table->date('birthdate');
            $table->string('barangay')->nullable();

            // If you want to avoid duplicate records for the same identity:
            $table->unique(['full_name', 'birthdate', 'barangay'], 'patients_identity_unique');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patients');
    }
}
