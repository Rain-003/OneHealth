<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('pregnancies', function (Blueprint $table) {
            $table->id();

            $table->foreignId('patient_id')
                ->constrained('patients')
                ->cascadeOnDelete();

            $table->unsignedInteger('pregnancy_no')->default(1);

            $table->date('lmp')->nullable();
            $table->date('edd')->nullable();

            $table->enum('status', [
                'ongoing',
                'completed',
            ])->default('ongoing');

            $table->enum('outcome', [
                'delivered',
                'miscarriage',
                'transferred',
                'unknown',
            ])->nullable();

            $table->date('completed_at')->nullable();

            $table->timestamps();

            $table->index(['patient_id', 'status']);
            $table->unique(['patient_id', 'pregnancy_no']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pregnancies');
    }
};